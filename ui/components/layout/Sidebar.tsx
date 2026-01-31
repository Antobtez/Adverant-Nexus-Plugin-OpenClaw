'use client';

/**
 * Sidebar Component - Navigation sidebar with section switching
 * Features collapsible design, active section highlighting, and notification badges
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, type ActiveSection } from '@/stores';
import { useSessionStore } from '@/stores/sessionStore';
import {
  MessageSquare,
  Sparkles,
  Radio,
  Clock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';

interface NavItem {
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'cron', label: 'Automation', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, toggleSidebar, unreadNotifications } =
    useAppStore();

  // Get unread message count from session store
  const unreadCount = useSessionStore((state) => state.getUnreadCount());

  // Add badge counts to nav items
  const itemsWithBadges = navItems.map((item) => ({
    ...item,
    badge: item.id === 'chat' ? unreadCount : undefined,
  }));

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
              OC
            </div>
            <span className="font-semibold">OpenClaw</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
            OC
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {itemsWithBadges.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}

              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={cn(
                    'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-600 text-white',
                    sidebarCollapsed && 'absolute -right-1 -top-1'
                  )}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-gray-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && ` (${item.badge})`}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Notifications indicator */}
      {unreadNotifications > 0 && (
        <div className="border-t border-gray-800 px-2 py-2">
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Bell className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Notifications</span>}
            <span
              className={cn(
                'flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white',
                sidebarCollapsed ? 'absolute -right-1 -top-1' : 'ml-auto'
              )}
            >
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          </button>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
