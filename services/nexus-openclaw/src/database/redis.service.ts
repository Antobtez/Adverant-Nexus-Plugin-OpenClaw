/**
 * Redis Service
 *
 * Provides:
 * - Connection management
 * - Key namespacing (openclaw:*)
 * - TTL helpers
 * - Pub/sub support
 */

import Redis, { RedisOptions } from 'ioredis';
import { createLogger } from '../utils/logger';
import { redisCommandDuration, redisErrors } from '../utils/metrics';

const logger = createLogger({ component: 'redis-service' });

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
}

export class RedisService {
  private client: Redis;
  private subscriber?: Redis;
  private publisher?: Redis;
  private keyPrefix: string;
  private isConnected: boolean = false;

  constructor(config: RedisConfig) {
    this.keyPrefix = config.keyPrefix || 'openclaw:';

    const options: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableReadyCheck: config.enableReadyCheck ?? true,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}`, { delay });
        return delay;
      },
    };

    this.client = new Redis(options);

    // Connection event handlers
    this.client.on('connect', () => {
      logger.info('Redis connection established');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error });
      redisErrors.inc({ command: 'connection', error_type: error.name });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Redis...');
      await this.client.ping();
      this.isConnected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      redisErrors.inc({ command: 'connect', error_type: 'connection_failed' });
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Closing Redis connection...');

      if (this.subscriber) {
        await this.subscriber.quit();
      }

      if (this.publisher) {
        await this.publisher.quit();
      }

      await this.client.quit();
      this.isConnected = false;

      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Failed to close Redis connection', { error });
      throw error;
    }
  }

  /**
   * Add namespace prefix to key
   */
  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Execute a Redis command with metrics
   */
  private async executeCommand<T>(
    command: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;

      redisCommandDuration.observe({ command }, duration);

      logger.debug(`Redis ${command} executed`, { duration });
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      logger.error(`Redis ${command} failed`, { error, duration });

      redisErrors.inc({
        command,
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      throw error;
    }
  }

  /**
   * SET operation
   */
  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    return this.executeCommand('SET', async () => {
      const prefixedKey = this.prefixKey(key);

      if (ttl) {
        return this.client.setex(prefixedKey, ttl, value);
      } else {
        return this.client.set(prefixedKey, value);
      }
    });
  }

  /**
   * SET JSON object
   */
  async setJSON(key: string, value: any, ttl?: number): Promise<'OK'> {
    return this.set(key, JSON.stringify(value), ttl);
  }

  /**
   * GET operation
   */
  async get(key: string): Promise<string | null> {
    return this.executeCommand('GET', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.get(prefixedKey);
    });
  }

  /**
   * GET JSON object
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * DELETE operation
   */
  async del(key: string | string[]): Promise<number> {
    return this.executeCommand('DEL', async () => {
      const keys = Array.isArray(key) ? key : [key];
      const prefixedKeys = keys.map((k) => this.prefixKey(k));
      return this.client.del(...prefixedKeys);
    });
  }

  /**
   * EXISTS operation
   */
  async exists(key: string): Promise<boolean> {
    return this.executeCommand('EXISTS', async () => {
      const prefixedKey = this.prefixKey(key);
      const result = await this.client.exists(prefixedKey);
      return result === 1;
    });
  }

  /**
   * EXPIRE operation
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    return this.executeCommand('EXPIRE', async () => {
      const prefixedKey = this.prefixKey(key);
      const result = await this.client.expire(prefixedKey, ttl);
      return result === 1;
    });
  }

  /**
   * TTL operation
   */
  async ttl(key: string): Promise<number> {
    return this.executeCommand('TTL', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.ttl(prefixedKey);
    });
  }

  /**
   * INCR operation
   */
  async incr(key: string): Promise<number> {
    return this.executeCommand('INCR', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.incr(prefixedKey);
    });
  }

  /**
   * INCRBY operation
   */
  async incrBy(key: string, increment: number): Promise<number> {
    return this.executeCommand('INCRBY', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.incrby(prefixedKey, increment);
    });
  }

  /**
   * DECR operation
   */
  async decr(key: string): Promise<number> {
    return this.executeCommand('DECR', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.decr(prefixedKey);
    });
  }

  /**
   * DECRBY operation
   */
  async decrBy(key: string, decrement: number): Promise<number> {
    return this.executeCommand('DECRBY', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.decrby(prefixedKey, decrement);
    });
  }

  /**
   * HSET operation
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.executeCommand('HSET', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.hset(prefixedKey, field, value);
    });
  }

  /**
   * HGET operation
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.executeCommand('HGET', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.hget(prefixedKey, field);
    });
  }

  /**
   * HGETALL operation
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.executeCommand('HGETALL', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.hgetall(prefixedKey);
    });
  }

  /**
   * HDEL operation
   */
  async hdel(key: string, field: string | string[]): Promise<number> {
    return this.executeCommand('HDEL', async () => {
      const prefixedKey = this.prefixKey(key);
      const fields = Array.isArray(field) ? field : [field];
      return this.client.hdel(prefixedKey, ...fields);
    });
  }

  /**
   * SADD operation
   */
  async sadd(key: string, member: string | string[]): Promise<number> {
    return this.executeCommand('SADD', async () => {
      const prefixedKey = this.prefixKey(key);
      const members = Array.isArray(member) ? member : [member];
      return this.client.sadd(prefixedKey, ...members);
    });
  }

  /**
   * SREM operation
   */
  async srem(key: string, member: string | string[]): Promise<number> {
    return this.executeCommand('SREM', async () => {
      const prefixedKey = this.prefixKey(key);
      const members = Array.isArray(member) ? member : [member];
      return this.client.srem(prefixedKey, ...members);
    });
  }

  /**
   * SMEMBERS operation
   */
  async smembers(key: string): Promise<string[]> {
    return this.executeCommand('SMEMBERS', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.smembers(prefixedKey);
    });
  }

  /**
   * SISMEMBER operation
   */
  async sismember(key: string, member: string): Promise<boolean> {
    return this.executeCommand('SISMEMBER', async () => {
      const prefixedKey = this.prefixKey(key);
      const result = await this.client.sismember(prefixedKey, member);
      return result === 1;
    });
  }

  /**
   * ZADD operation
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.executeCommand('ZADD', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.zadd(prefixedKey, score, member);
    });
  }

  /**
   * ZRANGE operation
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeCommand('ZRANGE', async () => {
      const prefixedKey = this.prefixKey(key);
      return this.client.zrange(prefixedKey, start, stop);
    });
  }

  /**
   * ZREM operation
   */
  async zrem(key: string, member: string | string[]): Promise<number> {
    return this.executeCommand('ZREM', async () => {
      const prefixedKey = this.prefixKey(key);
      const members = Array.isArray(member) ? member : [member];
      return this.client.zrem(prefixedKey, ...members);
    });
  }

  /**
   * KEYS operation (use with caution in production)
   */
  async keys(pattern: string): Promise<string[]> {
    return this.executeCommand('KEYS', async () => {
      const prefixedPattern = this.prefixKey(pattern);
      const keys = await this.client.keys(prefixedPattern);
      // Remove prefix from returned keys
      return keys.map((key) => key.replace(this.keyPrefix, ''));
    });
  }

  /**
   * SCAN operation (preferred over KEYS)
   */
  async scan(pattern: string, count: number = 100): Promise<string[]> {
    return this.executeCommand('SCAN', async () => {
      const prefixedPattern = this.prefixKey(pattern);
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [newCursor, foundKeys] = await this.client.scan(
          cursor,
          'MATCH',
          prefixedPattern,
          'COUNT',
          count
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      // Remove prefix from returned keys
      return keys.map((key) => key.replace(this.keyPrefix, ''));
    });
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.publisher) {
      this.publisher = this.client.duplicate();
    }

    return this.executeCommand('PUBLISH', async () => {
      const prefixedChannel = this.prefixKey(channel);
      return this.publisher!.publish(prefixedChannel, message);
    });
  }

  /**
   * Subscribe to channel
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    if (!this.subscriber) {
      this.subscriber = this.client.duplicate();

      this.subscriber.on('message', (chan, message) => {
        const unprefixedChannel = chan.replace(this.keyPrefix, '');
        logger.debug('Received message', { channel: unprefixedChannel });
        callback(message);
      });
    }

    const prefixedChannel = this.prefixKey(channel);
    await this.subscriber.subscribe(prefixedChannel);

    logger.info('Subscribed to channel', { channel });
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    const prefixedChannel = this.prefixKey(channel);
    await this.subscriber.unsubscribe(prefixedChannel);

    logger.info('Unsubscribed from channel', { channel });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();

    try {
      await this.client.ping();
      const latency = Date.now() - start;

      logger.debug('Redis health check passed', { latency });
      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - start;
      logger.error('Redis health check failed', { error, latency });

      return {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the underlying client (for advanced use cases)
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let redisService: RedisService | null = null;

export function initializeRedisService(config: RedisConfig): RedisService {
  if (redisService) {
    logger.warn('Redis service already initialized, returning existing instance');
    return redisService;
  }

  redisService = new RedisService(config);
  return redisService;
}

export function getRedisService(): RedisService {
  if (!redisService) {
    throw new Error('Redis service not initialized. Call initializeRedisService first.');
  }
  return redisService;
}

export default RedisService;
