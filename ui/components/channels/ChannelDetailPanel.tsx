'use client';

/**
 * ChannelDetailPanel Component - Channel configuration and status display
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useChannelStore, useSelectedChannel, CHANNEL_TYPE_INFO } from '@/stores/channelStore';
import {
  MessageSquare,
  Phone,
  Send,
  Hash,
  Radio,
  Users,
  Globe,
  Wifi,
  WifiOff,
  AlertCircle,
  Settings,
  RotateCcw,
  Trash2,
  X,
  Save,
  Send as SendIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  BarChart3,
  Link,
  Key,
  Bell,
} from 'lucide-react';
import type { Channel, ChannelType, ConnectionStatus, SessionScope } from '@/stores/channelStore';

interface ChannelDetailPanelProps {
  onClose?: () => void;
  onReconnect?: (channelId: string) => void;
  onTestMessage?: (channelId: string) => void;
  className?: string;
}

// Channel type icons
const channelIcons: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  telegram: Send,
  slack: Hash,
  discord: Users,
  signal: Radio,
  teams: Users,
  web: Globe,
};

// Connection status configuration
const statusConfig: Record<
  ConnectionStatus,
  { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  connected: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: Wifi,
    label: 'Connected',
  },
  connecting: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Wifi,
    label: 'Connecting',
  },
  disconnected: {
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: WifiOff,
    label: 'Disconnected',
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertCircle,
    label: 'Error',
  },
};

// Session scope options
const sessionScopeOptions: { value: SessionScope; label: string; description: string }[] = [
  {
    value: 'per-sender',
    label: 'Per Sender (Recommended)',
    description: 'Each sender gets their own conversation context',
  },
  {
    value: 'per-channel',
    label: 'Per Channel',
    description: 'All messages in a channel share the same context',
  },
  {
    value: 'global',
    label: 'Global',
    description: 'All messages across all channels share context',
  },
];

export function ChannelDetailPanel({
  onClose,
  onReconnect,
  onTestMessage,
  className,
}: ChannelDetailPanelProps) {
  const selectedChannel = useSelectedChannel();
  const { updateChannel } = useChannelStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formValues, setFormValues] = useState<Partial<Channel>>({});

  // Initialize form values when channel changes
  React.useEffect(() => {
    if (selectedChannel) {
      setFormValues({
        name: selectedChannel.name,
        config: { ...selectedChannel.config },
      });
    }
  }, [selectedChannel?.id]);

  // Handle form field change
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle config field change
  const handleConfigChange = useCallback((field: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!selectedChannel) return;
    updateChannel(selectedChannel.id, formValues);
    setEditMode(false);
  }, [selectedChannel, formValues, updateChannel]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (selectedChannel) {
      setFormValues({
        name: selectedChannel.name,
        config: { ...selectedChannel.config },
      });
    }
    setEditMode(false);
  }, [selectedChannel]);

  if (!selectedChannel) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center p-8 text-center', className)}>
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-700" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Select a channel to view details and configure
        </p>
      </div>
    );
  }

  const typeInfo = CHANNEL_TYPE_INFO[selectedChannel.channelType];
  const status = statusConfig[selectedChannel.connectionStatus];
  const ChannelIcon = channelIcons[selectedChannel.channelType] || MessageSquare;
  const StatusIcon = status.icon;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                typeInfo?.bgColor || 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              <ChannelIcon className={cn('h-6 w-6', typeInfo?.color || 'text-gray-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedChannel.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedChannel.identifier}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn('text-xs', status.bgColor, status.color)}
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Error display */}
        {selectedChannel.connectionStatus === 'error' && selectedChannel.errorMessage && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {selectedChannel.errorMessage}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(selectedChannel.connectionStatus === 'disconnected' ||
            selectedChannel.connectionStatus === 'error') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReconnect?.(selectedChannel.id)}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reconnect
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTestMessage?.(selectedChannel.id)}
          >
            <SendIcon className="mr-1.5 h-4 w-4" />
            Test Message
          </Button>
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Settings className="mr-1.5 h-4 w-4" />
              Edit Settings
            </Button>
          ) : (
            <>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save Changes
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Statistics */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedChannel.stats?.totalSessions || 0}
              </p>
              <p className="text-xs text-gray-500">Total Sessions</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedChannel.stats?.totalMessages || 0}
              </p>
              <p className="text-xs text-gray-500">Total Messages</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedChannel.stats?.activeSessions || 0}
              </p>
              <p className="text-xs text-gray-500">Active Sessions</p>
            </div>
          </div>
        </div>

        {/* Session Settings */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <MessageCircle className="h-4 w-4" />
            Session Settings
          </h3>

          <div className="space-y-4">
            {/* Session Scope */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Session Scope
              </label>
              <div className="space-y-2">
                {sessionScopeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      formValues.config?.sessionScope === option.value
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800',
                      !editMode && 'pointer-events-none opacity-60'
                    )}
                  >
                    <input
                      type="radio"
                      name="sessionScope"
                      value={option.value}
                      checked={formValues.config?.sessionScope === option.value}
                      onChange={() => handleConfigChange('sessionScope', option.value)}
                      disabled={!editMode}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Auto-Reply */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-Reply
                </label>
                <p className="text-sm text-gray-500">
                  Automatically respond to incoming messages
                </p>
              </div>
              <Switch
                checked={formValues.config?.autoReply ?? true}
                onCheckedChange={(checked) => handleConfigChange('autoReply', checked)}
                disabled={!editMode}
              />
            </div>

            {/* Welcome Message */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Welcome Message
              </label>
              <Textarea
                value={formValues.config?.welcomeMessage || ''}
                onChange={(e) => handleConfigChange('welcomeMessage', e.target.value)}
                placeholder="Hello! I'm your AI assistant. How can I help you today?"
                rows={3}
                disabled={!editMode}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Advanced Settings
            </span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Link className="h-4 w-4" />
                  Webhook URL
                </label>
                <Input
                  value={formValues.config?.webhookUrl || ''}
                  onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  disabled={!editMode}
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notifications
                    </label>
                    <p className="text-sm text-gray-500">
                      Receive alerts for new messages
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formValues.config?.notifications ?? true}
                  onCheckedChange={(checked) => handleConfigChange('notifications', checked)}
                  disabled={!editMode}
                />
              </div>

              {/* Session Timeout */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  Session Timeout (minutes)
                </label>
                <Input
                  type="number"
                  value={formValues.config?.sessionTimeoutMinutes || 30}
                  onChange={(e) =>
                    handleConfigChange('sessionTimeoutMinutes', parseInt(e.target.value))
                  }
                  min={5}
                  max={1440}
                  disabled={!editMode}
                />
              </div>
            </div>
          )}
        </div>

        {/* Connection Info */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Link className="h-4 w-4" />
            Connection Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Channel Type</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {typeInfo?.name || selectedChannel.channelType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedChannel.createdAt
                  ? new Date(selectedChannel.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Activity</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedChannel.lastActivity
                  ? new Date(selectedChannel.lastActivity).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <Button
          variant="outline"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove Channel
        </Button>
      </div>
    </div>
  );
}

export default ChannelDetailPanel;
