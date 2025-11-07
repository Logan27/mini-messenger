/**
 * Logging utility for React Native app
 * Provides structured logging with different levels and environment-aware output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  source: string;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  private formatMessage(level: LogLevel, message: string, source: string): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    return `${emoji[level]} [${source}] ${message}`;
  }

  private log(level: LogLevel, message: string, data?: any, source = 'App') {
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source
    };

    // Add to history for debugging
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Only output in development
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(level, message, source);
      
      switch (level) {
        case 'debug':
          console.log(formattedMessage, data || '');
          break;
        case 'info':
          console.info(formattedMessage, data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, data || '');
          break;
        case 'error':
          console.error(formattedMessage, data || '');
          break;
      }
    }
  }

  debug(message: string, data?: any, source = 'App') {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: any, source = 'App') {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: any, source = 'App') {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: any, source = 'App') {
    this.log('error', message, data, source);
  }

  // Specialized logging methods for common scenarios
  auth(message: string, data?: any) {
    this.info(message, data, 'Auth');
  }

  api(message: string, data?: any) {
    this.info(message, data, 'API');
  }

  websocket(message: string, data?: any) {
    this.info(message, data, 'WebSocket');
  }

  navigation(message: string, data?: any) {
    this.debug(message, data, 'Navigation');
  }

  performance(message: string, data?: any) {
    this.info(message, data, 'Performance');
  }

  // Get log history for debugging
  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory() {
    this.logHistory = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, data?: any, source?: string) => logger.debug(message, data, source),
  info: (message: string, data?: any, source?: string) => logger.info(message, data, source),
  warn: (message: string, data?: any, source?: string) => logger.warn(message, data, source),
  error: (message: string, data?: any, source?: string) => logger.error(message, data, source),
  auth: (message: string, data?: any) => logger.auth(message, data),
  api: (message: string, data?: any) => logger.api(message, data),
  websocket: (message: string, data?: any) => logger.websocket(message, data),
  navigation: (message: string, data?: any) => logger.navigation(message, data),
  performance: (message: string, data?: any) => logger.performance(message, data),
};

export default logger;