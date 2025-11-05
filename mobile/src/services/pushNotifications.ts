import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import api from './api';
import { navigate } from './navigationService';

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
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Get FCM token
      let token: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Use Firebase Cloud Messaging for native platforms
        token = await this.getFCMToken();
      } else {
        // Use Expo push notifications for web/other platforms
        if (!Device.isDevice) {
          console.warn('Must use physical device for Push Notifications');
          return false;
        }
        const expoPushToken = await Notifications.getExpoPushTokenAsync();
        token = expoPushToken.data;
      }

      console.log('Push notification token:', token);

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
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ requires runtime permission
        const authStatus = await messaging().requestPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      } else if (Platform.OS === 'ios') {
        // iOS requires permission request
        const authStatus = await messaging().requestPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      } else {
        // Use Expo notifications API
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        return finalStatus === 'granted';
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string> {
    try {
      // Check if we already have a token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      throw error;
    }
  }

  /**
   * Register device token with backend
   */
  async registerToken(token: string): Promise<void> {
    try {
      await api.post('/api/users/me/device-token', {
        token,
        platform: Platform.OS,
        deviceInfo: {
          model: Device.modelName,
          osVersion: Device.osVersion,
          manufacturer: Device.manufacturer,
        },
      });
      console.log('Device token registered with backend');
    } catch (error) {
      console.error('Failed to register device token:', error);
      throw error;
    }
  }

  /**
   * Unregister device token from backend
   */
  async unregisterToken(): Promise<void> {
    try {
      let token: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        token = await messaging().getToken();
      } else {
        const expoPushToken = await Notifications.getExpoPushTokenAsync();
        token = expoPushToken.data;
      }

      await api.delete('/api/users/me/device-token', {
        data: { token },
      });
      console.log('Device token unregistered from backend');
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
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        this.handleNotificationTapped(response);
      }
    );
  }

  /**
   * Setup FCM listeners
   */
  private setupFCMListeners(): void {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('FCM message received in foreground:', remoteMessage);

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
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      if (remoteMessage.data) {
        this.routeToScreen(remoteMessage.data);
      }
    });

    // Check if app was opened by a notification (when it was killed)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          if (remoteMessage.data) {
            // Delay routing to ensure navigation is ready
            setTimeout(() => {
              this.routeToScreen(remoteMessage.data || {});
            }, 1000);
          }
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      await this.registerToken(token);
    });
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    console.log('Handling notification data:', data);

    // You can add custom logic here (e.g., update badge count, show in-app alert)
  }

  /**
   * Handle notification tapped by user
   */
  private handleNotificationTapped(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    console.log('User tapped notification with data:', data);

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
        console.log('Unknown notification type:', type);
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
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } else {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    }
  }

  /**
   * Set notification badge count (iOS only)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
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
