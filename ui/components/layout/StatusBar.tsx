'use client';

/**
 * StatusBar Component - Bottom status bar
 * Shows WebSocket status, last sync time, version info, and quick stats
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useWsStatus, useQuota, useChannels, useCronJobs } from '@/stores';
import { formatDistanceToNow } from 'date-fns';
import { Circle, Zap, Radio, Clock } from 'lucide-react';

export function StatusBar() {
  const wsStatus = useWsStatus();
  const quota = useQuota();
  const channels = useChannels();
  const cronJobs = useCronJobs();

  // Calculate stats
  const connectedChannels = channels.filter((c) => c.connectionStatus === 'connected').length;
  const enabledCronJobs = cronJobs.filter((j) => j.enabled).length;

  // Format last ping time
  const lastPingText = wsStatus.lastPing
    ? formatDistanceToNow(wsStatus.lastPing, { addSuffix: true })
    : 'Never';

  return (
    <footer className="flex h-7 items-center justify-between border-t border-gray-200 bg-gray-50 px-3 text-xs dark:border-gray-800 dark:bg-gray-900">
      {/* Left section - Connection status */}
      <div className="flex items-center gap-4">
        {/* WebSocket Status */}
        <div className="flex items-center gap-1.5">
          <Circle
            className={cn(
              'h-2 w-2 fill-current',
              wsStatus.connected
                ? 'text-green-500'
                : wsStatus.reconnecting
                  ? 'text-yellow-500'
                  : 'text-red-500'
            )}
          />
          <span className="text-gray-600 dark:text-gray-400">
            WebSocket: {wsStatus.connected ? 'Connected' : wsStatus.reconnecting ? 'Reconnecting' : 'Disconnected'}
          </span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
          <span>Last sync: {lastPingText}</span>
        </div>

        {/* Latency */}
        {wsStatus.connected && wsStatus.latency > 0 && (
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
            <Zap className="h-3 w-3" />
            <span>{wsStatus.latency}ms</span>
          </div>
        )}
      </div>

      {/* Center section - Quick stats */}
      <div className="flex items-center gap-4">
        {/* Connected Channels */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
          <Radio className="h-3 w-3" />
          <span>
            {connectedChannels}/{channels.length} channels
          </span>
        </div>

        {/* Active Cron Jobs */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{enabledCronJobs} scheduled jobs</span>
        </div>

        {/* Quota Usage */}
        {quota && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-gray-500 dark:text-gray-500',
                quota.current.sessions / quota.limits.max_sessions > 0.8 && 'text-yellow-600',
                quota.current.sessions / quota.limits.max_sessions > 0.95 && 'text-red-600'
              )}
            >
              Sessions: {quota.current.sessions}
              {quota.limits.max_sessions !== -1 && `/${quota.limits.max_sessions}`}
            </span>
          </div>
        )}
      </div>

      {/* Right section - Version */}
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
        <span>OpenClaw v1.0.0</span>
      </div>
    </footer>
  );
}

export default StatusBar;
