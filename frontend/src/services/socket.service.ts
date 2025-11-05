import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnecting: boolean = false;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private lastConnectionToken: string | null = null;

  connect(token: string) {
    // Prevent multiple connections - check if already connected or connecting
    if (this.socket?.connected) {
      console.log('🔵 Socket already connected, skipping...');
      return;
    }

    if (this.isConnecting) {
      console.log('🔵 Socket connection in progress, skipping...');
      return;
    }

    // If same token and connection attempt is in progress, wait for it
    if (this.connectionPromise && this.lastConnectionToken === token) {
      console.log('🔵 Reusing existing connection attempt...');
      return this.connectionPromise;
    }

    // If socket exists but is disconnected, disconnect it first
    if (this.socket) {
      console.log('🔵 Cleaning up existing disconnected socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;
    this.lastConnectionToken = token;
    console.log('🔵 Connecting to WebSocket:', SOCKET_URL);

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
      console.log('📋 Current listeners registered:', Array.from(this.listeners.keys()).map(key => `${key} (${this.listeners.get(key)?.size} listeners)`));
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
      console.log('🔄 WebSocket reconnecting...');
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

    console.log('🎧 Setting up message listeners on socket:', this.socket.id);

    // New message received - backend sends 'message.new'
    this.socket.on('message.new', (message) => {
      console.log('🔵 Socket.IO received: message.new', message);
      // Emit to registered listeners
      this.emit('message.new', message);
    });

    // Legacy support for message_sent event
    this.socket.on('message_sent', (message) => {
      console.log('🔵 Socket.IO received: message_sent (legacy)', message);
      // Emit as 'message.new' to maintain compatibility
      this.emit('message.new', message);
    });

    // Message read receipt
    // Backend sends 'message_read' (underscore), not 'message.read' (dot)
    this.socket.on('message_read', (data) => {
      console.log('🔵 Socket.IO received: message_read', data);
      this.emit('message_read', data);
    });

    // Message deleted (soft delete - only for sender)
    this.socket.on('message_soft_deleted', (data) => {
      console.log('🔵 Socket.IO received: message_soft_deleted', data);
      this.emit('message_soft_deleted', data);
    });

    // Message deleted (hard delete - for everyone)
    this.socket.on('message_hard_deleted', (data) => {
      console.log('🔵 Socket.IO received: message_hard_deleted', data);
      this.emit('message_hard_deleted', data);
    });

    // Typing indicator
    this.socket.on('message.typing', (data) => {
      console.log('🔵 Socket.IO received: message.typing', data);
      this.emit('message.typing', data);
    });

    // User online status
    this.socket.on('user.status', (data) => {
      console.log('🔵 Socket.IO received: user.status', data);
      this.emit('user.status', data);
    });

    // Call events
    this.socket.on('call.incoming', (data) => {
      console.log('🔵 Socket.IO received: call.incoming', data);
      this.emit('call.incoming', data);
    });

    this.socket.on('call.response', (data) => {
      console.log('🔵 Socket.IO received: call.response', data);
      this.emit('call.response', data);
    });

    this.socket.on('call.accepted', (data) => {
      console.log('🔵 Socket.IO received: call.accepted', data);
      this.emit('call.accepted', data);
    });

    this.socket.on('call.rejected', (data) => {
      console.log('🔵 Socket.IO received: call.rejected', data);
      this.emit('call.rejected', data);
    });

    this.socket.on('call.ended', (data) => {
      console.log('🔵 Socket.IO received: call.ended', data);
      this.emit('call.ended', data);
    });

    // WebRTC signaling events
    this.socket.on('webrtc_offer', (data) => {
      console.log('🔵 Socket.IO received: webrtc_offer from', data.from);
      this.emit('webrtc_offer', data);
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('🔵 Socket.IO received: webrtc_answer from', data.from);
      this.emit('webrtc_answer', data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      console.log('🔵 Socket.IO received: webrtc_ice_candidate from', data.from);
      this.emit('webrtc_ice_candidate', data);
    });

    // Contact events
    this.socket.on('contact.request', (data) => {
      console.log('🔵 Socket.IO received: contact.request', data);
      this.emit('contact.request', data);
    });

    this.socket.on('contact.accepted', (data) => {
      console.log('🔵 Socket.IO received: contact.accepted', data);
      this.emit('contact.accepted', data);
    });

    this.socket.on('contact.rejected', (data) => {
      console.log('🔵 Socket.IO received: contact.rejected', data);
      this.emit('contact.rejected', data);
    });

    this.socket.on('contact.removed', (data) => {
      console.log('🔵 Socket.IO received: contact.removed', data);
      this.emit('contact.removed', data);
    });

    this.socket.on('contact.blocked', (data) => {
      console.log('🔵 Socket.IO received: contact.blocked', data);
      this.emit('contact.blocked', data);
    });

    this.socket.on('contact.unblocked', (data) => {
      console.log('🔵 Socket.IO received: contact.unblocked', data);
      this.emit('contact.unblocked', data);
    });

    // Group events
    this.socket.on('group_updated', (data) => {
      console.log('🔵 Socket.IO received: group_updated', data);
      this.emit('group_updated', data);
    });

    this.socket.on('group_deleted', (data) => {
      console.log('🔵 Socket.IO received: group_deleted', data);
      this.emit('group_deleted', data);
    });

    this.socket.on('group_member_joined', (data) => {
      console.log('🔵 Socket.IO received: group_member_joined', data);
      this.emit('group_member_joined', data);
    });

    this.socket.on('group_member_left', (data) => {
      console.log('🔵 Socket.IO received: group_member_left', data);
      this.emit('group_member_left', data);
    });

    this.socket.on('group_member_role_updated', (data) => {
      console.log('🔵 Socket.IO received: group_member_role_updated', data);
      this.emit('group_member_role_updated', data);
    });

    console.log('✅ All message listeners set up successfully (including WebRTC signaling, contact events, and group events)');
  }

  disconnect() {
    if (this.socket) {
      console.log('🔴 Disconnecting WebSocket...');
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
  send(event: string, data: any) {
    if (this.socket?.connected) {
      console.log(`📤 Socket.emit: ${event}`, { targetUserId: data.targetUserId, socketId: this.socket.id });
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
    console.log(`📝 Sending typing indicator:`, {
      recipientId,
      isTyping,
      connected: this.socket?.connected,
      socketId: this.socket?.id,
      expectedRoom: `user:${recipientId}`
    });
    this.send('message.typing', { recipientId, isTyping });
  }

  // Mark message as read
  markAsRead(messageId: string) {
    console.log('📤 Sending message_read event to backend:', {
      messageId,
      connected: this.socket?.connected,
      timestamp: new Date().toISOString()
    });
    this.send('message_read', { messageId, timestamp: new Date().toISOString() });
  }

  // Mark message as delivered
  markAsDelivered(messageId: string, senderId: string) {
    this.send('message_delivered', { messageId, senderId, timestamp: new Date().toISOString() });
  }

  // Subscribe to events from server
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    console.log(`🔔 Registered listener for event: ${event}, total listeners: ${this.listeners.get(event)!.size}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        console.log(`🔕 Unregistered listener for event: ${event}, remaining: ${callbacks.size}`);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Emit to local listeners
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    console.log(`📢 Emitting event: ${event}, listeners: ${callbacks?.size || 0}`, data);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
      console.log(`✅ Called ${callbacks.size} listeners for event: ${event}`);
    } else {
      // Only warn for important events (not typing indicators, status updates, or call events which are expected to have no listeners sometimes)
      if (!['message.typing', 'user.status', 'call.incoming', 'call.ended', 'connection.status'].includes(event)) {
        console.warn(`⚠️ No listeners registered for event: ${event}, data:`, data);
      }
    }
  }

  // Public method to manually trigger local listeners (e.g., after updating settings)
  triggerLocalEvent(event: string, data: any) {
    console.log(`🔄 Manually triggering local event: ${event}`);
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
    console.log('🔍 Socket Service Diagnostics:');
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
      console.log(`🎯 Backend sent event: ${eventName}`, args);
    });

    setTimeout(() => {
      this.socket?.offAny();
      if (originalOneAny) {
        this.socket?.onAny(originalOneAny as any);
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
  (window as any).socketService = socketService;
}
