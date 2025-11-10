/**
 * Route preloading utilities
 * Preload critical routes to improve perceived performance
 */

// Preload functions for lazy-loaded routes
const preloadFunctions: Record<string, () => Promise<unknown>> = {};

/**
 * Register a route for preloading
 */
export function registerRoutePreload(name: string, preloadFn: () => Promise<unknown>) {
  preloadFunctions[name] = preloadFn;
}

/**
 * Preload a specific route by name
 */
export function preloadRoute(name: string) {
  const preloadFn = preloadFunctions[name];
  if (preloadFn) {
    return preloadFn();
  }
  return Promise.resolve();
}

/**
 * Preload multiple routes
 */
export function preloadRoutes(names: string[]) {
  return Promise.all(names.map(name => preloadRoute(name)));
}

/**
 * Preload critical routes after initial render
 * Call this after user authentication to improve navigation performance
 */
export function preloadCriticalRoutes() {
  // Preload most commonly accessed routes after a short delay
  // to avoid competing with initial page load
  setTimeout(() => {
    preloadRoutes(['index', 'settings']);
  }, 1000);
}

/**
 * Preload admin routes for admin users
 */
export function preloadAdminRoutes() {
  setTimeout(() => {
    preloadRoutes(['adminDashboard', 'adminUsers', 'pendingUsers']);
  }, 1500);
}
