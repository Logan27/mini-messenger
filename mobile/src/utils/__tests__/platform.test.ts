import { Platform } from 'react-native';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    isDevice: true,
    executionEnvironment: 'standalone',
    appOwnership: 'expo',
    sessionId: 'test-session-123',
    platform: {
      ios: {
        model: 'iPhone 14 Pro',
        systemVersion: '17.0',
      },
      android: {
        model: 'Pixel 7',
        version: '13',
      },
    },
  },
}));

describe('platform', () => {
  let platform: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear module cache to allow re-importing with new mocks
    jest.resetModules();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.resetModules();
  });

  const importPlatform = () => {
    platform = require('../platform');
  };

  const mockConstants = (overrides: any = {}) => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        isDevice: true,
        executionEnvironment: 'standalone',
        appOwnership: 'expo',
        sessionId: 'test-session-123',
        platform: {
          ios: {
            model: 'iPhone 14 Pro',
            systemVersion: '17.0',
          },
          android: {
            model: 'Pixel 7',
            version: '13',
          },
        },
        ...overrides,
      },
    }));
  };

  describe('getPlatformInfo', () => {
    it('returns iOS platform info on iOS device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      mockConstants({ isDevice: true });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.version).toBe('17.0');
      expect(info.isDevice).toBe(true);
      expect(info.isSimulator).toBe(false);
      expect(info.isEmulator).toBe(false);
      expect(info.model).toBe('iPhone 14 Pro');
      expect(info.osVersion).toBe('17.0');
    });

    it('returns iOS platform info on iOS simulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.isDevice).toBe(false);
      expect(info.isSimulator).toBe(true);
      expect(info.isEmulator).toBe(false);
    });

    it('returns Android platform info on Android device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      Object.defineProperty(Platform, 'Version', { value: 33, writable: true });
      mockConstants({ isDevice: true });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.version).toBe(33);
      expect(info.isDevice).toBe(true);
      expect(info.isEmulator).toBe(false);
      expect(info.isSimulator).toBe(false);
      expect(info.apiLevel).toBe(33);
      expect(info.model).toBe('Pixel 7');
      expect(info.osVersion).toBe('13');
    });

    it('returns Android platform info on Android emulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      Object.defineProperty(Platform, 'Version', { value: 33, writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.isDevice).toBe(false);
      expect(info.isEmulator).toBe(true);
      expect(info.isSimulator).toBe(false);
    });

    it('parses Android API level from string version', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '33', writable: true });
      mockConstants({ isDevice: true });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.apiLevel).toBe(33);
    });

    it('returns web platform info', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '1.0', writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('web');
      expect(info.isDevice).toBe(false);
      expect(info.isEmulator).toBe(false);
      expect(info.isSimulator).toBe(false);
    });

    it('includes execution environment', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ executionEnvironment: 'storeClient' });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.executionEnvironment).toBe('storeClient');
    });

    it('includes app ownership', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ appOwnership: 'standalone' });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.appOwnership).toBe('standalone');
    });

    it('includes session ID', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ sessionId: 'unique-session-id' });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.sessionId).toBe('unique-session-id');
    });

    it('handles missing Constants gracefully', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: null,
      }));
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.isDevice).toBe(false);
      expect(info.executionEnvironment).toBe('unknown');
      expect(info.appOwnership).toBe('unknown');
      expect(info.sessionId).toBe('unknown');
    });

    it('handles missing iOS platform data', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ platform: {} });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.model).toBeUndefined();
      expect(info.osVersion).toBeUndefined();
    });

    it('handles missing Android platform data', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      Object.defineProperty(Platform, 'Version', { value: 33, writable: true });
      mockConstants({ platform: {} });
      importPlatform();

      const info = platform.getPlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.model).toBeUndefined();
      expect(info.osVersion).toBeUndefined();
    });
  });

  describe('isAndroid', () => {
    it('returns true on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      importPlatform();

      expect(platform.isAndroid()).toBe(true);
    });

    it('returns false on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      importPlatform();

      expect(platform.isAndroid()).toBe(false);
    });

    it('returns false on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      importPlatform();

      expect(platform.isAndroid()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('returns true on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      importPlatform();

      expect(platform.isIOS()).toBe(true);
    });

    it('returns false on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      importPlatform();

      expect(platform.isIOS()).toBe(false);
    });

    it('returns false on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      importPlatform();

      expect(platform.isIOS()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('returns true on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      importPlatform();

      expect(platform.isWeb()).toBe(true);
    });

    it('returns false on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      importPlatform();

      expect(platform.isWeb()).toBe(false);
    });

    it('returns false on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      importPlatform();

      expect(platform.isWeb()).toBe(false);
    });
  });

  describe('isPhysicalDevice', () => {
    it('returns true when running on physical device', () => {
      mockConstants({ isDevice: true });
      importPlatform();

      expect(platform.isPhysicalDevice()).toBe(true);
    });

    it('returns false when running on emulator/simulator', () => {
      mockConstants({ isDevice: false });
      importPlatform();

      expect(platform.isPhysicalDevice()).toBe(false);
    });

    it('returns false when Constants is unavailable', () => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: null,
      }));
      importPlatform();

      expect(platform.isPhysicalDevice()).toBe(false);
    });
  });

  describe('isEmulatorOrSimulator', () => {
    it('returns true on iOS simulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      expect(platform.isEmulatorOrSimulator()).toBe(true);
    });

    it('returns true on Android emulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      expect(platform.isEmulatorOrSimulator()).toBe(true);
    });

    it('returns false on physical device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockConstants({ isDevice: true });
      importPlatform();

      expect(platform.isEmulatorOrSimulator()).toBe(false);
    });
  });

  describe('getApiUrl', () => {
    it('returns environment variable when set', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      process.env.EXPO_PUBLIC_API_URL = 'https://api.production.com';
      mockConstants({ isDevice: true });
      importPlatform();

      const url = platform.getApiUrl();

      expect(url).toBe('https://api.production.com');
    });

    it('returns Android emulator URL when on Android emulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getApiUrl();

      expect(url).toBe('http://10.0.2.2:4000');
    });

    it('returns localhost URL when on iOS simulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getApiUrl();

      expect(url).toBe('http://localhost:4000');
    });

    it('returns localhost URL on physical device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants({ isDevice: true });
      importPlatform();

      const url = platform.getApiUrl();

      expect(url).toBe('http://localhost:4000');
    });

    it('returns localhost URL on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getApiUrl();

      expect(url).toBe('http://localhost:4000');
    });
  });

  describe('getWebSocketUrl', () => {
    it('returns environment variable when set', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      process.env.EXPO_PUBLIC_WS_URL = 'wss://ws.production.com';
      mockConstants({ isDevice: true });
      importPlatform();

      const url = platform.getWebSocketUrl();

      expect(url).toBe('wss://ws.production.com');
    });

    it('returns Android emulator WebSocket URL when on Android emulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getWebSocketUrl();

      expect(url).toBe('ws://10.0.2.2:4000');
    });

    it('returns localhost WebSocket URL when on iOS simulator', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getWebSocketUrl();

      expect(url).toBe('ws://localhost:4000');
    });

    it('returns localhost WebSocket URL on physical device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: true });
      importPlatform();

      const url = platform.getWebSocketUrl();

      expect(url).toBe('ws://localhost:4000');
    });

    it('returns localhost WebSocket URL on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const url = platform.getWebSocketUrl();

      expect(url).toBe('ws://localhost:4000');
    });
  });

  describe('Integration scenarios', () => {
    it('provides consistent platform detection across all methods', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      mockConstants({ isDevice: false });
      importPlatform();

      expect(platform.isAndroid()).toBe(true);
      expect(platform.isIOS()).toBe(false);
      expect(platform.isWeb()).toBe(false);
      expect(platform.isPhysicalDevice()).toBe(false);
      expect(platform.isEmulatorOrSimulator()).toBe(true);

      const info = platform.getPlatformInfo();
      expect(info.platform).toBe('android');
      expect(info.isEmulator).toBe(true);
    });

    it('uses correct URLs for Android emulator in development', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const apiUrl = platform.getApiUrl();
      const wsUrl = platform.getWebSocketUrl();

      expect(apiUrl).toBe('http://10.0.2.2:4000');
      expect(wsUrl).toBe('ws://10.0.2.2:4000');
    });

    it('uses correct URLs for iOS simulator in development', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      delete process.env.EXPO_PUBLIC_API_URL;
      delete process.env.EXPO_PUBLIC_WS_URL;
      mockConstants({ isDevice: false });
      importPlatform();

      const apiUrl = platform.getApiUrl();
      const wsUrl = platform.getWebSocketUrl();

      expect(apiUrl).toBe('http://localhost:4000');
      expect(wsUrl).toBe('ws://localhost:4000');
    });

    it('respects environment variables across all URL methods', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
      process.env.EXPO_PUBLIC_WS_URL = 'wss://ws.example.com';
      mockConstants({ isDevice: true });
      importPlatform();

      const apiUrl = platform.getApiUrl();
      const wsUrl = platform.getWebSocketUrl();

      expect(apiUrl).toBe('https://api.example.com');
      expect(wsUrl).toBe('wss://ws.example.com');
    });
  });

  describe('Default export', () => {
    it('exports all functions as default object', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      importPlatform();

      expect(platform.default).toBeDefined();
      expect(platform.default.getPlatformInfo).toBe(platform.getPlatformInfo);
      expect(platform.default.isAndroid).toBe(platform.isAndroid);
      expect(platform.default.isIOS).toBe(platform.isIOS);
      expect(platform.default.isWeb).toBe(platform.isWeb);
      expect(platform.default.isPhysicalDevice).toBe(platform.isPhysicalDevice);
      expect(platform.default.isEmulatorOrSimulator).toBe(platform.isEmulatorOrSimulator);
      expect(platform.default.getApiUrl).toBe(platform.getApiUrl);
      expect(platform.default.getWebSocketUrl).toBe(platform.getWebSocketUrl);
    });
  });
});
