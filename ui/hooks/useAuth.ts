import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * React hook for authentication management
 *
 * Provides:
 * - Current user data
 * - Login/logout methods
 * - Authentication state
 *
 * @example
 * const { user, isLoading, login, logout } = useAuth();
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => apiClient.auth.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.auth.login(email, password),
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('openclaw_token', data.token);
      // Invalidate and refetch user
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.auth.logout(),
    onSuccess: () => {
      // Remove token
      localStorage.removeItem('openclaw_token');
      // Clear all queries
      queryClient.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
  };
}
