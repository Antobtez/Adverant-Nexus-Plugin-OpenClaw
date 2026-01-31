/**
 * Health Check Utilities
 *
 * Provides comprehensive health checks for:
 * - Database connectivity
 * - Redis connectivity
 * - External services (GraphRAG, MageAgent)
 * - Disk space
 * - System resources
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import axios from 'axios';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { defaultLogger as logger } from './logger';

const exec = promisify(execCallback);

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      duration?: number;
      error?: string;
    };
  };
  timestamp: string;
  uptime: number;
}

export class HealthChecker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check PostgreSQL connectivity
   */
  async checkDatabase(pool: Pool): Promise<{ status: 'pass' | 'fail'; message?: string; duration?: number; error?: string }> {
    const start = Date.now();
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      const duration = Date.now() - start;
      logger.debug('Database health check passed', { duration });

      return {
        status: 'pass',
        message: 'Database is reachable',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database health check failed', { error, duration });

      return {
        status: 'fail',
        message: 'Database is unreachable',
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis(redis: Redis): Promise<{ status: 'pass' | 'fail'; message?: string; duration?: number; error?: string }> {
    const start = Date.now();
    try {
      await redis.ping();

      const duration = Date.now() - start;
      logger.debug('Redis health check passed', { duration });

      return {
        status: 'pass',
        message: 'Redis is reachable',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Redis health check failed', { error, duration });

      return {
        status: 'fail',
        message: 'Redis is unreachable',
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check external service health
   */
  async checkExternalService(
    serviceName: string,
    healthUrl: string,
    timeout: number = 5000
  ): Promise<{ status: 'pass' | 'fail'; message?: string; duration?: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await axios.get(healthUrl, {
        timeout,
        validateStatus: (status) => status < 500, // Accept 4xx as valid response
      });

      const duration = Date.now() - start;
      logger.debug(`${serviceName} health check passed`, { duration, status: response.status });

      return {
        status: 'pass',
        message: `${serviceName} is reachable`,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`${serviceName} health check failed`, { error, duration });

      return {
        status: 'fail',
        message: `${serviceName} is unreachable`,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace(threshold: number = 90): Promise<{ status: 'pass' | 'fail'; message?: string; error?: string }> {
    try {
      const { stdout } = await exec("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const usage = parseInt(stdout.trim(), 10);

      if (usage >= threshold) {
        logger.warn('Disk space warning', { usage, threshold });
        return {
          status: 'fail',
          message: `Disk usage is ${usage}% (threshold: ${threshold}%)`,
        };
      }

      logger.debug('Disk space check passed', { usage, threshold });
      return {
        status: 'pass',
        message: `Disk usage is ${usage}%`,
      };
    } catch (error) {
      logger.error('Disk space check failed', { error });
      return {
        status: 'fail',
        message: 'Unable to check disk space',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemory(threshold: number = 90): { status: 'pass' | 'fail'; message?: string } {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    if (heapUsedPercent >= threshold) {
      logger.warn('Memory usage warning', { heapUsedPercent, threshold });
      return {
        status: 'fail',
        message: `Heap usage is ${heapUsedPercent.toFixed(2)}% (threshold: ${threshold}%)`,
      };
    }

    logger.debug('Memory check passed', { heapUsedPercent, threshold });
    return {
      status: 'pass',
      message: `Heap usage is ${heapUsedPercent.toFixed(2)}%`,
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(options: {
    pool?: Pool;
    redis?: Redis;
    graphragUrl?: string;
    mageagentUrl?: string;
    diskThreshold?: number;
    memoryThreshold?: number;
  }): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Check database
    if (options.pool) {
      checks.database = await this.checkDatabase(options.pool);
    }

    // Check Redis
    if (options.redis) {
      checks.redis = await this.checkRedis(options.redis);
    }

    // Check GraphRAG
    if (options.graphragUrl) {
      checks.graphrag = await this.checkExternalService('GraphRAG', options.graphragUrl);
    }

    // Check MageAgent
    if (options.mageagentUrl) {
      checks.mageagent = await this.checkExternalService('MageAgent', options.mageagentUrl);
    }

    // Check disk space
    checks.disk = await this.checkDiskSpace(options.diskThreshold);

    // Check memory
    checks.memory = this.checkMemory(options.memoryThreshold);

    // Determine overall status
    const failedChecks = Object.values(checks).filter((check) => check.status === 'fail');
    const status = failedChecks.length === 0 ? 'healthy' : failedChecks.length <= 1 ? 'degraded' : 'unhealthy';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
    };
  }

  /**
   * Simple liveness check (always returns true if process is running)
   */
  livenessCheck(): { status: 'pass'; uptime: number } {
    return {
      status: 'pass',
      uptime: this.getUptime(),
    };
  }

  /**
   * Readiness check (checks critical services)
   */
  async readinessCheck(options: {
    pool?: Pool;
    redis?: Redis;
  }): Promise<{ status: 'pass' | 'fail'; checks: HealthCheckResult['checks'] }> {
    const checks: HealthCheckResult['checks'] = {};

    if (options.pool) {
      checks.database = await this.checkDatabase(options.pool);
    }

    if (options.redis) {
      checks.redis = await this.checkRedis(options.redis);
    }

    const failedChecks = Object.values(checks).filter((check) => check.status === 'fail');
    const status = failedChecks.length === 0 ? 'pass' : 'fail';

    return { status, checks };
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

export default healthChecker;
