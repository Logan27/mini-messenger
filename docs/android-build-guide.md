# Android App Build Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Development Build](#development-build)
6. [Production Build](#production-build)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **Java JDK** 11 or 17 (required for Android builds)
- **Android Studio** (for Android SDK and emulator)
- **EAS CLI**: `npm install -g eas-cli`
- **Expo CLI**: `npm install -g @expo/cli`

### Android SDK Requirements
- Android SDK Platform 33 (Android 13)
- Android SDK Build-Tools 33.0.0+
- Android Emulator (optional, for testing)

### EAS Account Setup
```bash
# Login to Expo account
eas login

# Configure project
cd mobile
eas build:configure
```

## Initial Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Verify Installation

```bash
# Check Expo CLI
expo --version

# Check EAS CLI
eas --version

# Verify Java installation
java -version

# Verify Android SDK
echo $ANDROID_SDK_ROOT
```

## Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add an Android app with package name: `com.messenger.app`

### 2. Download google-services.json

1. In Firebase Console, go to Project Settings
2. Under "Your apps", select Android app
3. Download `google-services.json`
4. Place in `/mobile/google-services.json`

**Example structure** (see `google-services.json.example`):
```json
{
  "project_info": {
    "project_id": "your-project-id",
    "project_number": "123456789"
  },
  "client": [...]
}
```

### 3. Enable Firebase Services

Enable the following in Firebase Console:
- ✅ **Firebase Cloud Messaging (FCM)** - For push notifications
- ✅ **Firebase Authentication** (optional) - For social login
- ✅ **Firebase Analytics** (optional) - For app analytics

### 4. Configure Push Notifications

```bash
# Get FCM Server Key
# Firebase Console → Project Settings → Cloud Messaging → Server Key
```

Add server key to backend `.env`:
```env
FCM_SERVER_KEY=your_server_key_here
```

## Environment Configuration

### 1. Development Environment

Create `/mobile/.env` (already exists):
```env
# API Configuration
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000

# App Configuration
EXPO_PUBLIC_APP_NAME=Messenger
EXPO_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_CALLS=true

# File Upload Configuration
EXPO_PUBLIC_MAX_FILE_SIZE=10485760
EXPO_PUBLIC_SUPPORTED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt
```

**Note**: `10.0.2.2` is Android emulator's localhost alias. Use your machine's IP for physical devices.

### 2. Production Environment

Create `/mobile/.env.production`:
```env
# Production API Configuration
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_WS_URL=wss://api.yourdomain.com

# App Configuration
EXPO_PUBLIC_APP_NAME=Messenger
EXPO_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_CALLS=true

# File Upload Configuration
EXPO_PUBLIC_MAX_FILE_SIZE=10485760
EXPO_PUBLIC_SUPPORTED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt
```

## Development Build

### Option 1: Expo Go (Quick Testing)

**Limitations**: Cannot test native modules (Firebase, biometric auth)

```bash
cd mobile

# Start development server
npm start

# Scan QR code with Expo Go app
```

### Option 2: Development Build (Recommended)

**Includes all native modules**

```bash
cd mobile

# Build development client
eas build --profile development --platform android

# Or build locally (requires Android Studio)
npx expo run:android
```

### Run on Emulator

```bash
# List available Android emulators
emulator -list-avds

# Start an emulator
emulator -avd Pixel_5_API_33

# Run app on emulator
npx expo run:android
```

### Run on Physical Device

1. Enable Developer Options and USB Debugging on Android device
2. Connect device via USB
3. Verify device connection:
```bash
adb devices
```
4. Run app:
```bash
npx expo run:android --device
```

## Production Build

### Build APK (For Testing)

```bash
cd mobile

# Build preview APK
eas build --profile preview --platform android

# Download and install on device
# EAS will provide download link
```

### Build AAB (For Google Play)

```bash
cd mobile

# Build production AAB
eas build --profile production --platform android
```

### Submit to Google Play

```bash
cd mobile

# First-time setup: Create app in Google Play Console
# Then download service account JSON

# Submit to internal testing track
eas submit --platform android --latest
```

## Testing

### Unit Tests

```bash
cd mobile
npm test
```

### Integration Tests

```bash
npm run test:ci
```

### E2E Tests (if configured)

```bash
# Install Detox (if not already)
npm install --save-dev detox

# Run E2E tests
detox test --configuration android.emu.debug
```

### Manual Testing Checklist

- [ ] **Authentication**
  - [ ] Register new account
  - [ ] Login with credentials
  - [ ] Biometric authentication
  - [ ] Forgot password flow
  - [ ] Logout

- [ ] **Messaging**
  - [ ] Send/receive messages in real-time
  - [ ] Typing indicators
  - [ ] Read receipts
  - [ ] Message edit/delete
  - [ ] File attachments

- [ ] **Contacts**
  - [ ] Search users
  - [ ] Send contact request
  - [ ] Accept/reject requests
  - [ ] Block/unblock

- [ ] **Groups**
  - [ ] Create group
  - [ ] Add/remove members
  - [ ] Group messaging
  - [ ] Leave group

- [ ] **Notifications**
  - [ ] Receive push notifications when app closed
  - [ ] Notification tap opens correct chat
  - [ ] Quiet hours respected
  - [ ] Per-contact muting

- [ ] **Calls** (if implemented)
  - [ ] Initiate video call
  - [ ] Accept incoming call
  - [ ] Mute/unmute audio
  - [ ] Toggle video

- [ ] **Performance**
  - [ ] App starts in < 3 seconds
  - [ ] Smooth scrolling (60 FPS)
  - [ ] No memory leaks
  - [ ] Offline mode works

## Troubleshooting

### Common Issues

#### 1. "google-services.json not found"

**Problem**: Firebase configuration missing

**Solution**:
```bash
cd mobile
cp google-services.json.example google-services.json
# Edit with your Firebase credentials
```

#### 2. "SDK location not found"

**Problem**: Android SDK path not configured

**Solution**:
```bash
# Set ANDROID_SDK_ROOT environment variable
export ANDROID_SDK_ROOT=$HOME/Android/Sdk

# Or create local.properties
echo "sdk.dir=/path/to/android/sdk" > android/local.properties
```

#### 3. "Execution failed for task ':app:mergeDebugResources'"

**Problem**: Resource conflicts or corrupt build cache

**Solution**:
```bash
cd mobile/android
./gradlew clean
cd ..
npx expo run:android
```

#### 4. "Unable to connect to backend"

**Problem**: Backend not running or wrong URL

**Solution**:
- Check backend is running: `curl http://localhost:4000/health`
- For emulator, use `10.0.2.2` instead of `localhost`
- For physical device, use your machine's IP address
- Check firewall settings

#### 5. "Push notifications not working"

**Problem**: FCM not configured or device token not registered

**Solution**:
1. Verify `google-services.json` is valid
2. Check Firebase Console → Cloud Messaging is enabled
3. Test with FCM test message
4. Verify device token is sent to backend
5. Check notification permissions granted

#### 6. "Biometric authentication fails"

**Problem**: Biometric hardware not available or not enrolled

**Solution**:
- Physical device: Ensure fingerprint/face enrolled in settings
- Emulator: Fingerprint simulation not reliable, test on real device
- Check permission granted: `USE_BIOMETRIC`

#### 7. "WebSocket connection fails"

**Problem**: WebSocket URL incorrect or CORS issues

**Solution**:
```bash
# Check WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://10.0.2.2:4000/socket.io/

# Expected: 101 Switching Protocols
```

#### 8. "File upload fails"

**Problem**: File size limit exceeded or permission denied

**Solution**:
- Check file size < 10MB
- Verify storage permissions granted
- Check backend file upload endpoint
- Test with small file first

### Debug Tools

#### Enable React Native Debugger

```bash
# Shake device or Cmd+D (emulator)
# Select "Debug with Chrome DevTools"
```

#### View Logs

```bash
# Android Logcat (all logs)
adb logcat

# Filter by app
adb logcat | grep "$(adb shell ps | grep com.messenger.app | awk '{print $2}')"

# React Native logs only
npx react-native log-android
```

#### Inspect Network Requests

```bash
# Install Flipper (Facebook's debugging tool)
# https://fbflipper.com/

# Or use Reactotron
npm install --save-dev reactotron-react-native
```

#### Check App Performance

```bash
# Enable performance monitoring in Firebase
# Firebase Console → Performance → View trace data
```

### Reset App State

```bash
# Clear app data
adb shell pm clear com.messenger.app

# Or uninstall/reinstall
adb uninstall com.messenger.app
npx expo run:android
```

### Clean Build

```bash
cd mobile

# Clean npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npx expo run:android
```

## Additional Resources

### Documentation Links
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [React Navigation Documentation](https://reactnavigation.org/)

### Community Support
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

### Performance Optimization
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Hermes Engine](https://reactnative.dev/docs/hermes)
- [ProGuard/R8 for Android](https://developer.android.com/studio/build/shrink-code)

## Build Checklist

Before submitting to Google Play:

- [ ] App version incremented in `app.json`
- [ ] `versionCode` incremented (Android)
- [ ] All environment variables set correctly
- [ ] `google-services.json` configured
- [ ] Icon and splash screen optimized
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] All required permissions justified
- [ ] App tested on multiple devices
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] GDPR compliance verified
- [ ] Crash rate < 0.1%
- [ ] Store listing prepared (description, screenshots)

## Next Steps

After successful build:

1. **Test thoroughly** on multiple devices
2. **Submit to internal testing** track
3. **Gather feedback** from beta testers
4. **Iterate and fix** any issues
5. **Submit to production** when ready
6. **Monitor** crash reports and analytics
7. **Plan updates** and new features

---

**Need help?** Contact the development team or refer to the troubleshooting section above.
