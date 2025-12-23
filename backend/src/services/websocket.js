import { Server } from 'socket.io';
import { createAdapter } from 'socket.io-redis-adapter';

import { config } from '../config/index.js';
import { getRedisClient, getRedisSubscriber } from '../config/redis.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';

import messageService from './messageService.js';

// WebSocket connection states
const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
};

// Event types for real-time communication
const WS_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',

  // User presence events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_AWAY: 'user_away',
  USER_STATUS_UPDATE: 'user_status_update',

  // Message events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MESSAGE_TYPING: 'typing',
  MESSAGE_STOP_TYPING: 'stop_typing',

  // Group events
  GROUP_MESSAGE: 'group_message',
  GROUP_JOIN: 'group_join',
  GROUP_LEAVE: 'group_leave',
  GROUP_UPDATED: 'group_updated',
  GROUP_DELETED: 'group_deleted',
  GROUP_MEMBER_JOINED: 'group_member_joined',
  GROUP_MEMBER_LEFT: 'group_member_left',
  GROUP_MEMBER_ROLE_UPDATED: 'group_member_role_updated',

  // Contact events
  CONTACT_REQUEST: 'contact.request',
  CONTACT_ACCEPTED: 'contact.accepted',
  CONTACT_REJECTED: 'contact.rejected',
  CONTACT_REMOVED: 'contact.removed',
  CONTACT_BLOCKED: 'contact.blocked',
  CONTACT_UNBLOCKED: 'contact.unblocked',

  // WebRTC events
  WEBRTC_SIGNAL: 'webrtc_signal',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
  CALL_MUTE: 'call_mute',
  CALL_UNMUTE: 'call_unmute',
  CALL_VIDEO_ON: 'call_video_on',
  CALL_VIDEO_OFF: 'call_video_off',

  // File upload events
  FILE_UPLOAD_START: 'file_upload_start',
  FILE_UPLOAD_PROGRESS: 'file_upload_progress',
  FILE_UPLOAD_COMPLETE: 'file_upload_complete',
  FILE_UPLOAD_ERROR: 'file_upload_error',
  FILE_UPLOAD_CANCEL: 'file_upload_cancel',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETED: 'notification:deleted',
  NOTIFICATION_BADGE_UPDATE: 'notification:badge-update',

  // System events
  HEARTBEAT: 'heartbeat',
  PONG: 'pong',
  ERROR: 'error',
};

