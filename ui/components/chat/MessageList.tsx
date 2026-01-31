'use client';

/**
 * MessageList Component - Scrollable message history
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionStore, useSessionMessages, useIsAssistantTyping } from '@/stores/sessionStore';
import { ArrowDown, Loader2 } from 'lucide-react';
import type { Message } from '@/stores/sessionStore';

interface MessageListProps {
  sessionId: string;
  className?: string;
  onLoadMore?: () => void;
}

export function MessageList({ sessionId, className, onLoadMore }: MessageListProps) {
  const messages = useSessionMessages(sessionId);
  const isTyping = useIsAssistantTyping(sessionId);
  const {
    messagesLoading,
    messagesError,
    hasMoreMessages,
    scrollPositions,
    setScrollPosition,
  } = useSessionStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [isNearBottom, setIsNearBottom] = React.useState(true);

  const loading = messagesLoading[sessionId];
  const error = messagesError[sessionId];
  const hasMore = hasMoreMessages[sessionId];

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll button if not near bottom
    setShowScrollButton(distanceFromBottom > 100);
    setIsNearBottom(distanceFromBottom < 50);

    // Save scroll position
    setScrollPosition(sessionId, scrollTop);

    // Load more when scrolled to top
    if (scrollTop < 50 && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [sessionId, hasMore, loading, onLoadMore, setScrollPosition]);

  // Auto-scroll on new messages (if near bottom)
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isTyping && isNearBottom) {
      scrollToBottom();
    }
  }, [isTyping, isNearBottom, scrollToBottom]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = scrollPositions[sessionId];
    if (savedPosition && containerRef.current) {
      containerRef.current.scrollTop = savedPosition;
    }
  }, [sessionId, scrollPositions]);

  // Group messages by sender for compact display
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{ messages: Message[]; isGrouped: boolean }> = [];
    let currentGroup: Message[] = [];
    let lastRole: string | null = null;

    messages.forEach((message, index) => {
      const nextMessage = messages[index + 1];
      const isSameRole = lastRole === message.role;
      const isLastInGroup = !nextMessage || nextMessage.role !== message.role;

      if (isSameRole) {
        currentGroup.push(message);
      } else {
        if (currentGroup.length > 0) {
          groups.push({ messages: currentGroup, isGrouped: currentGroup.length > 1 });
        }
        currentGroup = [message];
      }

      if (isLastInGroup) {
        groups.push({ messages: currentGroup, isGrouped: currentGroup.length > 1 });
        currentGroup = [];
      }

      lastRole = message.role;
    });

    return groups;
  }, [messages]);

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className={cn('flex flex-col gap-4 p-4', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0 && !loading) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <span className="text-2xl">👋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Start a conversation
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Send a message or execute a skill to begin
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          'absolute inset-0 overflow-y-auto px-4 py-4',
          className
        )}
      >
        {/* Load more indicator */}
        {hasMore && (
          <div className="mb-4 flex justify-center">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <button
                onClick={onLoadMore}
                className="text-sm text-blue-600 hover:underline"
              >
                Load earlier messages
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {groupedMessages.map((group, groupIndex) =>
            group.messages.map((message, messageIndex) => (
              <MessageBubble
                key={message.id}
                message={message}
                showAvatar={true}
                isGrouped={group.isGrouped && messageIndex > 0}
              />
            ))
          )}
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="mt-4">
            <TypingIndicator />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <ArrowDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}

export default MessageList;
