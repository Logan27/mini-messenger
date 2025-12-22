import axios from 'axios';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Firebase configuration (you'll need to add these to .env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize Firebase
export const initializeFirebase = () => {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('Firebase configuration not complete. Push notifications will not work.');
      return false;
    }

    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
      messaging = getMessaging(firebaseApp);
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return false;
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get FCM token
export const getFCMToken = async (vapidKey?: string): Promise<string | null> => {
  try {
    if (!messaging) {
      console.warn('Firebase messaging not initialized');
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (currentToken) {
      return currentToken;
    } else {
      console.warn('No FCM token available. Request permission first.');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Register device token with backend
export const registerDeviceToken = async (token: string, deviceName?: string) => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_URL}/push/register`,
      {
        token,
        deviceType: 'web',
        deviceName: deviceName || navigator.userAgent,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

// Unregister device token
export const unregisterDeviceToken = async (token: string) => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_URL}/push/unregister`,
      { token },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error unregistering device token:', error);
    throw error;
  }
};

// Get push notification status
export const getPushNotificationStatus = async () => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${API_URL}/push/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Error getting push status:', error);
    throw error;
  }
};

// Send test notification
export const sendTestNotification = async () => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_URL}/push/test`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) {
    console.warn('Firebase messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

// Complete push notification setup
export const setupPushNotifications = async (): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> => {
  try {
    // Initialize Firebase
    const initialized = initializeFirebase();
    if (!initialized) {
      return {
        success: false,
        error: 'Firebase not configured. Please add Firebase credentials to .env',
      };
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Notification permission denied',
      };
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      return {
        success: false,
        error: 'Failed to get FCM token',
      };
    }

    // Register with backend
    await registerDeviceToken(token);

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Push notification setup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to setup push notifications',
    };
  }
};

export default {
  initializeFirebase,
  requestNotificationPermission,
  getFCMToken,
  registerDeviceToken,
  unregisterDeviceToken,
  getPushNotificationStatus,
  sendTestNotification,
  onForegroundMessage,
  setupPushNotifications,
};
