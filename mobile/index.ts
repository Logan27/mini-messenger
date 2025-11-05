import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import App from './App';

// Register background message handler for FCM
// This must be called outside of any component lifecycle
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message received:', remoteMessage);

    // You can perform background tasks here
    // For example, update local storage, show notification, etc.

    // The notification will be automatically displayed by the system
    // You can customize it here if needed
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
