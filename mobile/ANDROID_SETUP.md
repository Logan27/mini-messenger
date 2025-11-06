# Android Setup Guide

## Overview

This guide will help you set up and run the Android version of the Messenger mobile app. The app has been configured to work **without Firebase Cloud Messaging** by default, using Expo's push notification service as a fallback.

## Quick Start (Without Firebase)

The app will work out of the box with the default configuration:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on Android:
   ```bash
   npm run android
   ```

The app will use Expo's notification service instead of Firebase Cloud Messaging.

## Java Exception Fixes

### What was fixed?

The app previously had Java exceptions that prevented it from launching on Android due to:

1. **Missing Firebase Configuration**: The app required `google-services.json` but it wasn't included
2. **Mandatory Firebase Initialization**: Firebase was being initialized unconditionally
3. **No Error Handling**: Firebase errors would crash the entire app

### How was it fixed?

1. **Made Firebase Optional**: The push notification service now checks if Firebase is available and falls back to Expo notifications
2. **Added Error Handling**: All Firebase operations are wrapped in try-catch blocks
3. **Provided Default Config**: A placeholder `google-services.json` is included to prevent build errors

## Firebase Cloud Messaging Setup (Optional)

If you want to use Firebase Cloud Messaging for better push notification support:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Add an Android app to your project
4. Use package name: `com.messenger.app`

### 2. Download google-services.json

1. In the Firebase Console, go to Project Settings
2. Select your Android app
3. Download the `google-services.json` file
4. Replace the placeholder file at `mobile/google-services.json` with your downloaded file

### 3. Enable Cloud Messaging

1. In Firebase Console, go to "Cloud Messaging"
2. Note your Server Key (needed for backend configuration)
3. Enable "Cloud Messaging API" in Google Cloud Console

### 4. Update Backend Configuration

Update your backend `.env` file with Firebase credentials:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### 5. Rebuild the App

After replacing `google-services.json`, rebuild the app:

```bash
# Clean the build
rm -rf android/build
rm -rf android/app/build

# Rebuild
npm run android
```

## Troubleshooting

### App not launching / Java exceptions

If you still see Java exceptions:

1. **Check Firebase Configuration**:
   - Ensure `google-services.json` exists in the `mobile/` directory
   - Verify the package name matches: `com.messenger.app`

2. **Clear Build Cache**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **Check Logs**:
   ```bash
   npx react-native log-android
   ```

4. **Common Error Messages**:

   - `"Default FirebaseApp is not initialized"`: Firebase is not properly configured
     - **Solution**: The app should handle this gracefully and use Expo notifications instead

   - `"google-services.json is missing"`: The configuration file is not found
     - **Solution**: Ensure the placeholder file exists or download from Firebase

   - `"FirebaseApp initialization unsuccessful"`: Invalid Firebase configuration
     - **Solution**: Replace placeholder with real Firebase config or app will use fallback

### Push Notifications Not Working

1. **Check Permissions**:
   - Android 13+ requires runtime notification permission
   - The app will request this automatically

2. **Verify Backend Connection**:
   - Ensure the backend API is running
   - Check `.env` file has correct `EXPO_PUBLIC_API_URL`

3. **Test with Expo Notifications**:
   - Even without Firebase, Expo notifications should work in development
   - Use Expo Go app for testing

### Build Errors

1. **Gradle Build Failed**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   rm -rf node_modules
   npm install
   ```

2. **Metro Bundler Issues**:
   ```bash
   npm start -- --reset-cache
   ```

## Architecture Notes

### Push Notification Service

The `src/services/pushNotifications.ts` service now:

- **Detects Firebase Availability**: Checks if Firebase is properly configured
- **Graceful Fallback**: Uses Expo notifications if Firebase is unavailable
- **Error Resilience**: Catches and handles Firebase initialization errors
- **Dual Support**: Works with both Firebase and Expo notification systems

### Code Structure

```typescript
// Firebase is loaded dynamically
let messaging: any = null;
let isFirebaseAvailable = false;

try {
  messaging = require('@react-native-firebase/messaging').default;
  isFirebaseAvailable = true;
} catch (error) {
  // Falls back to Expo notifications
}
```

## Development vs Production

### Development
- Use Expo notifications (no Firebase setup required)
- Faster iteration and testing
- Works on emulators and physical devices

### Production
- Recommended to use Firebase Cloud Messaging
- Better delivery rates and reliability
- Support for background notifications
- Follow Firebase setup steps above

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging for React Native](https://rnfirebase.io/messaging/usage)
- [Android Push Notification Guide](https://developer.android.com/develop/ui/views/notifications)

## Need Help?

If you encounter issues:

1. Check the logs: `npx react-native log-android`
2. Review the console output for Firebase warnings
3. Ensure all dependencies are installed: `npm install`
4. Try clearing caches: `npm start -- --reset-cache`

The app is now resilient to Firebase configuration issues and will work out of the box!
