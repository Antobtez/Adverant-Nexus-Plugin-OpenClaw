import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

/**
 * API Client for OpenClaw Backend
 *
 * Configured axios instance with:
 * - Base URL pointing to Nexus OpenClaw service
 * - Authentication token injection
 * - Request/response interceptors
 * - Type-safe API methods
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login or refresh token
          console.error('Unauthorized - redirecting to login');
          // window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('openclaw_token');
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // Chat API
  chat = {
    sendMessage: (message: string, sessionId?: string) =>
      this.request<{ response: string; sessionId: string }>({
        method: 'POST',
        url: '/api/chat/message',
        data: { message, sessionId },
      }),

    getHistory: (sessionId: string) =>
      this.request<Array<{ role: string; content: string; timestamp: string }>>({
        method: 'GET',
        url: `/api/chat/history/${sessionId}`,
      }),

    createSession: () =>
      this.request<{ sessionId: string }>({
        method: 'POST',
        url: '/api/chat/session',
      }),
  };

  // Skills API
  skills = {
    list: () =>
      this.request<
        Array<{
          id: string;
          name: string;
          description: string;
          category: string;
          parameters: Array<{ name: string; type: string; required: boolean }>;
        }>
      >({
        method: 'GET',
        url: '/api/skills',
      }),

    execute: (skillId: string, parameters: Record<string, any>) =>
      this.request<{ success: boolean; result: any; error?: string }>({
        method: 'POST',
        url: `/api/skills/${skillId}/execute`,
        data: { parameters },
      }),

    getDetails: (skillId: string) =>
      this.request<{
        id: string;
        name: string;
        description: string;
        category: string;
        parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
        examples: Array<{ description: string; parameters: Record<string, any> }>;
      }>({
        method: 'GET',
        url: `/api/skills/${skillId}`,
      }),
  };

  // Channels API
  channels = {
    list: () =>
      this.request<
        Array<{
          id: string;
          type: 'whatsapp' | 'telegram' | 'slack' | 'discord';
          status: 'connected' | 'disconnected' | 'error';
          config: Record<string, any>;
        }>
      >({
        method: 'GET',
        url: '/api/channels',
      }),

    connect: (type: string, config: Record<string, any>) =>
      this.request<{ success: boolean; channelId: string; qrCode?: string }>({
        method: 'POST',
        url: '/api/channels/connect',
        data: { type, config },
      }),

    disconnect: (channelId: string) =>
      this.request<{ success: boolean }>({
        method: 'POST',
        url: `/api/channels/${channelId}/disconnect`,
      }),

    test: (channelId: string) =>
      this.request<{ success: boolean; message: string }>({
        method: 'POST',
        url: `/api/channels/${channelId}/test`,
      }),
  };

  // Cron Jobs API
  cron = {
    list: () =>
      this.request<
        Array<{
          id: string;
          name: string;
          schedule: string;
          skillId: string;
          parameters: Record<string, any>;
          enabled: boolean;
          lastRun?: string;
          nextRun?: string;
        }>
      >({
        method: 'GET',
        url: '/api/cron',
      }),

    create: (job: {
      name: string;
      schedule: string;
      skillId: string;
      parameters: Record<string, any>;
    }) =>
      this.request<{ id: string; success: boolean }>({
        method: 'POST',
        url: '/api/cron',
        data: job,
      }),

    update: (id: string, job: Partial<{
      name: string;
      schedule: string;
      skillId: string;
      parameters: Record<string, any>;
      enabled: boolean;
    }>) =>
      this.request<{ success: boolean }>({
        method: 'PUT',
        url: `/api/cron/${id}`,
        data: job,
      }),

    delete: (id: string) =>
      this.request<{ success: boolean }>({
        method: 'DELETE',
        url: `/api/cron/${id}`,
      }),

    runNow: (id: string) =>
      this.request<{ success: boolean; result: any }>({
        method: 'POST',
        url: `/api/cron/${id}/run`,
      }),
  };

  // Analytics API
  analytics = {
    getMetrics: (range: '24h' | '7d' | '30d') =>
      this.request<{
        skillsExecuted: Array<{ date: string; count: number }>;
        topSkills: Array<{ skillId: string; name: string; count: number }>;
        channelUsage: Array<{ channel: string; count: number }>;
        sessionDuration: Array<{ date: string; avgDuration: number }>;
      }>({
        method: 'GET',
        url: `/api/analytics/metrics?range=${range}`,
      }),

    getQuota: () =>
      this.request<{
        used: number;
        total: number;
        percentage: number;
        resetDate: string;
      }>({
        method: 'GET',
        url: '/api/analytics/quota',
      }),
  };

  // Settings API
  settings = {
    get: () =>
      this.request<{
        modelProvider: 'anthropic' | 'openai' | 'openrouter';
        sessionTimeout: number;
        notifications: {
          email: boolean;
          slack: boolean;
          webhook?: string;
        };
      }>({
        method: 'GET',
        url: '/api/settings',
      }),

    update: (settings: {
      modelProvider?: 'anthropic' | 'openai' | 'openrouter';
      sessionTimeout?: number;
      notifications?: {
        email?: boolean;
        slack?: boolean;
        webhook?: string;
      };
    }) =>
      this.request<{ success: boolean }>({
        method: 'PUT',
        url: '/api/settings',
        data: settings,
      }),
  };

  // Auth API
  auth = {
    getCurrentUser: () =>
      this.request<{
        id: string;
        email: string;
        tier: 'free' | 'pro' | 'enterprise';
      }>({
        method: 'GET',
        url: '/api/auth/me',
      }),

    login: (email: string, password: string) =>
      this.request<{ token: string; user: any }>({
        method: 'POST',
        url: '/api/auth/login',
        data: { email, password },
      }),

    logout: () =>
      this.request<{ success: boolean }>({
        method: 'POST',
        url: '/api/auth/logout',
      }),
  };
}

// Export singleton instance
export const apiClient = new ApiClient();
