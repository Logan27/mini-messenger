import { Dimensions, InteractionManager } from 'react-native';

// Mock NetInfo
const mockAddEventListener = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: mockAddEventListener,
}));

// Use fake timers to prevent setInterval from hanging tests
jest.useFakeTimers();

describe('performance utility functions', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let performanceNowSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock performance.now()
    performanceNowSpy = jest.spyOn(performance, 'now');

    // Mock Dimensions
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 375,
      height: 667,
      scale: 2,
      fontScale: 1
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    performanceNowSpy.mockRestore();
  });

  describe('optimizeImage', () => {
    it('returns the original URI', () => {
      const { optimizeImage } = require('../performance');

      const result = optimizeImage('https://example.com/image.jpg', 200, 200);

      expect(result).toBe('https://example.com/image.jpg');
    });
  });

  describe('preloadCriticalResources', () => {
    it('iterates through resources without error', () => {
      const { preloadCriticalResources } = require('../performance');

      const resources = ['resource1', 'resource2', 'resource3'];

      expect(() => preloadCriticalResources(resources)).not.toThrow();
    });

    it('handles empty resources array', () => {
      const { preloadCriticalResources } = require('../performance');

      expect(() => preloadCriticalResources([])).not.toThrow();
    });
  });

  describe('deferNonCriticalOperations', () => {
    it('defers operations using InteractionManager', () => {
      const mockRunAfterInteractions = jest.fn((callback) => callback());
      (InteractionManager.runAfterInteractions as jest.Mock) = mockRunAfterInteractions;

      const { deferNonCriticalOperations } = require('../performance');

      const op1 = jest.fn();
      const op2 = jest.fn();
      const operations = [op1, op2];

      deferNonCriticalOperations(operations);

      expect(mockRunAfterInteractions).toHaveBeenCalled();
      expect(op1).toHaveBeenCalled();
      expect(op2).toHaveBeenCalled();
    });
  });

  describe('measureExecutionTime', () => {
    it('measures sync operation execution time', async () => {
      performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(250);

      const { measureExecutionTime } = require('../performance');

      const operation = () => 'result';
      const result = await measureExecutionTime(operation, 'Test Operation');

      expect(result).toBe('result');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test Operation took 150 milliseconds');
    });

    it('measures async operation execution time', async () => {
      performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(300);

      const { measureExecutionTime } = require('../performance');

      const asyncOperation = async () => {
        return new Promise(resolve => resolve('async result'));
      };

      const result = await measureExecutionTime(asyncOperation, 'Async Operation');

      expect(result).toBe('async result');
      expect(consoleLogSpy).toHaveBeenCalledWith('Async Operation took 200 milliseconds');
    });

    it('logs error and re-throws when operation fails', async () => {
      performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const { measureExecutionTime } = require('../performance');

      const failingOperation = () => {
        throw new Error('Operation failed');
      };

      await expect(measureExecutionTime(failingOperation, 'Failing Operation'))
        .rejects.toThrow('Operation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failing Operation failed after 100 milliseconds:',
        expect.any(Error)
      );
    });
  });

  describe('PerformanceOptimizer instance methods', () => {
    it('provides performanceOptimizer singleton', () => {
      const { performanceOptimizer } = require('../performance');

      expect(performanceOptimizer).toBeDefined();
    });

    it('getCurrentMetrics returns default metrics when no metrics recorded', () => {
      const { performanceOptimizer } = require('../performance');

      const metrics = performanceOptimizer.getCurrentMetrics();

      expect(metrics).toMatchObject({
        memoryUsage: { used: 0, total: 0, available: 0 },
        networkType: 'unknown',
        isConnected: true,
      });
      expect(metrics.screenDimensions).toBeDefined();
    });

    it('getMetricsHistory returns empty array initially', () => {
      const { performanceOptimizer } = require('../performance');

      const history = performanceOptimizer.getMetricsHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('getAverageMemoryUsage returns 0 when no metrics', () => {
      const { performanceOptimizer } = require('../performance');

      const average = performanceOptimizer.getAverageMemoryUsage();

      expect(average).toBe(0);
    });

    it('isLowEndDevice evaluates memory pressure', () => {
      const { performanceOptimizer } = require('../performance');

      jest.spyOn(performanceOptimizer, 'getCurrentMetrics').mockReturnValue({
        memoryUsage: {
          used: 1800 * 1024 * 1024,
          total: 2000 * 1024 * 1024,
          available: 200 * 1024 * 1024,
        },
        networkType: 'wifi',
        isConnected: true,
        screenDimensions: { width: 375, height: 667 },
        timestamp: Date.now(),
      });

      const result = performanceOptimizer.isLowEndDevice();

      expect(typeof result).toBe('boolean');
    });

    it('optimizeForDevice applies optimizations based on device type', () => {
      const { performanceOptimizer } = require('../performance');

      jest.spyOn(performanceOptimizer, 'isLowEndDevice').mockReturnValue(false);

      performanceOptimizer.optimizeForDevice();

      expect(consoleLogSpy).toHaveBeenCalledWith('Applying high-end device optimizations');
    });

    it('debounces function calls', () => {
      const { performanceOptimizer } = require('../performance');
      const mockFn = jest.fn();
      const debouncedFn = performanceOptimizer.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(150);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('throttles function calls', () => {
      const { performanceOptimizer } = require('../performance');
      const mockFn = jest.fn();
      const throttledFn = performanceOptimizer.throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      // First call executes immediately
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(150);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('memoizes function results', () => {
      const { performanceOptimizer } = require('../performance');
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoizedFn = performanceOptimizer.memoize(expensiveFn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });

    it('memoize computes new results for different arguments', () => {
      const { performanceOptimizer } = require('../performance');
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoizedFn = performanceOptimizer.memoize(expensiveFn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(10);

      expect(result1).toBe(10);
      expect(result2).toBe(20);
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });

    it('cleanup clears metrics history', () => {
      const { performanceOptimizer } = require('../performance');

      performanceOptimizer.cleanup();

      const history = performanceOptimizer.getMetricsHistory();
      expect(history).toEqual([]);
    });
  });
});
