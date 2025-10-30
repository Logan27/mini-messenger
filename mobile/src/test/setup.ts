import '@testing-library/react-native/extend-expect';

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 20,
    sessionId: 'test-session-id',
  },
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  deviceName: 'iPhone 15',
  deviceType: 1,
  deviceYearClass: 2023,
  isDevice: true,
  modelId: 'iPhone15,2',
  osBuildId: '21A342',
  osInternalBuildId: '21A342',
  osName: 'iOS',
  osVersion: '17.0.1',
  platformApiLevel: 17,
  totalMemory: 8589934592,
}));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock console methods in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};