/**
 * Channel Manager
 *
 * This module provides central management for all messaging channel adapters.
 * It handles channel registration, lifecycle management, message routing,
 * and coordination between different messaging platforms.
 *
 * Features:
 * - Register/unregister channels dynamically
 * - Route messages to appropriate adapter
 * - Handle channel lifecycle (connect/disconnect/reconnect)
 * - Store channel configurations in database
 * - Monitor channel health and status
 * - Rate limiting per channel type
 * - Message queuing for reliability
 *
 * @author Adverant AI
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import {
  ChannelAdapter,
  ChannelConfig,
  ChannelType,
  ConnectionStatus,
  InternalMessage,
  OutgoingMessage,
  ChannelRegistration,
  ChannelUpdate,
  CHANNEL_RATE_LIMITS,
  ChannelAdapterOptions,
  ChannelEvent,
  ChannelEventPayload
} from '../types/channel.types';

import { WhatsAppAdapter } from './whatsapp-adapter';
import { TelegramAdapter } from './telegram-adapter';
import { DiscordAdapter } from './discord-adapter';
import { SlackAdapter } from './slack-adapter';
import { WebAdapter } from './web-adapter';
import { ChannelRepository } from '../database/repositories/channel-repository';

/**
 * Channel manager initialization options
 */
interface ChannelManagerOptions {
  database: Pool;
  logger: any;
  onMessage: (channelId: string, message: InternalMessage) => Promise<void>;
  skillExecutor?: any;
}

/**
 * Central channel manager
 */
export class ChannelManager extends EventEmitter {
  private adapters: Map<string, ChannelAdapter> = new Map();
  private configs: Map<string, ChannelConfig> = new Map();
  private rateLimiters: Map<ChannelType, RateLimiterMemory> = new Map();
  private messageQueues: Map<string, OutgoingMessage[]> = new Map();

  private repository: ChannelRepository;
  private options!: ChannelManagerOptions;
  private isInitialized: boolean = false;

  // Health monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // 1 minute

  constructor() {
    super();
    this.repository = null as any; // Will be initialized in initialize()
  }

  /**
   * Initialize the channel manager
   */
  async initialize(options: ChannelManagerOptions): Promise<void> {
    this.options = options;
    this.repository = new ChannelRepository(options.database);

    // Setup rate limiters for each channel type
    this.setupRateLimiters();

    // Start health monitoring
    this.startHealthMonitoring();

    this.isInitialized = true;
    this.options.logger.info('Channel manager initialized');
  }

  /**
   * Setup rate limiters for each channel type
   */
  private setupRateLimiters(): void {
    for (const [channelType, limits] of Object.entries(CHANNEL_RATE_LIMITS)) {
      const rateLimiter = new RateLimiterMemory({
        points: limits.maxMessagesPerMinute,
        duration: 60, // 1 minute
        blockDuration: 60 // Block for 1 minute if exceeded
      });

      this.rateLimiters.set(channelType as ChannelType, rateLimiter);
    }

    this.options.logger.info('Rate limiters configured for all channel types');
  }

  /**
   * Register a new channel
   */
  async registerChannel(
    userId: string,
    organizationId: string,
    registration: ChannelRegistration
  ): Promise<ChannelConfig> {
    this.options.logger.info('Registering new channel', {
      userId,
      organizationId,
      channelType: registration.channelType
    });

    try {
      // Check if channel already exists
      const existing = await this.repository.findByTypeAndIdentifier(
        organizationId,
        registration.channelType,
        registration.channelIdentifier
      );

      if (existing) {
        throw new Error(`Channel ${registration.channelType} with identifier ${registration.channelIdentifier} already registered`);
      }

      // Create channel in database
      const config = await this.repository.create(
        userId,
        organizationId,
        registration.channelType,
        registration.channelIdentifier,
        registration.channelName,
        registration.config,
        registration.webhookUrl
      );

      this.configs.set(config.channelId, config);

      // Create and initialize adapter
      const adapter = await this.createAdapter(config);
      this.adapters.set(config.channelId, adapter);

      // Connect the adapter
      await adapter.connect();

      this.options.logger.info('Channel registered successfully', {
        channelId: config.channelId,
        channelType: config.channelType
      });

      this.emitChannelEvent({
        event: ChannelEvent.CONNECTION_ESTABLISHED,
        channelId: config.channelId,
        channelType: config.channelType,
        timestamp: new Date()
      });

      return config;

    } catch (error) {
      this.options.logger.error('Failed to register channel', {
        error,
        userId,
        channelType: registration.channelType
      });
      throw error;
    }
  }

