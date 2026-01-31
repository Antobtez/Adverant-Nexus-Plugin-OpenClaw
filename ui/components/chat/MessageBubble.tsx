'use client';

/**
 * MessageBubble Component - Individual chat message display
 * Supports text, attachments, and skill execution cards
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, FileIcon, ImageIcon, Music, Video } from 'lucide-react';
import type { Message, Attachment, MessageStatus } from '@/stores/sessionStore';
import { SkillExecutionCard } from './SkillExecutionCard';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  isGrouped?: boolean;
}

// Status icon component
function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3 text-gray-400" />;
    case 'sent':
      return <Check className="h-3 w-3 text-gray-400" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

// Attachment preview component
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const iconMap = {
    image: ImageIcon,
    document: FileIcon,
    audio: Music,
    video: Video,
  };
  const Icon = iconMap[attachment.type] || FileIcon;

  if (attachment.type === 'image' && attachment.url) {
    return (
      <div className="relative mt-2 max-w-xs overflow-hidden rounded-lg">
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.name}
          className="h-auto w-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
          {attachment.name}
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      <Icon className="h-5 w-5 text-gray-500" />
      <div className="flex-1 truncate">
        <div className="truncate font-medium text-gray-900 dark:text-white">
          {attachment.name}
        </div>
        <div className="text-xs text-gray-500">
          {(attachment.size / 1024).toFixed(1)} KB
        </div>
      </div>
    </a>
  );
}

export function MessageBubble({ message, showAvatar = true, isGrouped = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {message.content}
        </div>
      </div>
    );
  }

  // Skill execution message (no text content, just the card)
  if (message.skillExecution && !message.content) {
    return (
      <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {showAvatar && !isGrouped && (
          <UserAvatar
            fallback={isUser ? 'U' : 'AI'}
            variant={isUser ? 'default' : 'primary'}
            size="sm"
            className="flex-shrink-0"
          />
        )}
        {showAvatar && isGrouped && <div className="w-8" />}
        <div className={cn('flex max-w-[70%] flex-col', isUser ? 'items-end' : 'items-start')}>
          <SkillExecutionCard execution={message.skillExecution} />
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs text-gray-400',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <span>{format(message.timestamp, 'HH:mm')}</span>
            {isUser && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {showAvatar && !isGrouped && (
        <UserAvatar
          fallback={isUser ? 'U' : 'AI'}
          variant={isUser ? 'default' : 'primary'}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      {showAvatar && isGrouped && <div className="w-8" />}

      {/* Message Content */}
      <div className={cn('flex max-w-[70%] flex-col', isUser ? 'items-end' : 'items-start')}>
        {/* Main bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isUser
              ? 'rounded-br-md bg-blue-600 text-white'
              : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
          )}
        >
          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          )}
        </div>

        {/* Skill execution card (if present with text) */}
        {message.skillExecution && message.content && (
          <div className="mt-2">
            <SkillExecutionCard execution={message.skillExecution} />
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-xs text-gray-400',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span>{format(message.timestamp, 'HH:mm')}</span>
          {isUser && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
