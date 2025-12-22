import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';
import { navigate } from './navigationService';
import { getPlatformInfo } from '../utils/platform';

// Try to import Firebase messaging, but make it optional
let messaging: any = null;
let FirebaseMessaging: any = null;
let isFirebaseAvailable = false;
let isFirebaseConfigured = true; // Assume configured until proven otherwise

try {
  // Import Firebase messaging module
  FirebaseMessaging = require('@react-native-firebase/messaging');
  messaging = FirebaseMessaging.default;
  isFirebaseAvailable = true;
} catch (error) {
  console.warn('Firebase Cloud Messaging is not available, using Expo notifications only');
  isFirebaseAvailable = false;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const type = data.type as string;

    return {
      shouldShowAlert: true,
      shouldPlaySound: type === 'call' || type === 'message',
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export class PushNotificationService {
  private static instance: PushNotificationService;
  private notificationListener: any;
  private responseListener: any;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<string | false> {
    try {
      // Get platform info once at the start
      const platformInfo = getPlatformInfo();

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Get FCM token
      let token: string;

      if ((platformInfo.platform === 'android' || platformInfo.platform === 'ios') && isFirebaseAvailable && isFirebaseConfigured) {
        // Use Firebase Cloud Messaging for native platforms when available
        try {
          token = await this.getFCMToken();
        } catch (fcmError: any) {
          const errorMsg = fcmError?.message || 'Unknown error';
          if (errorMsg.includes('API key') || errorMsg.includes('IllegalArgumentException')) {
            console.warn('⚠️ Firebase FCM is not properly configured. Using Expo notifications as fallback.');
          } else {
            console.warn('Firebase Cloud Messaging failed, falling back to Expo notifications:', fcmError);
          }

          // Fall back to Expo notifications
          if (!platformInfo.isDevice) {
            console.warn('Must use physical device for Push Notifications');
            return false;
          }
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          token = expoPushToken.data;
        }
      } else {
        // Use Expo push notifications for web/other platforms or when Firebase is not available
        if (!platformInfo.isDevice) {
          console.warn('Must use physical device for Push Notifications');
          return false;
        }
        const expoPushToken = await Notifications.getExpoPushTokenAsync();
        token = expoPushToken.data;
      }

      // Register token with backend
      await this.registerToken(token);

      // Setup notification listeners
      this.setupNotificationListeners();

      // Setup FCM listeners for foreground messages
      this.setupFCMListeners();

      return token;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const platformInfo = getPlatformInfo();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string> {
    if (!isFirebaseAvailable || !messaging) {
      throw new Error('Firebase Cloud Messaging is not available');
    }

    try {
      // Check if we already have a token
      const token = await messaging().getToken();
      return token;
    } catch (error: any) {
      // Provide more helpful error messages
      const errorMessage = error?.message || 'Unknown error';

      if (errorMessage.includes('API key') || errorMessage.includes('IllegalArgumentException')) {
        console.warn('Firebase API key error detected. FCM will not be available.');
        console.warn('To fix this issue:');
        console.warn('1. Ensure Firebase Messaging is enabled in Firebase Console');
        console.warn('2. Check that the API key has no restrictions or allows FCM');
        console.warn('3. Verify google-services.json is properly configured');
        console.warn('4. Falling back to Expo push notifications');
        isFirebaseConfigured = false; // Disable future Firebase attempts
      } else {
        console.warn('Failed to get FCM token:', error);
      }

      throw error;
    }
  }

  /**
   * Register device token with backend with retry logic
   */
  async registerToken(token: string, retryCount: number = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds

    try {
      const platformInfo = getPlatformInfo();
      await api.post('/api/users/me/device-token', {
        token,
        platform: platformInfo.platform,
        deviceInfo: {
          model: platformInfo.model || Device.modelName,
          osVersion: platformInfo.osVersion || Device.osVersion,
          manufacturer: Device.manufacturer,
        },
      });
    } catch (error: any) {
      const isNetworkError = !error.response;
      const is401Error = error.response?.status === 401;
      const is5xxError = error.response?.status >= 500 && error.response?.status < 600;

      // Retry on network errors, 401 (might be resolved by token refresh), or server errors
      if ((isNetworkError || is401Error || is5xxError) && retryCount < MAX_RETRIES) {
        console.warn(`Failed to register device token (attempt ${retryCount + 1}/${MAX_RETRIES}). Retrying...`, {
          errorStatus: error.response?.status,
          errorMessage: error.message,
          isNetworkError,
          is401Error,
          is5xxError
        });

        // Wait before retrying with exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the registration
        return this.registerToken(token, retryCount + 1);
      }

      console.error('Failed to register device token after retries:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        retryCount
      });

      // Don't throw the error to prevent app initialization from failing
      // The token will be registered on next app restart or token refresh
    }
  }

  /**
   * Unregister device token from backend
   */
  async unregisterToken(): Promise<void> {
    try {
      const platformInfo = getPlatformInfo();
      let token: string;

      if ((platformInfo.platform === 'android' || platformInfo.platform === 'ios') && isFirebaseAvailable && messaging) {
        try {
          token = await messaging().getToken();
        } catch {
          // Fall back to Expo token
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          token = expoPushToken.data;
        }
      } else {
        const expoPushToken = await Notifications.getExpoPushTokenAsync();
        token = expoPushToken.data;
      }

      await api.delete('/api/users/me/device-token', {
        data: { token },
      });
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for when notification is received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationTapped(response);
      }
    );
  }

  /**
   * Setup FCM listeners
   */
  private setupFCMListeners(): void {
    const platformInfo = getPlatformInfo();

    if (platformInfo.platform !== 'android' && platformInfo.platform !== 'ios') {
      return;
    }

    if (!isFirebaseAvailable || !messaging) {
      return;
    }

    try {
      // Handle foreground messages
      messaging().onMessage(async (remoteMessage: any) => {
        // Display local notification when app is in foreground
        if (remoteMessage.notification) {
          await this.displayLocalNotification(
            remoteMessage.notification.title || 'New notification',
            remoteMessage.notification.body || '',
            remoteMessage.data || {}
          );
        }
      });

      // Handle notification opened when app was in background
      messaging().onNotificationOpenedApp((remoteMessage: any) => {
        if (remoteMessage.data) {
          this.routeToScreen(remoteMessage.data);
        }
      });

      // Check if app was opened by a notification (when it was killed)
      messaging()
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            if (remoteMessage.data) {
              // Delay routing to ensure navigation is ready
              setTimeout(() => {
                this.routeToScreen(remoteMessage.data || {});
              }, 1000);
            }
          }
        })
        .catch((error: any) => {
          console.error('Failed to get initial notification:', error);
        });

      // Handle token refresh
      messaging().onTokenRefresh(async (token: string) => {
        await this.registerToken(token);
      });
    } catch (error) {
      console.error('Failed to setup FCM listeners:', error);
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data;

    // You can add custom logic here (e.g., update badge count, show in-app alert)
  }

  /**
   * Handle notification tapped by user
   */
  private handleNotificationTapped(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;

    this.routeToScreen(data);
  }

  /**
   * Route to appropriate screen based on notification data
   */
  private routeToScreen(data: any): void {
    const type = data.type as string;

    switch (type) {
      case 'message':
        if (data.conversationId) {
          navigate('Chat', { conversationId: data.conversationId });
        }
        break;

      case 'call':
        if (data.callId && data.call) {
          try {
            const call = typeof data.call === 'string' ? JSON.parse(data.call) : data.call;
            navigate('IncomingCall', { call });
          } catch (error) {
            console.error('Failed to parse call data:', error);
          }
        }
        break;

      case 'group_message':
        if (data.groupId) {
          navigate('Chat', { conversationId: data.groupId });
        }
        break;

      case 'contact_request':
        navigate('ContactRequests', {});
        break;

      case 'system':
        // Handle system notifications (e.g., navigate to settings)
        break;

      default:
    }
  }

  /**
   * Display a local notification
   */
  async displayLocalNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Schedule a notification for later
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerSeconds: number,
    data?: any
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
      },
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<boolean> {
    try {
      const platformInfo = getPlatformInfo();

      if ((platformInfo.platform === 'android' || platformInfo.platform === 'ios') && isFirebaseAvailable && messaging) {
        try {
          const authStatus = await messaging().hasPermission();
          return (
            authStatus === FirebaseMessaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === FirebaseMessaging.AuthorizationStatus.PROVISIONAL
          );
        } catch {
          // Fall back to Expo permissions
          const { status } = await Notifications.getPermissionsAsync();
          return status === 'granted';
        }
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
      }
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return false;
    }
  }

  /**
   * Set notification badge count (iOS only)
   */
  async setBadgeCount(count: number): Promise<void> {
    const platformInfo = getPlatformInfo();
    if (platformInfo.platform === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    const platformInfo = getPlatformInfo();
    if (platformInfo.platform === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
