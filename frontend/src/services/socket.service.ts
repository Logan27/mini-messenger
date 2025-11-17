import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

type EventHandler = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnecting: boolean = false;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private lastConnectionToken: string | null = null;

  connect(token: string) {
    // Prevent multiple connections - check if already connected or connecting
    if (this.socket?.connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // If same token and connection attempt is in progress, wait for it
    if (this.connectionPromise && this.lastConnectionToken === token) {
      return this.connectionPromise;
    }

    // If socket exists but is disconnected, disconnect it first
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;
    this.lastConnectionToken = token;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected, socket ID:', this.socket?.id);
      this.isConnecting = false;
      this.connectionPromise = null;
      this.reconnecting = false;
      this.emit('connection.status', { connected: true, reconnecting: false });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnecting = false;
      this.connectionPromise = null;
      this.lastConnectionToken = null;
      this.emit('connection.status', { connected: false, reconnecting: false });
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnecting = true;
      this.emit('connection.status', { connected: false, reconnecting: true });
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Set up message event listeners
    this.setupMessageListeners();
  }

  private setupMessageListeners() {
    if (!this.socket) {
      console.error('❌ Cannot setup message listeners - socket is null');
      return;
    }


    // New message received - backend sends 'message.new'
    this.socket.on('message.new', (message) => {
      // Emit to registered listeners
      this.emit('message.new', message);
    });

    // Legacy support for message_sent event
    this.socket.on('message_sent', (message) => {
      // Emit as 'message.new' to maintain compatibility
      this.emit('message.new', message);
    });

    // Message read receipt
    // Backend sends 'message_read' (underscore), not 'message.read' (dot)
    this.socket.on('message_read', (data) => {
      this.emit('message_read', data);
    });

    // Message deleted (soft delete - only for sender)
    this.socket.on('message_soft_deleted', (data) => {
      this.emit('message_soft_deleted', data);
    });

    // Message deleted (hard delete - for everyone)
    this.socket.on('message_hard_deleted', (data) => {
      this.emit('message_hard_deleted', data);
    });

    // Typing indicator
    this.socket.on('message.typing', (data) => {
      this.emit('message.typing', data);
    });

    // User online status
    this.socket.on('user.status', (data) => {
      this.emit('user.status', data);
    });

    // Call events
    this.socket.on('call.incoming', (data) => {
      this.emit('call.incoming', data);
    });

    this.socket.on('call.response', (data) => {
      this.emit('call.response', data);
    });

    this.socket.on('call.accepted', (data) => {
      this.emit('call.accepted', data);
    });

    this.socket.on('call.rejected', (data) => {
      this.emit('call.rejected', data);
    });

    this.socket.on('call.ended', (data) => {
      this.emit('call.ended', data);
    });

    // WebRTC signaling events
    this.socket.on('webrtc_offer', (data) => {
      this.emit('webrtc_offer', data);
    });

    this.socket.on('webrtc_answer', (data) => {
      this.emit('webrtc_answer', data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      this.emit('webrtc_ice_candidate', data);
    });

    // Contact events
    this.socket.on('contact.request', (data) => {
      this.emit('contact.request', data);
    });

    this.socket.on('contact.accepted', (data) => {
      this.emit('contact.accepted', data);
    });

    this.socket.on('contact.rejected', (data) => {
      this.emit('contact.rejected', data);
    });

    this.socket.on('contact.removed', (data) => {
      this.emit('contact.removed', data);
    });

    this.socket.on('contact.blocked', (data) => {
      this.emit('contact.blocked', data);
    });

    this.socket.on('contact.unblocked', (data) => {
      this.emit('contact.unblocked', data);
    });

    this.socket.on('contact.muted', (data) => {
      this.emit('contact.muted', data);
    });

    this.socket.on('contact.unmuted', (data) => {
      this.emit('contact.unmuted', data);
    });

    // Group events
    this.socket.on('group_updated', (data) => {
      this.emit('group_updated', data);
    });

    this.socket.on('group_deleted', (data) => {
      this.emit('group_deleted', data);
    });

    this.socket.on('group_member_joined', (data) => {
      this.emit('group_member_joined', data);
    });

    this.socket.on('group_member_left', (data) => {
      this.emit('group_member_left', data);
    });

    this.socket.on('group_member_role_updated', (data) => {
      this.emit('group_member_role_updated', data);
    });

    console.log('✅ All message listeners set up successfully (including WebRTC signaling, contact events, and group events)');
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      this.isConnecting = false;
      this.connectionPromise = null;
      this.lastConnectionToken = null;
      this.reconnecting = false;
    }
  }

  // Emit events to server
  send(event: string, data: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('❌ Socket not connected, cannot send event:', event);
    }
  }

  // Send a message
  sendMessage(data: { recipientId?: string; groupId?: string; content: string }) {
    this.send('message.send', data);
  }

  // Send typing indicator
  sendTyping(recipientId: string, isTyping: boolean) {
    this.send('message.typing', { recipientId, isTyping });
  }

  // Mark message as read
  markAsRead(messageId: string) {
    this.send('message_read', { messageId, timestamp: new Date().toISOString() });
  }

  // Mark message as delivered
  markAsDelivered(messageId: string, senderId: string) {
    this.send('message_delivered', { messageId, senderId, timestamp: new Date().toISOString() });
  }

  // Subscribe to events from server
  on(event: string, callback: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Unsubscribe from events
  off(event: string, callback: EventHandler) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Emit to local listeners
  private emit(event: string, data: unknown) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Public method to manually trigger local listeners (e.g., after updating settings)
  triggerLocalEvent(event: string, data: unknown) {
    this.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isReconnecting(): boolean {
    return this.reconnecting;
  }

  // Diagnostic method - call from console to debug
  diagnose() {
    console.log('  Connected:', this.socket?.connected);
    console.log('  Socket ID:', this.socket?.id);
    console.log('  Is Connecting:', this.isConnecting);
    console.log('  Is Reconnecting:', this.reconnecting);
    console.log('  Registered Listeners:');
    this.listeners.forEach((callbacks, event) => {
      console.log(`    ${event}: ${callbacks.size} listener(s)`);
    });
    console.log('  Socket.IO Internal Listeners:');
    if (this.socket) {
      // Socket.io doesn't expose eventNames, so we just log that listeners are attached
      console.log('    Internal Socket.io listeners are attached (use browser devtools to inspect)');
    }
  }

  // Test method - simulate receiving an event to verify local emit works
  testLocalEmit() {
    console.log('🧪 Testing local emit system...');
    const testData = {
      id: 'test-123',
      content: 'Test message from console',
      senderId: 'test-sender',
      recipientId: 'test-recipient',
      timestamp: new Date().toISOString()
    };
    console.log('Emitting test message.new event...');
    this.emit('message.new', testData);
  }

  // Test method - check if backend is sending ANY events
  testBackendEvents() {
    console.log('🧪 Testing backend event reception...');
    console.log('Listening for ALL Socket.IO events for 10 seconds...');

    if (!this.socket) {
      console.error('❌ Socket not connected');
      return;
    }

    const originalOneAny = this.socket.onAny;
    const receivedEvents: string[] = [];

    this.socket.onAny((eventName, ...args) => {
      receivedEvents.push(eventName);
    });

    setTimeout(() => {
      this.socket?.offAny();
      if (originalOneAny) {
        this.socket?.onAny(originalOneAny as (...args: unknown[]) => void);
      }
      console.log('🧪 Test complete. Received events:', receivedEvents.length > 0 ? receivedEvents : 'NONE');
      if (receivedEvents.length === 0) {
        console.warn('⚠️ No events received from backend in 10 seconds');
        console.warn('⚠️ This means the backend is not broadcasting to your socket');
      }
    }, 10000);

    console.log('Waiting 10 seconds... (send a message or type to trigger events)');
  }
}

export const socketService = new SocketService();
export default socketService;

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { socketService: SocketService }).socketService = socketService;
}
