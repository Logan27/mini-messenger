# Firebase v22 Migration Guide

## Overview

React Native Firebase is migrating from the namespaced API to a modular API in v22 to match the Firebase Web SDK. This guide explains how to migrate the codebase.

## Current Status

The app currently uses the **v21 namespaced API** which will be deprecated in v22. You'll see warnings like:
- `"This method is deprecated... Please use getApp() instead"`
- `"Method called was requestPermission. Please use requestPermission() instead"`
- `"This method is deprecated as well as all React Native Firebase namespaced API"`

**The app still works**, but will need migration before v22 is released.

## Migration Overview

### Current (v21 Namespaced API)
```typescript
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
const authStatus = await messaging().requestPermission();
```

### Future (v22 Modular API)
```typescript
import { getMessaging, getToken, requestPermission } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';

const app = getApp();
const messagingInstance = getMessaging(app);
const token = await getToken(messagingInstance);
const authStatus = await requestPermission(messagingInstance);
```

## Files That Need Migration

### 1. `src/services/pushNotifications.ts`

**Current Issues:**
- Lines 14-15: `require('@react-native-firebase/messaging').default`
- Line 150: `messaging().requestPermission()`
- Line 156-159: `messaging.AuthorizationStatus.*`
- Line 238: `messaging().getToken()`
- Line 311: `messaging().getToken()`
- Line 369: `messaging().onMessage()`
- Line 383: `messaging().onNotificationOpenedApp()`
- Line 391: `messaging().getInitialNotification()`
- Line 409: `messaging().onTokenRefresh()`
- Line 539: `messaging().hasPermission()`

**Migration Steps:**

```typescript
// 1. Update imports
import {
  getMessaging,
  getToken,
  requestPermission,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  AuthorizationStatus
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';

// 2. Get messaging instance
let messaging: any = null;
let isFirebaseAvailable = false;

try {
  const app = getApp();
  messaging = getMessaging(app);
  isFirebaseAvailable = true;
} catch (error) {
  console.warn('Firebase Cloud Messaging is not available');
  isFirebaseAvailable = false;
}

// 3. Update method calls
// Before: await messaging().getToken()
// After:  await getToken(messaging)

// Before: await messaging().requestPermission()
// After:  await requestPermission(messaging)

// Before: messaging.AuthorizationStatus.AUTHORIZED
// After:  AuthorizationStatus.AUTHORIZED

// Before: messaging().onMessage(callback)
// After:  onMessage(messaging, callback)
```

### 2. `index.ts`

**Current Issues:**
- Lines 52-55: Uses `messaging().setBackgroundMessageHandler()`

**Migration Steps:**

```typescript
// Update import
import { getMessaging, onBackgroundMessage } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';

// Update background handler
try {
  const app = getApp();
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, async (remoteMessage) => {
    log.info('Background message received', {
      messageId: remoteMessage.messageId,
      from: remoteMessage.from,
      hasData: !!remoteMessage.data,
      notification: remoteMessage.notification
    }, 'FCM');
  });
} catch (error) {
  log.error('Failed to register FCM background handler', error, 'FCM');
}
```

## Testing the Migration

### 1. Update Dependencies
```bash
npm install @react-native-firebase/app@latest @react-native-firebase/messaging@latest
```

### 2. Test Each Feature
- [ ] Request notification permissions
- [ ] Get FCM token
- [ ] Register token with backend
- [ ] Receive foreground notifications
- [ ] Receive background notifications
- [ ] Handle notification taps
- [ ] Token refresh handling

### 3. Test Fallback to Expo
- [ ] Ensure fallback still works if Firebase fails
- [ ] Test on emulator (should use Expo)
- [ ] Test on physical device with Firebase
- [ ] Test on physical device without Firebase config

## Migration Checklist

- [ ] Update all imports to modular API
- [ ] Replace `messaging().method()` with `method(messaging)`
- [ ] Update `messaging.AuthorizationStatus` to `AuthorizationStatus`
- [ ] Update background message handler
- [ ] Test on Android
- [ ] Test on iOS
- [ ] Test fallback scenarios
- [ ] Update documentation
- [ ] Remove deprecated API warnings

## Timeline

**Current:** v21 with deprecation warnings (functional)
**Next Release:** Should complete migration before v22 release
**Target:** Complete migration in next 2-3 months

## Resources

- [React Native Firebase v22 Migration Guide](https://rnfirebase.io/migrating-to-v22)
- [Firebase Web SDK Modular API](https://firebase.google.com/docs/web/modular-upgrade)
- [Breaking Changes Announcement](https://github.com/invertase/react-native-firebase/discussions)

## Notes

- The modular API is more tree-shakeable (smaller bundle size)
- Better TypeScript support
- Aligns with Firebase Web SDK
- More explicit and less "magic"
- Migration can be done gradually (both APIs work in v21)

## Need Help?

If you encounter issues during migration:
1. Check the official migration guide
2. Search GitHub issues: https://github.com/invertase/react-native-firebase/issues
3. Join the Discord community: https://discord.gg/C9aK28N

---

**Status:** Migration not started yet. Current implementation works but shows deprecation warnings.
**Priority:** Medium (plan for next major update)
**Impact:** Required before upgrading to v22
