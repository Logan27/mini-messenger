// Performance optimization utilities for React Native

import { Dimensions, PixelRatio, Platform } from 'react-native';

// Device detection
export const getDeviceType = () => {
  const { width, height } = Dimensions.get('window');

  if (Platform.OS === 'ios') {
    if (width >= 768 || height >= 1024) {
      return 'tablet';
    }
  } else if (Platform.OS === 'android') {
    if (width >= 720 || height >= 1024) {
      return 'tablet';
    }
  }

  return 'phone';
};

// Screen size categories
export const getScreenSize = () => {
  const { width } = Dimensions.get('window');

  if (width < 375) return 'small';
  if (width < 414) return 'medium';
  if (width < 768) return 'large';
  return 'xlarge';
};

// Memory optimization
export const optimizeImageSize = (originalWidth: number, originalHeight: number) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Calculate optimal size based on screen dimensions
  const maxWidth = Math.min(screenWidth * 0.8, 800);
  const maxHeight = Math.min(screenHeight * 0.6, 600);

  const aspectRatio = originalWidth / originalHeight;

  let newWidth = maxWidth;
  let newHeight = newWidth / aspectRatio;

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
};

// Battery optimization
export const getBatteryOptimizationSettings = () => {
  return {
    // Reduce animations on low battery
    reducedAnimations: false,
    // Disable auto-refresh on low battery
    disableAutoRefresh: false,
    // Reduce WebSocket reconnection attempts
    reducedReconnections: false,
    // Disable background sync
    disableBackgroundSync: false,
  };
};

// Network optimization
export const getNetworkOptimizationSettings = (connectionType: string) => {
  switch (connectionType) {
    case 'wifi':
      return {
        enableHighQualityImages: true,
        enableAutoDownload: true,
        enableVideoAutoplay: true,
        cacheSize: 50 * 1024 * 1024, // 50MB
      };
    case 'cellular':
      return {
        enableHighQualityImages: false,
        enableAutoDownload: false,
        enableVideoAutoplay: false,
        cacheSize: 10 * 1024 * 1024, // 10MB
      };
    default:
      return {
        enableHighQualityImages: false,
        enableAutoDownload: false,
        enableVideoAutoplay: false,
        cacheSize: 5 * 1024 * 1024, // 5MB
      };
  }
};

// Bundle optimization
export const getBundleOptimizationSettings = () => {
  return {
    // Enable tree shaking
    treeShaking: true,
    // Enable code splitting
    codeSplitting: true,
    // Compress assets
    compressAssets: true,
    // Enable Hermes engine
    hermesEnabled: true,
    // Optimize imports
    optimizeImports: true,
  };
};

// Performance monitoring
export const performanceMonitor = {
  startTimer: (name: string) => {
    if (__DEV__) {
      console.time(name);
    }
  },

  endTimer: (name: string) => {
    if (__DEV__) {
      console.timeEnd(name);
    }
  },

  measureAsync: async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    if (__DEV__) {
      console.log(`Performance: ${name} took ${end - start}ms`);
    }

    return result;
  },

  measureSync: (name: string, fn: () => any) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    if (__DEV__) {
      console.log(`Performance: ${name} took ${end - start}ms`);
    }

    return result;
  },
};

// Memory management
export const memoryManager = {
  // Force garbage collection (development only)
  forceGC: () => {
    if (__DEV__ && global.gc) {
      global.gc();
    }
  },

  // Clear image cache
  clearImageCache: () => {
    // Implementation would depend on image library used
    console.log('Clearing image cache');
  },

  // Clear AsyncStorage (use with caution)
  clearStorage: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  },

  // Get memory usage (approximate)
  getMemoryUsage: () => {
    if (Platform.OS === 'android') {
      return 'Memory usage tracking not implemented for Android';
    } else if (Platform.OS === 'ios') {
      return 'Memory usage tracking not implemented for iOS';
    }
    return 'Platform not supported';
  },
};

// Animation optimization
export const animationOptimizer = {
  // Use native driver for animations
  useNativeDriver: true,

  // Reduce animation complexity on slower devices
  reduceComplexity: (devicePerformance: 'high' | 'medium' | 'low') => {
    switch (devicePerformance) {
      case 'high':
        return { duration: 300, easing: 'ease-in-out' };
      case 'medium':
        return { duration: 200, easing: 'linear' };
      case 'low':
        return { duration: 100, easing: 'linear' };
      default:
        return { duration: 300, easing: 'ease-in-out' };
    }
  },

  // Optimize layout animations
  optimizeLayoutAnimation: () => {
    return {
      duration: 250,
      update: {
        type: 'spring',
        springDamping: 0.7,
      },
    };
  },
};

// Storage optimization
export const storageOptimizer = {
  // Compress data before storage
  compressData: (data: any) => {
    // Implementation would use a compression library
    return JSON.stringify(data);
  },

  // Decompress data after retrieval
  decompressData: (data: string) => {
    // Implementation would use a decompression library
    return JSON.parse(data);
  },

  // Clean up old cached data
  cleanupCache: async (maxAge: number = 7 * 24 * 60 * 60 * 1000) => { // 7 days
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const keys = await AsyncStorage.getAllKeys();

    // Log the cleanup operation
    console.log(`Cleaning up ${keys.length} cache entries`);

    // Remove cache entries older than maxAge
    // Implementation would check timestamps and remove old entries
  },
};

// Error boundary optimization
export const errorBoundaryOptimizer = {
  // Capture errors in development
  captureErrors: __DEV__,

  // Report errors to service
  reportErrors: !__DEV__,

  // Retry failed operations
  retryFailedOperations: true,

  // Fallback UI for errors
  showFallbackUI: true,
};

// Accessibility optimization
export const accessibilityOptimizer = {
  // Ensure minimum touch target size
  minTouchTargetSize: 44,

  // High contrast mode support
  highContrastMode: false,

  // Screen reader optimization
  screenReaderOptimized: true,

  // Keyboard navigation support
  keyboardNavigation: true,
};

// Platform-specific optimizations
export const platformOptimizer = {
  ios: {
    // iOS-specific optimizations
    enableHaptics: true,
    useSFSymbols: true,
    optimizeForNotch: true,
  },

  android: {
    // Android-specific optimizations
    enableRippleEffect: true,
    useMaterialDesign: true,
    optimizeForBackButton: true,
  },
};

// Development vs Production optimizations
export const environmentOptimizer = {
  development: {
    enablePerformanceMonitoring: true,
    enableConsoleLogging: true,
    enableErrorReporting: false,
    enableBundleAnalyzer: true,
  },

  production: {
    enablePerformanceMonitoring: false,
    enableConsoleLogging: false,
    enableErrorReporting: true,
    enableBundleAnalyzer: false,
  },
};