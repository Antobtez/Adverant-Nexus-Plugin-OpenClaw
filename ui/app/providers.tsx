'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/stores/appStore';

/**
 * Theme Provider - Handles theme switching and system preference detection
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // Use system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use explicit theme
      root.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

/**
 * Auth Initializer - Checks for existing auth state on mount
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, setToken, setAuthLoading } = useAppStore();

  useEffect(() => {
    // Check for existing auth state
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('openclaw_token');
        const userStr = localStorage.getItem('openclaw_user');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          setToken(token);
          setUser(user);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        // Clear invalid state
        localStorage.removeItem('openclaw_token');
        localStorage.removeItem('openclaw_user');
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, [setUser, setToken, setAuthLoading]);

  return <>{children}</>;
}

/**
 * Root providers for the OpenClaw UI
 *
 * Wraps the application with:
 * - TanStack Query for data fetching
 * - Radix UI Tooltip Provider
 * - Theme management
 * - Auth initialization
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthInitializer>
          <TooltipProvider delayDuration={400}>
            {children}
          </TooltipProvider>
        </AuthInitializer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
