import { Dimensions, InteractionManager, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface MemoryInfo {
  used: number;
  total: number;
  available: number;
}

interface PerformanceMetrics {
  memoryUsage: MemoryInfo;
  networkType: string;
  isConnected: boolean;
  batteryLevel?: number;
  screenDimensions: { width: number; height: number };
  timestamp: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor memory usage
    this.startMemoryMonitoring();

    // Monitor network changes
    this.startNetworkMonitoring();

    // Monitor battery level (iOS)
    this.startBatteryMonitoring();

    // Monitor app state changes
    this.startAppStateMonitoring();
  }

  private startMemoryMonitoring(): void {
    // Record memory usage every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);
  }

  private startNetworkMonitoring(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      this.recordNetworkChange(state);
    });
  }

  private startBatteryMonitoring(): void {
    // Battery monitoring for iOS (Android requires additional permissions)
    if (Platform.OS === 'ios') {
      // This would require importing Battery module from react-native
      // For now, we'll skip detailed battery monitoring
    }
  }

  private startAppStateMonitoring(): void {
    // Monitor when app becomes active/inactive for performance adjustments
    const AppState = require('react-native').AppState;

    AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active') {
        this.onAppBecomeActive();
      } else if (nextAppState === 'background') {
        this.onAppBecomeBackground();
      }
    });
  }

  private async recordMemoryUsage(): Promise<void> {
    try {
      // Get memory info (Android only)
      if (Platform.OS === 'android') {
        const DeviceInfo = require('react-native-device-info');
        const memInfo = await DeviceInfo.getTotalMemory();
        const availableMem = await DeviceInfo.getAvailableMemory();

        const memoryInfo: MemoryInfo = {
          used: memInfo - availableMem,
          total: memInfo,
          available: availableMem,
        };

        this.recordMetrics({
          memoryUsage: memoryInfo,
          networkType: 'unknown',
          isConnected: true,
          screenDimensions: Dimensions.get('window'),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to record memory usage:', error);
    }
  }

  private recordNetworkChange(state: NetInfoState): void {
    this.recordMetrics({
      memoryUsage: { used: 0, total: 0, available: 0 },
      networkType: state.type,
      isConnected: state.isConnected ?? false,
      screenDimensions: Dimensions.get('window'),
      timestamp: Date.now(),
    });
  }

  private onAppBecomeActive(): void {
    // Clear unnecessary caches when app becomes active
    this.clearImageCache();
    this.optimizeAnimations();
  }

  private onAppBecomeBackground(): void {
    // Reduce performance when in background
    this.reduceBackgroundPerformance();
  }

  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log performance warnings
    this.checkPerformanceThresholds(metrics);
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Memory usage warning
    if (metrics.memoryUsage.used > metrics.memoryUsage.total * 0.8) {
      console.warn('High memory usage detected:', metrics.memoryUsage);
    }

    // Network connectivity issues
    if (!metrics.isConnected) {
      console.warn('No network connection');
    }

    // Slow network type
    if (metrics.networkType === 'cellular' && !metrics.isConnected) {
      console.warn('Slow network connection detected');
    }
  }

  private clearImageCache(): void {
    // Clear React Native image cache
    const Image = require('react-native').Image;
    Image.queryCache?.({}).then((cache: any) => {
      if (cache.size > 50 * 1024 * 1024) { // 50MB
        Image.clearDiskCache?.();
        Image.clearMemoryCache?.();
      }
    });
  }

  private optimizeAnimations(): void {
    // Reduce animation complexity when performance is low
    const currentMetrics = this.getCurrentMetrics();
    if (currentMetrics.memoryUsage.used > currentMetrics.memoryUsage.total * 0.7) {
      // Disable complex animations
      console.log('Optimizing animations for better performance');
    }
  }

  private reduceBackgroundPerformance(): void {
    // Reduce timers and background tasks
    console.log('Reducing background performance');
  }

  public getCurrentMetrics(): PerformanceMetrics {
    return this.metrics[this.metrics.length - 1] || {
      memoryUsage: { used: 0, total: 0, available: 0 },
      networkType: 'unknown',
      isConnected: true,
      screenDimensions: Dimensions.get('window'),
      timestamp: Date.now(),
    };
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getAverageMemoryUsage(): number {
    if (this.metrics.length === 0) return 0;

    const total = this.metrics.reduce((sum, metric) => sum + metric.memoryUsage.used, 0);
    return total / this.metrics.length;
  }

  public isLowEndDevice(): boolean {
    // Check if device has limited capabilities
    const currentMetrics = this.getCurrentMetrics();
    const memoryPressure = currentMetrics.memoryUsage.used / currentMetrics.memoryUsage.total;

    return memoryPressure > 0.8 || currentMetrics.memoryUsage.total < 2 * 1024 * 1024 * 1024; // Less than 2GB
  }

  public optimizeForDevice(): void {
    if (this.isLowEndDevice()) {
      this.applyLowEndOptimizations();
    } else {
      this.applyHighEndOptimizations();
    }
  }

  private applyLowEndOptimizations(): void {
    // Optimizations for low-end devices
    console.log('Applying low-end device optimizations');

    // Reduce image quality
    // Disable shadows and complex effects
    // Reduce animation duration
    // Limit concurrent operations
  }

  private applyHighEndOptimizations(): void {
    // Optimizations for high-end devices
    console.log('Applying high-end device optimizations');

    // Enable high-quality graphics
    // Increase animation smoothness
    // Enable advanced features
  }

  public debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  public throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return function executedFunction(...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  public memoize<T extends (...args: any[]) => any>(func: T): T {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  public cleanup(): void {
    this.metrics = [];
  }
}

// Utility functions for performance optimization
export const optimizeImage = (uri: string, width: number, height: number): string => {
  // In a real implementation, this would resize and optimize images
  return uri;
};

export const preloadCriticalResources = (resources: string[]): void => {
  // Preload critical resources for better performance
  resources.forEach(resource => {
    // Implementation would depend on the specific requirements
  });
};

export const deferNonCriticalOperations = (operations: Function[]): void => {
  // Defer non-critical operations until after interactions
  InteractionManager.runAfterInteractions(() => {
    operations.forEach(op => op());
  });
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T> | T,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await operation();
    const endTime = performance.now();
    console.log(`${operationName} took ${endTime - startTime} milliseconds`);
    return result;
  } catch (error) {
    const endTime = performance.now();
    console.error(`${operationName} failed after ${endTime - startTime} milliseconds:`, error);
    throw error;
  }
};

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();
export default performanceOptimizer;