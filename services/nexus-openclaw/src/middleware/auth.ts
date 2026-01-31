/**
 * Authentication Middleware
 *
 * Provides:
 * - JWT validation using NexusAuthClient
 * - Attach user to request object
 * - Handle auth errors gracefully
 * - Support for optional authentication
 */

import { Request, Response, NextFunction } from 'express';
import { NexusAuthClient } from '../auth/nexus-auth-client';
import { createLogger } from '../utils/logger';
import { UnauthorizedError } from './error-handler';

const logger = createLogger({ component: 'auth-middleware' });

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId: string;
        tier: 'open_source' | 'teams' | 'government';
        email?: string;
        name?: string;
      };
      requestId?: string;
    }
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    return match[1];
  }

  // Support plain token
  return authHeader;
}

/**
 * Authentication middleware (required)
 */
export function requireAuth(authClient: NexusAuthClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token
      const token = extractToken(req);

      if (!token) {
        logger.warn('Missing authentication token', {
          path: req.path,
          method: req.method,
        });
        throw new UnauthorizedError('Authentication token required');
      }

      // Validate token
      const user = await authClient.validateToken(token);

      if (!user) {
        logger.warn('Invalid authentication token', {
          path: req.path,
          method: req.method,
        });
        throw new UnauthorizedError('Invalid or expired token');
      }

      // Attach user to request
      req.user = {
        userId: user.userId,
        organizationId: user.organizationId,
        tier: user.tier,
        email: user.email,
        name: user.name,
      };

      logger.debug('Authentication successful', {
        userId: user.userId,
        organizationId: user.organizationId,
        tier: user.tier,
      });

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        next(error);
      } else {
        logger.error('Authentication error', { error });
        next(new UnauthorizedError('Authentication failed'));
      }
    }
  };
}

/**
 * Optional authentication middleware
 */
export function optionalAuth(authClient: NexusAuthClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token
      const token = extractToken(req);

      if (!token) {
        // No token provided, continue without user
        next();
        return;
      }

      // Validate token
      const user = await authClient.validateToken(token);

      if (user) {
        // Attach user to request
        req.user = {
          userId: user.userId,
          organizationId: user.organizationId,
          tier: user.tier,
          email: user.email,
          name: user.name,
        };

        logger.debug('Optional authentication successful', {
          userId: user.userId,
          organizationId: user.organizationId,
        });
      } else {
        logger.debug('Optional authentication failed - invalid token', {
          path: req.path,
        });
      }

      next();
    } catch (error) {
      // Don't fail on optional auth error
      logger.warn('Optional authentication error', { error });
      next();
    }
  };
}

/**
 * Tier-based authorization middleware
 */
export function requireTier(...allowedTiers: Array<'open_source' | 'teams' | 'government'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedTiers.includes(req.user.tier)) {
      logger.warn('Insufficient tier for access', {
        userId: req.user.userId,
        userTier: req.user.tier,
        requiredTiers: allowedTiers,
        path: req.path,
      });

      next(
        new UnauthorizedError('Insufficient permissions', {
          userTier: req.user.tier,
          requiredTiers: allowedTiers,
        })
      );
      return;
    }

    logger.debug('Tier authorization successful', {
      userId: req.user.userId,
      tier: req.user.tier,
    });

    next();
  };
}

/**
 * Organization ownership verification middleware
 */
export function requireOrganization(getOrganizationId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const targetOrganizationId = getOrganizationId(req);

    if (req.user.organizationId !== targetOrganizationId) {
      logger.warn('Organization mismatch', {
        userId: req.user.userId,
        userOrganizationId: req.user.organizationId,
        targetOrganizationId,
        path: req.path,
      });

      next(
        new UnauthorizedError('Access denied', {
          reason: 'Organization mismatch',
        })
      );
      return;
    }

    logger.debug('Organization verification successful', {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    });

    next();
  };
}

/**
 * API key authentication middleware (alternative to JWT)
 */
export function apiKeyAuth(authClient: NexusAuthClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract API key from header
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        logger.warn('Missing API key', {
          path: req.path,
          method: req.method,
        });
        throw new UnauthorizedError('API key required');
      }

      // Validate API key
      const user = await authClient.validateApiKey(apiKey);

      if (!user) {
        logger.warn('Invalid API key', {
          path: req.path,
          method: req.method,
        });
        throw new UnauthorizedError('Invalid API key');
      }

      // Attach user to request
      req.user = {
        userId: user.userId,
        organizationId: user.organizationId,
        tier: user.tier,
        email: user.email,
        name: user.name,
      };

      logger.debug('API key authentication successful', {
        userId: user.userId,
        organizationId: user.organizationId,
      });

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        next(error);
      } else {
        logger.error('API key authentication error', { error });
        next(new UnauthorizedError('Authentication failed'));
      }
    }
  };
}

export default requireAuth;
