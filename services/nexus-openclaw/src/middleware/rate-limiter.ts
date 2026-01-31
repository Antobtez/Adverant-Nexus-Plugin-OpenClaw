/**
 * Tiered Rate Limiting Middleware
 *
 * Provides:
 * - Rate limiting using rate-limiter-flexible with Redis
 * - Different limits per tier (open_source, teams, government)
 * - Block excessive requests
 * - Return 429 with retry-after header
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger';
import { rateLimitHits, rateLimitRemaining } from '../utils/metrics';
import { RateLimitError } from './error-handler';

const logger = createLogger({ component: 'rate-limiter' });

// Rate limit configurations by tier
export const RATE_LIMITS = {
  open_source: {
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds (1 minute)
    blockDuration: 60, // Block for 60 seconds if exceeded
  },
  teams: {
    points: 500,
    duration: 60,
    blockDuration: 60,
  },
  government: {
    points: 2000,
    duration: 60,
    blockDuration: 30,
  },
};

// WebSocket connection limits
export const WS_CONNECTION_LIMITS = {
  open_source: {
    points: 5, // Max 5 concurrent connections
    duration: 0, // No time limit
  },
  teams: {
    points: 20,
    duration: 0,
  },
  government: {
    points: 100,
    duration: 0,
  },
};

// Message rate limits (for WebSocket)
export const MESSAGE_RATE_LIMITS = {
  open_source: {
    points: 200, // 200 messages
    duration: 60, // Per minute
    blockDuration: 30,
  },
  teams: {
    points: 1000,
    duration: 60,
    blockDuration: 30,
  },
  government: {
    points: 5000,
    duration: 60,
    blockDuration: 15,
  },
};

/**
 * Create rate limiter instance
 */
export function createRateLimiter(
  redis: Redis,
  config: { points: number; duration: number; blockDuration?: number },
  keyPrefix: string
): RateLimiterRedis {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
  });
}

/**
 * Create in-memory rate limiter (fallback)
 */
export function createMemoryRateLimiter(
  config: { points: number; duration: number; blockDuration?: number },
  keyPrefix: string
): RateLimiterMemory {
  return new RateLimiterMemory({
    keyPrefix,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
  });
}

/**
 * Rate limiter factory
 */
export class RateLimiterFactory {
  private limiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map();
  private redis?: Redis;

  constructor(redis?: Redis) {
    this.redis = redis;
  }

  /**
   * Get or create rate limiter for tier
   */
  getLimiter(tier: string, type: 'http' | 'ws' | 'message'): RateLimiterRedis | RateLimiterMemory {
    const key = `${tier}:${type}`;

    if (!this.limiters.has(key)) {
      let config;
      let keyPrefix;

      if (type === 'http') {
        config = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.open_source;
        keyPrefix = `openclaw:rate_limit:http:${tier}`;
      } else if (type === 'ws') {
        config = WS_CONNECTION_LIMITS[tier as keyof typeof WS_CONNECTION_LIMITS] || WS_CONNECTION_LIMITS.open_source;
        keyPrefix = `openclaw:rate_limit:ws:${tier}`;
      } else {
        config = MESSAGE_RATE_LIMITS[tier as keyof typeof MESSAGE_RATE_LIMITS] || MESSAGE_RATE_LIMITS.open_source;
        keyPrefix = `openclaw:rate_limit:message:${tier}`;
      }

      const limiter = this.redis
        ? createRateLimiter(this.redis, config, keyPrefix)
        : createMemoryRateLimiter(config, keyPrefix);

      this.limiters.set(key, limiter);
    }

    return this.limiters.get(key)!;
  }

  /**
   * Clear all limiters (for testing)
   */
  clear(): void {
    this.limiters.clear();
  }
}

/**
 * HTTP rate limiting middleware
 */
