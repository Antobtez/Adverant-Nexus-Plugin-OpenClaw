import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Client for OpenClaw Real-time Communication
 *
 * Manages Socket.IO connection with:
 * - Auto-reconnection
 * - Event subscription
 * - Authentication
 * - Connection state management
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export type MessageEvent = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

export type SkillExecutionEvent = {
  skillId: string;
  status: 'started' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: string;
};

export type ChannelStatusEvent = {
  channelId: string;
  type: 'whatsapp' | 'telegram' | 'slack' | 'discord';
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  qrCode?: string;
};

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    const token = this.getAuthToken();

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.updateConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('error');
      } else {
        this.updateConnectionStatus('connecting');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
    });
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('openclaw_token');
  }

  private updateConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  // Public API
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public onConnectionStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusCallbacks.push(callback);
    callback(this.connectionStatus); // Call immediately with current status

    // Return unsubscribe function
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
    };
  }

  // Event Subscriptions
  public onMessage(callback: (message: MessageEvent) => void) {
    if (!this.socket) return () => {};

    this.socket.on('message', callback);
    return () => this.socket?.off('message', callback);
  }

  public onTyping(callback: (data: { sessionId: string; isTyping: boolean }) => void) {
    if (!this.socket) return () => {};

    this.socket.on('typing', callback);
    return () => this.socket?.off('typing', callback);
  }

  public onSkillExecution(callback: (event: SkillExecutionEvent) => void) {
    if (!this.socket) return () => {};

    this.socket.on('skill:execution', callback);
    return () => this.socket?.off('skill:execution', callback);
  }

  public onChannelStatus(callback: (event: ChannelStatusEvent) => void) {
    if (!this.socket) return () => {};

    this.socket.on('channel:status', callback);
    return () => this.socket?.off('channel:status', callback);
  }

  public onCronJobRun(callback: (data: { jobId: string; success: boolean; result?: any }) => void) {
    if (!this.socket) return () => {};

    this.socket.on('cron:run', callback);
    return () => this.socket?.off('cron:run', callback);
  }

  // Event Emitters
  public sendMessage(message: string, sessionId: string) {
    if (!this.socket?.connected) {
      console.error('[WebSocket] Cannot send message - not connected');
      return;
    }

    this.socket.emit('message:send', { message, sessionId });
  }

  public setTyping(sessionId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:set', { sessionId, isTyping });
  }

  public joinSession(sessionId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('session:join', { sessionId });
  }

  public leaveSession(sessionId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('session:leave', { sessionId });
  }

  // Cleanup
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateConnectionStatus('disconnected');
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
