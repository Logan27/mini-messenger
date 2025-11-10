import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('socketService', () => {
  let mockSocket: any;
  let socketService: any;

  beforeEach(async () => {
    // Create mock socket with event emitter behavior
    mockSocket = {
      id: 'test-socket-id',
      connected: false,
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };

    vi.mocked(io).mockReturnValue(mockSocket as any);

    // Dynamically import to get fresh instance
    const module = await import('../socket.service');
    socketService = module.socketService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should create socket connection with token', () => {
      const token = 'test-token-123';
      socketService.connect(token);

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token },
          reconnection: true,
        })
      );
    });

    it('should set up event listeners on connect', () => {
      socketService.connect('token');

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should not create duplicate connection if already connected', () => {
      mockSocket.connected = true;
      socketService.connect('token');
      socketService.connect('token');

      // Should only call io once
      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and clear listeners', () => {
      mockSocket.connected = true;
      socketService.connect('token');
      socketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should register event listeners', () => {
      const handler = vi.fn();
      const unsubscribe = socketService.on('message.new', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit events to registered listeners', () => {
      const handler = vi.fn();
      socketService.on('message.new', handler);

      const testData = { id: 'msg1', content: 'test' };
      socketService.emit('message.new', testData);

      expect(handler).toHaveBeenCalledWith(testData);
    });

    it('should unsubscribe listeners', () => {
      const handler = vi.fn();
      const unsubscribe = socketService.on('message.new', handler);

      unsubscribe();

      socketService.emit('message.new', { test: 'data' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should check connection status', () => {
      mockSocket.connected = true;
      const isConnected = socketService.isConnected();

      expect(typeof isConnected).toBe('boolean');
    });

    it('should check reconnection status', () => {
      const isReconnecting = socketService.isReconnecting();

      expect(typeof isReconnecting).toBe('boolean');
    });
  });
});
