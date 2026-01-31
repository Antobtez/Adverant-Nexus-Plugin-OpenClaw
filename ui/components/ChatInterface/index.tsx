'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Loader2, CheckCheck, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatRelativeTime } from '@/lib/utils';
import type { MessageEvent } from '@/lib/websocket-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export function ChatInterface() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { wsClient, isConnected } = useWebSocket();

  // Create or load session
  useEffect(() => {
    const loadSession = async () => {
      const storedSessionId = localStorage.getItem('openclaw_session_id');

      if (storedSessionId) {
        setSessionId(storedSessionId);
        wsClient.joinSession(storedSessionId);
      } else {
        try {
          const { sessionId: newSessionId } = await apiClient.chat.createSession();
          setSessionId(newSessionId);
          localStorage.setItem('openclaw_session_id', newSessionId);
          wsClient.joinSession(newSessionId);
        } catch (error) {
          console.error('Failed to create session:', error);
        }
      }
    };

    loadSession();

    return () => {
      if (sessionId) {
        wsClient.leaveSession(sessionId);
      }
    };
  }, []);

  // Load message history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['chat', 'history', sessionId],
    queryFn: () => apiClient.chat.getHistory(sessionId),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (history) {
      setMessages(
        history.map((msg, idx) => ({
          id: `${msg.timestamp}-${idx}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          status: 'delivered',
        }))
      );
    }
  }, [history]);

  // WebSocket message subscription
  useEffect(() => {
    const unsubscribeMessage = wsClient.onMessage((message: MessageEvent) => {
      if (message.sessionId === sessionId) {
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;

          return [
            ...prev,
            {
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              status: message.status,
            },
          ];
        });

        // Stop typing indicator when assistant responds
        if (message.role === 'assistant') {
          setIsTyping(false);
        }
      }
    });

    const unsubscribeTyping = wsClient.onTyping(({ sessionId: sid, isTyping: typing }) => {
      if (sid === sessionId) {
        setIsTyping(typing);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
    };
  }, [sessionId, wsClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => apiClient.chat.sendMessage(message, sessionId),
    onMutate: async (message) => {
      // Optimistically add user message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setMessageInput('');

      // Emit via WebSocket for real-time delivery
      wsClient.sendMessage(message, sessionId);

      return { optimisticMessage };
    },
    onSuccess: (data, message, context) => {
      // Update optimistic message with real data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === context?.optimisticMessage.id
            ? { ...msg, id: data.sessionId, status: 'sent' }
            : msg
        )
      );

      // Show typing indicator
      setIsTyping(true);

      // Invalidate history to refetch
      queryClient.invalidateQueries({ queryKey: ['chat', 'history', sessionId] });
    },
    onError: (error, message, context) => {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== context?.optimisticMessage.id));
    },
  });

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !sessionId) return;

    sendMessageMutation.mutate(trimmedMessage);
  }, [messageInput, sessionId, sendMessageMutation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!sessionId || historyLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading chat session...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">OpenClaw Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Ask anything or use /skill_name to execute skills
            </p>
          </div>
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Welcome to OpenClaw!</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Start a conversation or execute any of the 100+ available skills.
                Try asking "What can you do?" or use /help to see available commands.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-70">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                  {message.role === 'user' && message.status && (
                    <span className="text-xs">
                      {message.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {message.status === 'sent' && <Check className="h-3 w-3" />}
                      {(message.status === 'delivered' || message.status === 'read') && (
                        <CheckCheck className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-muted-foreground">Assistant is typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="flex-1"
            disabled={!isConnected || sendMessageMutation.isPending}
          />

          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !isConnected || sendMessageMutation.isPending}
            size="icon"
            className="shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
