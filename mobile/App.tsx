import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { wsService } from './src/services/api';
import { initializeCallWebSocketHandlers, cleanupCallWebSocketHandlers } from './src/services/callWebSocketHandler';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

    // Connect to WebSocket when authenticated
    if (token) {
      wsService.connect(token);
      // Initialize call-specific WebSocket handlers
      initializeCallWebSocketHandlers();
    }

    // Cleanup WebSocket on unmount
    return () => {
      cleanupCallWebSocketHandlers();
      wsService.disconnect();
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
