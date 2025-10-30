import { io, Socket } from 'socket.io-client';

type EventHandler = (data: any) => void;

interface ConnectionState {
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private connectionState: ConnectionState = {
    isConnected: false,
    connectionState: 'disconnected'
  };

  connect(token: string, userId: string, username: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

    console.log(`🔌 Connecting to WebSocket at ${SOCKET_URL}...`);

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.connectionState = {
        isConnected: true,
        connectionState: 'connected'
      };
      this.emit('connected', { timestamp: new Date().toISOString() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.connectionState = {
        isConnected: false,
        connectionState: 'disconnected'
      };
      this.emit('disconnected', { reason, timestamp: new Date().toISOString() });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
      this.connectionState = {
        isConnected: false,
        connectionState: 'error'
      };
      this.emit('error', { error: error.message, timestamp: new Date().toISOString() });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.emit('reconnected', { attemptNumber, timestamp: new Date().toISOString() });
    });

    // Message events
    this.socket.on('message_sent', (data) => {
      this.emit('message_sent', data);
    });

    this.socket.on('message_delivered', (data) => {
      this.emit('message_delivered', data);
    });

    this.socket.on('message_read', (data) => {
      this.emit('message_read', data);
    });

    // Typing events
    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    this.socket.on('stop_typing', (data) => {
      this.emit('stop_typing', data);
    });

    // User presence events
    this.socket.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });

    this.socket.on('user_status_update', (data) => {
      this.emit('user_status_update', data);
    });

    // Group events
    this.socket.on('group_member_added', (data) => {
      this.emit('group_member_added', data);
    });

    this.socket.on('group_member_removed', (data) => {
      this.emit('group_member_removed', data);
    });

    this.socket.on('group_member_role_updated', (data) => {
      this.emit('group_member_role_updated', data);
    });

    this.socket.on('group_updated', (data) => {
      this.emit('group_updated', data);
    });

    this.socket.on('group_left', (data) => {
      this.emit('group_left', data);
    });
  }

  sendMessage(data: any) {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected, cannot send message');
      return;
    }

    const eventType = data.type || 'message';
    this.socket.emit(eventType, data);
  }

  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = {
        isConnected: false,
        connectionState: 'disconnected'
      };
    }
  }

  cleanup() {
    this.disconnect();
    this.eventHandlers.clear();
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new WebSocketService();