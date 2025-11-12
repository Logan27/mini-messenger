describe('logger', () => {
  let logger: any;
  let log: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock Date for consistent timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    // Restore all mocks
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    // Clear module cache to allow re-importing with new NODE_ENV
    jest.resetModules();
    jest.restoreAllMocks();
  });

  const importLogger = () => {
    const loggerModule = require('../logger');
    logger = loggerModule.logger;
    log = loggerModule.log;
  };

  describe('Basic logging methods', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('logs debug messages', () => {
      logger.debug('Debug message', { foo: 'bar' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 [App] Debug message',
        { foo: 'bar' }
      );

      const history = logger.getLogHistory();
      expect(history).toHaveLength(1);
      expect(history[0].level).toBe('debug');
      expect(history[0].message).toBe('Debug message');
      expect(history[0].data).toEqual({ foo: 'bar' });
    });

    it('logs info messages', () => {
      logger.info('Info message', { test: 123 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [App] Info message',
        { test: 123 }
      );

      const history = logger.getLogHistory();
      expect(history[0].level).toBe('info');
      expect(history[0].message).toBe('Info message');
    });

    it('logs warn messages', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [App] Warning message',
        ''
      );

      const history = logger.getLogHistory();
      expect(history[0].level).toBe('warn');
      expect(history[0].message).toBe('Warning message');
    });

    it('logs error messages', () => {
      logger.error('Error message', new Error('Test error'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [App] Error message',
        expect.any(Error)
      );

      const history = logger.getLogHistory();
      expect(history[0].level).toBe('error');
      expect(history[0].message).toBe('Error message');
    });

    it('logs without data parameter', () => {
      logger.info('Message without data');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [App] Message without data',
        ''
      );
    });

    it('logs with custom source', () => {
      logger.info('Custom source message', null, 'CustomModule');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [CustomModule] Custom source message',
        ''
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('CustomModule');
    });
  });

  describe('Specialized logging methods', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('logs auth messages with Auth source', () => {
      logger.auth('User logged in', { userId: '123' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [Auth] User logged in',
        { userId: '123' }
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('Auth');
      expect(history[0].level).toBe('info');
    });

    it('logs api messages with API source', () => {
      logger.api('API request completed', { status: 200 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [API] API request completed',
        { status: 200 }
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('API');
    });

    it('logs websocket messages with WebSocket source', () => {
      logger.websocket('Connected to server', { url: 'ws://example.com' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [WebSocket] Connected to server',
        { url: 'ws://example.com' }
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('WebSocket');
    });

    it('logs navigation messages with Navigation source and debug level', () => {
      logger.navigation('Navigated to Home', { screen: 'Home' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 [Navigation] Navigated to Home',
        { screen: 'Home' }
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('Navigation');
      expect(history[0].level).toBe('debug');
    });

    it('logs performance messages with Performance source', () => {
      logger.performance('Render time', { duration: 150 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [Performance] Render time',
        { duration: 150 }
      );

      const history = logger.getLogHistory();
      expect(history[0].source).toBe('Performance');
    });
  });

  describe('Log history management', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('maintains log history', () => {
      logger.info('Message 1');
      logger.warn('Message 2');
      logger.error('Message 3');

      const history = logger.getLogHistory();
      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Message 1');
      expect(history[1].message).toBe('Message 2');
      expect(history[2].message).toBe('Message 3');
    });

    it('includes timestamp in log entries', () => {
      logger.info('Timestamped message');

      const history = logger.getLogHistory();
      expect(history[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('limits history to max size (100 entries)', () => {
      // Add 150 log entries
      for (let i = 0; i < 150; i++) {
        logger.info(`Message ${i}`);
      }

      const history = logger.getLogHistory();
      expect(history).toHaveLength(100);

      // Should keep the most recent 100
      expect(history[0].message).toBe('Message 50');
      expect(history[99].message).toBe('Message 149');
    });

    it('clears log history', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');

      expect(logger.getLogHistory()).toHaveLength(3);

      logger.clearHistory();

      expect(logger.getLogHistory()).toHaveLength(0);
    });

    it('returns a copy of history (not reference)', () => {
      logger.info('Original message');

      const history1 = logger.getLogHistory();
      const history2 = logger.getLogHistory();

      expect(history1).not.toBe(history2); // Different array references
      expect(history1).toEqual(history2); // Same content
    });
  });

  describe('Environment-aware logging', () => {
    it('outputs to console in development mode', () => {
      process.env.NODE_ENV = 'development';
      importLogger();

      logger.info('Development message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('does not output to console in production mode', () => {
      process.env.NODE_ENV = 'production';
      importLogger();

      logger.info('Production message');

      // Should not output to console in production
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      // But still adds to history
      const history = logger.getLogHistory();
      expect(history).toHaveLength(1);
    });

    it('outputs to console when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      importLogger();

      logger.info('No env message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Export functionality', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('exports logs as JSON string', () => {
      logger.info('Export test 1', { data: 'value1' });
      logger.warn('Export test 2', { data: 'value2' });

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Export test 1');
      expect(parsed[1].message).toBe('Export test 2');
    });

    it('exports empty array when no logs', () => {
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual([]);
    });

    it('exports formatted JSON with indentation', () => {
      logger.info('Formatted test');

      const exported = logger.exportLogs();

      // Check that it's formatted with indentation (contains newlines)
      expect(exported).toContain('\n');
      expect(exported).toContain('  '); // 2-space indentation
    });
  });

  describe('Convenience functions', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('provides log.debug convenience function', () => {
      log.debug('Convenience debug');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 [App] Convenience debug',
        ''
      );
    });

    it('provides log.info convenience function', () => {
      log.info('Convenience info', { test: true });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [App] Convenience info',
        { test: true }
      );
    });

    it('provides log.warn convenience function', () => {
      log.warn('Convenience warn');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [App] Convenience warn',
        ''
      );
    });

    it('provides log.error convenience function', () => {
      log.error('Convenience error', new Error('Test'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [App] Convenience error',
        expect.any(Error)
      );
    });

    it('provides log.auth convenience function', () => {
      log.auth('Convenience auth');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [Auth] Convenience auth',
        ''
      );
    });

    it('provides log.api convenience function', () => {
      log.api('Convenience api');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [API] Convenience api',
        ''
      );
    });

    it('provides log.websocket convenience function', () => {
      log.websocket('Convenience websocket');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [WebSocket] Convenience websocket',
        ''
      );
    });

    it('provides log.navigation convenience function', () => {
      log.navigation('Convenience navigation');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 [Navigation] Convenience navigation',
        ''
      );
    });

    it('provides log.performance convenience function', () => {
      log.performance('Convenience performance');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'ℹ️ [Performance] Convenience performance',
        ''
      );
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      importLogger();
    });

    it('logs from multiple sources and retrieves history', () => {
      logger.auth('User login started');
      logger.api('GET /users/me', { status: 200 });
      logger.websocket('Connection established');
      logger.navigation('Navigate to Home');
      logger.performance('Page load', { time: 200 });

      const history = logger.getLogHistory();
      expect(history).toHaveLength(5);
      expect(history[0].source).toBe('Auth');
      expect(history[1].source).toBe('API');
      expect(history[2].source).toBe('WebSocket');
      expect(history[3].source).toBe('Navigation');
      expect(history[4].source).toBe('Performance');
    });

    it('handles mixed log levels', () => {
      logger.debug('Debug level');
      logger.info('Info level');
      logger.warn('Warn level');
      logger.error('Error level');

      const history = logger.getLogHistory();
      expect(history.map(entry => entry.level)).toEqual([
        'debug',
        'info',
        'warn',
        'error'
      ]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('maintains history after clearing and logging again', () => {
      logger.info('First message');
      logger.info('Second message');

      logger.clearHistory();

      logger.info('Third message');
      logger.info('Fourth message');

      const history = logger.getLogHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Third message');
      expect(history[1].message).toBe('Fourth message');
    });
  });
});
