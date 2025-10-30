interface PerformanceMetrics {
  timestamp: number;
  url: string;
  userAgent: string;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  timing: {
    dnsLookup: number;
    tcpConnect: number;
    tlsHandshake: number;
    request: number;
    response: number;
    domProcessing: number;
    resourceLoading: number;
    total: number;
  };
  coreWebVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

interface ErrorMetrics {
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

class PerformanceService {
  private sessionId: string;
  private isEnabled: boolean;
  private metricsEndpoint: string;
  private errorEndpoint: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.metricsEndpoint = '/api/metrics';
    this.errorEndpoint = '/api/errors';

    this.initializePerformanceObserver();
    this.initializeErrorTracking();
    this.trackNetworkInformation();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceObserver(): void {
    if (!this.isEnabled || !('PerformanceObserver' in window)) return;

    try {
      // Track Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.recordCoreWebVital('lcp', lastEntry.startTime);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordCoreWebVital('fid', entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordCoreWebVital('cls', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });

      // Track Navigation Timing
      window.addEventListener('load', () => {
        setTimeout(() => this.recordNavigationTiming(), 0);
      });

    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  private initializeErrorTracking(): void {
    if (!this.isEnabled) return;

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        severity: 'critical',
        context: {
          reason: event.reason,
        },
      });
    });

    // Track React errors
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.recordError({
        message: message?.toString() || 'Unknown error',
        stack: error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        severity: 'high',
        context: {
          source,
          lineno,
          colno,
        },
      });

      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  private trackNetworkInformation(): void {
    if (!this.isEnabled || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;

    // Track connection changes
    connection.addEventListener('change', () => {
      this.recordNetworkInfo(connection);
    });

    // Record initial connection info
    this.recordNetworkInfo(connection);
  }

  private recordNavigationTiming(): void {
    if (!('performance' in window) || !('getEntriesByType' in performance)) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!navigation) return;

    const timing = {
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      tlsHandshake: navigation.secureConnectionStart
        ? navigation.requestStart - navigation.secureConnectionStart
        : 0,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      domProcessing: navigation.domContentLoadedEventEnd - navigation.responseEnd,
      resourceLoading: navigation.loadEventEnd - navigation.domContentLoadedEventEnd,
      total: navigation.loadEventEnd - navigation.navigationStart,
    };

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timing,
      connection: this.getNetworkInfo(),
      memory: this.getMemoryInfo(),
    };

    this.sendMetrics(metrics);
  }

  private recordCoreWebVital(metric: string, value: number): void {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timing: {} as any, // Not needed for CWV
      coreWebVitals: {
        [metric]: value,
      },
    };

    this.sendMetrics(metrics);
  }

  private recordError(error: ErrorMetrics): void {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') return;

    fetch(this.errorEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error),
    }).catch(err => {
      console.warn('Failed to send error metrics:', err);
    });
  }

  private recordNetworkInfo(connection: any): void {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timing: {} as any,
      connection: {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      },
    };

    this.sendMetrics(metrics);
  }

  private getNetworkInfo(): PerformanceMetrics['connection'] {
    if (!('connection' in navigator)) return undefined;

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  private getMemoryInfo(): PerformanceMetrics['memory'] {
    if (!('memory' in performance)) return undefined;

    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    };
  }

  private sendMetrics(metrics: PerformanceMetrics): void {
    // Don't send metrics in development
    if (process.env.NODE_ENV === 'development') return;

    fetch(this.metricsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    }).catch(err => {
      console.warn('Failed to send performance metrics:', err);
    });
  }

  // Public methods for manual tracking
  public trackCustomMetric(name: string, value: number, unit?: string): void {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timing: {} as any,
      coreWebVitals: {
        [`custom_${name}`]: value,
      },
    };

    this.sendMetrics(metrics);
  }

  public trackCustomError(error: Partial<ErrorMetrics>): void {
    this.recordError({
      timestamp: Date.now(),
      message: error.message || 'Custom error',
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      severity: error.severity || 'medium',
      context: error.context,
      stack: error.stack,
    });
  }

  public setUserId(userId: string): void {
    // Store user ID for error tracking
    this.sessionId = `${this.sessionId}_${userId}`;
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();
export default performanceService;