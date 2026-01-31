'use client';

/**
 * AppShell Component - Main application layout wrapper
 * Combines Sidebar, Header, main content area, and StatusBar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, useIsAuthenticated } from '@/stores';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: React.ReactNode;
  headerTitle?: string;
  onNewAction?: () => void;
  newActionLabel?: string;
  showStatusBar?: boolean;
  className?: string;
}

export function AppShell({
  children,
  headerTitle,
  onNewAction,
  newActionLabel,
  showStatusBar = true,
  className,
}: AppShellProps) {
  const isAuthenticated = useIsAuthenticated();
  const { isAuthLoading, activeSection } = useAppStore();

  // Section titles
  const sectionTitles: Record<string, string> = {
    chat: 'Chat',
    skills: 'Skills',
    channels: 'Channels',
    cron: 'Automation',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading OpenClaw...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
              OC
            </div>
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to OpenClaw
          </h1>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
            Multi-channel AI assistant with 100+ skills
          </p>
          <button
            onClick={() => {
              // TODO: Implement authentication
              console.log('Sign in clicked');
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950', className)}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          title={headerTitle || sectionTitles[activeSection] || 'OpenClaw'}
          onNewAction={onNewAction}
          newActionLabel={newActionLabel}
        />

        {/* Content */}
        <main className="flex flex-1 overflow-hidden">{children}</main>

        {/* Status Bar */}
        {showStatusBar && <StatusBar />}
      </div>
    </div>
  );
}

/**
 * AppShellContent - Wrapper for section-specific content
 * Handles padding and scrolling consistently
 */
interface AppShellContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AppShellContent({ children, className, noPadding }: AppShellContentProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-auto',
        !noPadding && 'p-4 lg:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ContentHeader - Section header within content area
 */
interface ContentHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ContentHeader({ title, description, action, className }: ContentHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex items-start justify-between border-b border-gray-200 pb-4 dark:border-gray-800',
        className
      )}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default AppShell;
