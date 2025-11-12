import { Dimensions, Platform } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue(['key1', 'key2', 'key3']),
}));

describe('optimization', () => {
  let optimization: any;

  // Mock console methods
  let consoleTimeSpy: jest.SpyInstance;
  let consoleTimeEndSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleTimeSpy = jest.spyOn(console, 'time').mockImplementation();
    consoleTimeEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reset modules to clear any cached imports
    jest.resetModules();
  });

  afterEach(() => {
    consoleTimeSpy.mockRestore();
    consoleTimeEndSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const importOptimization = () => {
    optimization = require('../optimization');
  };

  describe('getDeviceType', () => {
    it('returns tablet for iOS device with width >= 768', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 768, height: 1024, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('tablet');
    });

    it('returns tablet for iOS device with height >= 1024', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 600, height: 1024, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('tablet');
    });

    it('returns phone for iOS device with smaller dimensions', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('phone');
    });

    it('returns tablet for Android device with width >= 720', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 720, height: 900, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('tablet');
    });

    it('returns tablet for Android device with height >= 1024', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 600, height: 1024, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('tablet');
    });

    it('returns phone for Android device with smaller dimensions', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 360, height: 640, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('phone');
    });

    it('returns phone for unknown platform', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 500, height: 800, scale: 1, fontScale: 1 });
      importOptimization();

      expect(optimization.getDeviceType()).toBe('phone');
    });
  });

  describe('getScreenSize', () => {
    it('returns small for width < 375', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getScreenSize()).toBe('small');
    });

    it('returns medium for width >= 375 and < 414', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getScreenSize()).toBe('medium');
    });

    it('returns large for width >= 414 and < 768', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 414, height: 896, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getScreenSize()).toBe('large');
    });

    it('returns xlarge for width >= 768', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 768, height: 1024, scale: 2, fontScale: 1 });
      importOptimization();

      expect(optimization.getScreenSize()).toBe('xlarge');
    });
  });

  describe('optimizeImageSize', () => {
    it('optimizes image to fit within screen constraints', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      const result = optimization.optimizeImageSize(1000, 1000);

      expect(result.width).toBe(300); // 375 * 0.8 = 300
      expect(result.height).toBe(300);
    });

    it('maintains aspect ratio when width is constrained', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      const result = optimization.optimizeImageSize(1600, 900);

      expect(result.width).toBe(300);
      expect(result.height).toBe(169); // Maintains 16:9 aspect ratio
    });

    it('maintains aspect ratio when height is constrained', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      const result = optimization.optimizeImageSize(900, 1600);

      expect(result.width).toBe(225); // Maintains aspect ratio
      expect(result.height).toBe(400); // 667 * 0.6 = 400.2, limited by maxHeight
    });

    it('caps dimensions at max values', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1200, height: 1600, scale: 2, fontScale: 1 });
      importOptimization();

      const result = optimization.optimizeImageSize(2000, 2000);

      expect(result.width).toBe(600); // Capped at maxHeight * aspectRatio
      expect(result.height).toBe(600); // Capped at maxHeight (1600 * 0.6 = 960, but max is 600)
    });
  });

  describe('getBatteryOptimizationSettings', () => {
    it('returns default battery optimization settings', () => {
      importOptimization();

      const settings = optimization.getBatteryOptimizationSettings();

      expect(settings).toEqual({
        reducedAnimations: false,
        disableAutoRefresh: false,
        reducedReconnections: false,
        disableBackgroundSync: false,
      });
    });
  });

  describe('getNetworkOptimizationSettings', () => {
    beforeEach(() => {
      importOptimization();
    });

    it('returns high quality settings for wifi', () => {
      const settings = optimization.getNetworkOptimizationSettings('wifi');

      expect(settings).toEqual({
        enableHighQualityImages: true,
        enableAutoDownload: true,
        enableVideoAutoplay: true,
        cacheSize: 50 * 1024 * 1024,
      });
    });

    it('returns optimized settings for cellular', () => {
      const settings = optimization.getNetworkOptimizationSettings('cellular');

      expect(settings).toEqual({
        enableHighQualityImages: false,
        enableAutoDownload: false,
        enableVideoAutoplay: false,
        cacheSize: 10 * 1024 * 1024,
      });
    });

    it('returns conservative settings for unknown connection type', () => {
      const settings = optimization.getNetworkOptimizationSettings('unknown');

      expect(settings).toEqual({
        enableHighQualityImages: false,
        enableAutoDownload: false,
        enableVideoAutoplay: false,
        cacheSize: 5 * 1024 * 1024,
      });
    });
  });

  describe('getBundleOptimizationSettings', () => {
    it('returns bundle optimization settings', () => {
      importOptimization();

      const settings = optimization.getBundleOptimizationSettings();

      expect(settings).toEqual({
        treeShaking: true,
        codeSplitting: true,
        compressAssets: true,
        hermesEnabled: true,
        optimizeImports: true,
      });
    });
  });

  describe('performanceMonitor', () => {
    beforeEach(() => {
      importOptimization();
    });

    it('starts and ends timer in development', () => {
      optimization.performanceMonitor.startTimer('test-timer');
      optimization.performanceMonitor.endTimer('test-timer');

      expect(consoleTimeSpy).toHaveBeenCalledWith('test-timer');
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('test-timer');
    });

    it('measures async function execution time', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const performanceNowSpy = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(250);

      const result = await optimization.performanceMonitor.measureAsync('async-test', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Performance: async-test took 150ms');

      performanceNowSpy.mockRestore();
    });

    it('measures sync function execution time', () => {
      const mockFn = jest.fn().mockReturnValue('result');
      const performanceNowSpy = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);

      const result = optimization.performanceMonitor.measureSync('sync-test', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Performance: sync-test took 100ms');

      performanceNowSpy.mockRestore();
    });
  });

  describe('memoryManager', () => {
    beforeEach(() => {
      importOptimization();
    });

    it('forces garbage collection in development when available', () => {
      const mockGC = jest.fn();
      (global as any).gc = mockGC;

      optimization.memoryManager.forceGC();

      expect(mockGC).toHaveBeenCalled();

      delete (global as any).gc;
    });

    it('does not error when gc is unavailable', () => {
      delete (global as any).gc;

      expect(() => optimization.memoryManager.forceGC()).not.toThrow();
    });

    it('clears image cache', () => {
      optimization.memoryManager.clearImageCache();

      expect(consoleLogSpy).toHaveBeenCalledWith('Clearing image cache');
    });

    it('clears AsyncStorage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      await optimization.memoryManager.clearStorage();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });

    it('returns memory usage message for Android', () => {
      // Need to set Platform.OS before importing to ensure correct value
      jest.resetModules();
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });
      importOptimization();

      const result = optimization.memoryManager.getMemoryUsage();

      expect(result).toBe('Memory usage tracking not implemented for Android');
    });

    it('returns memory usage message for iOS', () => {
      // Need to set Platform.OS before importing to ensure correct value
      jest.resetModules();
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
      importOptimization();

      const result = optimization.memoryManager.getMemoryUsage();

      expect(result).toBe('Memory usage tracking not implemented for iOS');
    });

    it('returns platform not supported for other platforms', () => {
      // Need to set Platform.OS before importing to ensure correct value
      jest.resetModules();
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
      importOptimization();

      const result = optimization.memoryManager.getMemoryUsage();

      expect(result).toBe('Platform not supported');
    });
  });

  describe('animationOptimizer', () => {
    beforeEach(() => {
      importOptimization();
    });

    it('has useNativeDriver enabled', () => {
      expect(optimization.animationOptimizer.useNativeDriver).toBe(true);
    });

    it('reduces complexity for high performance devices', () => {
      const result = optimization.animationOptimizer.reduceComplexity('high');

      expect(result).toEqual({ duration: 300, easing: 'ease-in-out' });
    });

    it('reduces complexity for medium performance devices', () => {
      const result = optimization.animationOptimizer.reduceComplexity('medium');

      expect(result).toEqual({ duration: 200, easing: 'linear' });
    });

    it('reduces complexity for low performance devices', () => {
      const result = optimization.animationOptimizer.reduceComplexity('low');

      expect(result).toEqual({ duration: 100, easing: 'linear' });
    });

    it('uses default settings for unknown performance level', () => {
      const result = optimization.animationOptimizer.reduceComplexity('unknown' as any);

      expect(result).toEqual({ duration: 300, easing: 'ease-in-out' });
    });

    it('optimizes layout animations', () => {
      const result = optimization.animationOptimizer.optimizeLayoutAnimation();

      expect(result).toEqual({
        duration: 250,
        update: {
          type: 'spring',
          springDamping: 0.7,
        },
      });
    });
  });

  describe('storageOptimizer', () => {
    beforeEach(() => {
      importOptimization();
    });

    it('compresses data to JSON string', () => {
      const data = { key: 'value', number: 123 };
      const result = optimization.storageOptimizer.compressData(data);

      expect(result).toBe('{"key":"value","number":123}');
    });

    it('decompresses JSON string to data', () => {
      const jsonString = '{"key":"value","number":123}';
      const result = optimization.storageOptimizer.decompressData(jsonString);

      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('cleans up cache with default max age', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      await optimization.storageOptimizer.cleanupCache();

      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Cleaning up 3 cache entries');
    });

    it('cleans up cache with custom max age', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const customMaxAge = 24 * 60 * 60 * 1000; // 1 day

      await optimization.storageOptimizer.cleanupCache(customMaxAge);

      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
    });
  });

  describe('errorBoundaryOptimizer', () => {
    it('has correct development settings', () => {
      importOptimization();

      expect(optimization.errorBoundaryOptimizer.captureErrors).toBe(true);
      expect(optimization.errorBoundaryOptimizer.reportErrors).toBe(false);
      expect(optimization.errorBoundaryOptimizer.retryFailedOperations).toBe(true);
      expect(optimization.errorBoundaryOptimizer.showFallbackUI).toBe(true);
    });
  });

  describe('accessibilityOptimizer', () => {
    it('has correct accessibility settings', () => {
      importOptimization();

      expect(optimization.accessibilityOptimizer.minTouchTargetSize).toBe(44);
      expect(optimization.accessibilityOptimizer.highContrastMode).toBe(false);
      expect(optimization.accessibilityOptimizer.screenReaderOptimized).toBe(true);
      expect(optimization.accessibilityOptimizer.keyboardNavigation).toBe(true);
    });
  });

  describe('platformOptimizer', () => {
    it('has correct iOS optimizations', () => {
      importOptimization();

      expect(optimization.platformOptimizer.ios).toEqual({
        enableHaptics: true,
        useSFSymbols: true,
        optimizeForNotch: true,
      });
    });

    it('has correct Android optimizations', () => {
      importOptimization();

      expect(optimization.platformOptimizer.android).toEqual({
        enableRippleEffect: true,
        useMaterialDesign: true,
        optimizeForBackButton: true,
      });
    });
  });

  describe('environmentOptimizer', () => {
    it('has correct development environment settings', () => {
      importOptimization();

      expect(optimization.environmentOptimizer.development).toEqual({
        enablePerformanceMonitoring: true,
        enableConsoleLogging: true,
        enableErrorReporting: false,
        enableBundleAnalyzer: true,
      });
    });

    it('has correct production environment settings', () => {
      importOptimization();

      expect(optimization.environmentOptimizer.production).toEqual({
        enablePerformanceMonitoring: false,
        enableConsoleLogging: false,
        enableErrorReporting: true,
        enableBundleAnalyzer: false,
      });
    });
  });

  describe('Integration scenarios', () => {
    it('provides appropriate settings for different device types', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });
      importOptimization();

      const deviceType = optimization.getDeviceType();
      const screenSize = optimization.getScreenSize();
      const networkSettings = optimization.getNetworkOptimizationSettings('wifi');

      expect(deviceType).toBe('phone');
      expect(screenSize).toBe('medium');
      expect(networkSettings.enableHighQualityImages).toBe(true);
    });

    it('optimizes image for tablet device', () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 768, height: 1024, scale: 2, fontScale: 1 });
      importOptimization();

      const imageSize = optimization.optimizeImageSize(2000, 1500);

      // With screen width 768, maxWidth = min(768 * 0.8, 800) = 614.4
      expect(imageSize.width).toBeGreaterThan(0);
      expect(imageSize.height).toBeGreaterThan(0);
    });

    it('uses performance monitoring for async operations', async () => {
      importOptimization();

      const performanceNowSpy = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100);

      const asyncOperation = async () => {
        return new Promise(resolve => setTimeout(() => resolve('done'), 50));
      };

      await optimization.performanceMonitor.measureAsync('operation', asyncOperation);

      expect(consoleLogSpy).toHaveBeenCalledWith('Performance: operation took 100ms');

      performanceNowSpy.mockRestore();
    });
  });
});
