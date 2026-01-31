'use client';

/**
 * ChatInterface Component - Main chat view with sessions and messages
 * Uses three-panel layout: sessions list, messages, session details
 */

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TwoPanelLayout } from '@/components/layout/ThreePanelLayout';
import { SessionList } from './SessionList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useSessionStore, useActiveSession } from '@/stores/sessionStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Settings, Info, MoreVertical, Phone, MessageCircle, X } from 'lucide-react';
import { UserAvatar } from '@/components/ui/avatar';

interface ChatInterfaceProps {
  className?: string;
  onOpenSkillBrowser?: () => void;
}

export function ChatInterface({ className, onOpenSkillBrowser }: ChatInterfaceProps) {
  const activeSession = useActiveSession();
  const { createSession } = useWebSocket();
  const { addMessage, setAssistantTyping } = useSessionStore();

  // Handle new session
  const handleNewSession = useCallback(() => {
    createSession('web');
  }, [createSession]);

  // Handle send message
  const handleSendMessage = useCallback(
    (content: string, attachments?: File[]) => {
      if (!activeSession) return;

      // Create optimistic message
      const messageId = `msg_${Date.now()}`;
      addMessage(activeSession.id, {
        id: messageId,
        sessionId: activeSession.id,
        role: 'user',
        content,
        status: 'sending',
        timestamp: new Date(),
        // TODO: Handle attachments upload
      });

      // Send via WebSocket (the hook will handle the actual sending)
      // This would be handled by the WebSocket event handlers
    },
    [activeSession, addMessage]
  );

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    // Emit typing event via WebSocket
  }, []);

  const handleTypingStop = useCallback(() => {
    // Emit stop typing event via WebSocket
  }, []);

  return (
    <div className={cn('flex h-full', className)}>
      <TwoPanelLayout
        primaryPanel={
          <SessionList onNewSession={handleNewSession} />
        }
        mainPanel={
          activeSession ? (
            <div className="flex h-full flex-col">
              {/* Chat header */}
              <ChatHeader session={activeSession} />

              {/* Messages */}
              <MessageList sessionId={activeSession.id} />

              {/* Input */}
              <MessageInput
                onSend={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                showSkillButton={true}
                onSkillClick={onOpenSkillBrowser}
              />
            </div>
          ) : (
            <EmptyState onNewSession={handleNewSession} />
          )
        }
        primaryPanelMinSize={20}
        mainPanelMinSize={50}
      />
    </div>
  );
}

// Chat header component
interface ChatHeaderProps {
  session: NonNullable<ReturnType<typeof useActiveSession>>;
}

function ChatHeader({ session }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <UserAvatar
          fallback={session.title?.charAt(0) || session.channelType.charAt(0).toUpperCase()}
          variant="primary"
          size="sm"
        />
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {session.title || `${session.channelType} session`}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{session.channelType}</span>
            {session.active && (
              <>
                <span>•</span>
                <span className="text-green-500">Active</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Empty state when no session is selected
function EmptyState({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-8 text-center dark:bg-gray-950">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <MessageCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
        Welcome to OpenClaw
      </h2>
      <p className="mt-2 max-w-sm text-gray-600 dark:text-gray-400">
        Your multi-channel AI assistant with 100+ skills. Start a conversation or select an existing session.
      </p>
      <Button onClick={onNewSession} className="mt-6">
        Start new conversation
      </Button>
    </div>
  );
}

export default ChatInterface;
