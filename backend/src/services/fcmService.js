import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import admin from 'firebase-admin';

import config from '../config/index.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FcmService {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      // Skip initialization if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        logger.info('Firebase Admin SDK already initialized');
        return;
      }

      // Check if Firebase is configured via service account file
      if (config.firebase.serviceAccountPath) {
        const serviceAccountPath = path.resolve(
          __dirname,
          '../..',
          config.firebase.serviceAccountPath
        );

        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.initialized = true;
          logger.info('Firebase Admin SDK initialized with service account file');
          return;
        } else {
          logger.warn('Firebase service account file not found at:', serviceAccountPath);
        }
      }

      // Check if Firebase is configured via environment variables
      if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            clientEmail: config.firebase.clientEmail,
            privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.initialized = true;
        logger.info('Firebase Admin SDK initialized with environment variables');
        return;
      }

      logger.warn(
        'Firebase Admin SDK not initialized. Push notifications will not work. ' +
          'Please configure Firebase credentials in environment variables or service account file.'
      );
    } catch (error) {
      logger.error('Error initializing Firebase Admin SDK:', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendPushNotification(deviceToken, title, body, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase Admin SDK not initialized. Cannot send push notification.');
      return { success: false, error: 'FCM not initialized' };
    }

    if (!deviceToken) {
      logger.warn('Device token is required to send push notification');
      return { success: false, error: 'Device token required' };
    }

    // Convert data values to strings (FCM requirement)
    const stringifiedData = {};
    Object.keys(data).forEach(key => {
      stringifiedData[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
    });

    const message = {
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      token: deviceToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      logger.info('Successfully sent push notification', {
        messageId: response,
        deviceToken: `${deviceToken.substring(0, 20)}...`,
      });
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Error sending push notification', {
        error: error.message,
        code: error.code,
        deviceToken: `${deviceToken.substring(0, 20)}...`,
      });

      // Handle invalid tokens
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return { success: false, error: 'Invalid token', shouldDelete: true };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notifications to multiple devices
   */
  async sendMulticastNotification(deviceTokens, title, body, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase Admin SDK not initialized. Cannot send push notifications.');
      return { success: false, error: 'FCM not initialized' };
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      logger.warn('Device tokens are required to send push notifications');
      return { success: false, error: 'Device tokens required' };
    }

    // Convert data values to strings (FCM requirement)
    const stringifiedData = {};
    Object.keys(data).forEach(key => {
      stringifiedData[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
    });

    const message = {
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      tokens: deviceTokens,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info('Successfully sent multicast push notifications', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalCount: deviceTokens.length,
      });

      // Collect invalid tokens
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(deviceTokens[idx]);
        }
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.error('Error sending multicast push notifications', {
        error: error.message,
        code: error.code,
        tokenCount: deviceTokens.length,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if FCM is initialized
   */
  isInitialized() {
    return this.initialized;
  }
}

export default new FcmService();
