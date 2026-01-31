/**
 * Redis Service - Caching and pub/sub functionality
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.client = new Redis(url);
      this.subscriber = this.client.duplicate();

      this.client.on('error', (err) => logger.error('Redis client error', { error: err }));
      this.subscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err }));

      await this.client.ping();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  getSubscriber(): Redis | null {
    return this.subscriber;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }
}

export const redisService = new RedisService();