class WebSocketService {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.redisSubscriber = null;
    this.authenticatedSockets = new Map(); // socketId -> userId
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.typingUsers = new Map(); // roomId -> Set of typing userIds
    this.typingThrottle = new Map(); // throttleKey -> timestamp for typing indicators
    this.userStatus = new Map(); // userId -> status info
    this.connectionAttempts = new Map(); // socketId -> attempt count
    this.rateLimiters = new Map(); // userId -> rate limiter info
    this.eventRateLimiters = new Map(); // userId -> Map of event type -> rate limiter
  }

  async initialize(server) {
    try {
      // Initialize Redis clients
      this.redisClient = getRedisClient();
      this.redisSubscriber = getRedisSubscriber();

      // Initialize message service
      await messageService.initialize();

      // Create Socket.IO server with authentication middleware
      this.io = new Server(server, {
        cors: {
          origin: config.security.cors.origin,
          methods: config.security.cors.methods,
          credentials: config.security.cors.credentials,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        maxHttpBufferSize: 1e6, // 1MB
        allowUpgrades: true,
      });

      // Set up Redis adapter for horizontal scaling
      /*
      if (config.redis.url) {
        try {
          const pubClient = this.redisClient.duplicate();
          const subClient = this.redisSubscriber.duplicate();

          this.io.adapter(createAdapter(pubClient, subClient));
          console.log('≡ƒôí WebSocket server initialized with Redis adapter for scaling');
        } catch (error) {
          console.error('Γ¥î Failed to initialize Redis adapter:', error);
          console.log('≡ƒôí WebSocket server initialized without Redis adapter');
        }
      } else {
        console.log('≡ƒôí WebSocket server initialized');
      }
      */
      console.log('≡ƒôí WebSocket server initialized (Redis adapter disabled for testing)');

      // Set up authentication middleware
      this.io.use(this.authenticateSocket.bind(this));

      // Set up connection handlers
      this.setupConnectionHandlers();

      // Set up Redis pub/sub listeners
      this.setupRedisListeners();

      // Start periodic cleanup tasks
      this.startPeriodicCleanup();

      // Mark all users as offline on server start (in case of restart)
      await this.markAllUsersOffline();

      console.log('✅ WebSocket service initialized successfully');
      return this.io;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  // JWT authentication middleware for Socket.IO
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Extract token from header if needed
      const extractedToken = extractTokenFromHeader(token) || token;

      // Verify JWT token
      const verification = verifyAccessToken(extractedToken);

      if (!verification.valid) {
        return next(new Error(`Authentication failed: ${verification.error}`));
      }

      // Store user info on socket
      socket.userId = verification.decoded.userId;
      socket.username = verification.decoded.username;
      socket.userRole = verification.decoded.role;

      // Track connection attempts
      const attempts = this.connectionAttempts.get(socket.id) || 0;
      this.connectionAttempts.set(socket.id, attempts + 1);

      // Rate limiting check
      if (!this.checkRateLimit(socket.userId)) {
        return next(new Error('Rate limit exceeded'));
      }

      console.log(`🔐 Socket authenticated: ${socket.userId} (${socket.username})`);
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  // Rate limiting for WebSocket connections
  checkRateLimit(userId) {
    const now = Date.now();
    const limiter = this.rateLimiters.get(userId) || { count: 0, resetTime: now + 60000 };

    // Reset if window expired
    if (now > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 60000; // 1 minute window
    }

    // Check limit (max 5 connections per minute per user)
    if (limiter.count >= 5) {
      return false;
    }

    limiter.count++;
    this.rateLimiters.set(userId, limiter);
    return true;
  }

  // Rate limiting for WebSocket events with optimized limits
  checkEventRateLimit(userId, eventType) {
    const now = Date.now();
    const rateLimits = {
      message_sent: { max: 100, window: 60000 }, // 100 messages per minute
      typing: { max: 60, window: 60000 }, // 60 typing events per minute
      user_status_update: { max: 10, window: 60000 }, // 10 status updates per minute
      webrtc_signal: { max: 50, window: 60000 }, // 50 WebRTC signals per minute
      call_control: { max: 30, window: 60000 }, // 30 call control events per minute
      call_reconnect: { max: 10, window: 60000 }, // 10 reconnection attempts per minute
    };

    const limits = rateLimits[eventType];
    if (!limits) {
      return true;
    } // No rate limiting for this event type

    // Get or create rate limiter for this user and event type
    if (!this.eventRateLimiters.has(userId)) {
      this.eventRateLimiters.set(userId, new Map());
    }

    const userEventLimiters = this.eventRateLimiters.get(userId);
    const limiter = userEventLimiters.get(eventType) || {
      count: 0,
      resetTime: now + limits.window,
    };

    // Reset if window expired
    if (now > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + limits.window;
    }

    // Check limit
    if (limiter.count >= limits.max) {
      console.warn(
        `🚫 Rate limit exceeded for user ${userId}, event ${eventType} (${limiter.count}/${limits.max})`
      );
      return false;
    }

    limiter.count++;
    userEventLimiters.set(eventType, limiter);
    return true;
  }

  // Clean up old rate limit entries
  cleanupRateLimiters() {
    const now = Date.now();

    // Clean connection rate limiters
    for (const [userId, limiter] of this.rateLimiters.entries()) {
      if (now > limiter.resetTime + 300000) {
        // Remove after 5 minutes
        this.rateLimiters.delete(userId);
      }
    }

    // Clean event rate limiters
    for (const [userId, userEventLimiters] of this.eventRateLimiters.entries()) {
      for (const [eventType, limiter] of userEventLimiters.entries()) {
        if (now > limiter.resetTime + 300000) {
          // Remove after 5 minutes
          userEventLimiters.delete(eventType);
        }
      }

      // Remove user entry if no event limiters left
      if (userEventLimiters.size === 0) {
        this.eventRateLimiters.delete(userId);
      }
    }
  }

  setupConnectionHandlers() {
    this.io.on('connection', socket => {
      this.handleConnection(socket);
    });
  }

  async handleConnection(socket) {
    try {
      console.log(`🔗 Socket connected: ${socket.id} (User: ${socket.userId})`);

      // Track authenticated socket
      this.authenticatedSockets.set(socket.id, socket.userId);

      // Track user sockets
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId).add(socket.id);

      // Update user online status
      await this.updateUserStatus(socket.userId, 'online', socket.id);

      // Join user-specific room
      const userRoom = `user:${socket.userId}`;
      await socket.join(userRoom);
      console.log(`✅ User ${socket.userId} joined room: ${userRoom}`);
      console.log(`📡 Socket ${socket.id} current rooms:`, Array.from(socket.rooms));

      // Join user's groups (for real-time group events)
      await this.joinUserGroups(socket);

      // Emit authentication success
      socket.emit(WS_EVENTS.AUTHENTICATED, {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString(),
      });

      // Set up event handlers
      this.setupSocketEventHandlers(socket);

      // Start heartbeat mechanism
      this.startHeartbeat(socket);
    } catch (error) {
      console.error('❌ Error handling socket connection:', error);
      socket.emit(WS_EVENTS.AUTH_ERROR, { message: 'Connection setup failed' });
    }
  }

  setupSocketEventHandlers(socket) {
    // Handle user status updates
    socket.on(WS_EVENTS.USER_STATUS_UPDATE, data => {
      if (this.checkEventRateLimit(socket.userId, 'user_status_update')) {
        this.handleUserStatusUpdate(socket, data);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for status updates',
        });
      }
    });

    // Handle typing indicators with throttling
    // Frontend sends 'message.typing' with { recipientId, isTyping }
    socket.on('message.typing', data => {
      if (this.checkEventRateLimit(socket.userId, 'typing')) {
        this.handleTypingIndicator(socket, data, data.isTyping);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for typing indicators',
        });
      }
    });

    // OPTIMIZATION: Consolidated message send handler (supports both event names)
    const handleMessageSend = data => {
      if (this.checkEventRateLimit(socket.userId, 'message_sent')) {
        messageService.handleMessageSent(socket, data);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for messages',
        });
      }
    };

    // Handle message events (frontend sends 'message.send')
    socket.on('message.send', handleMessageSend);

    // Legacy support for message_sent event
    socket.on(WS_EVENTS.MESSAGE_SENT, handleMessageSend);

    // Handle message delivery confirmation
    socket.on(WS_EVENTS.MESSAGE_DELIVERED, data => {
      messageService.handleMessageDelivered(socket, data);
    });

    // Handle message read confirmation
    socket.on(WS_EVENTS.MESSAGE_READ, data => {
      messageService.handleMessageRead(socket, data);
    });

    // Handle group message delivery confirmation
    socket.on('group_message_delivered', data => {
      messageService.handleGroupMessageDelivered(socket, data);
    });

    // Handle group message read confirmation
    socket.on('group_message_read', data => {
      messageService.handleGroupMessageRead(socket, data);
    });

    // Handle WebRTC signaling with optimized event handling
    socket.on(WS_EVENTS.WEBRTC_OFFER, data => {
      if (this.checkEventRateLimit(socket.userId, 'webrtc_signal')) {
        this.handleWebRTCSignal(socket, data, WS_EVENTS.WEBRTC_OFFER);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for WebRTC signals',
        });
      }
    });

    socket.on(WS_EVENTS.WEBRTC_ANSWER, data => {
      if (this.checkEventRateLimit(socket.userId, 'webrtc_signal')) {
        this.handleWebRTCSignal(socket, data, WS_EVENTS.WEBRTC_ANSWER);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for WebRTC signals',
        });
      }
    });

    socket.on(WS_EVENTS.WEBRTC_ICE_CANDIDATE, data => {
      if (this.checkEventRateLimit(socket.userId, 'webrtc_signal')) {
        this.handleWebRTCSignal(socket, data, WS_EVENTS.WEBRTC_ICE_CANDIDATE);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for WebRTC signals',
        });
      }
    });

    // Handle call control events with enhanced rate limiting
    socket.on(WS_EVENTS.CALL_MUTE, data => {
      if (this.checkEventRateLimit(socket.userId, 'call_control')) {
        this.handleCallControl(socket, data, WS_EVENTS.CALL_MUTE);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for call controls',
        });
      }
    });

    socket.on(WS_EVENTS.CALL_UNMUTE, data => {
      if (this.checkEventRateLimit(socket.userId, 'call_control')) {
        this.handleCallControl(socket, data, WS_EVENTS.CALL_UNMUTE);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for call controls',
        });
      }
    });

    socket.on(WS_EVENTS.CALL_VIDEO_ON, data => {
      if (this.checkEventRateLimit(socket.userId, 'call_control')) {
        this.handleCallControl(socket, data, WS_EVENTS.CALL_VIDEO_ON);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for call controls',
        });
      }
    });

    socket.on(WS_EVENTS.CALL_VIDEO_OFF, data => {
      if (this.checkEventRateLimit(socket.userId, 'call_control')) {
        this.handleCallControl(socket, data, WS_EVENTS.CALL_VIDEO_OFF);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for call controls',
        });
      }
    });

    // Handle call reconnection event with rate limiting
    socket.on('call_reconnect', data => {
      if (this.checkEventRateLimit(socket.userId, 'call_reconnect')) {
        this.handleCallReconnect(socket, data);
      } else {
        socket.emit(WS_EVENTS.ERROR, {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for call reconnections',
        });
      }
    });

    // Handle heartbeat
    socket.on(WS_EVENTS.HEARTBEAT, () => {
      socket.emit(WS_EVENTS.PONG);
    });

    // Handle file upload progress subscription
    socket.on(WS_EVENTS.FILE_UPLOAD_START, data => {
      this.handleFileUploadStart(socket, data);
    });

    socket.on(WS_EVENTS.FILE_UPLOAD_CANCEL, data => {
      this.handleFileUploadCancel(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', reason => {
      this.handleDisconnect(socket, reason);
    });
  }

  async handleUserStatusUpdate(socket, data) {
    const { status } = data;
    if (!['online', 'away', 'offline'].includes(status)) {
      return;
    }

    await this.updateUserStatus(socket.userId, status, socket.id);

    // Broadcast status update to other users
    socket.broadcast.emit(WS_EVENTS.USER_STATUS_UPDATE, {
      userId: socket.userId,
      username: socket.username,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  async handleTypingIndicator(socket, data, isTyping) {
    const { recipientId, groupId } = data;
    const roomId = recipientId ? `user:${recipientId}` : `group:${groupId}`;

    if (isTyping) {
      // Add user to typing list
      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Set());
      }
      this.typingUsers.get(roomId).add(socket.userId);

      // Broadcast typing indicator with throttling (1 per second as specified)
      this.throttleTypingIndicator(socket, roomId, {
        userId: socket.userId,
        username: socket.username,
        recipientId,
        groupId,
        isTyping: true,
        timestamp: new Date().toISOString(),
      });

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        this.handleTypingIndicator(socket, data, false);
      }, 3000);
    } else {
      // Remove user from typing list
      const typingSet = this.typingUsers.get(roomId);
      if (typingSet) {
        typingSet.delete(socket.userId);

        // Broadcast stop typing immediately (no throttling needed)
        // Emit message.typing with isTyping: false to match frontend expectations
        socket.to(roomId).emit('message.typing', {
          userId: socket.userId,
          username: socket.username,
          recipientId,
          groupId,
          isTyping: false,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Throttle typing indicators to 1 per second
  throttleTypingIndicator(socket, roomId, typingData) {
    const throttleKey = `typing:${roomId}:${socket.userId}`;
    const now = Date.now();

    // Check if we should throttle this typing indicator
    if (this.typingThrottle && this.typingThrottle.has(throttleKey)) {
      const lastSent = this.typingThrottle.get(throttleKey);
      if (now - lastSent < 1000) {
        // 1 second throttle
        return; // Skip this typing indicator
      }
    }

    // Update throttle timestamp
    if (!this.typingThrottle) {
      this.typingThrottle = new Map();
    }
    this.typingThrottle.set(throttleKey, now);

    // Broadcast typing indicator (use message.typing to match frontend)
    socket.to(roomId).emit('message.typing', typingData);
  }

  // OPTIMIZATION: Deterministic cleanup instead of random probability
  cleanupTypingThrottle() {
    if (!this.typingThrottle) {
      return;
    }

    const now = Date.now();
    for (const [key, timestamp] of this.typingThrottle.entries()) {
      if (now - timestamp > 5000) {
        // Remove entries older than 5 seconds
        this.typingThrottle.delete(key);
      }
    }
  }

  async handleWebRTCSignal(socket, data, eventType) {
    if (!this.checkEventRateLimit(socket.userId, 'webrtc_signal')) {
      socket.emit(WS_EVENTS.ERROR, {
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for WebRTC signals',
      });
      return;
    }

    const { targetUserId, signal } = data;

    // Enhanced logging for WebRTC signaling
    console.log(`🔄 WS_WEBRTC_SIGNAL: ${eventType} from ${socket.userId} to ${targetUserId}`);

    // Validate target user exists and is online
    const targetSockets = this.getUserSockets(targetUserId);
    if (targetSockets.size === 0) {
      console.warn(`⚠️ WS_WEBRTC_SIGNAL: Target user ${targetUserId} not online`);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'TARGET_OFFLINE',
        message: 'Target user is not online',
      });
      return;
    }

    // Optimized signal delivery with error handling
    try {
      socket.to(`user:${targetUserId}`).emit(eventType, {
        from: socket.userId,
        signal,
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ WS_WEBRTC_SIGNAL: ${eventType} delivered successfully`);
    } catch (error) {
      console.error(`❌ WS_WEBRTC_SIGNAL: Error delivering ${eventType}:`, error);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'SIGNAL_DELIVERY_FAILED',
        message: 'Failed to deliver WebRTC signal',
      });
    }
  }

  async handleCallControl(socket, data, eventType) {
    const { targetUserId } = data;

    console.log(`🔄 WS_CALL_CONTROL: ${eventType} from ${socket.userId} to ${targetUserId}`);

    // Validate target user exists and is online
    const targetSockets = this.getUserSockets(targetUserId);
    if (targetSockets.size === 0) {
      console.warn(`⚠️ WS_CALL_CONTROL: Target user ${targetUserId} not online`);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'TARGET_OFFLINE',
        message: 'Target user is not online',
      });
      return;
    }

    // Optimized call control delivery with error handling
    try {
      socket.to(`user:${targetUserId}`).emit(eventType, {
        from: socket.userId,
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ WS_CALL_CONTROL: ${eventType} delivered successfully`);
    } catch (error) {
      console.error(`❌ WS_CALL_CONTROL: Error delivering ${eventType}:`, error);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'CALL_CONTROL_FAILED',
        message: 'Failed to deliver call control event',
      });
    }
  }

  async handleCallReconnect(socket, data) {
    const { callId } = data;

    console.log(`🔄 WS_CALL_RECONNECT: User ${socket.userId} reconnecting to call ${callId}`);

    // Import CallController to check active calls
    try {
      const { getActiveCalls } = await import('../controllers/callController.js');
      const activeCalls = getActiveCalls();

      // Validate that the user is part of this call
      const callTracking = activeCalls.get(callId);
      if (!callTracking) {
        console.warn(`⚠️ WS_CALL_RECONNECT: Call ${callId} not found in active tracking`);
        socket.emit(WS_EVENTS.ERROR, {
          type: 'CALL_NOT_FOUND',
          message: 'Call session not found or expired',
        });
        return;
      }

      if (!callTracking.participants.has(socket.userId)) {
        console.warn(`⚠️ WS_CALL_RECONNECT: User ${socket.userId} not part of call ${callId}`);
        socket.emit(WS_EVENTS.ERROR, {
          type: 'NOT_CALL_PARTICIPANT',
          message: 'You are not a participant in this call',
        });
        return;
      }

      // Update call tracking with reconnection
      callTracking.lastActivity = new Date();
      const attempts = callTracking.reconnectAttempts.get(socket.userId) || 0;
      callTracking.reconnectAttempts.set(socket.userId, attempts + 1);

      // Join call-specific room for reconnection
      await socket.join(`call:${callId}`);

      // Emit reconnection event to other participants
      socket.to(`call:${callId}`).emit('call.reconnected', {
        callId,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `✅ WS_CALL_RECONNECT: Reconnection event sent for call ${callId}, attempt ${attempts + 1}`
      );
    } catch (error) {
      console.error(`❌ WS_CALL_RECONNECT: Error handling reconnection:`, error);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'RECONNECT_ERROR',
        message: 'Failed to process call reconnection',
      });
    }
  }

  startHeartbeat(socket) {
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit(WS_EVENTS.HEARTBEAT);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 25000); // 25 seconds as specified

    // Clear interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval);
    });
  }

  async handleDisconnect(socket, reason) {
    console.log(
      `🔌 Socket disconnected: ${socket.id} (User: ${socket.userId}) - Reason: ${reason}`
    );

    // Remove from authenticated sockets
    this.authenticatedSockets.delete(socket.id);

    // Remove from user sockets
    const userSocketSet = this.userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        // User has no more active connections
        this.userSockets.delete(socket.userId);
        await this.updateUserStatus(socket.userId, 'offline');
      }
    }

    // Clean up typing indicators
    this.cleanupTypingIndicators(socket.userId);

    // Clean up connection attempts tracking
    this.connectionAttempts.delete(socket.id);
  }

  async updateUserStatus(userId, status, socketId = null) {
    const statusInfo = {
      userId,
      status,
      timestamp: new Date().toISOString(),
      socketId,
    };

    this.userStatus.set(userId, statusInfo);

    // OPTIMIZATION: Batch status updates to reduce database writes
    // Only update database on status change or periodically
    try {
      const { User, Contact } = await import('../models/index.js');

      // Update user status in database (debounced in future optimization)
      await User.update({ status }, { where: { id: userId } });

      // OPTIMIZATION: Only broadcast to user's contacts instead of all connected clients
      // Get user's contact list
      const contacts = await Contact.findAll({
        where: { userId },
        attributes: ['contactUserId'],
        raw: true,
      });

      const contactUserIds = contacts.map(c => c.contactUserId);

      // Broadcast status update only to contacts
      const statusPayload = {
        userId,
        status,
        onlineStatus: status,
        timestamp: statusInfo.timestamp,
        socketId: statusInfo.socketId,
      };

      // Emit to each contact's room
      for (const contactUserId of contactUserIds) {
        this.io?.to(`user:${contactUserId}`).emit('user.status', statusPayload);

        // Backward compatibility events
        if (status === 'online') {
          this.io?.to(`user:${contactUserId}`).emit(WS_EVENTS.USER_ONLINE, statusInfo);
        } else if (status === 'offline') {
          this.io?.to(`user:${contactUserId}`).emit(WS_EVENTS.USER_OFFLINE, statusInfo);
        }
      }
    } catch (error) {
      console.error('❌ Error updating user status:', error);
    }
  }

  cleanupTypingIndicators(userId) {
    for (const [roomId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);
        if (typingSet.size === 0) {
          this.typingUsers.delete(roomId);
        }
      }
    }
  }

  // Join user to their active groups
  async joinUserGroups(socket) {
    try {
      const { GroupMember } = await import('../models/index.js');

      const userGroups = await GroupMember.findAll({
        where: {
          userId: socket.userId,
          isActive: true,
        },
        attributes: ['groupId'],
      });

      // Join each group room
      for (const membership of userGroups) {
        await socket.join(`group:${membership.groupId}`);
      }
    } catch (error) {
      console.error('Error joining user groups:', error);
    }
  }

  // Get user status from Redis (for cross-server communication)
  async getUserStatus(userId) {
    // DISABLED - Redis in subscriber mode, use in-memory userStatus instead
    // if (!this.redisClient) {
    //   return null;
    // }
    // const status = await this.redisClient.get(`user_status:${userId}`);
    // return status ? JSON.parse(status) : null;

    // Use in-memory status for single-server deployment
    return this.userStatus.get(userId) || null;
  }

  // Broadcast message to specific user across all servers
  async broadcastToUser(userId, event, data) {
    console.log(`📡 WebSocketService.broadcastToUser: userId=${userId}, event=${event}`);
    // Skip if WebSocket service is not properly initialized
    if (!this.io) {
      console.warn('⚠️ WebSocket service: this.io is undefined');
      return;
    }

    // Check if io.to exists and is a function
    if (!this.io.to || typeof this.io.to !== 'function') {
      console.warn('⚠️ WebSocket service: io.to is not available');
      return;
    }

    // Broadcast locally (cross-server handled by Redis adapter)
    const room = `user:${userId}`;

    // Additional safety checks before accessing adapter
    if (!this.io.sockets || !this.io.sockets.adapter) {
      console.warn('⚠️ WebSocket service: adapter not available');
      return;
    }

    const socketsInRoom = this.io.sockets.adapter.rooms.get(room);

    if (!socketsInRoom || socketsInRoom.size === 0) {
      console.warn(`⚠️ No sockets in room: ${room}. User might be offline or not joined.`);
      return;
    }

    try {
      console.log(`📡 Emitting ${event} to ${socketsInRoom.size} socket(s) in room: ${room}`);
      this.io.to(room).emit(event, data);
    } catch (error) {
      console.error(`❌ Failed to emit ${event} to room ${room}:`, error);
      // Don't throw error to avoid breaking the API response
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  // Get total connection count (alias for health check)
  getConnectionCount() {
    return this.authenticatedSockets.size;
  }

  // Get socket by user ID
  getUserSockets(userId) {
    return this.userSockets.get(userId) || new Set();
  }

  setupRedisListeners() {
    if (!this.redisSubscriber) {
      return;
    }

    // Listen for cross-server broadcasts
    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);

        if (channel.startsWith('broadcast:user:')) {
          const targetUserId = channel.replace('broadcast:user:', '');
          this.io?.to(`user:${targetUserId}`).emit(data.event, data.data);
        }
      } catch (error) {
        console.error('❌ Error handling Redis message:', error);
      }
    });

    // Subscribe to broadcast channels
    this.redisSubscriber.subscribe('broadcast:user:*');
  }

  // File upload progress handlers
  async handleFileUploadStart(socket, data) {
    const { uploadId, recipientId, groupId, fileNames, totalSize } = data;

    // Create upload progress tracking
    const uploadProgress = {
      uploadId,
      userId: socket.userId,
      username: socket.username,
      fileNames,
      totalSize,
      uploadedSize: 0,
      progress: 0,
      status: 'uploading',
      startTime: new Date().toISOString(),
      socketId: socket.id,
    };

    // Store upload progress for tracking
    if (!this.uploadProgresses) {
      this.uploadProgresses = new Map();
    }
    this.uploadProgresses.set(uploadId, uploadProgress);

    // Notify recipient(s) about upload start
    const targetRoom = recipientId ? `user:${recipientId}` : `group:${groupId}`;

    this.io?.to(targetRoom).emit(WS_EVENTS.FILE_UPLOAD_START, {
      uploadId,
      fromUserId: socket.userId,
      fromUsername: socket.username,
      fileNames,
      totalSize,
      timestamp: new Date().toISOString(),
    });
  }

  async handleFileUploadCancel(socket, data) {
    const { uploadId, recipientId, groupId } = data;

    // Remove from progress tracking
    if (this.uploadProgresses) {
      this.uploadProgresses.delete(uploadId);
    }

    // Notify recipient(s) about upload cancellation
    const targetRoom = recipientId ? `user:${recipientId}` : `group:${groupId}`;

    this.io?.to(targetRoom).emit(WS_EVENTS.FILE_UPLOAD_CANCEL, {
      uploadId,
      fromUserId: socket.userId,
      fromUsername: socket.username,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to update file upload progress (called by file upload service)
  updateFileUploadProgress(uploadId, uploadedSize, status = 'uploading') {
    if (!this.uploadProgresses) {
      return;
    }

    const progress = this.uploadProgresses.get(uploadId);
    if (!progress) {
      return;
    }

    progress.uploadedSize = uploadedSize;
    progress.progress = Math.round((uploadedSize / progress.totalSize) * 100);
    progress.status = status;

    // Get target room based on upload info (would need to be stored or passed)
    // For now, broadcast to user's own room for progress tracking
    this.io?.to(`user:${progress.userId}`).emit(WS_EVENTS.FILE_UPLOAD_PROGRESS, {
      uploadId,
      uploadedSize,
      progress: progress.progress,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to complete file upload (called by file upload service)
  completeFileUpload(uploadId, fileIds, recipientId = null, groupId = null) {
    if (!this.uploadProgresses) {
      return;
    }

    const progress = this.uploadProgresses.get(uploadId);
    if (!progress) {
      return;
    }

    // Remove from progress tracking
    this.uploadProgresses.delete(uploadId);

    // Notify recipient(s) about upload completion
    const targetRoom = recipientId ? `user:${recipientId}` : `group:${groupId}`;

    this.io?.to(targetRoom).emit(WS_EVENTS.FILE_UPLOAD_COMPLETE, {
      uploadId,
      fromUserId: progress.userId,
      fromUsername: progress.username,
      fileIds,
      timestamp: new Date().toISOString(),
    });

    // Also notify uploader
    this.io?.to(`user:${progress.userId}`).emit(WS_EVENTS.FILE_UPLOAD_COMPLETE, {
      uploadId,
      fileIds,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to handle file upload errors (called by file upload service)
  handleFileUploadError(uploadId, error, recipientId = null, groupId = null) {
    if (!this.uploadProgresses) {
      return;
    }

    const progress = this.uploadProgresses.get(uploadId);
    if (!progress) {
      return;
    }

    // Remove from progress tracking
    this.uploadProgresses.delete(uploadId);

    // Notify recipient(s) about upload error
    const targetRoom = recipientId ? `user:${recipientId}` : `group:${groupId}`;

    this.io?.to(targetRoom).emit(WS_EVENTS.FILE_UPLOAD_ERROR, {
      uploadId,
      fromUserId: progress.userId,
      fromUsername: progress.username,
      error: error.message || 'Upload failed',
      timestamp: new Date().toISOString(),
    });

    // Also notify uploader
    this.io?.to(`user:${progress.userId}`).emit(WS_EVENTS.FILE_UPLOAD_ERROR, {
      uploadId,
      error: error.message || 'Upload failed',
      timestamp: new Date().toISOString(),
    });
  }

  // Mark all users as offline on server start
  async markAllUsersOffline() {
    try {
      const { User } = await import('../models/index.js');
      const result = await User.update(
        { status: 'offline' },
        { where: { status: ['online', 'away'] } }
      );

      console.log(`📴 Marked ${result[0]} users as offline on server start`);
    } catch (error) {
      console.error('❌ Error marking users offline on startup:', error);
    }
  }

  // Clean up resources
  async cleanup() {
    // Clean up message service
    await messageService.cleanup();

    if (this.redisClient) {
      await this.redisClient.quit();
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }

    this.authenticatedSockets.clear();
    this.userSockets.clear();
    this.typingUsers.clear();
    this.typingThrottle.clear();
    this.userStatus.clear();
    this.connectionAttempts.clear();
    this.rateLimiters.clear();
    this.eventRateLimiters.clear();

    if (this.uploadProgresses) {
      this.uploadProgresses.clear();
    }
  }

  // Start periodic cleanup tasks
  startPeriodicCleanup() {
    // Clean up rate limiters every 5 minutes
    setInterval(() => {
      this.cleanupRateLimiters();
    }, 300000);

    // OPTIMIZATION: Deterministic cleanup of typing throttle entries every 10 seconds
    setInterval(() => {
      this.cleanupTypingThrottle();
    }, 10000);
  }
}

// Create singleton instance
const wsService = new WebSocketService();

export const initializeWebSocket = async server => {
  return await wsService.initialize(server);
};

export const getWebSocketService = () => {
  return wsService;
};

export const getIO = () => {
  if (!wsService.io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket() first.');
  }
  return wsService.io;
};

export { WS_EVENTS, CONNECTION_STATES };
export default wsService;
