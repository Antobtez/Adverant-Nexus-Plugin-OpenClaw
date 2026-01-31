/**
 * Session Manager
 *
 * Provides:
 * - Create/update/delete sessions
 * - Session expiration handling
 * - Message history storage
 * - Multi-tenant isolation
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { RedisService } from '../database/redis.service';
import { DatabaseService } from '../database/database.service';
import { sessionsActive, sessionsTotal, sessionDuration } from '../utils/metrics';

const logger = createLogger({ component: 'session-manager' });

export interface Session {
  sessionId: string;
  organizationId: string;
  userId: string;
  tier: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'inactive' | 'expired';
}

export interface Message {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CreateSessionOptions {
  organizationId: string;
  userId: string;
  tier: string;
  metadata?: Record<string, any>;
  ttl?: number; // Session TTL in seconds
}

export interface SessionWithMessages extends Session {
  messages: Message[];
}

export class SessionManager {
  private redis: RedisService;
  private db: DatabaseService;
  private readonly SESSION_PREFIX = 'session:';
  private readonly MESSAGES_PREFIX = 'messages:';
  private readonly ORG_SESSIONS_PREFIX = 'org:sessions:';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours

  constructor(redis: RedisService, db: DatabaseService) {
    this.redis = redis;
    this.db = db;
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();
    const ttl = options.ttl || this.DEFAULT_TTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const session: Session = {
      sessionId,
      organizationId: options.organizationId,
      userId: options.userId,
      tier: options.tier,
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      status: 'active',
    };

    try {
      // Store in database
      await this.db.query(
        `
        INSERT INTO openclaw_sessions (
          session_id, organization_id, user_id, tier, metadata,
          created_at, updated_at, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          session.sessionId,
          session.organizationId,
          session.userId,
          session.tier,
          JSON.stringify(session.metadata || {}),
          session.createdAt,
          session.updatedAt,
          session.expiresAt,
          session.status,
        ]
      );

      // Store in Redis for quick access
      await this.redis.setJSON(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        ttl
      );

      // Add to organization's session set
      await this.redis.sadd(
        `${this.ORG_SESSIONS_PREFIX}${options.organizationId}`,
        sessionId
      );

      // Update metrics
      sessionsTotal.inc({
        organization_id: options.organizationId,
        tier: options.tier,
      });

      sessionsActive.inc({
        organization_id: options.organizationId,
        tier: options.tier,
      });

      logger.info('Session created', {
        sessionId,
        organizationId: options.organizationId,
        userId: options.userId,
        tier: options.tier,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create session', {
        error,
        organizationId: options.organizationId,
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      // Try Redis first
      const cached = await this.redis.getJSON<Session>(
        `${this.SESSION_PREFIX}${sessionId}`
      );

      if (cached) {
        return cached;
      }

      // Fall back to database
      const result = await this.db.queryOne<any>(
        `
        SELECT * FROM openclaw_sessions
        WHERE session_id = $1
        `,
        [sessionId]
      );

      if (!result) {
        return null;
      }

      const session: Session = {
        sessionId: result.session_id,
        organizationId: result.organization_id,
        userId: result.user_id,
        tier: result.tier,
        metadata: result.metadata,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
        expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
        status: result.status,
      };

      // Cache in Redis
      if (session.expiresAt) {
        const ttl = Math.max(
          0,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
        );
        if (ttl > 0) {
          await this.redis.setJSON(
            `${this.SESSION_PREFIX}${sessionId}`,
            session,
            ttl
          );
        }
      }

      return session;
    } catch (error) {
      logger.error('Failed to get session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<Session, 'sessionId' | 'organizationId' | 'createdAt'>>
  ): Promise<Session | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      const updatedSession: Session = {
        ...session,
        ...updates,
        updatedAt: new Date(),
      };

      // Update database
      await this.db.query(
        `
        UPDATE openclaw_sessions
        SET metadata = $1, updated_at = $2, expires_at = $3, status = $4
        WHERE session_id = $5
        `,
        [
          JSON.stringify(updatedSession.metadata || {}),
          updatedSession.updatedAt,
          updatedSession.expiresAt,
          updatedSession.status,
          sessionId,
        ]
      );

      // Update Redis
      if (updatedSession.expiresAt) {
        const ttl = Math.max(
          0,
          Math.floor((updatedSession.expiresAt.getTime() - Date.now()) / 1000)
        );
        if (ttl > 0) {
          await this.redis.setJSON(
            `${this.SESSION_PREFIX}${sessionId}`,
            updatedSession,
            ttl
          );
        }
      } else {
        await this.redis.setJSON(
          `${this.SESSION_PREFIX}${sessionId}`,
          updatedSession
        );
      }

      logger.info('Session updated', { sessionId });

      return updatedSession;
    } catch (error) {
      logger.error('Failed to update session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Calculate session duration for metrics
      const duration = (Date.now() - session.createdAt.getTime()) / 1000;
      sessionDuration.observe(
        {
          organization_id: session.organizationId,
          tier: session.tier,
        },
        duration
      );

      // Delete from database
      await this.db.query(
        `DELETE FROM openclaw_sessions WHERE session_id = $1`,
        [sessionId]
      );

      // Delete from Redis
      await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);

      // Remove from organization's session set
      await this.redis.srem(
        `${this.ORG_SESSIONS_PREFIX}${session.organizationId}`,
        sessionId
      );

      // Delete messages
      await this.redis.del(`${this.MESSAGES_PREFIX}${sessionId}`);

      // Update metrics
      sessionsActive.dec({
        organization_id: session.organizationId,
        tier: session.tier,
      });

      logger.info('Session deleted', { sessionId, duration });

      return true;
    } catch (error) {
      logger.error('Failed to delete session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<Message> {
    const messageId = uuidv4();
    const now = new Date();

    const message: Message = {
      messageId,
      sessionId,
      role,
      content,
      timestamp: now,
      metadata,
    };

    try {
      // Store in database
      await this.db.query(
        `
        INSERT INTO openclaw_messages (
          message_id, session_id, role, content, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          message.messageId,
          message.sessionId,
          message.role,
          message.content,
          message.timestamp,
          JSON.stringify(message.metadata || {}),
        ]
      );

      // Append to Redis list
      await this.redis.getClient().rpush(
        this.redis['prefixKey'](`${this.MESSAGES_PREFIX}${sessionId}`),
        JSON.stringify(message)
      );

      // Update session timestamp
      await this.updateSession(sessionId, {});

      logger.debug('Message added to session', { sessionId, messageId, role });

      return message;
    } catch (error) {
      logger.error('Failed to add message', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get messages for session
   */
  async getMessages(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    try {
      // Try Redis first
      const cachedMessages = await this.redis.getClient().lrange(
        this.redis['prefixKey'](`${this.MESSAGES_PREFIX}${sessionId}`),
        offset || 0,
        limit ? (offset || 0) + limit - 1 : -1
      );

      if (cachedMessages.length > 0) {
        return cachedMessages.map((msg) => JSON.parse(msg));
      }

      // Fall back to database
      const query = limit
        ? `
          SELECT * FROM openclaw_messages
          WHERE session_id = $1
          ORDER BY timestamp ASC
          LIMIT $2 OFFSET $3
        `
        : `
          SELECT * FROM openclaw_messages
          WHERE session_id = $1
          ORDER BY timestamp ASC
        `;

      const params = limit ? [sessionId, limit, offset || 0] : [sessionId];
      const results = await this.db.queryMany<any>(query, params);

      const messages: Message[] = results.map((row) => ({
        messageId: row.message_id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata,
      }));

      return messages;
    } catch (error) {
      logger.error('Failed to get messages', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get sessions for organization
   */
  async getOrganizationSessions(
    organizationId: string,
    status?: 'active' | 'inactive' | 'expired'
  ): Promise<Session[]> {
    try {
      const query = status
        ? `
          SELECT * FROM openclaw_sessions
          WHERE organization_id = $1 AND status = $2
          ORDER BY created_at DESC
        `
        : `
          SELECT * FROM openclaw_sessions
          WHERE organization_id = $1
          ORDER BY created_at DESC
        `;

      const params = status ? [organizationId, status] : [organizationId];
      const results = await this.db.queryMany<any>(query, params);

      return results.map((row) => ({
        sessionId: row.session_id,
        organizationId: row.organization_id,
        userId: row.user_id,
        tier: row.tier,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        status: row.status,
      }));
    } catch (error) {
      logger.error('Failed to get organization sessions', {
        error,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Expire old sessions
   */
  async expireOldSessions(): Promise<number> {
    try {
      const result = await this.db.query(
        `
        UPDATE openclaw_sessions
        SET status = 'expired'
        WHERE expires_at < NOW() AND status = 'active'
        RETURNING session_id, organization_id, tier
        `
      );

      for (const row of result.rows) {
        // Update metrics
        sessionsActive.dec({
          organization_id: row.organization_id,
          tier: row.tier,
        });

        // Delete from Redis
        await this.redis.del(`${this.SESSION_PREFIX}${row.session_id}`);
      }

      logger.info('Expired old sessions', { count: result.rowCount });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to expire old sessions', { error });
      throw error;
    }
  }

  /**
   * Get session with messages
   */
  async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const messages = await this.getMessages(sessionId);

    return {
      ...session,
      messages,
    };
  }

  /**
   * Get active session count for organization
   */
  async getActiveSessionCount(organizationId: string): Promise<number> {
    try {
      const result = await this.db.queryOne<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM openclaw_sessions
        WHERE organization_id = $1 AND status = 'active'
        `,
        [organizationId]
      );

      return result ? parseInt(result.count, 10) : 0;
    } catch (error) {
      logger.error('Failed to get active session count', {
        error,
        organizationId,
      });
      throw error;
    }
  }
}

export default SessionManager;
