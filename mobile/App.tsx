import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { wsService } from './src/services/api';
import { initializeCallWebSocketHandlers, cleanupCallWebSocketHandlers } from './src/services/callWebSocketHandler';
import { pushNotificationService } from './src/services/pushNotifications';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const { checkAuth, token } = useAuthStore();

  useEffect(() => {
    // Check authentication on app start
    checkAuth();

    // Initialize services when authenticated
    if (token) {
      // Connect to WebSocket
      wsService.connect(token);

      // Initialize call-specific WebSocket handlers
      initializeCallWebSocketHandlers();

      // Initialize push notifications
      pushNotificationService.initialize().catch((error) => {
        console.error('Failed to initialize push notifications:', error);
      });
    }

    // Cleanup on unmount or logout
    return () => {
      cleanupCallWebSocketHandlers();
      wsService.disconnect();
      pushNotificationService.cleanup();
    };
  }, [token]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
