/**
 * OpenClaw WebSocket Gateway
 *
 * This module implements the real-time WebSocket gateway for the OpenClaw plugin.
 * It uses Socket.IO with a Redis adapter to enable horizontal scaling across
 * multiple pod replicas in Kubernetes.
 *
 * Features:
 * - Multi-tenant session isolation via organization rooms
 * - JWT authentication for all connections
 * - Redis adapter for multi-pod WebSocket communication
 * - Rate limiting per tier quotas
 * - Event-driven architecture for skill execution and session management
 * - Graceful connection handling and shutdown
 *
 * @author Adverant AI
 * @version 1.0.0
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import http from 'http';

// Internal imports
import { NexusAuthClient } from '../auth/nexus-auth-client';
import { SessionManager } from './session-manager';
import { SkillExecutor } from '../skills/skill-executor';
import { QuotaEnforcer } from '../middleware/quota-enforcer';
import { Logger } from '../utils/logger';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

/**
 * WebSocket event types
 */
export enum WebSocketEvent {
  // Session events
  SESSION_CREATE = 'session.create',
  SESSION_CREATED = 'session.created',
  SESSION_UPDATE = 'session.update',
  SESSION_UPDATED = 'session.updated',
  SESSION_DELETE = 'session.delete',
  SESSION_DELETED = 'session.deleted',

  // Skill execution events
  SKILL_EXECUTE = 'skill.execute',
  SKILL_STARTED = 'skill.started',
  SKILL_PROGRESS = 'skill.progress',
  SKILL_COMPLETED = 'skill.completed',
  SKILL_ERROR = 'skill.error',

  // Message events
  MESSAGE_SEND = 'message.send',
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_TYPING = 'message.typing',

  // Cron job events
  CRON_CREATE = 'cron.create',
  CRON_CREATED = 'cron.created',
  CRON_TRIGGERED = 'cron.triggered',
  CRON_COMPLETED = 'cron.completed',
  CRON_FAILED = 'cron.failed',

  // Channel events
  CHANNEL_CONNECT = 'channel.connect',
  CHANNEL_CONNECTED = 'channel.connected',
  CHANNEL_DISCONNECT = 'channel.disconnect',
  CHANNEL_DISCONNECTED = 'channel.disconnected',

  // Quota events
  QUOTA_WARNING = 'quota.warning',
  QUOTA_EXCEEDED = 'quota.exceeded',

  // Error events
  ERROR = 'error',
  UNAUTHORIZED = 'unauthorized'
}

/**
 * Socket data interface (attached to each socket connection)
 */
interface SocketData {
  userId: string;
  organizationId: string;
  tier: string;
  sessionId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * Gateway initialization options
 */
interface GatewayOptions {
  redis: RedisService;
  database: DatabaseService;
  logger: Logger;
}

/**
 * OpenClaw WebSocket Gateway
 * Manages all real-time WebSocket connections and events
 */
export class OpenClawGateway {
  private io: SocketIOServer | null = null;
  private authClient: NexusAuthClient;
  private sessionManager: SessionManager;
  private skillExecutor: SkillExecutor;
  private quotaEnforcer: QuotaEnforcer;
  private redis: RedisService | null = null;
  private database: DatabaseService | null = null;
  private logger: Logger | null = null;
  private isReady: boolean = false;

  // Metrics
  private connectionCount: number = 0;
  private messageCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.authClient = new NexusAuthClient();
    this.sessionManager = new SessionManager();
    this.skillExecutor = new SkillExecutor();
    this.quotaEnforcer = new QuotaEnforcer();
  }

