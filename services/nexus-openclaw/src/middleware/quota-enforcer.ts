/**
 * Quota Enforcement Middleware
 *
 * Provides:
 * - Check quotas before operations
 * - Track usage in Redis
 * - Emit quota warning events (80% usage)
 * - Block when quota exceeded
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger';
import { quotaUsage, quotaLimit, quotaExceeded } from '../utils/metrics';
import { ForbiddenError } from './error-handler';
import { EventEmitter } from 'events';

const logger = createLogger({ component: 'quota-enforcer' });

// Quota configurations by tier
export const QUOTAS = {
  open_source: {
    sessions_per_month: 100,
    messages_per_month: 10000,
    skills_per_session: 10,
    concurrent_sessions: 5,
  },
  teams: {
    sessions_per_month: 1000,
    messages_per_month: 100000,
    skills_per_session: 50,
    concurrent_sessions: 20,
  },
  government: {
    sessions_per_month: 10000,
    messages_per_month: 1000000,
    skills_per_session: 200,
    concurrent_sessions: 100,
  },
};

// Warning threshold (80%)
const WARNING_THRESHOLD = 0.8;

/**
 * Quota event emitter
 */
export const quotaEvents = new EventEmitter();

/**
 * Quota types
 */
export type QuotaType = 'sessions' | 'messages' | 'skills' | 'concurrent_sessions';

/**
 * Quota enforcer class
 */
export class QuotaEnforcer {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get Redis key for quota
   */
  private getQuotaKey(organizationId: string, quotaType: QuotaType, period?: string): string {
    const now = new Date();
    const month = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `openclaw:quota:${organizationId}:${quotaType}:${month}`;
  }

  /**
   * Get current usage for quota type
   */
  async getUsage(organizationId: string, tier: string, quotaType: QuotaType): Promise<number> {
    try {
      const key = this.getQuotaKey(organizationId, quotaType);
      const usage = await this.redis.get(key);
      return usage ? parseInt(usage, 10) : 0;
    } catch (error) {
      logger.error('Failed to get quota usage', { error, organizationId, quotaType });
      return 0;
    }
  }

  /**
   * Get quota limit for tier
   */
  getLimit(tier: string, quotaType: QuotaType): number {
    const tierConfig = QUOTAS[tier as keyof typeof QUOTAS] || QUOTAS.open_source;

    switch (quotaType) {
      case 'sessions':
        return tierConfig.sessions_per_month;
      case 'messages':
        return tierConfig.messages_per_month;
      case 'skills':
        return tierConfig.skills_per_session;
      case 'concurrent_sessions':
        return tierConfig.concurrent_sessions;
      default:
        return 0;
    }
  }

