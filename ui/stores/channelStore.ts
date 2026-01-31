/**
 * Channel Store - Multi-channel integration state management
 * Handles channel configuration, connection status, and setup wizards
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';

export type ChannelType = 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'signal' | 'teams' | 'web';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'pending_auth';

export type SessionScope = 'per-sender' | 'per-channel' | 'global';

export interface ChannelConfig {
  // Common settings
  sessionScope: SessionScope;
  autoReply: boolean;
  welcomeMessage?: string;
  awayMessage?: string;

  // WhatsApp specific
  whatsapp?: {
    phoneNumber?: string;
    businessName?: string;
    profilePicUrl?: string;
    qrCodeData?: string;
    pairingCode?: string;
  };

  // Telegram specific
  telegram?: {
    botToken?: string;
    botUsername?: string;
    webhookUrl?: string;
    allowedChats?: string[];
  };

  // Slack specific
  slack?: {
    workspaceId?: string;
    workspaceName?: string;
    botUserId?: string;
    appId?: string;
    accessToken?: string;
    channels?: string[];
  };

  // Discord specific
  discord?: {
    botToken?: string;
    applicationId?: string;
    guildIds?: string[];
    permissions?: number;
  };

  // Signal specific
  signal?: {
    phoneNumber?: string;
    deviceName?: string;
  };

  // Teams specific
  teams?: {
    tenantId?: string;
    appId?: string;
    botId?: string;
  };

  // Web specific
  web?: {
    widgetId?: string;
    allowedOrigins?: string[];
    theme?: 'light' | 'dark' | 'auto';
  };
}

export interface Channel {
  id: string;
  userId: string;
  organizationId: string;
  type: ChannelType;
  name: string;
  identifier: string; // Phone number, bot username, workspace name, etc.
  config: ChannelConfig;
  connectionStatus: ConnectionStatus;
  lastConnected?: Date;
  lastError?: string;
  messageCount: number;
  sessionCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelStats {
  channelId: string;
  messagesReceived: number;
  messagesSent: number;
  sessionsCreated: number;
  skillsExecuted: number;
  avgResponseTimeMs: number;
  lastActivity?: Date;
}

// Setup wizard state
export type SetupWizardStep =
  | 'select-channel'
  | 'configure'
  | 'authenticate'
  | 'verify'
  | 'complete';

export interface SetupWizardState {
  isOpen: boolean;
  channelType: ChannelType | null;
  currentStep: SetupWizardStep;
  config: Partial<ChannelConfig>;
  error: string | null;
  isLoading: boolean;

  // WhatsApp specific wizard state
  whatsappQrCode?: string;
  whatsappPairingCode?: string;
  whatsappConnectionStatus?: 'waiting' | 'scanning' | 'pairing' | 'connected' | 'error';
}

interface ChannelState {
  // Channels
  channels: Channel[];
  channelsLoading: boolean;
  channelsError: string | null;

  // Selected channel for detail view
  selectedChannelId: string | null;

  // Channel stats
  channelStats: Record<string, ChannelStats>;

  // Setup wizard
  setupWizard: SetupWizardState;

  // Actions - Channels
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setChannelsLoading: (loading: boolean) => void;
  setChannelsError: (error: string | null) => void;

  // Actions - Connection status
  updateConnectionStatus: (channelId: string, status: ConnectionStatus, error?: string) => void;
  setChannelConnected: (channelId: string) => void;
  setChannelDisconnected: (channelId: string, error?: string) => void;
  setChannelReconnecting: (channelId: string) => void;

  // Actions - Selection
  selectChannel: (channelId: string | null) => void;

  // Actions - Stats
  updateChannelStats: (channelId: string, stats: Partial<ChannelStats>) => void;
  incrementMessageCount: (channelId: string, direction: 'sent' | 'received') => void;

  // Actions - Setup wizard
  openSetupWizard: (channelType?: ChannelType) => void;
  closeSetupWizard: () => void;
  setWizardChannelType: (type: ChannelType) => void;
  setWizardStep: (step: SetupWizardStep) => void;
  updateWizardConfig: (config: Partial<ChannelConfig>) => void;
  setWizardError: (error: string | null) => void;
  setWizardLoading: (loading: boolean) => void;
  resetWizard: () => void;

  // WhatsApp specific wizard actions
  setWhatsAppQrCode: (qrCode: string) => void;
  setWhatsAppPairingCode: (code: string) => void;
  setWhatsAppConnectionStatus: (
    status: 'waiting' | 'scanning' | 'pairing' | 'connected' | 'error'
  ) => void;

  // Selectors
  getChannelsByType: (type: ChannelType) => Channel[];
  getConnectedChannels: () => Channel[];
  getSelectedChannel: () => Channel | null;
  getActiveChannelCount: () => number;
}

const initialWizardState: SetupWizardState = {
  isOpen: false,
  channelType: null,
  currentStep: 'select-channel',
  config: {},
  error: null,
  isLoading: false,
};

export const useChannelStore = create<ChannelState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        channels: [],
        channelsLoading: false,
        channelsError: null,
        selectedChannelId: null,
        channelStats: {},
        setupWizard: { ...initialWizardState },

        // Actions - Channels
        setChannels: (channels) =>
          set((state) => {
            state.channels = channels;
          }),

        addChannel: (channel) =>
          set((state) => {
            const exists = state.channels.some((c) => c.id === channel.id);
            if (!exists) {
              state.channels.push(channel);
            }
          }),

        updateChannel: (channelId, updates) =>
          set((state) => {
            const index = state.channels.findIndex((c) => c.id === channelId);
            if (index !== -1) {
              state.channels[index] = {
                ...state.channels[index],
                ...updates,
                updatedAt: new Date(),
              };
            }
          }),

        removeChannel: (channelId) =>
          set((state) => {
            state.channels = state.channels.filter((c) => c.id !== channelId);
            delete state.channelStats[channelId];
            if (state.selectedChannelId === channelId) {
              state.selectedChannelId = null;
            }
          }),

        setChannelsLoading: (loading) =>
          set((state) => {
            state.channelsLoading = loading;
          }),

        setChannelsError: (error) =>
          set((state) => {
            state.channelsError = error;
          }),

        // Actions - Connection status
        updateConnectionStatus: (channelId, status, error) =>
          set((state) => {
            const channel = state.channels.find((c) => c.id === channelId);
            if (channel) {
              channel.connectionStatus = status;
              if (error) {
                channel.lastError = error;
              }
              if (status === 'connected') {
                channel.lastConnected = new Date();
                channel.lastError = undefined;
              }
            }
          }),

        setChannelConnected: (channelId) =>
          set((state) => {
            const channel = state.channels.find((c) => c.id === channelId);
            if (channel) {
              channel.connectionStatus = 'connected';
              channel.lastConnected = new Date();
              channel.lastError = undefined;
            }
          }),

        setChannelDisconnected: (channelId, error) =>
          set((state) => {
            const channel = state.channels.find((c) => c.id === channelId);
            if (channel) {
              channel.connectionStatus = 'disconnected';
              if (error) {
                channel.lastError = error;
              }
            }
          }),

        setChannelReconnecting: (channelId) =>
          set((state) => {
            const channel = state.channels.find((c) => c.id === channelId);
            if (channel) {
              channel.connectionStatus = 'reconnecting';
            }
          }),

        // Actions - Selection
        selectChannel: (channelId) =>
          set((state) => {
            state.selectedChannelId = channelId;
          }),

        // Actions - Stats
        updateChannelStats: (channelId, stats) =>
          set((state) => {
            state.channelStats[channelId] = {
              channelId,
              messagesReceived: 0,
              messagesSent: 0,
              sessionsCreated: 0,
              skillsExecuted: 0,
              avgResponseTimeMs: 0,
              ...state.channelStats[channelId],
              ...stats,
            };
          }),

        incrementMessageCount: (channelId, direction) =>
          set((state) => {
            const channel = state.channels.find((c) => c.id === channelId);
            if (channel) {
              channel.messageCount += 1;
            }

            if (!state.channelStats[channelId]) {
              state.channelStats[channelId] = {
                channelId,
                messagesReceived: 0,
                messagesSent: 0,
                sessionsCreated: 0,
                skillsExecuted: 0,
                avgResponseTimeMs: 0,
              };
            }

            if (direction === 'sent') {
              state.channelStats[channelId].messagesSent += 1;
            } else {
              state.channelStats[channelId].messagesReceived += 1;
            }
            state.channelStats[channelId].lastActivity = new Date();
          }),

        // Actions - Setup wizard
        openSetupWizard: (channelType) =>
          set((state) => {
            state.setupWizard = {
              ...initialWizardState,
              isOpen: true,
              channelType: channelType ?? null,
              currentStep: channelType ? 'configure' : 'select-channel',
            };
          }),

        closeSetupWizard: () =>
          set((state) => {
            state.setupWizard.isOpen = false;
          }),

        setWizardChannelType: (type) =>
          set((state) => {
            state.setupWizard.channelType = type;
            state.setupWizard.currentStep = 'configure';
          }),

        setWizardStep: (step) =>
          set((state) => {
            state.setupWizard.currentStep = step;
          }),

        updateWizardConfig: (config) =>
          set((state) => {
            state.setupWizard.config = {
              ...state.setupWizard.config,
              ...config,
            };
          }),

        setWizardError: (error) =>
          set((state) => {
            state.setupWizard.error = error;
          }),

        setWizardLoading: (loading) =>
          set((state) => {
            state.setupWizard.isLoading = loading;
          }),

        resetWizard: () =>
          set((state) => {
            state.setupWizard = { ...initialWizardState };
          }),

        // WhatsApp specific
        setWhatsAppQrCode: (qrCode) =>
          set((state) => {
            state.setupWizard.whatsappQrCode = qrCode;
          }),

        setWhatsAppPairingCode: (code) =>
          set((state) => {
            state.setupWizard.whatsappPairingCode = code;
          }),

        setWhatsAppConnectionStatus: (status) =>
          set((state) => {
            state.setupWizard.whatsappConnectionStatus = status;
          }),

        // Selectors
        getChannelsByType: (type) => {
          const state = get();
          return state.channels.filter((c) => c.type === type);
        },

        getConnectedChannels: () => {
          const state = get();
          return state.channels.filter((c) => c.connectionStatus === 'connected');
        },

        getSelectedChannel: () => {
          const state = get();
          if (!state.selectedChannelId) return null;
          return state.channels.find((c) => c.id === state.selectedChannelId) ?? null;
        },

        getActiveChannelCount: () => {
          const state = get();
          return state.channels.filter((c) => c.active).length;
        },
      })),
      {
        name: 'openclaw-channel-storage',
        partialize: (state) => ({
          // Don't persist sensitive data like tokens
          // Only persist UI preferences
          selectedChannelId: state.selectedChannelId,
        }),
      }
    ),
    { name: 'OpenClawChannelStore' }
  )
);

// Selector hooks
export const useChannels = () => useChannelStore((state) => state.channels);
export const useSelectedChannel = () => useChannelStore((state) => state.getSelectedChannel());
export const useConnectedChannels = () => useChannelStore((state) => state.getConnectedChannels());
export const useSetupWizard = () => useChannelStore((state) => state.setupWizard);

// Channel type metadata for UI
export const CHANNEL_TYPE_INFO: Record<
  ChannelType,
  {
    name: string;
    description: string;
    icon: string;
    color: string;
    bgColor: string;
    authMethod: string;
  }
> = {
  whatsapp: {
    name: 'WhatsApp',
    description: 'Connect via QR code pairing',
    icon: 'MessageCircle',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    authMethod: 'qr_code',
  },
  telegram: {
    name: 'Telegram',
    description: 'Connect via bot token',
    icon: 'Send',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    authMethod: 'bot_token',
  },
  slack: {
    name: 'Slack',
    description: 'Connect via OAuth',
    icon: 'Hash',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    authMethod: 'oauth',
  },
  discord: {
    name: 'Discord',
    description: 'Connect via bot token',
    icon: 'Gamepad2',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    authMethod: 'bot_token',
  },
  signal: {
    name: 'Signal',
    description: 'Connect via phone linking',
    icon: 'Shield',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    authMethod: 'phone_link',
  },
  teams: {
    name: 'Microsoft Teams',
    description: 'Connect via Azure AD',
    icon: 'Users',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    authMethod: 'azure_ad',
  },
  web: {
    name: 'Web Widget',
    description: 'Embed chat on your website',
    icon: 'Globe',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    authMethod: 'api_key',
  },
};
