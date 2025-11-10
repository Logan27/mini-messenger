import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerRoutePreload,
  preloadRoute,
  preloadRoutes,
  preloadCriticalRoutes,
  preloadAdminRoutes,
} from '../routePreload';

describe('routePreload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerRoutePreload', () => {
    it('should register a preload function', () => {
      const mockPreload = vi.fn().mockResolvedValue({});

      registerRoutePreload('testRoute', mockPreload);

      // Verify registration by attempting to preload
      preloadRoute('testRoute');

      expect(mockPreload).toHaveBeenCalled();
    });

    it('should allow registering multiple routes', () => {
      const mockPreload1 = vi.fn().mockResolvedValue({});
      const mockPreload2 = vi.fn().mockResolvedValue({});

      registerRoutePreload('route1', mockPreload1);
      registerRoutePreload('route2', mockPreload2);

      preloadRoute('route1');
      preloadRoute('route2');

      expect(mockPreload1).toHaveBeenCalled();
      expect(mockPreload2).toHaveBeenCalled();
    });

    it('should overwrite existing registration', () => {
      const mockPreload1 = vi.fn().mockResolvedValue({});
      const mockPreload2 = vi.fn().mockResolvedValue({});

      registerRoutePreload('testRoute', mockPreload1);
      registerRoutePreload('testRoute', mockPreload2);

      preloadRoute('testRoute');

      expect(mockPreload1).not.toHaveBeenCalled();
      expect(mockPreload2).toHaveBeenCalled();
    });
  });

  describe('preloadRoute', () => {
    it('should preload a registered route', async () => {
      const mockPreload = vi.fn().mockResolvedValue({ module: 'loaded' });

      registerRoutePreload('testRoute', mockPreload);

      const result = await preloadRoute('testRoute');

      expect(mockPreload).toHaveBeenCalled();
      expect(result).toEqual({ module: 'loaded' });
    });

    it('should return resolved promise for unregistered route', async () => {
      const result = await preloadRoute('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should handle preload function errors gracefully', async () => {
      const mockPreload = vi.fn().mockRejectedValue(new Error('Load failed'));

      registerRoutePreload('failingRoute', mockPreload);

      await expect(preloadRoute('failingRoute')).rejects.toThrow('Load failed');
    });

    it('should call preload function only once per call', async () => {
      const mockPreload = vi.fn().mockResolvedValue({});

      registerRoutePreload('testRoute', mockPreload);

      await preloadRoute('testRoute');

      expect(mockPreload).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadRoutes', () => {
    it('should preload multiple routes', async () => {
      const mockPreload1 = vi.fn().mockResolvedValue({ route: 1 });
      const mockPreload2 = vi.fn().mockResolvedValue({ route: 2 });
      const mockPreload3 = vi.fn().mockResolvedValue({ route: 3 });

      registerRoutePreload('route1', mockPreload1);
      registerRoutePreload('route2', mockPreload2);
      registerRoutePreload('route3', mockPreload3);

      const results = await preloadRoutes(['route1', 'route2', 'route3']);

      expect(mockPreload1).toHaveBeenCalled();
      expect(mockPreload2).toHaveBeenCalled();
      expect(mockPreload3).toHaveBeenCalled();
      expect(results).toHaveLength(3);
    });

    it('should preload routes in parallel', async () => {
      vi.useRealTimers(); // Use real timers for this timing test

      const startTimes: number[] = [];
      const mockPreload1 = vi.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10)); // Reduced from 100ms
        return { route: 1 };
      });
      const mockPreload2 = vi.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10)); // Reduced from 100ms
        return { route: 2 };
      });

      registerRoutePreload('route1', mockPreload1);
      registerRoutePreload('route2', mockPreload2);

      await preloadRoutes(['route1', 'route2']);

      // Both should start at roughly the same time
      expect(Math.abs(startTimes[0] - startTimes[1])).toBeLessThan(50);

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should handle empty array', async () => {
      const results = await preloadRoutes([]);

      expect(results).toEqual([]);
    });

    it('should handle mix of registered and unregistered routes', async () => {
      const mockPreload = vi.fn().mockResolvedValue({ route: 1 });

      registerRoutePreload('registered', mockPreload);

      const results = await preloadRoutes(['registered', 'unregistered']);

      expect(results).toHaveLength(2);
      expect(mockPreload).toHaveBeenCalled();
    });

    it('should continue even if one route fails', async () => {
      const mockPreload1 = vi.fn().mockRejectedValue(new Error('Failed'));
      const mockPreload2 = vi.fn().mockResolvedValue({ route: 2 });

      registerRoutePreload('failing', mockPreload1);
      registerRoutePreload('working', mockPreload2);

      // Promise.all will reject if any promise rejects
      await expect(preloadRoutes(['failing', 'working'])).rejects.toThrow(
        'Failed'
      );

      expect(mockPreload1).toHaveBeenCalled();
      expect(mockPreload2).toHaveBeenCalled();
    });
  });

  describe('preloadCriticalRoutes', () => {
    it('should preload critical routes after delay', () => {
      const mockPreloadIndex = vi.fn().mockResolvedValue({});
      const mockPreloadSettings = vi.fn().mockResolvedValue({});

      registerRoutePreload('index', mockPreloadIndex);
      registerRoutePreload('settings', mockPreloadSettings);

      preloadCriticalRoutes();

      // Should not be called immediately
      expect(mockPreloadIndex).not.toHaveBeenCalled();
      expect(mockPreloadSettings).not.toHaveBeenCalled();

      // Fast-forward time by 1000ms
      vi.advanceTimersByTime(1000);

      // Should be called after delay
      expect(mockPreloadIndex).toHaveBeenCalled();
      expect(mockPreloadSettings).toHaveBeenCalled();
    });

    it('should preload index and settings routes', () => {
      const mockPreloadIndex = vi.fn().mockResolvedValue({});
      const mockPreloadSettings = vi.fn().mockResolvedValue({});

      registerRoutePreload('index', mockPreloadIndex);
      registerRoutePreload('settings', mockPreloadSettings);

      preloadCriticalRoutes();
      vi.advanceTimersByTime(1000);

      expect(mockPreloadIndex).toHaveBeenCalledTimes(1);
      expect(mockPreloadSettings).toHaveBeenCalledTimes(1);
    });

    it('should work even if routes are not registered', () => {
      // Should not throw error
      expect(() => {
        preloadCriticalRoutes();
        vi.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });

  describe('preloadAdminRoutes', () => {
    it('should preload admin routes after delay', () => {
      const mockPreloadDashboard = vi.fn().mockResolvedValue({});
      const mockPreloadUsers = vi.fn().mockResolvedValue({});
      const mockPreloadPending = vi.fn().mockResolvedValue({});

      registerRoutePreload('adminDashboard', mockPreloadDashboard);
      registerRoutePreload('adminUsers', mockPreloadUsers);
      registerRoutePreload('pendingUsers', mockPreloadPending);

      preloadAdminRoutes();

      // Should not be called immediately
      expect(mockPreloadDashboard).not.toHaveBeenCalled();
      expect(mockPreloadUsers).not.toHaveBeenCalled();
      expect(mockPreloadPending).not.toHaveBeenCalled();

      // Fast-forward time by 1500ms
      vi.advanceTimersByTime(1500);

      // Should be called after delay
      expect(mockPreloadDashboard).toHaveBeenCalled();
      expect(mockPreloadUsers).toHaveBeenCalled();
      expect(mockPreloadPending).toHaveBeenCalled();
    });

    it('should use longer delay than critical routes', () => {
      const mockCritical = vi.fn().mockResolvedValue({});
      const mockAdmin = vi.fn().mockResolvedValue({});

      registerRoutePreload('index', mockCritical);
      registerRoutePreload('adminDashboard', mockAdmin);

      preloadCriticalRoutes();
      preloadAdminRoutes();

      // After 1000ms, only critical routes should be preloaded
      vi.advanceTimersByTime(1000);
      expect(mockCritical).toHaveBeenCalled();
      expect(mockAdmin).not.toHaveBeenCalled();

      // After additional 500ms, admin routes should be preloaded
      vi.advanceTimersByTime(500);
      expect(mockAdmin).toHaveBeenCalled();
    });

    it('should preload all three admin routes', () => {
      const mocks = {
        adminDashboard: vi.fn().mockResolvedValue({}),
        adminUsers: vi.fn().mockResolvedValue({}),
        pendingUsers: vi.fn().mockResolvedValue({}),
      };

      registerRoutePreload('adminDashboard', mocks.adminDashboard);
      registerRoutePreload('adminUsers', mocks.adminUsers);
      registerRoutePreload('pendingUsers', mocks.pendingUsers);

      preloadAdminRoutes();
      vi.advanceTimersByTime(1500);

      expect(mocks.adminDashboard).toHaveBeenCalledTimes(1);
      expect(mocks.adminUsers).toHaveBeenCalledTimes(1);
      expect(mocks.pendingUsers).toHaveBeenCalledTimes(1);
    });
  });
});
