/**
 * Channel Types and Interfaces
 *
 * This module defines TypeScript interfaces and types for the multi-channel
 * integration system. All channel adapters must implement the ChannelAdapter
 * interface to ensure consistent behavior across platforms.
 *
 * @author Adverant AI
 * @version 1.0.0
 */

/**
 * Supported channel types
 */
export enum ChannelType {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
  SIGNAL = 'signal',
  TEAMS = 'teams',
  WEB = 'web'
}

/**
 * Channel connection status
 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
  PENDING = 'pending'
}

/**
 * Message type enumeration
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
  REACTION = 'reaction'
}

/**
 * Internal message format (normalized across all channels)
 */
export interface InternalMessage {
  messageId: string;
  channelType: ChannelType;
  channelMessageId: string;  // Platform-specific message ID
  sessionId?: string;

  // Sender information
  senderId: string;  // Platform-specific user ID
  senderName?: string;
  senderUsername?: string;

  // Content
  type: MessageType;
  content: string;  // Text content or caption
  media?: MessageMedia;

  // Context
  replyTo?: string;  // Message ID being replied to
  threadId?: string;  // Thread/conversation ID

  // Metadata
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Media attachment interface
 */
export interface MessageMedia {
  url?: string;
  buffer?: Buffer;
  mimeType: string;
  filename?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;  // For audio/video
  thumbnail?: string;  // Base64 or URL
}

/**
 * Outgoing message (to be sent to external platform)
 */
export interface OutgoingMessage {
  recipientId: string;  // Platform-specific recipient ID
  type: MessageType;
  content: string;
  media?: MessageMedia;

  // Optional features
  replyTo?: string;
  buttons?: MessageButton[];
  keyboard?: MessageKeyboard;
  embed?: MessageEmbed;  // For Discord, Slack

  metadata?: Record<string, any>;
}

/**
 * Message button (for interactive messages)
 */
export interface MessageButton {
  id: string;
  label: string;
  url?: string;
  callback?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
}

/**
 * Message keyboard (for Telegram, WhatsApp)
 */
export interface MessageKeyboard {
  buttons: MessageButton[][];
  inline?: boolean;
  oneTime?: boolean;
}

/**
 * Rich embed (for Discord, Slack)
 */
export interface MessageEmbed {
  title?: string;
  description?: string;
  color?: string;
  author?: {
    name: string;
    iconUrl?: string;
    url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  thumbnail?: string;
  image?: string;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  timestamp?: Date;
}

/**
 * Channel configuration (stored in database)
 */
export interface ChannelConfig {
  channelId: string;
  userId: string;
  organizationId: string;

  channelType: ChannelType;
  channelIdentifier: string;  // Phone number, bot token, webhook URL
  channelName?: string;

  // Channel-specific config (encrypted in database)
  config: Record<string, any>;

  // Webhook configuration
  webhookUrl?: string;
  webhookSecret?: string;

  // Status
  active: boolean;
  verified: boolean;
  connectionStatus: ConnectionStatus;
  lastError?: string;

  // Usage tracking
  messageCount: number;
  lastMessageAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  verifiedAt?: Date;
}

/**
 * Channel adapter initialization options
 */
export interface ChannelAdapterOptions {
  config: ChannelConfig;
  logger: any;  // Logger instance
  database: any;  // Database service
  onMessage: (message: InternalMessage) => Promise<void>;
  onStatusChange: (status: ConnectionStatus, error?: string) => Promise<void>;
}

/**
 * Channel adapter statistics
 */
export interface ChannelStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  lastActivity?: Date;
  uptime: number;  // Milliseconds
}

/**
 * Main channel adapter interface
 * All channel adapters must implement this interface
 */
export interface ChannelAdapter {
  /**
   * Initialize the channel adapter
   */
  initialize(options: ChannelAdapterOptions): Promise<void>;

  /**
   * Connect to the external platform
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the external platform
   */
  disconnect(): Promise<void>;

  /**
   * Send a message through this channel
   */
  sendMessage(message: OutgoingMessage): Promise<string>;  // Returns platform message ID

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus;

