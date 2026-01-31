/**
 * Session Store - Chat sessions and messages state management
 * Handles chat sessions, messages, typing indicators, and message attachments
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

export type ChannelType = 'web' | 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'signal' | 'teams';
export type MessageRole = 'user' | 'assistant' | 'system';
export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'error';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface SkillExecution {
  executionId: string;
  skillName: string;
  status: SkillExecutionStatus;
  progress?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  executionTimeMs?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  skillExecution?: SkillExecution;
  status: MessageStatus;
  timestamp: Date;
  editedAt?: Date;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  organizationId: string;
  channelType: ChannelType;
  channelId?: string;
  channelName?: string;
  title?: string;
  context: Record<string, unknown>;
  active: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastActivity: Date;
  createdAt: Date;
  expiresAt?: Date;
}

interface SessionState {
  // Sessions
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  activeSessionId: string | null;

  // Messages (keyed by sessionId)
  messages: Record<string, Message[]>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  hasMoreMessages: Record<string, boolean>;

  // Typing indicators
  typingUsers: Record<string, string[]>; // sessionId -> userIds who are typing
  isAssistantTyping: Record<string, boolean>;

  // Pending message (draft)
  pendingMessage: Record<string, string>;

  // Scroll position tracking
  scrollPositions: Record<string, number>;

  // Actions - Sessions
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  setSessionsLoading: (loading: boolean) => void;
  setSessionsError: (error: string | null) => void;
  markSessionRead: (sessionId: string) => void;

  // Actions - Messages
  setMessages: (sessionId: string, messages: Message[]) => void;
  addMessage: (sessionId: string, message: Message) => void;
  prependMessages: (sessionId: string, messages: Message[]) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (sessionId: string, messageId: string) => void;
  setMessagesLoading: (sessionId: string, loading: boolean) => void;
  setMessagesError: (sessionId: string, error: string | null) => void;
  setHasMoreMessages: (sessionId: string, hasMore: boolean) => void;
  clearMessages: (sessionId: string) => void;

  // Actions - Typing
  setTypingUsers: (sessionId: string, userIds: string[]) => void;
  addTypingUser: (sessionId: string, userId: string) => void;
  removeTypingUser: (sessionId: string, userId: string) => void;
  setAssistantTyping: (sessionId: string, typing: boolean) => void;

  // Actions - Pending message
  setPendingMessage: (sessionId: string, message: string) => void;
  clearPendingMessage: (sessionId: string) => void;

  // Actions - Scroll
  setScrollPosition: (sessionId: string, position: number) => void;

  // Actions - Skill Execution
  updateSkillExecution: (
    sessionId: string,
    messageId: string,
    updates: Partial<SkillExecution>
  ) => void;

  // Selectors (computed)
  getActiveSession: () => Session | null;
  getSessionMessages: (sessionId: string) => Message[];
  getUnreadCount: () => number;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      sessions: [],
      sessionsLoading: false,
      sessionsError: null,
      activeSessionId: null,
      messages: {},
      messagesLoading: {},
      messagesError: {},
      hasMoreMessages: {},
      typingUsers: {},
      isAssistantTyping: {},
      pendingMessage: {},
      scrollPositions: {},

      // Actions - Sessions
      setSessions: (sessions) =>
        set((state) => {
          state.sessions = sessions;
        }),

      addSession: (session) =>
        set((state) => {
          // Check if session already exists
          const exists = state.sessions.some((s) => s.id === session.id);
          if (!exists) {
            state.sessions.unshift(session);
            // Initialize empty messages array for new session
            state.messages[session.id] = [];
          }
        }),

      updateSession: (sessionId, updates) =>
        set((state) => {
          const index = state.sessions.findIndex((s) => s.id === sessionId);
          if (index !== -1) {
            state.sessions[index] = { ...state.sessions[index], ...updates };
          }
        }),

      removeSession: (sessionId) =>
        set((state) => {
          state.sessions = state.sessions.filter((s) => s.id !== sessionId);
          delete state.messages[sessionId];
          delete state.typingUsers[sessionId];
          delete state.isAssistantTyping[sessionId];
          delete state.pendingMessage[sessionId];
          if (state.activeSessionId === sessionId) {
            state.activeSessionId = state.sessions[0]?.id ?? null;
          }
        }),

      setActiveSession: (sessionId) =>
        set((state) => {
          state.activeSessionId = sessionId;
          // Mark as read when becoming active
          if (sessionId) {
            const session = state.sessions.find((s) => s.id === sessionId);
            if (session) {
              session.unreadCount = 0;
            }
          }
        }),

      setSessionsLoading: (loading) =>
        set((state) => {
          state.sessionsLoading = loading;
        }),

      setSessionsError: (error) =>
        set((state) => {
          state.sessionsError = error;
        }),

      markSessionRead: (sessionId) =>
        set((state) => {
          const session = state.sessions.find((s) => s.id === sessionId);
          if (session) {
            session.unreadCount = 0;
          }
        }),

      // Actions - Messages
      setMessages: (sessionId, messages) =>
        set((state) => {
          state.messages[sessionId] = messages;
        }),

      addMessage: (sessionId, message) =>
        set((state) => {
          if (!state.messages[sessionId]) {
            state.messages[sessionId] = [];
          }
          state.messages[sessionId].push(message);

          // Update session's last activity and message
          const session = state.sessions.find((s) => s.id === sessionId);
          if (session) {
            session.lastActivity = new Date();
            session.lastMessage = message.content.substring(0, 100);
            // Increment unread if not active session
            if (state.activeSessionId !== sessionId && message.role !== 'user') {
              session.unreadCount += 1;
            }
          }
        }),

      prependMessages: (sessionId, messages) =>
        set((state) => {
          if (!state.messages[sessionId]) {
            state.messages[sessionId] = [];
          }
          state.messages[sessionId] = [...messages, ...state.messages[sessionId]];
        }),

      updateMessage: (sessionId, messageId, updates) =>
        set((state) => {
          const messages = state.messages[sessionId];
          if (messages) {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              messages[index] = { ...messages[index], ...updates };
            }
          }
        }),

      removeMessage: (sessionId, messageId) =>
        set((state) => {
          const messages = state.messages[sessionId];
          if (messages) {
            state.messages[sessionId] = messages.filter((m) => m.id !== messageId);
          }
        }),

      setMessagesLoading: (sessionId, loading) =>
        set((state) => {
          state.messagesLoading[sessionId] = loading;
        }),

      setMessagesError: (sessionId, error) =>
        set((state) => {
          state.messagesError[sessionId] = error;
        }),

      setHasMoreMessages: (sessionId, hasMore) =>
        set((state) => {
          state.hasMoreMessages[sessionId] = hasMore;
        }),

      clearMessages: (sessionId) =>
        set((state) => {
          state.messages[sessionId] = [];
        }),

      // Actions - Typing
      setTypingUsers: (sessionId, userIds) =>
        set((state) => {
          state.typingUsers[sessionId] = userIds;
        }),

      addTypingUser: (sessionId, userId) =>
        set((state) => {
          if (!state.typingUsers[sessionId]) {
            state.typingUsers[sessionId] = [];
          }
          if (!state.typingUsers[sessionId].includes(userId)) {
            state.typingUsers[sessionId].push(userId);
          }
        }),

      removeTypingUser: (sessionId, userId) =>
        set((state) => {
          if (state.typingUsers[sessionId]) {
            state.typingUsers[sessionId] = state.typingUsers[sessionId].filter(
              (id) => id !== userId
            );
          }
        }),

      setAssistantTyping: (sessionId, typing) =>
        set((state) => {
          state.isAssistantTyping[sessionId] = typing;
        }),

      // Actions - Pending message
      setPendingMessage: (sessionId, message) =>
        set((state) => {
          state.pendingMessage[sessionId] = message;
        }),

      clearPendingMessage: (sessionId) =>
        set((state) => {
          delete state.pendingMessage[sessionId];
        }),

      // Actions - Scroll
      setScrollPosition: (sessionId, position) =>
        set((state) => {
          state.scrollPositions[sessionId] = position;
        }),

      // Actions - Skill Execution
      updateSkillExecution: (sessionId, messageId, updates) =>
        set((state) => {
          const messages = state.messages[sessionId];
          if (messages) {
            const message = messages.find((m) => m.id === messageId);
            if (message && message.skillExecution) {
              message.skillExecution = { ...message.skillExecution, ...updates };
            }
          }
        }),

      // Selectors
      getActiveSession: () => {
        const state = get();
        if (!state.activeSessionId) return null;
        return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
      },

      getSessionMessages: (sessionId) => {
        const state = get();
        return state.messages[sessionId] ?? [];
      },

      getUnreadCount: () => {
        const state = get();
        return state.sessions.reduce((total, session) => total + session.unreadCount, 0);
      },
    })),
    { name: 'OpenClawSessionStore' }
  )
);

// Selector hooks
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useActiveSession = () => {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  return activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null;
};
export const useSessionMessages = (sessionId: string) =>
  useSessionStore((state) => state.messages[sessionId] ?? []);
export const useIsAssistantTyping = (sessionId: string) =>
  useSessionStore((state) => state.isAssistantTyping[sessionId] ?? false);