  /**
   * Initialize the WebSocket gateway
   */
  async initialize(
    httpServer: http.Server,
    options: GatewayOptions
  ): Promise<void> {
    this.redis = options.redis;
    this.database = options.database;
    this.logger = options.logger;

    this.logger.info('Initializing WebSocket gateway...');

    try {
      // Create Socket.IO server
      this.io = new SocketIOServer(httpServer, {
        path: '/openclaw/ws',
        cors: {
          origin: '*',  // CORS will be handled by Istio VirtualService
          credentials: true,
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 1e6  // 1MB max message size
      });

      // Configure Redis adapter for multi-pod scaling
      await this.setupRedisAdapter();

      // Configure middleware
      this.setupMiddleware();

      // Setup event handlers
      this.setupEventHandlers();

      // Initialize session manager
      await this.sessionManager.initialize(this.database, this.logger);

      // Initialize skill executor
      await this.skillExecutor.initialize(this.database, this.logger);

      // Initialize quota enforcer
      await this.quotaEnforcer.initialize(this.redis, this.logger);

      this.isReady = true;
      this.logger.info('WebSocket gateway initialized successfully');

    } catch (error) {
      this.logger?.error('Failed to initialize WebSocket gateway', { error });
      throw error;
    }
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    if (!this.io || !this.redis) {
      throw new Error('Cannot setup Redis adapter: IO or Redis not initialized');
    }

    this.logger?.info('Setting up Redis adapter for multi-pod scaling...');

    // Create Redis pub/sub clients
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();

    // Create and attach adapter
    this.io.adapter(createAdapter(pubClient, subClient));

    this.logger?.info('Redis adapter configured successfully');
  }

  /**
   * Setup authentication and authorization middleware
   */
  private setupMiddleware(): void {
    if (!this.io) {
      throw new Error('Cannot setup middleware: IO not initialized');
    }

    // JWT authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          this.logger?.warn('WebSocket connection attempted without token', {
            socketId: socket.id,
            ip: socket.handshake.address
          });
          return next(new Error('Authentication required'));
        }

        // Validate JWT token
        const user = await this.authClient.validateToken(token as string);

        // Attach user data to socket
        socket.data = {
          userId: user.userId,
          organizationId: user.organizationId,
          tier: user.tier || 'open_source',
          connectedAt: new Date(),
          lastActivity: new Date()
        } as SocketData;

        this.logger?.info('WebSocket connection authenticated', {
          socketId: socket.id,
          userId: user.userId,
          organizationId: user.organizationId,
          tier: user.tier
        });

        next();

      } catch (error) {
        this.logger?.error('WebSocket authentication failed', {
          error,
          socketId: socket.id
        });
        next(new Error('Invalid or expired token'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const data = socket.data as SocketData;

        // Check connection quota
        const canConnect = await this.quotaEnforcer.checkConnectionQuota(
          data.organizationId,
          data.tier
        );

        if (!canConnect) {
          this.logger?.warn('WebSocket connection rejected: quota exceeded', {
            organizationId: data.organizationId,
            tier: data.tier
          });
          return next(new Error('Connection quota exceeded for your tier'));
        }

        next();

      } catch (error) {
        this.logger?.error('Rate limiting middleware error', { error });
        next(error as Error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) {
      throw new Error('Cannot setup event handlers: IO not initialized');
    }

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    const data = socket.data as SocketData;

    this.connectionCount++;
    this.logger?.info('Client connected', {
      socketId: socket.id,
      userId: data.userId,
      organizationId: data.organizationId,
      totalConnections: this.connectionCount
    });

    // Join organization room for multi-tenant isolation
    socket.join(`org:${data.organizationId}`);

    // Join user room for user-specific events
    socket.join(`user:${data.userId}`);

    // Session management events
    socket.on(WebSocketEvent.SESSION_CREATE, (payload) => this.handleSessionCreate(socket, payload));
    socket.on(WebSocketEvent.SESSION_UPDATE, (payload) => this.handleSessionUpdate(socket, payload));
    socket.on(WebSocketEvent.SESSION_DELETE, (payload) => this.handleSessionDelete(socket, payload));

    // Skill execution events
    socket.on(WebSocketEvent.SKILL_EXECUTE, (payload) => this.handleSkillExecute(socket, payload));

    // Message events
    socket.on(WebSocketEvent.MESSAGE_SEND, (payload) => this.handleMessageSend(socket, payload));
    socket.on(WebSocketEvent.MESSAGE_TYPING, (payload) => this.handleMessageTyping(socket, payload));

    // Cron job events
    socket.on(WebSocketEvent.CRON_CREATE, (payload) => this.handleCronCreate(socket, payload));

    // Channel events
    socket.on(WebSocketEvent.CHANNEL_CONNECT, (payload) => this.handleChannelConnect(socket, payload));

    // Disconnection
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));

    // Error handling
    socket.on('error', (error) => this.handleError(socket, error));
  }

  /**
   * Handle session creation
   */
  private async handleSessionCreate(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      this.logger?.info('Creating session', {
        userId: data.userId,
        organizationId: data.organizationId,
        channelType: payload.channelType
      });

      // Create session in database
      const session = await this.sessionManager.createSession({
        userId: data.userId,
        organizationId: data.organizationId,
        channelType: payload.channelType,
        channelId: payload.channelId,
        context: payload.context || {}
      });

      // Attach session ID to socket
      data.sessionId = session.session_id;

      // Join session room
      socket.join(`session:${session.session_id}`);

      // Emit success event
      socket.emit(WebSocketEvent.SESSION_CREATED, {
        sessionId: session.session_id,
        channelType: session.channel_type,
        createdAt: session.created_at
      });

      this.logger?.info('Session created successfully', {
        sessionId: session.session_id,
        userId: data.userId
      });

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to create session', {
        error,
        userId: data.userId,
        payload
      });

      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.SESSION_CREATE,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle session update
   */
  private async handleSessionUpdate(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      const session = await this.sessionManager.updateSession(
        payload.sessionId,
        {
          context: payload.context,
          metadata: payload.metadata
        }
      );

      socket.emit(WebSocketEvent.SESSION_UPDATED, {
        sessionId: session.session_id,
        updatedAt: session.last_activity
      });

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to update session', { error, payload });
      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.SESSION_UPDATE,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle session deletion
   */
  private async handleSessionDelete(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      await this.sessionManager.deleteSession(payload.sessionId);

      // Leave session room
      socket.leave(`session:${payload.sessionId}`);

      socket.emit(WebSocketEvent.SESSION_DELETED, {
        sessionId: payload.sessionId
      });

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to delete session', { error, payload });
      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.SESSION_DELETE,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle skill execution request
   */
  private async handleSkillExecute(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      this.logger?.info('Executing skill', {
        skillName: payload.skillName,
        userId: data.userId,
        sessionId: payload.sessionId || data.sessionId
      });

      // Check skill execution quota
      const canExecute = await this.quotaEnforcer.checkSkillQuota(
        data.organizationId,
        data.tier
      );

      if (!canExecute) {
        socket.emit(WebSocketEvent.QUOTA_EXCEEDED, {
          resource: 'skill_executions',
          tier: data.tier
        });
        return;
      }

      // Emit skill started event
      socket.emit(WebSocketEvent.SKILL_STARTED, {
        skillName: payload.skillName,
        executionId: payload.executionId
      });

      // Execute skill with progress callback
      const result = await this.skillExecutor.execute({
        skillName: payload.skillName,
        params: payload.params,
        userId: data.userId,
        organizationId: data.organizationId,
        sessionId: payload.sessionId || data.sessionId,
        onProgress: (progress) => {
          socket.emit(WebSocketEvent.SKILL_PROGRESS, {
            executionId: payload.executionId,
            progress
          });
        }
      });

      // Emit skill completed event
      socket.emit(WebSocketEvent.SKILL_COMPLETED, {
        executionId: payload.executionId,
        result
      });

      this.messageCount++;

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Skill execution failed', {
        error,
        skillName: payload.skillName,
        userId: data.userId
      });

      socket.emit(WebSocketEvent.SKILL_ERROR, {
        executionId: payload.executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle message send
   */
  private async handleMessageSend(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      // Process message (store in DB, forward to skill, etc.)
      const message = await this.sessionManager.addMessage({
        sessionId: payload.sessionId || data.sessionId,
        userId: data.userId,
        content: payload.content,
        type: payload.type || 'text'
      });

      // Broadcast to session room
      this.io?.to(`session:${payload.sessionId || data.sessionId}`).emit(WebSocketEvent.MESSAGE_RECEIVED, {
        messageId: message.id,
        content: message.content,
        userId: data.userId,
        timestamp: message.created_at
      });

      this.messageCount++;

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to send message', { error, payload });
      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.MESSAGE_SEND,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle typing indicator
   */
  private handleMessageTyping(socket: Socket, payload: any): void {
    const data = socket.data as SocketData;

    // Broadcast typing indicator to session room (except sender)
    socket.to(`session:${payload.sessionId || data.sessionId}`).emit(WebSocketEvent.MESSAGE_TYPING, {
      userId: data.userId,
      isTyping: payload.isTyping
    });
  }

  /**
   * Handle cron job creation
   */
  private async handleCronCreate(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      // Create cron job logic here
      socket.emit(WebSocketEvent.CRON_CREATED, {
        jobId: 'placeholder',
        schedule: payload.schedule
      });

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to create cron job', { error, payload });
      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.CRON_CREATE,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle channel connection
   */
  private async handleChannelConnect(socket: Socket, payload: any): Promise<void> {
    const data = socket.data as SocketData;

    try {
      // Channel connection logic here
      socket.emit(WebSocketEvent.CHANNEL_CONNECTED, {
        channelType: payload.channelType,
        channelId: payload.channelId
      });

    } catch (error) {
      this.errorCount++;
      this.logger?.error('Failed to connect channel', { error, payload });
      socket.emit(WebSocketEvent.ERROR, {
        event: WebSocketEvent.CHANNEL_CONNECT,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(socket: Socket, reason: string): void {
    const data = socket.data as SocketData;

    this.connectionCount--;
    this.logger?.info('Client disconnected', {
      socketId: socket.id,
      userId: data.userId,
      reason,
      totalConnections: this.connectionCount
    });
  }

  /**
   * Handle socket errors
   */
  private handleError(socket: Socket, error: Error): void {
    this.errorCount++;
    this.logger?.error('Socket error', {
      socketId: socket.id,
      error
    });
  }

  /**
   * Broadcast event to organization
   */
  broadcastToOrg(organizationId: string, event: string, data: any): void {
    this.io?.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Broadcast event to user
   */
  broadcastToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast event to session
   */
  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io?.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Check if gateway is ready
   */
  public isGatewayReady(): boolean {
    return this.isReady;
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      connections: this.connectionCount,
      messages: this.messageCount,
      errors: this.errorCount
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger?.info('Shutting down WebSocket gateway...');

    if (this.io) {
      // Close all connections
      this.io.close();
      this.logger?.info('All WebSocket connections closed');
    }

    this.isReady = false;
  }
}
