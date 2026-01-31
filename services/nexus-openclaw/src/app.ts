/**
 * OpenClaw Application - Production-Hardened Express Application
 *
 * This module configures the Express application with all middleware,
 * routes, and error handling for production deployment.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { defaultLogger as logger } from './utils/logger';
import { getMetrics } from './utils/metrics';
import { healthChecker } from './utils/health-checker';

// Middleware
import { requestLogger } from './middleware/request-logger';
import { requireAuth, optionalAuth } from './middleware/auth';
import { rateLimiter, RateLimiterFactory } from './middleware/rate-limiter';
import { quotaEnforcer, QuotaEnforcer } from './middleware/quota-enforcer';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Services
import { DatabaseService } from './database/database.service';
import { RedisService } from './database/redis.service';
import { NexusAuthClient } from './auth/nexus-auth-client';

// Environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const PLUGIN_ID = process.env.NEXUS_PLUGIN_ID || 'nexus-openclaw';
const PLUGIN_VERSION = process.env.NEXUS_PLUGIN_VERSION || '1.0.0';
const BUILD_ID = process.env.NEXUS_BUILD_ID || 'dev';

export interface AppConfig {
  db: DatabaseService;
  redis: RedisService;
  authClient: NexusAuthClient;
  rateLimiterFactory: RateLimiterFactory;
  quotaEnforcer: QuotaEnforcer;
}

/**
 * Create and configure Express application
 */
export function createApp(config: AppConfig): Express {
  const app = express();

  // ===== Security Middleware =====

  // Helmet security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (NODE_ENV === 'development' || !origin) {
          callback(null, true);
        } else {
          const allowedOrigins = [
            'https://api.adverant.ai',
            'https://dashboard.adverant.ai',
            'https://adverant.ai',
          ];

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('CORS policy violation'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    })
  );

  // ===== Request Parsing =====

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ===== Response Compression =====

  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );

  // ===== Trust Proxy (for K8s) =====

  app.set('trust proxy', true);

  // ===== Request Logging =====

  app.use(requestLogger);

  // ===== Health Check Routes (No Auth) =====

  app.get('/health', async (req: Request, res: Response) => {
    const healthResult = await healthChecker.performHealthCheck({
      pool: config.db.getPool(),
      redis: config.redis.getClient(),
      graphragUrl: process.env.NEXUS_GRAPHRAG_URL,
      mageagentUrl: process.env.NEXUS_MAGEAGENT_URL,
    });

    const statusCode = healthResult.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthResult);
  });

  app.get('/health/live', (req: Request, res: Response) => {
    const result = healthChecker.livenessCheck();
    res.status(200).json(result);
  });

  app.get('/health/ready', async (req: Request, res: Response) => {
    const result = await healthChecker.readinessCheck({
      pool: config.db.getPool(),
      redis: config.redis.getClient(),
    });

    const statusCode = result.status === 'pass' ? 200 : 503;
    res.status(statusCode).json(result);
  });

  // ===== Metrics Endpoint (No Auth) =====

  app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    const metrics = await getMetrics();
    res.send(metrics);
  });

  // ===== Info Endpoint (No Auth) =====

  app.get('/info', (req: Request, res: Response) => {
    res.json({
      plugin: PLUGIN_ID,
      version: PLUGIN_VERSION,
      buildId: BUILD_ID,
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ===== API Routes (With Auth) =====

  const apiRouter = express.Router();

  // Apply auth, rate limiting, and quota enforcement to all API routes
  apiRouter.use(requireAuth(config.authClient));
  apiRouter.use(rateLimiter(config.rateLimiterFactory));

  // Session routes
  apiRouter.post(
    '/sessions',
    quotaEnforcer(config.quotaEnforcer, 'sessions'),
    async (req: Request, res: Response) => {
      // Session creation handler
      res.status(501).json({ error: 'Not implemented' });
    }
  );

  apiRouter.get('/sessions/:sessionId', async (req: Request, res: Response) => {
    // Get session handler
    res.status(501).json({ error: 'Not implemented' });
  });

  apiRouter.put('/sessions/:sessionId', async (req: Request, res: Response) => {
    // Update session handler
    res.status(501).json({ error: 'Not implemented' });
  });

  apiRouter.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
    // Delete session handler
    res.status(501).json({ error: 'Not implemented' });
  });

  apiRouter.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    // Get messages handler
    res.status(501).json({ error: 'Not implemented' });
  });

  // Chat completions (OpenAI-compatible)
  apiRouter.post(
    '/chat/completions',
    quotaEnforcer(config.quotaEnforcer, 'messages'),
    async (req: Request, res: Response) => {
      // Chat completions handler
      res.status(501).json({ error: 'Not implemented' });
    }
  );

  // Skills routes
  apiRouter.get('/skills', async (req: Request, res: Response) => {
    // List skills handler
    res.status(501).json({ error: 'Not implemented' });
  });

  apiRouter.post(
    '/skills/execute',
    quotaEnforcer(config.quotaEnforcer, 'skills'),
    async (req: Request, res: Response) => {
      // Execute skill handler
      res.status(501).json({ error: 'Not implemented' });
    }
  );

  // Mount API router
  app.use('/api/v1', apiRouter);

  // ===== Error Handling =====

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info('Express application configured', {
    environment: NODE_ENV,
    plugin: PLUGIN_ID,
    version: PLUGIN_VERSION,
  });

  return app;
}

export default createApp;
