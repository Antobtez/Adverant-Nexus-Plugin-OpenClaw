'use client';

/**
 * SessionCard Component - Session preview in sidebar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Phone, Send, Hash, Gamepad2, Shield, Globe } from 'lucide-react';
import type { Session, ChannelType } from '@/stores/sessionStore';

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

// Channel type icons
const channelIcons: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  web: Globe,
  whatsapp: Phone,
  telegram: Send,
  slack: Hash,
  discord: Gamepad2,
  signal: Shield,
  teams: MessageCircle,
};

// Channel colors
const channelColors: Record<ChannelType, string> = {
  web: 'text-gray-500',
  whatsapp: 'text-green-500',
  telegram: 'text-blue-500',
  slack: 'text-purple-500',
  discord: 'text-indigo-500',
  signal: 'text-blue-600',
  teams: 'text-violet-500',
};

export function SessionCard({ session, isActive, onClick }: SessionCardProps) {
  const ChannelIcon = channelIcons[session.channelType];
  const channelColor = channelColors[session.channelType];

  // Format time
  const timeAgo = formatDistanceToNow(session.lastActivity, { addSuffix: false });

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors',
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      {/* Avatar with channel indicator */}
      <div className="relative flex-shrink-0">
        <UserAvatar
          fallback={session.title?.charAt(0) || session.channelType.charAt(0).toUpperCase()}
          variant={isActive ? 'primary' : 'default'}
          size="md"
        />
        {/* Channel badge */}
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-900',
            channelColor
          )}
        >
          <ChannelIcon className="h-3 w-3" />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm font-medium',
              isActive
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-gray-900 dark:text-white'
            )}
          >
            {session.title || `${session.channelType} session`}
          </span>
          <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo}</span>
        </div>

        {/* Last message preview */}
        {session.lastMessage && (
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {session.lastMessage}
          </p>
        )}

        {/* Channel name and unread badge */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs capitalize text-gray-400">{session.channelType}</span>

          {/* Unread badge */}
          {session.unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">
              {session.unreadCount > 99 ? '99+' : session.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Active indicator */}
      {session.active && (
        <div
          className={cn(
            'mt-1 h-2 w-2 flex-shrink-0 rounded-full',
            isActive ? 'bg-blue-600' : 'bg-green-500'
          )}
        />
      )}
    </button>
  );
}

export default SessionCard;
