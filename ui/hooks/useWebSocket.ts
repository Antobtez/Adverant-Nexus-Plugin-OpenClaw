'use client';

/**
 * WebSocket Hook - Real-time communication with Zustand store integration
 *
 * Manages Socket.IO connection with:
 * - Automatic reconnection with exponential backoff
 * - Integration with all Zustand stores (app, session, skill, channel, cron)
 * - Event-driven updates to application state
 * - Latency monitoring
 */

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/stores/appStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useChannelStore } from '@/stores/channelStore';
import { useCronStore } from '@/stores/cronStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.adverant.ai';
const WS_PATH = '/openclaw/ws';
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30000;

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // App store actions
  const {
    token,
    setWsConnected,
    setWsReconnecting,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    updateWsLatency,
    setWsError,
  } = useAppStore();

  // Session store actions
  const { addMessage, updateMessage, addSession, updateSession, setAssistantTyping } =
    useSessionStore();

  // Channel store actions
  const { updateConnectionStatus, setWhatsAppQrCode, setWhatsAppConnectionStatus } =
    useChannelStore();

  // Cron store actions
  const { setJobRunning, setJobCompleted, addRunRecord } = useCronStore();

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) {
      return;
    }

    const socket = io(WS_URL, {
      path: WS_PATH,
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[WS] Connected');
      setWsConnected(true);
      resetReconnectAttempts();
      setWsError(null);
      onConnect?.();

      // Start ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        const start = Date.now();
        socket.emit('ping', () => {
          updateWsLatency(Date.now() - start);
        });
      }, PING_INTERVAL_MS);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setWsConnected(false);
      onDisconnect?.(reason);

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    });

    socket.on('reconnecting', () => {
      console.log('[WS] Reconnecting...');
      setWsReconnecting(true);
      incrementReconnectAttempts();
    });

    socket.on('reconnect_failed', () => {
      console.error('[WS] Reconnection failed');
      setWsReconnecting(false);
      setWsError('Failed to reconnect after maximum attempts');
      onError?.(new Error('WebSocket reconnection failed'));
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      setWsError(error.message);
      onError?.(error);
    });

    // Session events
    socket.on('session.created', (data) => {
      addSession({
        id: data.sessionId,
        userId: data.userId,
        organizationId: data.organizationId,
        channelType: data.channelType,
        channelId: data.channelId,
        title: data.title,
        context: data.context || {},
        active: true,
        unreadCount: 0,
        lastActivity: new Date(),
        createdAt: new Date(),
      });
    });

    socket.on('session.updated', (data) => {
      updateSession(data.sessionId, {
        lastActivity: new Date(),
        ...data.updates,
      });
    });

    // Message events
    socket.on('message.received', (data) => {
      addMessage(data.sessionId, {
        id: data.messageId,
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        attachments: data.attachments,
        status: 'delivered',
        timestamp: new Date(data.timestamp),
      });
    });

    socket.on('message.sent', (data) => {
      updateMessage(data.sessionId, data.messageId, {
        status: 'delivered',
      });
    });

    socket.on('typing.started', (data) => {
      setAssistantTyping(data.sessionId, true);
    });

    socket.on('typing.stopped', (data) => {
      setAssistantTyping(data.sessionId, false);
    });

    // Skill execution events
    socket.on('skill.started', (data) => {
      addMessage(data.sessionId, {
        id: data.executionId,
        sessionId: data.sessionId,
        role: 'assistant',
        content: '',
        skillExecution: {
          executionId: data.executionId,
          skillName: data.skillName,
          status: 'running',
          input: data.input,
          startedAt: new Date(),
        },
        status: 'sent',
        timestamp: new Date(),
      });
    });

    socket.on('skill.progress', (data) => {
      updateMessage(data.sessionId, data.executionId, {
        skillExecution: {
          executionId: data.executionId,
          skillName: data.skillName,
          status: 'running',
          progress: data.progress,
          startedAt: new Date(data.startedAt),
        },
      });
    });

    socket.on('skill.completed', (data) => {
      updateMessage(data.sessionId, data.executionId, {
        content: data.summary || '',
        skillExecution: {
          executionId: data.executionId,
          skillName: data.skillName,
          status: 'completed',
          output: data.output,
          executionTimeMs: data.executionTimeMs,
          startedAt: new Date(data.startedAt),
          completedAt: new Date(),
        },
      });
    });

    socket.on('skill.error', (data) => {
      updateMessage(data.sessionId, data.executionId, {
        skillExecution: {
          executionId: data.executionId,
          skillName: data.skillName,
          status: 'error',
          error: data.error,
          startedAt: new Date(data.startedAt),
          completedAt: new Date(),
        },
      });
    });

    // Channel events
    socket.on('channel.connected', (data) => {
      updateConnectionStatus(data.channelId, 'connected');
    });

    socket.on('channel.disconnected', (data) => {
      updateConnectionStatus(data.channelId, 'disconnected', data.reason);
    });

    socket.on('channel.error', (data) => {
      updateConnectionStatus(data.channelId, 'error', data.error);
    });

    // WhatsApp specific events
    socket.on('whatsapp.qr', (data) => {
      setWhatsAppQrCode(data.qrCode);
      setWhatsAppConnectionStatus('scanning');
    });

    socket.on('whatsapp.pairing', () => {
      setWhatsAppConnectionStatus('pairing');
    });

    socket.on('whatsapp.connected', (data) => {
      setWhatsAppConnectionStatus('connected');
      updateConnectionStatus(data.channelId, 'connected');
    });

    // Cron job events
    socket.on('cron.triggered', (data) => {
      setJobRunning(data.jobId);
    });

    socket.on('cron.completed', (data) => {
      setJobCompleted(data.jobId, data.success ? 'success' : 'error', data.error, data.durationMs);

      addRunRecord({
        id: data.runId,
        jobId: data.jobId,
        jobName: data.jobName,
        skillName: data.skillName,
        skillParams: data.skillParams,
        status: data.success ? 'success' : 'error',
        output: data.output,
        error: data.error,
        durationMs: data.durationMs,
        scheduledAt: new Date(data.scheduledAt),
        startedAt: new Date(data.startedAt),
        completedAt: new Date(data.completedAt),
      });
    });

    // Quota events
    socket.on('quota.updated', (data) => {
      useAppStore.getState().setQuota(data);
    });

    socketRef.current = socket;
  }, [
    token,
    setWsConnected,
    setWsReconnecting,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    updateWsLatency,
    setWsError,
    addMessage,
    updateMessage,
    addSession,
    updateSession,
    setAssistantTyping,
    updateConnectionStatus,
    setWhatsAppQrCode,
    setWhatsAppConnectionStatus,
    setJobRunning,
    setJobCompleted,
    addRunRecord,
    onConnect,
    onDisconnect,
    onError,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    setWsConnected(false);
  }, [setWsConnected]);

  // Emit event helper
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WS] Cannot emit - not connected');
    }
  }, []);

  // Send message helper
  const sendMessage = useCallback(
    (sessionId: string, content: string, attachments?: unknown[]) => {
      emit('message.send', { sessionId, content, attachments });
    },
    [emit]
  );

  // Execute skill helper
  const executeSkill = useCallback(
    (sessionId: string, skillName: string, params: Record<string, unknown>) => {
      emit('skill.execute', { sessionId, skillName, params });
    },
    [emit]
  );

  // Create session helper
  const createSession = useCallback(
    (channelType: string, channelId?: string) => {
      emit('session.create', { channelType, channelId });
    },
    [emit]
  );

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, connect, disconnect]);

  // Derive connection status from WebSocket state
  const wsState = useAppStore((state) => state.ws);
  const connectionStatus = wsState.reconnecting
    ? 'Reconnecting...'
    : wsState.connected
      ? 'Connected'
      : wsState.error
        ? 'Error'
        : 'Disconnected';

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    sendMessage,
    executeSkill,
    createSession,
    isConnected: wsState.connected,
    connectionStatus,
    latency: wsState.latency,
    error: wsState.error,
  };
}

export default useWebSocket;
