import admin from 'firebase-admin';

// TODO: Add fcm-service-account.json to the config directory
// const serviceAccount = require('../config/fcm-service-account.json');

class FcmService {
  constructor() {
    // try {
    //   admin.initializeApp({
    //     credential: admin.credential.cert(serviceAccount)
    //   });
    //   console.log('Firebase Admin SDK initialized');
    // } catch (error) {
    //   console.error('Error initializing Firebase Admin SDK:', error);
    // }
  }

  async sendPushNotification(deviceToken, title, body, data) {
    if (!admin.apps.length) {
      console.warn('Firebase Admin SDK not initialized. Cannot send push notification.');
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: deviceToken,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

export default new FcmService();
