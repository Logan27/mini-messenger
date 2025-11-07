/**
 * Platform detection utility for React Native app
 * Provides consistent platform information across the app
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface PlatformInfo {
  platform: 'ios' | 'android' | 'web' | 'unknown';
  version: string | number;
  isDevice: boolean;
  isEmulator: boolean;
  isSimulator: boolean;
  executionEnvironment: string;
  appOwnership: string;
  sessionId: string;
  apiLevel?: number; // Android specific
  model?: string; // Device model
  osVersion?: string; // OS version
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const platform = Platform.OS as 'ios' | 'android' | 'web' | 'unknown';
  const version = Platform.Version;
  
  // Get device information
  const isDevice = Constants?.isDevice ?? false;
  const executionEnvironment = Constants?.executionEnvironment ?? 'unknown';
  const appOwnership = Constants?.appOwnership ?? 'unknown';
  const sessionId = Constants?.sessionId ?? 'unknown';
  
  // Determine if running on emulator/simulator
  let isEmulator = false;
  let isSimulator = false;
  let model: string | undefined;
  let osVersion: string | undefined;
  let apiLevel: number | undefined;
  
  if (platform === 'android') {
    // Android emulator detection
    isEmulator = !isDevice;
    apiLevel = typeof version === 'number' ? version : parseInt(String(version), 10);
    model = Constants?.platform?.android?.model;
    osVersion = Constants?.platform?.android?.version;
  } else if (platform === 'ios') {
    // iOS simulator detection
    isSimulator = !isDevice;
    model = Constants?.platform?.ios?.model || undefined;
    osVersion = Constants?.platform?.ios?.systemVersion || undefined;
  }
  
  return {
    platform,
    version,
    isDevice,
    isEmulator,
    isSimulator,
    executionEnvironment,
    appOwnership,
    sessionId,
    apiLevel,
    model,
    osVersion,
  };
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Check if running on Web
 */
export function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Check if running on a physical device
 */
export function isPhysicalDevice(): boolean {
  return Constants?.isDevice ?? false;
}

/**
 * Check if running on an emulator or simulator
 */
export function isEmulatorOrSimulator(): boolean {
  const platform = getPlatformInfo();
  return platform.isEmulator || platform.isSimulator;
}

/**
 * Get API URL based on platform
 */
export function getApiUrl(): string {
  const platform = getPlatformInfo();
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback URLs based on platform
  if (platform.platform === 'android' && platform.isEmulator) {
    return 'http://10.0.2.2:4000'; // Android emulator special IP
  } else if (platform.platform === 'ios' && platform.isSimulator) {
    return 'http://localhost:4000'; // iOS simulator uses localhost
  } else {
    return 'http://localhost:4000'; // Default fallback
  }
}

/**
 * Get WebSocket URL based on platform
 */
export function getWebSocketUrl(): string {
  const platform = getPlatformInfo();
  const envUrl = process.env.EXPO_PUBLIC_WS_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback URLs based on platform
  if (platform.platform === 'android' && platform.isEmulator) {
    return 'ws://10.0.2.2:4000'; // Android emulator special IP
  } else if (platform.platform === 'ios' && platform.isSimulator) {
    return 'ws://localhost:4000'; // iOS simulator uses localhost
  } else {
    return 'ws://localhost:4000'; // Default fallback
  }
}

export default {
  getPlatformInfo,
  isAndroid,
  isIOS,
  isWeb,
  isPhysicalDevice,
  isEmulatorOrSimulator,
  getApiUrl,
  getWebSocketUrl,
};