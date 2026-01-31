/**
 * Channel Adapters - Public API
 *
 * This module exports all channel adapters and the channel manager
 * for use in the OpenClaw application.
 *
 * @author Adverant AI
 * @version 1.0.0
 */

export { ChannelManager } from './channel-manager';
export { WhatsAppAdapter } from './whatsapp-adapter';
export { TelegramAdapter } from './telegram-adapter';
export { DiscordAdapter } from './discord-adapter';
export { SlackAdapter } from './slack-adapter';
export { WebAdapter } from './web-adapter';

export * from '../types/channel.types';
