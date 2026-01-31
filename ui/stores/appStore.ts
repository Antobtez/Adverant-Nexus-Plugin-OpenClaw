/**
 * Application Store - Global app state management
 * Handles authentication, WebSocket connection, quota, and UI state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  tier: 'open_source' | 'teams' | 'government';
  avatar?: string;
}

export interface QuotaLimits {
  max_sessions: number;
  max_skills_per_minute: number;
  max_channels: number;
  max_cron_jobs: number;
}

export interface Quota {
  tier: string;
  limits: QuotaLimits;
  current: {
    sessions: number;
    skills_this_minute: number;
    channels: number;
    cron_jobs: number;
  };
}

export interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastPing: Date | null;
  latency: number;
  error: string | null;
}

export type ActiveSection = 'chat' | 'skills' | 'channels' | 'cron' | 'analytics' | 'settings';
export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  // Authentication
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  // WebSocket
  ws: WebSocketState;

  // Quota
  quota: Quota | null;

  // UI State
  sidebarCollapsed: boolean;
  activeSection: ActiveSection;
  primaryPanelWidth: number;
  detailPanelWidth: number;
  isDetailPanelOpen: boolean;

  // Theme
  theme: ThemeMode;

  // Notifications
  unreadNotifications: number;

  // Actions - Auth
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  // Actions - WebSocket
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  updateWsLatency: (latency: number) => void;
  setWsError: (error: string | null) => void;

  // Actions - Quota
  setQuota: (quota: Quota) => void;
  updateQuotaCurrent: (updates: Partial<Quota['current']>) => void;

  // Actions - UI
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveSection: (section: ActiveSection) => void;
  setPrimaryPanelWidth: (width: number) => void;
  setDetailPanelWidth: (width: number) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;

  // Actions - Theme
  setTheme: (theme: ThemeMode) => void;

  // Actions - Notifications
  setUnreadNotifications: (count: number) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state - Auth
        user: null,
        token: null,
        isAuthenticated: false,
        isAuthLoading: true,

        // Initial state - WebSocket
        ws: {
          connected: false,
          reconnecting: false,
          reconnectAttempts: 0,
          lastPing: null,
          latency: 0,
          error: null,
        },

        // Initial state - Quota
        quota: null,

        // Initial state - UI
        sidebarCollapsed: false,
        activeSection: 'chat',
        primaryPanelWidth: 320,
        detailPanelWidth: 400,
        isDetailPanelOpen: true,

        // Initial state - Theme
        theme: 'system',

        // Initial state - Notifications
        unreadNotifications: 0,

        // Actions - Auth
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          }),

        setToken: (token) =>
          set((state) => {
            state.token = token;
          }),

        setAuthLoading: (loading) =>
          set((state) => {
            state.isAuthLoading = loading;
          }),

        logout: () =>
          set((state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.quota = null;
          }),

        // Actions - WebSocket
        setWsConnected: (connected) =>
          set((state) => {
            state.ws.connected = connected;
            if (connected) {
              state.ws.reconnecting = false;
              state.ws.reconnectAttempts = 0;
              state.ws.error = null;
            }
          }),

        setWsReconnecting: (reconnecting) =>
          set((state) => {
            state.ws.reconnecting = reconnecting;
          }),

        incrementReconnectAttempts: () =>
          set((state) => {
            state.ws.reconnectAttempts += 1;
          }),

        resetReconnectAttempts: () =>
          set((state) => {
            state.ws.reconnectAttempts = 0;
          }),

        updateWsLatency: (latency) =>
          set((state) => {
            state.ws.latency = latency;
            state.ws.lastPing = new Date();
          }),

        setWsError: (error) =>
          set((state) => {
            state.ws.error = error;
          }),

        // Actions - Quota
        setQuota: (quota) =>
          set((state) => {
            state.quota = quota;
          }),

        updateQuotaCurrent: (updates) =>
          set((state) => {
            if (state.quota) {
              state.quota.current = { ...state.quota.current, ...updates };
            }
          }),

        // Actions - UI
        toggleSidebar: () =>
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          }),

        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.sidebarCollapsed = collapsed;
          }),

        setActiveSection: (section) =>
          set((state) => {
            state.activeSection = section;
          }),

        setPrimaryPanelWidth: (width) =>
          set((state) => {
            state.primaryPanelWidth = width;
          }),

        setDetailPanelWidth: (width) =>
          set((state) => {
            state.detailPanelWidth = width;
          }),

        toggleDetailPanel: () =>
          set((state) => {
            state.isDetailPanelOpen = !state.isDetailPanelOpen;
          }),

        setDetailPanelOpen: (open) =>
          set((state) => {
            state.isDetailPanelOpen = open;
          }),

        // Actions - Theme
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),

        // Actions - Notifications
        setUnreadNotifications: (count) =>
          set((state) => {
            state.unreadNotifications = count;
          }),

        incrementNotifications: () =>
          set((state) => {
            state.unreadNotifications += 1;
          }),

        clearNotifications: () =>
          set((state) => {
            state.unreadNotifications = 0;
          }),
      })),
      {
        name: 'openclaw-app-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          primaryPanelWidth: state.primaryPanelWidth,
          detailPanelWidth: state.detailPanelWidth,
          isDetailPanelOpen: state.isDetailPanelOpen,
          activeSection: state.activeSection,
        }),
      }
    ),
    { name: 'OpenClawAppStore' }
  )
);

// Selector hooks for common patterns
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useWsStatus = () => useAppStore((state) => state.ws);
export const useQuota = () => useAppStore((state) => state.quota);
export const useTheme = () => useAppStore((state) => state.theme);
export const useActiveSection = () => useAppStore((state) => state.activeSection);
