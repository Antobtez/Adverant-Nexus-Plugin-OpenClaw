'use client';

/**
 * ChannelCard Component - Individual channel card with status and actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import type { Channel, ConnectionStatus } from '@/stores/channelStore';
import { CHANNEL_TYPE_INFO } from '@/stores/channelStore';

interface ChannelCardProps {
  channel: Channel;
  isSelected?: boolean;
  onClick?: () => void;
  onReconnect?: () => void;
  onRemove?: () => void;
  onConfigure?: () => void;
  compact?: boolean;
  className?: string;
}

// Channel type icons
const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
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

export function ChannelCard({
  channel,
  isSelected = false,
  onClick,
  onReconnect,
  onRemove,
  onConfigure,
  compact = false,
  className,
}: ChannelCardProps) {
  const typeInfo = CHANNEL_TYPE_INFO[channel.channelType];
  const status = statusConfig[channel.connectionStatus];
  const ChannelIcon = channelIcons[channel.channelType] || MessageSquare;
  const StatusIcon = status.icon;

  // Format last activity
  const formatLastActivity = (date: Date | undefined) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
          className
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            typeInfo?.bgColor || 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          <ChannelIcon className={cn('h-5 w-5', typeInfo?.color || 'text-gray-600')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-gray-900 dark:text-white">
              {channel.name}
            </span>
            <div className={cn('h-2 w-2 rounded-full', status.bgColor)}>
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  channel.connectionStatus === 'connected' && 'bg-green-500',
                  channel.connectionStatus === 'connecting' && 'animate-pulse bg-yellow-500',
                  channel.connectionStatus === 'disconnected' && 'bg-gray-400',
                  channel.connectionStatus === 'error' && 'bg-red-500'
                )}
              />
            </div>
          </div>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {channel.identifier}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={onClick}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            typeInfo?.bgColor || 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          <ChannelIcon className={cn('h-6 w-6', typeInfo?.color || 'text-gray-600')} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {channel.name}
            </h3>
            <Badge
              variant="secondary"
              className={cn('text-xs', status.bgColor, status.color)}
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
            {channel.identifier}
          </p>

          {/* Stats row */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {channel.stats?.totalSessions || 0} sessions
            </span>
            <span>
              {channel.stats?.totalMessages || 0} messages
            </span>
            <span>
              Last active: {formatLastActivity(channel.lastActivity)}
            </span>
          </div>
        </div>
      </button>

      {/* Error message */}
      {channel.connectionStatus === 'error' && channel.errorMessage && (
        <div className="mx-4 mb-2 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {channel.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 dark:border-gray-800">
        {channel.connectionStatus === 'disconnected' || channel.connectionStatus === 'error' ? (
          <Button variant="ghost" size="sm" onClick={onReconnect}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reconnect
          </Button>
        ) : null}

        <Button variant="ghost" size="sm" onClick={onConfigure}>
          <Settings className="mr-1.5 h-4 w-4" />
          Configure
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}

export default ChannelCard;