  /**
   * Get channel statistics
   */
  getStats(): ChannelStats;

  /**
   * Handle incoming webhook (if applicable)
   */
  handleWebhook?(body: any, headers: Record<string, string>): Promise<void>;

  /**
   * Verify webhook signature (if applicable)
   */
  verifyWebhookSignature?(body: any, signature: string): boolean;
}

/**
 * WhatsApp-specific configuration
 */
export interface WhatsAppConfig {
  phoneNumber: string;
  sessionId: string;  // Unique session identifier
  qrCode?: string;  // Base64 QR code for authentication
  authState?: any;  // Baileys auth state (encrypted)
  webhookVerifyToken?: string;
}

/**
 * Telegram-specific configuration
 */
export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  allowedUpdates?: string[];
}

/**
 * Discord-specific configuration
 */
export interface DiscordConfig {
  botToken: string;
  applicationId: string;
  guildId?: string;  // Optional server ID
  intents: string[];  // Discord intents
}

/**
 * Slack-specific configuration
 */
export interface SlackConfig {
  botToken: string;
  appToken?: string;  // For socket mode
  signingSecret: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  teamId?: string;
  enterpriseId?: string;
}

/**
 * Channel registration request
 */
export interface ChannelRegistration {
  channelType: ChannelType;
  channelIdentifier: string;
  channelName?: string;
  config: Record<string, any>;
  webhookUrl?: string;
}

/**
 * Channel update request
 */
export interface ChannelUpdate {
  channelName?: string;
  config?: Record<string, any>;
  active?: boolean;
  webhookUrl?: string;
}

/**
 * Channel event types
 */
export enum ChannelEvent {
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_FAILED = 'message.failed',
  CONNECTION_ESTABLISHED = 'connection.established',
  CONNECTION_LOST = 'connection.lost',
  ERROR = 'error',
  READY = 'ready'
}

/**
 * Channel event payload
 */
export interface ChannelEventPayload {
  event: ChannelEvent;
  channelId: string;
  channelType: ChannelType;
  timestamp: Date;
  data?: any;
  error?: string;
}

/**
 * Rate limit configuration per channel type
 */
export interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  burstLimit: number;  // Max messages in burst
  burstWindowMs: number;  // Burst window in milliseconds
}

/**
 * Default rate limits per channel type
 */
export const CHANNEL_RATE_LIMITS: Record<ChannelType, RateLimitConfig> = {
  [ChannelType.WHATSAPP]: {
    maxMessagesPerMinute: 20,
    maxMessagesPerHour: 1000,
    maxMessagesPerDay: 10000,
    burstLimit: 5,
    burstWindowMs: 1000
  },
  [ChannelType.TELEGRAM]: {
    maxMessagesPerMinute: 30,
    maxMessagesPerHour: 1500,
    maxMessagesPerDay: 20000,
    burstLimit: 10,
    burstWindowMs: 1000
  },
  [ChannelType.DISCORD]: {
    maxMessagesPerMinute: 50,
    maxMessagesPerHour: 2000,
    maxMessagesPerDay: 30000,
    burstLimit: 5,
    burstWindowMs: 1000
  },
  [ChannelType.SLACK]: {
    maxMessagesPerMinute: 60,
    maxMessagesPerHour: 3000,
    maxMessagesPerDay: 50000,
    burstLimit: 10,
    burstWindowMs: 1000
  },
  [ChannelType.SIGNAL]: {
    maxMessagesPerMinute: 20,
    maxMessagesPerHour: 800,
    maxMessagesPerDay: 5000,
    burstLimit: 5,
    burstWindowMs: 1000
  },
  [ChannelType.TEAMS]: {
    maxMessagesPerMinute: 40,
    maxMessagesPerHour: 2000,
    maxMessagesPerDay: 25000,
    burstLimit: 10,
    burstWindowMs: 1000
  },
  [ChannelType.WEB]: {
    maxMessagesPerMinute: 100,
    maxMessagesPerHour: 5000,
    maxMessagesPerDay: 100000,
    burstLimit: 20,
    burstWindowMs: 1000
  }
};
