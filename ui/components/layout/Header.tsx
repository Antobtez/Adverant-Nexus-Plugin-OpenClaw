'use client';

/**
 * Header Component - Top navigation bar
 * Shows connection status, user info, and quick actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, useUser, useWsStatus, useQuota } from '@/stores';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  onNewAction?: () => void;
  newActionLabel?: string;
}

export function Header({ title, onNewAction, newActionLabel }: HeaderProps) {
  const user = useUser();
  const wsStatus = useWsStatus();
  const quota = useQuota();
  const { theme, setTheme, logout } = useAppStore();

  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = React.useState(false);

  // Connection status display
  const connectionStatus = React.useMemo(() => {
    if (wsStatus.connected) {
      return {
        icon: Wifi,
        label: 'Connected',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      };
    }
    if (wsStatus.reconnecting) {
      return {
        icon: RefreshCw,
        label: `Reconnecting... (${wsStatus.reconnectAttempts})`,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        animate: true,
      };
    }
    return {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    };
  }, [wsStatus]);

  // Theme icon
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Left section - Title and breadcrumb */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        )}
      </div>

      {/* Right section - Status, actions, user */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
            connectionStatus.bgColor,
            connectionStatus.color
          )}
        >
          <connectionStatus.icon
            className={cn('h-3.5 w-3.5', connectionStatus.animate && 'animate-spin')}
          />
          <span>{connectionStatus.label}</span>
          {wsStatus.connected && wsStatus.latency > 0 && (
            <span className="text-gray-500">({wsStatus.latency}ms)</span>
          )}
        </div>

        {/* Tier Badge */}
        {quota && (
          <div className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {quota.tier.replace('_', ' ')}
          </div>
        )}

        {/* New Action Button */}
        {onNewAction && (
          <button
            onClick={onNewAction}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {newActionLabel || 'New'}
          </button>
        )}

        {/* Theme Toggle */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            onBlur={() => setTimeout(() => setThemeMenuOpen(false), 150)}
            className="flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ThemeIcon className="h-5 w-5" />
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value as 'light' | 'dark' | 'system');
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                    theme === option.value
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <button className="flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />
              )}
            </div>
            {user && (
              <div className="hidden text-left md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
              </div>
            )}
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {user && (
                <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700 md:hidden">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                </div>
              )}

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  useAppStore.getState().setActiveSection('settings');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