  /**
   * Create adapter instance for channel type
   */
  private async createAdapter(config: ChannelConfig): Promise<ChannelAdapter> {
    let adapter: ChannelAdapter;

    switch (config.channelType) {
      case ChannelType.WHATSAPP:
        adapter = new WhatsAppAdapter();
        break;

      case ChannelType.TELEGRAM:
        adapter = new TelegramAdapter();
        break;

      case ChannelType.DISCORD:
        adapter = new DiscordAdapter();
        break;

      case ChannelType.SLACK:
        adapter = new SlackAdapter();
        break;

      case ChannelType.WEB:
        adapter = new WebAdapter();
        break;

      default:
        throw new Error(`Unsupported channel type: ${config.channelType}`);
    }

    const adapterOptions: ChannelAdapterOptions = {
      config,
      logger: this.options.logger,
      database: this.options.database,
      onMessage: async (message: InternalMessage) => {
        await this.handleIncomingMessage(config.channelId, message);
      },
      onStatusChange: async (status: ConnectionStatus, error?: string) => {
        await this.handleStatusChange(config.channelId, status, error);
      }
    };

    await adapter.initialize(adapterOptions);

    return adapter;
  }

  /**
   * Handle incoming message from adapter
   */
  private async handleIncomingMessage(
    channelId: string,
    message: InternalMessage
  ): Promise<void> {
    try {
      this.options.logger.info('Message received from channel', {
        channelId,
        messageId: message.messageId,
        type: message.type
      });

      // Update message count in database
      const config = this.configs.get(channelId);
      if (config) {
        await this.repository.incrementMessageCount(channelId, config.organizationId);
      }

      // Emit event
      this.emitChannelEvent({
        event: ChannelEvent.MESSAGE_RECEIVED,
        channelId,
        channelType: message.channelType,
        timestamp: new Date(),
        data: { messageId: message.messageId }
      });

      // Forward to main handler
      await this.options.onMessage(channelId, message);

    } catch (error) {
      this.options.logger.error('Failed to handle incoming message', {
        error,
        channelId,
        messageId: message.messageId
      });
    }
  }

  /**
   * Handle channel status change
   */
  private async handleStatusChange(
    channelId: string,
    status: ConnectionStatus,
    error?: string
  ): Promise<void> {
    try {
      const config = this.configs.get(channelId);
      if (!config) return;

      this.options.logger.info('Channel status changed', {
        channelId,
        status,
        error
      });

      // Update status in database
      await this.repository.updateStatus(
        channelId,
        config.organizationId,
        status,
        error
      );

      // Update local config
      config.connectionStatus = status;
      config.lastError = error;

      // Emit event
      const event = status === ConnectionStatus.CONNECTED
        ? ChannelEvent.CONNECTION_ESTABLISHED
        : ChannelEvent.CONNECTION_LOST;

      this.emitChannelEvent({
        event,
        channelId,
        channelType: config.channelType,
        timestamp: new Date(),
        error
      });

    } catch (err) {
      this.options.logger.error('Failed to handle status change', {
        error: err,
        channelId,
        status
      });
    }
  }

