'use client';

/**
 * SessionList Component - Sidebar list of chat sessions
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { SessionCard } from './SessionCard';
import { useSessionStore, useSessions } from '@/stores/sessionStore';
import { Search, Plus, MessageSquare, Filter } from 'lucide-react';
import type { ChannelType } from '@/stores/sessionStore';

interface SessionListProps {
  onNewSession?: () => void;
  className?: string;
}

export function SessionList({ onNewSession, className }: SessionListProps) {
  const sessions = useSessions();
  const {
    activeSessionId,
    setActiveSession,
    sessionsLoading,
    sessionsError,
  } = useSessionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<ChannelType | 'all'>('all');

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Filter by channel
    if (filterChannel !== 'all') {
      filtered = filtered.filter((s) => s.channelType === filterChannel);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title?.toLowerCase().includes(query) ||
          s.lastMessage?.toLowerCase().includes(query) ||
          s.channelType.toLowerCase().includes(query)
      );
    }

    // Sort by last activity
    return filtered.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }, [sessions, filterChannel, searchQuery]);

  // Get unique channel types from sessions
  const channelTypes = useMemo(() => {
    const types = new Set(sessions.map((s) => s.channelType));
    return Array.from(types);
  }, [sessions]);

  // Loading state
  if (sessionsLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (sessionsError) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <p className="text-sm text-red-500">{sessionsError}</p>
        <Button variant="outline" size="sm" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sessions
          </h2>
          {onNewSession && (
            <Button onClick={onNewSession} size="sm" className="h-8">
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="pl-9"
          />
        </div>

        {/* Channel filter */}
        {channelTypes.length > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterChannel('all')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  filterChannel === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                All
              </button>
              {channelTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterChannel(type)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    filterChannel === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {searchQuery || filterChannel !== 'all'
                ? 'No sessions match your filters'
                : 'No active sessions'}
            </p>
            {!searchQuery && filterChannel === 'all' && onNewSession && (
              <Button onClick={onNewSession} variant="outline" size="sm" className="mt-4">
                Start a conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => setActiveSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredSessions.length} sessions</span>
          <span>
            {sessions.filter((s) => s.active).length} active
          </span>
        </div>
      </div>
    </div>
  );
}

export default SessionList;
