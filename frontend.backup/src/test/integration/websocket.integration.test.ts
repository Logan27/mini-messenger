import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useWebSocket } from '../../services/websocketService';

// Mock Socket.IO client
jest.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  })),
}));

import { io } from 'socket.io-client';

const mockSocket = io as jest.MockedFunction<typeof io>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('WebSocket Integration Tests', () => {
  let mockSocketInstance: any;

  beforeEach(() => {
    mockSocketInstance = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
      id: 'mock-socket-id',
    };

    mockSocket.mockReturnValue(mockSocketInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection on mount', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      expect(mockSocket).toHaveBeenCalledWith('ws://localhost:3001');
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle connection events', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const connectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        act(() => {
          connectHandler();
        });
      }

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle disconnection events', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        act(() => {
          disconnectHandler('io server disconnect');
        });
      }

      expect(result.current.isConnected).toBe(false);
    });

    it('should handle connection errors', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const errorHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      if (errorHandler) {
        act(() => {
          errorHandler(new Error('Connection failed'));
        });
      }

      expect(result.current.error).toBe('Connection failed');
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(mockSocketInstance.off).toHaveBeenCalledWith('connect');
      expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocketInstance.off).toHaveBeenCalledWith('connect_error');
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should handle incoming messages', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const messageHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const testMessage = {
        id: '1',
        content: 'Hello, world!',
        senderId: 'user1',
        recipientId: 'user2',
        type: 'text',
        timestamp: new Date().toISOString(),
      };

      if (messageHandler) {
        act(() => {
          messageHandler(testMessage);
        });
      }

      expect(result.current.messages).toContainEqual(testMessage);
    });

    it('should handle typing indicators', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const typingHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'typing'
      )?.[1];

      const typingData = {
        userId: 'user1',
        isTyping: true,
        conversationId: 'conv1',
      };

      if (typingHandler) {
        act(() => {
          typingHandler(typingData);
        });
      }

      expect(result.current.typingUsers).toContainEqual(typingData);
    });

    it('should handle user status updates', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const statusHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'user_status'
      )?.[1];

      const statusUpdate = {
        userId: 'user1',
        status: 'online',
        lastSeen: new Date().toISOString(),
      };

      if (statusHandler) {
        act(() => {
          statusHandler(statusUpdate);
        });
      }

      expect(result.current.onlineUsers).toContainEqual(statusUpdate);
    });

    it('should handle group message status updates', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const groupStatusHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'group_message_status'
      )?.[1];

      const groupStatusUpdate = {
        messageId: 'msg1',
        groupId: 'group1',
        userId: 'user1',
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };

      if (groupStatusHandler) {
        act(() => {
          groupStatusHandler(groupStatusUpdate);
        });
      }

      expect(result.current.groupMessageStatuses).toContainEqual(groupStatusUpdate);
    });
  });

  describe('Message Sending', () => {
    it('should send messages through WebSocket', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const messageData = {
        content: 'Test message',
        recipientId: 'user2',
        type: 'text',
      };

      act(() => {
        result.current.sendMessage(messageData);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send_message', messageData);
    });

    it('should send typing indicators', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.sendTypingIndicator(true, 'conv1');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('typing', {
        isTyping: true,
        conversationId: 'conv1',
      });
    });

    it('should send status updates', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateStatus('away');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('status_update', {
        status: 'away',
      });
    });

    it('should handle send message errors', () => {
      mockSocketInstance.emit.mockImplementation((event, data, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Send failed'));
        }
      });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const messageData = {
        content: 'Test message',
        recipientId: 'user2',
        type: 'text',
      };

      act(() => {
        result.current.sendMessage(messageData);
      });

      expect(result.current.error).toBe('Send failed');
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on connection loss', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        act(() => {
          disconnectHandler('io server disconnect');
        });
      }

      expect(result.current.isConnected).toBe(false);

      // Simulate reconnection
      const connectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        act(() => {
          connectHandler();
        });
      }

      expect(result.current.isConnected).toBe(true);
    });

    it('should implement exponential backoff for reconnection', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      // Simulate multiple disconnections
      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        act(() => {
          disconnectHandler('io server disconnect');
        });

        act(() => {
          disconnectHandler('io server disconnect');
        });
      }

      // Fast-forward time to test backoff
      vi.advanceTimersByTime(5000);

      expect(result.current.reconnectAttempts).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('Room/Conversation Management', () => {
    it('should join conversation room', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.joinConversation('conv1');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join_conversation', {
        conversationId: 'conv1',
      });
    });

    it('should leave conversation room', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.leaveConversation('conv1');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave_conversation', {
        conversationId: 'conv1',
      });
    });

    it('should join group', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.joinGroup('group1');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join_group', {
        groupId: 'group1',
      });
    });

    it('should leave group', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.leaveGroup('group1');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave_group', {
        groupId: 'group1',
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle malformed messages gracefully', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const messageHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler(null); // Malformed message
        });

        act(() => {
          messageHandler({}); // Empty message
        });
      }

      // Should not crash and should handle gracefully
      expect(result.current.error).toBeNull();
    });

    it('should handle network interruptions', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const errorHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      if (errorHandler) {
        act(() => {
          errorHandler(new Error('Network is unreachable'));
        });
      }

      expect(result.current.error).toBe('Network is unreachable');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track message latency', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      const startTime = Date.now();

      act(() => {
        result.current.sendMessage({
          content: 'Performance test',
          recipientId: 'user2',
          type: 'text',
        });
      });

      // Simulate pong response
      const pongHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'pong'
      )?.[1];

      if (pongHandler) {
        act(() => {
          pongHandler(Date.now());
        });
      }

      expect(result.current.latency).toBeGreaterThan(0);
    });

    it('should track connection quality', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3001'), {
        wrapper: createWrapper(),
      });

      // Simulate multiple rapid disconnections/reconnections
      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      const connectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (disconnectHandler && connectHandler) {
        act(() => {
          disconnectHandler('io server disconnect');
          connectHandler();
          disconnectHandler('io server disconnect');
          connectHandler();
        });
      }

      expect(result.current.connectionQuality).toBeLessThan(1); // Should be less than perfect
    });
  });
});