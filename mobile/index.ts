import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import App from './App';
import { log } from './src/utils/logger';
import { getPlatformInfo, getApiUrl, getWebSocketUrl } from './src/utils/platform';

// Entry point logging
log.info('App entry point reached', undefined, 'Bootstrap');

// FIX: Use proper platform detection utility
const platformInfo = getPlatformInfo();
log.info('Platform detected', platformInfo, 'Bootstrap');
log.info('React Native DevTools connection test', undefined, 'Bootstrap');

// DIAGNOSTIC: Check Firebase availability and version
try {
  const firebaseModule = require('@react-native-firebase/messaging');
  const firebaseVersion = firebaseModule.VERSION || 'unknown';
  log.info('Firebase version detected', {
    version: firebaseVersion,
    hasDefault: !!firebaseModule.default,
    moduleType: typeof firebaseModule
  }, 'Firebase');
} catch (error) {
  log.error('Firebase version check failed', error, 'Firebase');
}

// FIX: Use platform-aware URLs and proper environment checking
const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
  EXPO_PUBLIC_ENABLE_NOTIFICATIONS: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS,
  EXPO_PUBLIC_ENABLE_CALLS: process.env.EXPO_PUBLIC_ENABLE_CALLS,
  // Use platform-aware URLs
  resolvedApiUrl: getApiUrl(),
  resolvedWebSocketUrl: getWebSocketUrl(),
};

log.info('Environment variables check', envVars, 'Environment');

// Register background message handler for FCM
// This must be called outside of any component lifecycle
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  log.info('Setting up FCM background message handler', undefined, 'FCM');
  
  // DIAGNOSTIC: Check if messaging is available before using it
  if (messaging && typeof messaging === 'function') {
    try {
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        log.info('Background message received', {
          messageId: remoteMessage.messageId,
          from: remoteMessage.from,
          hasData: !!remoteMessage.data
        }, 'FCM');

        // You can perform background tasks here
        // For example, update local storage, show notification, etc.

        // The notification will be automatically displayed by the system
        // You can customize it here if needed
      });
      log.info('FCM background handler registered successfully', undefined, 'FCM');
    } catch (error) {
      log.error('Failed to register FCM background handler', error, 'FCM');
    }
  } else {
    log.warn('Firebase messaging not available for background handler', {
      messagingType: typeof messaging,
      isFunction: typeof messaging === 'function'
    }, 'FCM');
  }
}

log.info('Registering root component', undefined, 'Bootstrap');
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
log.info('Root component registered successfully', undefined, 'Bootstrap');
