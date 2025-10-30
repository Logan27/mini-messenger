// WebSocket client service with reconnection logic and session restoration
class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.reconnectDecay = 1.5; // Exponential backoff multiplier
    this.timeoutInterval = null;
    this.serverOffset = 0; // For clock synchronization
    this.offlineQueue = []; // Messages sent while offline
    this.eventListeners = new Map(); // Event name -> Set of handlers
    this.authToken = null;
    this.userId = null;
    this.username = null;
    this.connectionState = 'disconnected'; // connecting, connected, disconnected, error, reconnecting

    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleError = this.handleError.bind(this);
    this.attemptReconnect = this.attemptReconnect.bind(this);
  }

  // Initialize connection with authentication
  async connect(token, userId, username) {
    if (this.isConnecting || this.isConnected) {
      console.warn('WebSocket connection already in progress or connected');
      return;
    }

    this.authToken = token;
    this.userId = userId;
    this.username = username;
    this.connectionState = 'connecting';
    this.isConnecting = true;

    try {
      // Import socket.io client
      const { io } = await import('socket.io-client');

      // Create socket connection with authentication
      this.socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
        auth: {
          token: this.authToken
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        autoConnect: false,
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Attempt connection
      this.socket.connect();

      console.log('🔌 WebSocket connecting...');
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.handleError(error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleError);
    this.socket.on('reconnect', this.handleReconnect);
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt);
    this.socket.on('reconnect_error', this.handleError);
    this.socket.on('reconnect_failed', this.handleReconnectFailed);

    // Authentication events
    this.socket.on('authenticated', this.handleAuthenticated);
    this.socket.on('auth_error', this.handleAuthError);

    // Message events
    this.socket.on('message_sent', this.handleMessageSent);
    this.socket.on('message_delivered', this.handleMessageDelivered);
    this.socket.on('message_read', this.handleMessageRead);
    this.socket.on('group_message', this.handleGroupMessage);

    // User presence events
    this.socket.on('user_online', this.handleUserOnline);
    this.socket.on('user_offline', this.handleUserOffline);
    this.socket.on('user_status_update', this.handleUserStatusUpdate);

    // Typing indicators
    this.socket.on('typing', this.handleTyping);
    this.socket.on('stop_typing', this.handleStopTyping);

    // WebRTC events
    this.socket.on('webrtc_signal', this.handleWebRTCSignal);

    // Call events
    this.socket.on('call_initiated', this.handleCallInitiated);
    this.socket.on('call_accepted', this.handleCallAccepted);
    this.socket.on('call_declined', this.handleCallDeclined);
    this.socket.on('call_ended', this.handleCallEnded);
    this.socket.on('call_failed', this.handleCallFailed);
    this.socket.on('call_participant_joined', this.handleCallParticipantJoined);
    this.socket.on('call_participant_left', this.handleCallParticipantLeft);

    // Admin events
    this.socket.on('admin_stats_update', this.handleAdminStatsUpdate);
    this.socket.on('admin_user_registration', this.handleAdminUserRegistration);
    this.socket.on('admin_user_activity', this.handleAdminUserActivity);
    this.socket.on('admin_system_alert', this.handleAdminSystemAlert);
    this.socket.on('admin_notification', this.handleAdminNotification);

    // Notification events
    this.socket.on('notification', this.handleNotification);
    this.socket.on('notification_read', this.handleNotificationRead);
    this.socket.on('notification_deleted', this.handleNotificationDeleted);

    // System events
    this.socket.on('error', this.handleError);
    this.socket.on('pong', this.handlePong);
  }

  // Handle successful connection
  handleConnect() {
    console.log('✅ WebSocket connected:', this.socket.id);
    this.isConnected = true;
    this.isConnecting = false;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay

    // Emit connection event
    this.emit('connected', { socketId: this.socket.id });

    // Process offline queue
    this.processOfflineQueue();

    // Start heartbeat
    this.startHeartbeat();
  }

  // Handle disconnection
  handleDisconnect(reason) {
    console.log('🔌 WebSocket disconnected:', reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'disconnected';

    // Emit disconnection event
    this.emit('disconnected', { reason });

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear connection timeout
    if (this.timeoutInterval) {
      clearTimeout(this.timeoutInterval);
    }

    // Attempt reconnection if not manually disconnected
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  // Handle connection errors
  handleError(error) {
    console.error('❌ WebSocket error:', error);
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'error';

    // Emit error event
    this.emit('error', { error: error.message || error });

    // Attempt reconnection on error
    this.scheduleReconnect();
  }

  // Handle successful reconnection
  handleReconnect(attemptNumber) {
    console.log('✅ WebSocket reconnected after', attemptNumber, 'attempts');
    this.isConnected = true;
    this.isConnecting = false;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Emit reconnection event
    this.emit('reconnected', { attemptNumber });

    // Process offline queue
    this.processOfflineQueue();
  }

  // Handle reconnection attempts
  handleReconnectAttempt(attemptNumber) {
    console.log('🔄 WebSocket reconnection attempt:', attemptNumber);
    this.connectionState = 'reconnecting';

    // Emit reconnection attempt event
    this.emit('reconnecting', { attemptNumber, maxAttempts: this.maxReconnectAttempts });
  }

  // Handle failed reconnection
  handleReconnectFailed() {
    console.error('❌ WebSocket reconnection failed after max attempts');
    this.connectionState = 'error';

    // Emit reconnection failed event
    this.emit('reconnection_failed', { maxAttempts: this.maxReconnectAttempts });
  }

  // Handle authentication success
  handleAuthenticated(data) {
    console.log('🔐 WebSocket authenticated:', data);
    this.userId = data.userId;
    this.username = data.username;

    // Emit authentication event
    this.emit('authenticated', data);
  }

  // Handle authentication error
  handleAuthError(error) {
    console.error('❌ WebSocket authentication error:', error);
    this.connectionState = 'error';

    // Emit auth error event
    this.emit('auth_error', error);
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.handleReconnectFailed();
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = 'reconnecting';

    // Calculate delay with exponential backoff and jitter
    const jitter = Math.random() * 0.1 * this.reconnectDelay; // 10% jitter
    const delay = Math.min(this.reconnectDelay + jitter, this.maxReconnectDelay);

    console.log(`⏱️ Scheduling reconnection attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);

    setTimeout(() => {
      if (!this.isConnected && this.authToken) {
        this.attemptReconnect();
      }
    }, delay);

    // Increase delay for next attempt
    this.reconnectDelay = Math.min(this.reconnectDelay * this.reconnectDecay, this.maxReconnectDelay);
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.isConnected || !this.authToken) return;

    console.log('🔄 Attempting to reconnect...');
    this.isConnecting = true;

    try {
      this.socket.connect();
    } catch (error) {
      console.error('❌ Reconnection attempt failed:', error);
      this.handleError(error);
    }
  }

  // Start heartbeat mechanism
  startHeartbeat() {
    this.stopHeartbeat(); // Clear existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        const startTime = Date.now();
        this.socket.emit('heartbeat');

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('⚠️ Heartbeat timeout - connection may be stale');
          this.socket.disconnect();
        }, 5000);
      }
    }, 25000); // 25 seconds as specified
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // Handle pong response
  handlePong(data) {
    // Clear heartbeat timeout
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    // Calculate server offset for clock synchronization
    const latency = Date.now() - this.lastHeartbeatTime;
    this.serverOffset = data.timestamp ? data.timestamp - Date.now() + latency / 2 : 0;

    // Emit heartbeat event
    this.emit('heartbeat', { latency, serverOffset: this.serverOffset });
  }

  // Process offline message queue
  processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`📨 Processing ${this.offlineQueue.length} offline messages`);

    // Process messages in order
    this.offlineQueue.forEach((queuedMessage, index) => {
      setTimeout(() => {
        this.sendMessage(queuedMessage.data, queuedMessage.options);
      }, index * 100); // Stagger messages by 100ms
    });

    // Clear queue
    this.offlineQueue = [];
  }

  // Send message with offline queue support
  sendMessage(messageData, options = {}) {
    if (!this.socket) {
      console.warn('⚠️ No socket connection available');
      return false;
    }

    // If connected, send immediately
    if (this.isConnected) {
      try {
        this.socket.emit('message_sent', messageData);
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);

        // If send fails and not a manual retry, add to offline queue
        if (!options.isRetry) {
          this.addToOfflineQueue(messageData, options);
        }
        return false;
      }
    }

    // If disconnected, add to offline queue
    if (!options.isRetry) {
      this.addToOfflineQueue(messageData, options);
    }

    return false;
  }

  // Add message to offline queue
  addToOfflineQueue(messageData, options) {
    this.offlineQueue.push({
      data: messageData,
      options,
      timestamp: Date.now(),
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.log(`📨 Added message to offline queue. Queue size: ${this.offlineQueue.length}`);

    // Emit offline queue event
    this.emit('offline_message_queued', {
      messageId: this.offlineQueue[this.offlineQueue.length - 1].id,
      queueSize: this.offlineQueue.length
    });

    // Limit offline queue size (max 1000 messages)
    if (this.offlineQueue.length > 1000) {
      const removedMessages = this.offlineQueue.splice(0, this.offlineQueue.length - 1000);
      console.warn(`⚠️ Offline queue full, removed ${removedMessages.length} oldest messages`);
    }
  }

  // Event handler methods (placeholders - implement based on app needs)
  handleMessageSent(data) {
    this.emit('message_sent', data);
  }

  handleMessageDelivered(data) {
    this.emit('message_delivered', data);
  }

  handleMessageRead(data) {
    this.emit('message_read', data);
  }

  handleGroupMessage(data) {
    this.emit('group_message', data);
  }

  handleUserOnline(data) {
    this.emit('user_online', data);
  }

  handleUserOffline(data) {
    this.emit('user_offline', data);
  }

  handleUserStatusUpdate(data) {
    this.emit('user_status_update', data);
  }

  handleTyping(data) {
    this.emit('typing', data);
  }

  handleStopTyping(data) {
    this.emit('stop_typing', data);
  }

  handleWebRTCSignal(data) {
    this.emit('webrtc_signal', data);
  }

  // Call event handlers
  handleCallInitiated(data) {
    this.emit('call_initiated', data);
  }

  handleCallAccepted(data) {
    this.emit('call_accepted', data);
  }

  handleCallDeclined(data) {
    this.emit('call_declined', data);
  }

  handleCallEnded(data) {
    this.emit('call_ended', data);
  }

  handleCallFailed(data) {
    this.emit('call_failed', data);
  }

  handleCallParticipantJoined(data) {
    this.emit('call_participant_joined', data);
  }

  handleCallParticipantLeft(data) {
    this.emit('call_participant_left', data);
  }

  // Admin event handlers
  handleAdminStatsUpdate(data) {
    this.emit('admin_stats_update', data);
  }

  handleAdminUserRegistration(data) {
    this.emit('admin_user_registration', data);
  }

  handleAdminUserActivity(data) {
    this.emit('admin_user_activity', data);
  }

  handleAdminSystemAlert(data) {
    this.emit('admin_system_alert', data);
  }

  handleAdminNotification(data) {
    this.emit('admin_notification', data);
  }

  // Notification event handlers
  handleNotification(data) {
    this.emit('notification', data);
  }

  handleNotificationRead(data) {
    this.emit('notification_read', data);
  }

  handleNotificationDeleted(data) {
    this.emit('notification_deleted', data);
  }

  // Connection state management
  setConnectionState(state) {
    if (this.connectionState !== state) {
      const oldState = this.connectionState;
      this.connectionState = state;
      this.emit('connection_state_change', { oldState, newState: state });
    }
  }

  // Get current connection state
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      offlineQueueSize: this.offlineQueue.length,
      serverOffset: this.serverOffset
    };
  }

  // Event emitter methods
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Clean disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'disconnected';

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear timeouts
    if (this.timeoutInterval) {
      clearTimeout(this.timeoutInterval);
    }

    console.log('🔌 WebSocket disconnected manually');
  }

  // Cleanup resources
  cleanup() {
    this.disconnect();

    // Clear event listeners
    this.eventListeners.clear();

    // Clear offline queue
    this.offlineQueue = [];

    console.log('🧹 WebSocket service cleaned up');
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
export { WebSocketService };