  /**
   * Increment usage
   */
  async incrementUsage(
    organizationId: string,
    tier: string,
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<number> {
    try {
      const key = this.getQuotaKey(organizationId, quotaType);
      const newUsage = await this.redis.incrby(key, amount);

      // Set expiry for monthly quotas (35 days)
      if (quotaType !== 'concurrent_sessions') {
        await this.redis.expire(key, 35 * 24 * 60 * 60);
      }

      // Update metrics
      quotaUsage.set(
        {
          organization_id: organizationId,
          tier,
          quota_type: quotaType,
        },
        newUsage
      );

      quotaLimit.set(
        {
          organization_id: organizationId,
          tier,
          quota_type: quotaType,
        },
        this.getLimit(tier, quotaType)
      );

      // Check for warnings
      const limit = this.getLimit(tier, quotaType);
      const usagePercent = newUsage / limit;

      if (usagePercent >= WARNING_THRESHOLD && usagePercent < 1.0) {
        logger.warn('Quota warning threshold reached', {
          organizationId,
          tier,
          quotaType,
          usage: newUsage,
          limit,
          percent: Math.round(usagePercent * 100),
        });

        quotaEvents.emit('warning', {
          organizationId,
          tier,
          quotaType,
          usage: newUsage,
          limit,
          percent: usagePercent,
        });
      }

      return newUsage;
    } catch (error) {
      logger.error('Failed to increment quota usage', { error, organizationId, quotaType });
      throw error;
    }
  }

  /**
   * Decrement usage
   */
  async decrementUsage(
    organizationId: string,
    tier: string,
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<number> {
    try {
      const key = this.getQuotaKey(organizationId, quotaType);
      const newUsage = await this.redis.decrby(key, amount);

      // Ensure usage doesn't go negative
      if (newUsage < 0) {
        await this.redis.set(key, 0);
        return 0;
      }

      // Update metrics
      quotaUsage.set(
        {
          organization_id: organizationId,
          tier,
          quota_type: quotaType,
        },
        newUsage
      );

      return newUsage;
    } catch (error) {
      logger.error('Failed to decrement quota usage', { error, organizationId, quotaType });
      throw error;
    }
  }

  /**
   * Check if quota is available
   */
  async checkQuota(
    organizationId: string,
    tier: string,
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<{ available: boolean; usage: number; limit: number }> {
    const usage = await this.getUsage(organizationId, tier, quotaType);
    const limit = this.getLimit(tier, quotaType);
    const available = usage + amount <= limit;

    if (!available) {
      logger.warn('Quota exceeded', {
        organizationId,
        tier,
        quotaType,
        usage,
        limit,
        requested: amount,
      });

      quotaExceeded.inc({
        organization_id: organizationId,
        tier,
        quota_type: quotaType,
      });

      quotaEvents.emit('exceeded', {
        organizationId,
        tier,
        quotaType,
        usage,
        limit,
      });
    }

    return { available, usage, limit };
  }

  /**
   * Reset quota (admin function)
   */
  async resetQuota(organizationId: string, quotaType: QuotaType): Promise<void> {
    try {
      const key = this.getQuotaKey(organizationId, quotaType);
      await this.redis.del(key);

      logger.info('Quota reset', {
        organizationId,
        quotaType,
      });
    } catch (error) {
      logger.error('Failed to reset quota', { error, organizationId, quotaType });
      throw error;
    }
  }
}

/**
 * Quota enforcement middleware factory
 */
export function quotaEnforcer(enforcer: QuotaEnforcer, quotaType: QuotaType, amount: number = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get user from auth middleware
      const user = req.user;
      if (!user) {
        // Skip quota check if no user (should be caught by auth middleware)
        next();
        return;
      }

      const { organizationId, tier } = user;

      // Check quota
      const { available, usage, limit } = await enforcer.checkQuota(organizationId, tier, quotaType, amount);

      if (!available) {
        logger.warn('Request blocked due to quota exceeded', {
          organizationId,
          tier,
          quotaType,
          usage,
          limit,
          path: req.path,
        });

        throw new ForbiddenError(`Quota exceeded for ${quotaType}`, {
          quotaType,
          usage,
          limit,
          tier,
        });
      }

      // Attach quota info to request for later use
      (req as any).quota = {
        type: quotaType,
        usage,
        limit,
      };

      logger.debug('Quota check passed', {
        organizationId,
        tier,
        quotaType,
        usage,
        limit,
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        next(error);
      } else {
        logger.error('Quota enforcement error', { error });
        // Don't block request on quota check failure
        next();
      }
    }
  };
}

/**
 * Quota tracking middleware (increments after successful request)
 */
export function trackQuota(enforcer: QuotaEnforcer, quotaType: QuotaType, amount: number = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Track quota after response is sent
    res.on('finish', async () => {
      // Only track successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user;
        if (!user) return;

        const { organizationId, tier } = user;

        try {
          await enforcer.incrementUsage(organizationId, tier, quotaType, amount);

          logger.debug('Quota usage tracked', {
            organizationId,
            tier,
            quotaType,
            amount,
          });
        } catch (error) {
          logger.error('Failed to track quota usage', { error, organizationId, quotaType });
        }
      }
    });

    next();
  };
}

export default quotaEnforcer;
