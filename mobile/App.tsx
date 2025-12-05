import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useSettingsStore } from './src/stores/settingsStore';
import { wsService } from './src/services/api';
import { initializeCallWebSocketHandlers, cleanupCallWebSocketHandlers } from './src/services/callWebSocketHandler';
import { pushNotificationService } from './src/services/pushNotifications';
import { log } from './src/utils/logger';

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
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // App initialization logging
    log.info('App component mounting', undefined, 'App');
    log.debug('React Native DevTools connection test', undefined, 'App');

    // FIX: Use proper platform detection utility
    const { getPlatformInfo, getApiUrl, getWebSocketUrl } = require('./src/utils/platform');
    const platformInfo = getPlatformInfo();

    log.info('Platform detected', platformInfo, 'App');

    // FIX: Use platform-aware URLs and proper environment checking
    const envConfig = {
      API_URL: process.env.EXPO_PUBLIC_API_URL,
      WS_URL: process.env.EXPO_PUBLIC_WS_URL,
      NODE_ENV: process.env.NODE_ENV,
      APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
      APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
      ENABLE_NOTIFICATIONS: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS,
      ENABLE_CALLS: process.env.EXPO_PUBLIC_ENABLE_CALLS,
      // Use platform-aware resolved URLs
      resolvedApiUrl: getApiUrl(),
      resolvedWebSocketUrl: getWebSocketUrl(),
    };

    log.debug('Environment configuration', envConfig, 'App');

    // Load settings on app start
    log.info('Loading user settings from storage');
    loadSettings();

    // Check authentication on app start
    log.auth('Checking authentication...');
    checkAuth();

    // Initialize services when authenticated
    if (token) {
      log.auth('User authenticated, initializing services');
      
      // Connect to WebSocket
      log.websocket('Connecting to WebSocket service');
      wsService.connect(token);

      // Initialize call-specific WebSocket handlers
      log.websocket('Initializing call WebSocket handlers');
      initializeCallWebSocketHandlers();

      // Initialize push notifications
      log.info('Initializing push notifications');
      pushNotificationService.initialize().catch((error) => {
        log.error('Failed to initialize push notifications', error, 'PushNotifications');
      });
    } else {
      log.auth('No authentication token found');
    }

    // Cleanup on unmount or logout
    return () => {
      log.info('Cleaning up services on component unmount');
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
