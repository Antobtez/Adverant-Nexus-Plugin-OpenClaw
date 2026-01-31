import { useEffect, useState } from 'react';
import { wsClient, type ConnectionStatus } from '@/lib/websocket-client';

/**
 * React hook for WebSocket connection management
 *
 * Provides:
 * - Connection status
 * - Auto-reconnection
 * - Event subscriptions
 *
 * @example
 * const { isConnected, connectionStatus } = useWebSocket();
 */
export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    wsClient.getConnectionStatus()
  );
  const [isConnected, setIsConnected] = useState(wsClient.isConnected());

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = wsClient.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    wsClient,
  };
}