export function rateLimiter(factory: RateLimiterFactory) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get user info from auth middleware
      const user = (req as any).user;
      if (!user) {
        // If no user, use IP-based rate limiting
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const limiter = factory.getLimiter('open_source', 'http');

        try {
          const rateLimitInfo = await limiter.consume(clientIp);

          // Set rate limit headers
          res.setHeader('X-RateLimit-Limit', RATE_LIMITS.open_source.points);
          res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints);
          res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());

          // Record metrics
          rateLimitRemaining.set(
            {
              organization_id: 'anonymous',
              tier: 'open_source',
              limit_type: 'http',
            },
            rateLimitInfo.remainingPoints
          );

          next();
        } catch (rateLimitError) {
          handleRateLimitExceeded(req, res, next, 'open_source', 'http', rateLimitError);
        }
        return;
      }

      // Get tier from user
      const tier = user.tier || 'open_source';
      const organizationId = user.organizationId;

      // Get limiter for tier
      const limiter = factory.getLimiter(tier, 'http');

      try {
        const rateLimitInfo = await limiter.consume(organizationId);

        // Set rate limit headers
        const config = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.open_source;
        res.setHeader('X-RateLimit-Limit', config.points);
        res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());

        // Record metrics
        rateLimitRemaining.set(
          {
            organization_id: organizationId,
            tier,
            limit_type: 'http',
          },
          rateLimitInfo.remainingPoints
        );

        logger.debug('Rate limit check passed', {
          organizationId,
          tier,
          remaining: rateLimitInfo.remainingPoints,
        });

        next();
      } catch (rateLimitError) {
        handleRateLimitExceeded(req, res, next, tier, 'http', rateLimitError);
      }
    } catch (error) {
      // If rate limiter fails, log error but don't block request
      logger.error('Rate limiter error', { error });
      next();
    }
  };
}

/**
 * Handle rate limit exceeded
 */
function handleRateLimitExceeded(
  req: Request,
  res: Response,
  next: NextFunction,
  tier: string,
  limitType: string,
  rateLimitError: any
): void {
  const user = (req as any).user;
  const organizationId = user?.organizationId || 'anonymous';

  const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);

  logger.warn('Rate limit exceeded', {
    organizationId,
    tier,
    limitType,
    retryAfter,
  });

  // Record metrics
  rateLimitHits.inc({
    organization_id: organizationId,
    tier,
    limit_type: limitType,
  });

  // Set retry-after header
  res.setHeader('Retry-After', retryAfter);
  res.setHeader('X-RateLimit-Limit', rateLimitError.points || 0);
  res.setHeader('X-RateLimit-Remaining', 0);
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitError.msBeforeNext).toISOString());

  next(
    new RateLimitError('Rate limit exceeded. Please try again later.', {
      retryAfter,
      tier,
    })
  );
}

/**
 * Check WebSocket connection limit
 */
export async function checkWebSocketLimit(
  factory: RateLimiterFactory,
  organizationId: string,
  tier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = factory.getLimiter(tier, 'ws');

  try {
    await limiter.consume(organizationId, 1);
    return { allowed: true };
  } catch (rateLimitError: any) {
    const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);

    logger.warn('WebSocket connection limit exceeded', {
      organizationId,
      tier,
      retryAfter,
    });

    // Record metrics
    rateLimitHits.inc({
      organization_id: organizationId,
      tier,
      limit_type: 'ws',
    });

    return { allowed: false, retryAfter };
  }
}

/**
 * Release WebSocket connection limit
 */
export async function releaseWebSocketLimit(
  factory: RateLimiterFactory,
  organizationId: string,
  tier: string
): Promise<void> {
  const limiter = factory.getLimiter(tier, 'ws');

  try {
    await limiter.reward(organizationId, 1);
    logger.debug('WebSocket connection limit released', {
      organizationId,
      tier,
    });
  } catch (error) {
    logger.error('Failed to release WebSocket limit', { error, organizationId, tier });
  }
}

/**
 * Check message rate limit
 */
export async function checkMessageLimit(
  factory: RateLimiterFactory,
  organizationId: string,
  tier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = factory.getLimiter(tier, 'message');

  try {
    await limiter.consume(organizationId, 1);
    return { allowed: true };
  } catch (rateLimitError: any) {
    const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);

    logger.warn('Message rate limit exceeded', {
      organizationId,
      tier,
      retryAfter,
    });

    // Record metrics
    rateLimitHits.inc({
      organization_id: organizationId,
      tier,
      limit_type: 'message',
    });

    return { allowed: false, retryAfter };
  }
}

export default rateLimiter;
