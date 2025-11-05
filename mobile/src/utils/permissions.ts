import { Alert, Platform } from 'react-native';
import { request, check, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const permission: Permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      return true;
    }

    if (result === RESULTS.DENIED) {
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    }

    if (result === RESULTS.BLOCKED) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is blocked. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return false;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Request microphone permission
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const permission: Permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      return true;
    }

    if (result === RESULTS.DENIED) {
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    }

    if (result === RESULTS.BLOCKED) {
      Alert.alert(
        'Microphone Permission',
        'Microphone permission is blocked. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return false;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
};

/**
 * Request both camera and microphone permissions for video calls
 */
export const requestCallPermissions = async (isVideoCall: boolean): Promise<boolean> => {
  try {
    // Always request microphone permission
    const micPermission = await requestMicrophonePermission();

    if (!micPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required to make calls.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Request camera permission only for video calls
    if (isVideoCall) {
      const cameraPermission = await requestCameraPermission();

      if (!cameraPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to make video calls.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error requesting call permissions:', error);
    return false;
  }
};

/**
 * Check if camera permission is granted
 */
export const hasCameraPermission = async (): Promise<boolean> => {
  try {
    const permission: Permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

/**
 * Check if microphone permission is granted
 */
export const hasMicrophonePermission = async (): Promise<boolean> => {
  try {
    const permission: Permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return false;
  }
};