  /**
   * Send message through a channel
   */
  async sendMessage(
    channelId: string,
    message: OutgoingMessage
  ): Promise<string> {
    const adapter = this.adapters.get(channelId);
    const config = this.configs.get(channelId);

    if (!adapter || !config) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(config.channelType);
    if (rateLimiter) {
      try {
        await rateLimiter.consume(channelId, 1);
      } catch (error) {
        this.options.logger.warn('Rate limit exceeded', {
          channelId,
          channelType: config.channelType
        });

        // Queue message for later
        this.queueMessage(channelId, message);
        throw new Error('Rate limit exceeded. Message queued.');
      }
    }

    try {
      const messageId = await adapter.sendMessage(message);

      this.options.logger.info('Message sent through channel', {
        channelId,
        messageId,
        type: message.type
      });

      this.emitChannelEvent({
        event: ChannelEvent.MESSAGE_SENT,
        channelId,
        channelType: config.channelType,
        timestamp: new Date(),
        data: { messageId }
      });

      return messageId;

    } catch (error) {
      this.options.logger.error('Failed to send message', {
        error,
        channelId,
        recipientId: message.recipientId
      });

      this.emitChannelEvent({
        event: ChannelEvent.MESSAGE_FAILED,
        channelId,
        channelType: config.channelType,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Send failed'
      });

      throw error;
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(channelId: string, message: OutgoingMessage): void {
    if (!this.messageQueues.has(channelId)) {
      this.messageQueues.set(channelId, []);
    }

    const queue = this.messageQueues.get(channelId)!;
    queue.push(message);

    this.options.logger.info('Message queued', {
      channelId,
      queueLength: queue.length
    });

    // Process queue after delay
    setTimeout(() => {
      this.processQueue(channelId);
    }, 60000); // 1 minute
  }

  /**
   * Process queued messages
   */
  private async processQueue(channelId: string): Promise<void> {
    const queue = this.messageQueues.get(channelId);
    if (!queue || queue.length === 0) return;

    this.options.logger.info('Processing message queue', {
      channelId,
      queueLength: queue.length
    });

    while (queue.length > 0) {
      const message = queue.shift()!;

      try {
        await this.sendMessage(channelId, message);
      } catch (error) {
        // If still rate limited, put back in queue
        if (error instanceof Error && error.message.includes('Rate limit')) {
          queue.unshift(message);
          break;
        }

        this.options.logger.error('Failed to send queued message', {
          error,
          channelId
        });
      }

      // Delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Update channel configuration
   */
  async updateChannel(
    channelId: string,
    organizationId: string,
    update: ChannelUpdate
  ): Promise<ChannelConfig> {
    const config = this.configs.get(channelId);
    if (!config) {
      throw new Error(`Channel ${channelId} not found`);
    }

    this.options.logger.info('Updating channel', { channelId, update });

    // Update in database
    if (update.config) {
      await this.repository.updateConfig(channelId, organizationId, update.config);
      config.config = update.config;
    }

    // Update local config
    if (update.channelName !== undefined) {
      config.channelName = update.channelName;
    }

    this.configs.set(channelId, config);

    return config;
  }

  /**
   * Unregister and disconnect a channel
   */
  async unregisterChannel(
    channelId: string,
    organizationId: string
  ): Promise<void> {
    this.options.logger.info('Unregistering channel', { channelId });

    const adapter = this.adapters.get(channelId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(channelId);
    }

    this.configs.delete(channelId);
    this.messageQueues.delete(channelId);

    await this.repository.deactivate(channelId, organizationId);

    this.options.logger.info('Channel unregistered', { channelId });
  }

  /**
   * Get channel configuration
   */
  getChannel(channelId: string): ChannelConfig | undefined {
    return this.configs.get(channelId);
  }

  /**
   * List all channels for an organization
   */
  async listChannels(
    organizationId: string,
    channelType?: ChannelType
  ): Promise<ChannelConfig[]> {
    return await this.repository.listByOrganization(organizationId, channelType);
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelId: string): ConnectionStatus | undefined {
    const adapter = this.adapters.get(channelId);
    return adapter?.getStatus();
  }

  /**
   * Get channel statistics
   */
  getChannelStats(channelId: string): any {
    const adapter = this.adapters.get(channelId);
    return adapter?.getStats();
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL_MS);

    this.options.logger.info('Health monitoring started');
  }

  /**
   * Perform health check on all channels
   */
  private async performHealthCheck(): Promise<void> {
    for (const [channelId, adapter] of this.adapters) {
      try {
        const status = adapter.getStatus();
        const config = this.configs.get(channelId);

        if (!config) continue;

        // If disconnected unexpectedly, attempt reconnect
        if (status === ConnectionStatus.DISCONNECTED && config.active) {
          this.options.logger.warn('Channel disconnected unexpectedly, reconnecting...', {
            channelId,
            channelType: config.channelType
          });

          await adapter.connect();
        }

        // Update stats
        const stats = adapter.getStats();
        this.options.logger.debug('Channel health check', {
          channelId,
          status,
          stats
        });

      } catch (error) {
        this.options.logger.error('Health check failed', {
          error,
          channelId
        });
      }
    }
  }

  /**
   * Emit channel event
   */
  private emitChannelEvent(payload: ChannelEventPayload): void {
    this.emit('channel-event', payload);
  }

  /**
   * Shutdown all channels
   */
  async shutdown(): Promise<void> {
    this.options.logger.info('Shutting down channel manager...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Disconnect all adapters
    const disconnectPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.disconnect().catch(err => {
        this.options.logger.error('Error disconnecting adapter', { error: err });
      })
    );

    await Promise.all(disconnectPromises);

    this.adapters.clear();
    this.configs.clear();
    this.messageQueues.clear();

    this.options.logger.info('Channel manager shutdown complete');
  }
}
