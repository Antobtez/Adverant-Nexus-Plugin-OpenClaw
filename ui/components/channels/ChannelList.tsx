'use client';

/**
 * ChannelList Component - List of configured channels with filtering
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChannelCard } from './ChannelCard';
import { useChannelStore, useChannels, useSelectedChannel, CHANNEL_TYPE_INFO } from '@/stores/channelStore';
import {
  Search,
  Plus,
  Filter,
  MessageSquare,
  Phone,
  Send,
  Hash,
  Radio,
  Users,
  Globe,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import type { ChannelType, ConnectionStatus } from '@/stores/channelStore';

interface ChannelListProps {
  onAddChannel?: () => void;
  className?: string;
}

type FilterStatus = 'all' | ConnectionStatus;
type FilterType = 'all' | ChannelType;

// Channel type icons for filter
const channelIcons: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  telegram: Send,
  slack: Hash,
  discord: Users,
  signal: Radio,
  teams: Users,
  web: Globe,
};

export function ChannelList({ onAddChannel, className }: ChannelListProps) {
  const channels = useChannels();
  const selectedChannel = useSelectedChannel();
  const { selectChannel, removeChannel, isLoading, error } = useChannelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = channel.name.toLowerCase().includes(query);
        const matchesIdentifier = channel.identifier.toLowerCase().includes(query);
        if (!matchesName && !matchesIdentifier) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && channel.connectionStatus !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && channel.channelType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [channels, searchQuery, statusFilter, typeFilter]);

  // Group channels by type for summary
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      total: channels.length,
      connected: channels.filter((c) => c.connectionStatus === 'connected').length,
      disconnected: channels.filter((c) => c.connectionStatus !== 'connected').length,
    };

    // Count by type
    Object.keys(CHANNEL_TYPE_INFO).forEach((type) => {
      counts[type] = channels.filter((c) => c.channelType === type).length;
    });

    return counts;
  }, [channels]);

  // Handle channel selection
  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
  };

  // Handle channel removal with confirmation
  const handleRemoveChannel = (channelId: string) => {
    if (window.confirm('Are you sure you want to remove this channel? This action cannot be undone.')) {
      removeChannel(channelId);
    }
  };

  // Handle reconnection
  const handleReconnect = (channelId: string) => {
    // This would trigger reconnection via WebSocket
    console.log('Reconnecting channel:', channelId);
  };

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <WifiOff className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Channels
          </h2>
          <Button size="sm" onClick={onAddChannel}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Channel
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Summary badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            All ({channelCounts.total})
          </Badge>
          <Badge
            variant={statusFilter === 'connected' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('connected')}
          >
            <Wifi className="mr-1 h-3 w-3" />
            Connected ({channelCounts.connected})
          </Badge>
          <Badge
            variant={statusFilter === 'disconnected' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('disconnected')}
          >
            <WifiOff className="mr-1 h-3 w-3" />
            Disconnected ({channelCounts.disconnected})
          </Badge>
        </div>

        {/* Type filter */}
        <div className="mt-2 flex flex-wrap gap-1">
          <Button
            variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="h-7 text-xs"
          >
            All Types
          </Button>
          {(Object.keys(CHANNEL_TYPE_INFO) as ChannelType[]).map((type) => {
            const TypeIcon = channelIcons[type];
            const info = CHANNEL_TYPE_INFO[type];
            const count = channelCounts[type] || 0;
            if (count === 0 && typeFilter !== type) return null;

            return (
              <Button
                key={type}
                variant={typeFilter === type ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter(type)}
                className="h-7 text-xs"
              >
                <TypeIcon className={cn('mr-1 h-3 w-3', info.color)} />
                {info.name} {count > 0 && `(${count})`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredChannels.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {channels.length === 0
                ? 'No channels configured'
                : 'No channels match your filters'}
            </p>
            {channels.length === 0 && (
              <Button size="sm" className="mt-4" onClick={onAddChannel}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Your First Channel
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isSelected={selectedChannel?.id === channel.id}
                onClick={() => handleSelectChannel(channel.id)}
                onReconnect={() => handleReconnect(channel.id)}
                onRemove={() => handleRemoveChannel(channel.id)}
                onConfigure={() => handleSelectChannel(channel.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChannelList;
