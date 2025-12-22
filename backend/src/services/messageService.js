import { sequelize } from '../config/database.js';
import { getRedisClient, getRedisSubscriber } from '../config/redis.js';
import { Device } from '../models/Device.js';
import { Group } from '../models/Group.js';
import { GroupMember } from '../models/GroupMember.js';
import { GroupMessageStatus } from '../models/GroupMessageStatus.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

import fcmService from './fcmService.js';
import { getIO, WS_EVENTS, getWebSocketService } from './websocket.js';

class MessageService {
  constructor() {
    this.redisClient = null;
    this.redisSubscriber = null;
    this.messageSequences = new Map(); // userId -> current sequence number
    this.pendingDeliveries = new Map(); // messageId -> delivery info
    this.deliveryTimeouts = new Map(); // messageId -> timeout handle
    this.sequenceBatch = new Map(); // userId -> sequence number (pending Redis write)
    this.sequenceBatchTimeout = null;
  }

  async initialize() {
    this.redisClient = getRedisClient();
    this.redisSubscriber = getRedisSubscriber();

    // Subscribe to cross-server message events using the subscriber client
    if (this.redisSubscriber) {
      await this.redisSubscriber.subscribe('message_delivery', message => {
        try {
          if (message) {
            this.handleCrossServerMessageDelivery(JSON.parse(message));
          }
        } catch (error) {
          // FIXED BUG-M011: Use logger instead of console.error
          logger.error('Error handling cross-server message delivery:', {
            error: error.message,
            stack: error.stack,
            message,
          });
        }
      });

      await this.redisSubscriber.subscribe('message_read', message => {
        try {
          if (message) {
            this.handleCrossServerMessageRead(JSON.parse(message));
          }
        } catch (error) {
          // FIXED BUG-M011: Use logger instead of console.error
          logger.error('Error handling cross-server message read:', {
            error: error.message,
            stack: error.stack,
            message,
          });
        }
      });
    }

    logger.info('✅ Message service initialized');
  }

  // Handle incoming message from client
  async handleMessageSent(socket, messageData) {
    logger.debug('handleMessageSent called', {
      senderId: socket.userId,
      recipientId: messageData.recipientId,
      groupId: messageData.groupId,
      socketId: socket.id,
    });

    try {
      const {
        id: messageId,
        recipientId,
        groupId,
        content,
        type = 'text',
        timestamp,
      } = messageData;
      const senderId = socket.userId;

      // Fetch sender details (avatar AND username)
      const sender = await User.findByPk(senderId, { attributes: ['username', 'avatar'] });

      if (sender) {
        logger.info(`Message sender found: ${sender.username}, Avatar: ${sender.avatar}`);
      } else {
        logger.warn(`Message sender not found in DB: ${senderId}`);
      }

      // Generate sequence number for this sender
      const sequenceNumber = this.getNextSequenceNumber(senderId);

      // Enhanced message data with metadata
      const enhancedMessage = {
        id: messageId,
        senderId,
        senderName: socket.username || sender?.username || 'Unknown',
        senderAvatar: sender?.avatar,
        recipientId,
        groupId,
        content,
        type,
        timestamp: timestamp || new Date().toISOString(),
        sequenceNumber,
        status: 'sent',
        edited: false,
        editedAt: null,
        replyTo: messageData.replyTo || null,
        reactions: [],
        attachments: messageData.attachments || [],
      };

      // Store message in database (would integrate with Message model)
      await this.storeMessage(enhancedMessage);

      // Broadcast to recipient(s)
      if (recipientId) {
        logger.debug('Broadcasting message.new to recipient', { recipientId });
        await this.broadcastToUser(recipientId, 'message.new', {
          ...enhancedMessage,
          delivered: false,
          read: false,
        });

        // Send push notification if user is offline
        const wsService = getWebSocketService();
        const userSockets = wsService.getUserSockets(recipientId);
        if (!userSockets || userSockets.size === 0) {
          const devices = await Device.findAll({ where: { userId: recipientId } });
          for (const device of devices) {
            await fcmService.sendPushNotification(device.token, `${socket.username}`, content, {
              type: 'message',
              messageId: messageId.toString(),
              conversationId: recipientId.toString(), // For direct messages, we can use recipientId
              senderId: senderId.toString(),
            });
          }
        }

        // Set up delivery confirmation tracking
        this.trackMessageDelivery(messageId, recipientId, enhancedMessage);
      }

      if (groupId) {
        // Get all active group members for proper delivery tracking
        const groupMembers = await GroupMember.findAll({
          where: {
            groupId,
            isActive: true,
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
            },
          ],
        });

        // OPTIMIZATION: Use bulkCreate instead of findOrCreate for better performance
        // Create group message status records for all members (except sender) in a single query
        const statusRecords = groupMembers
          .filter(member => member.userId !== senderId)
          .map(member => ({
            messageId,
            userId: member.userId,
            status: 'sent',
          }));

        if (statusRecords.length > 0) {
          await GroupMessageStatus.bulkCreate(statusRecords, {
            ignoreDuplicates: true,
          });
        }

        // Get group details for notification
        const group = await Group.findByPk(groupId, {
          attributes: ['name'],
        });

        // Broadcast to group room with member information
        getIO()
          .to(`group:${groupId}`)
          .emit(WS_EVENTS.GROUP_MESSAGE, {
            ...enhancedMessage,
            groupMembers: groupMembers.map(m => ({
              id: m.userId,
              username: m.user.username,
              role: m.role,
              status: m.user.status,
            })),
            delivered: false,
            read: false,
          });

        // OPTIMIZATION: Batch push notifications to avoid N+1 queries
        // Collect offline user IDs first
        const wsService = getWebSocketService();
        const offlineUserIds = groupMembers
          .filter(member => member.userId !== senderId)
          .filter(member => {
            const userSockets = wsService.getUserSockets(member.userId);
            return !userSockets || userSockets.size === 0;
          })
          .map(member => member.userId);

        // Query all devices for offline users in a single query
        if (offlineUserIds.length > 0) {
          const devices = await Device.findAll({
            where: { userId: offlineUserIds },
          });

          // Group devices by userId for efficient lookup
          const devicesByUser = new Map();
          for (const device of devices) {
            if (!devicesByUser.has(device.userId)) {
              devicesByUser.set(device.userId, []);
            }
            devicesByUser.get(device.userId).push(device);
          }

          const groupName = group?.name || 'Group';

          // Send notifications in batch
          const notificationPromises = [];
          for (const userId of offlineUserIds) {
            const userDevices = devicesByUser.get(userId) || [];
            for (const device of userDevices) {
              notificationPromises.push(
                fcmService.sendPushNotification(
                  device.token,
                  `${groupName}`,
                  `${socket.username}: ${content}`,
                  {
                    type: 'group_message',
                    messageId: messageId.toString(),
                    groupId: groupId.toString(),
                    senderId: senderId.toString(),
                  }
                )
              );
            }
          }

          // Send all notifications in parallel
          await Promise.allSettled(notificationPromises);
        }

        // Track delivery for all members
        for (const member of groupMembers) {
          if (member.userId !== senderId) {
            this.trackGroupMessageDelivery(messageId, member.userId, enhancedMessage);
          }
        }
      }

      // Emit back to sender for confirmation
      socket.emit(WS_EVENTS.MESSAGE_SENT, {
        ...enhancedMessage,
        status: 'sent',
      });

      logger.info(
        `📤 Message sent: ${messageId} from ${senderId} to ${recipientId || `group:${groupId}`}`
      );
    } catch (error) {
      logger.error('❌ Error handling message sent:', error);
      socket.emit(WS_EVENTS.ERROR, {
        type: 'MESSAGE_SEND_ERROR',
        message: 'Failed to send message',
        error: error.message,
      });
    }
  }

  // Handle message delivery confirmation
  async handleMessageDelivered(socket, deliveryData) {
    try {
      const { messageId, timestamp } = deliveryData;
      const userId = socket.userId;

      // Update delivery status in database
      await this.updateMessageDeliveryStatus(messageId, userId, 'delivered', timestamp);

      // Notify sender about delivery
      const wsService = getWebSocketService();
      await wsService.broadcastToUser(deliveryData.senderId, WS_EVENTS.MESSAGE_DELIVERED, {
        messageId,
        recipientId: userId,
        timestamp: timestamp || new Date().toISOString(),
      });

      // Clear delivery timeout
      if (this.deliveryTimeouts.has(messageId)) {
        clearTimeout(this.deliveryTimeouts.get(messageId));
        this.deliveryTimeouts.delete(messageId);
      }

      // Remove from pending deliveries
      this.pendingDeliveries.delete(messageId);

      logger.info(`✅ Message delivered: ${messageId} to ${userId}`);
    } catch (error) {
      logger.error('❌ Error handling message delivery:', error);
    }
  }

  // Handle message read confirmation
  async handleMessageRead(socket, readData) {
    try {
      const { messageId, timestamp } = readData;
      const userId = socket.userId;

      logger.debug(`📖 Handling read receipt: messageId=${messageId}, userId=${userId}`);

      // Update read status in database
      const result = await this.updateMessageReadStatus(messageId, userId, timestamp);

      // FIX BUG-MSG-007: Skip WebSocket emit if already read
      if (result.alreadyRead) {
        logger.debug(`Skipping duplicate read notification for message: ${messageId}`);
        return;
      }

      // If message not found or update failed, try to get it anyway for sender ID
      let message = result.message;
      if (!message) {
        logger.debug(`📖 Message not in result, fetching by ID: ${messageId}`);
        message = await this.getMessageById(messageId);
      }

      if (!message) {
        logger.warn(`⚠️ Cannot broadcast read receipt - message ${messageId} not found`);
        return;
      }

      // Don't send read receipt if user is reading their own message
      if (message.senderId === userId) {
        logger.debug(`📖 Skipping read receipt - user ${userId} is reading their own message`);
        return;
      }

      // Notify sender about read
      const wsService = getWebSocketService();
      logger.debug(`📖 Broadcasting read receipt to sender: ${message.senderId}`);

      const readReceiptData = {
        messageId,
        readerId: userId,
        readerName: socket.username,
        timestamp: timestamp || new Date().toISOString(),
      };

      // Send to sender (original recipient of the read receipt)
      await wsService.broadcastToUser(message.senderId, WS_EVENTS.MESSAGE_READ, readReceiptData);

      // Also send back to the reader (for multi-device sync)
      await wsService.broadcastToUser(userId, WS_EVENTS.MESSAGE_READ, readReceiptData);

      logger.info(
        `👁️ Message read: ${messageId} by ${userId}, notified sender: ${message.senderId} and reader: ${userId}`
      );
    } catch (error) {
      logger.error('❌ Error handling message read:', {
        error: error.message,
        stack: error.stack,
        messageId: readData?.messageId,
        userId: socket?.userId,
      });
    }
  }

  // Track message delivery with timeout
  trackMessageDelivery(messageId, recipientId, messageData) {
    // Set delivery timeout (30 seconds)
    const timeout = setTimeout(async () => {
      logger.warn(`⚠️ Message delivery timeout: ${messageId}`);

      // Update message status to indicate delivery may have failed
      await this.updateMessageDeliveryStatus(messageId, recipientId, 'delivery_timeout');

      this.pendingDeliveries.delete(messageId);
      this.deliveryTimeouts.delete(messageId);
    }, 30000);

    // Store tracking info
    this.pendingDeliveries.set(messageId, {
      recipientId,
      messageData,
      timeout,
    });

    this.deliveryTimeouts.set(messageId, timeout);
  }

  // Track group message delivery with timeout
  trackGroupMessageDelivery(messageId, userId, messageData) {
    // Set delivery timeout (30 seconds)
    const timeout = setTimeout(async () => {
      logger.warn(`⚠️ Group message delivery timeout: ${messageId} for user ${userId}`);

      // Update group message status to indicate delivery may have failed
      await this.updateGroupMessageDeliveryStatus(messageId, userId, 'delivery_timeout');

      this.pendingDeliveries.delete(`${messageId}:${userId}`);
      this.deliveryTimeouts.delete(`${messageId}:${userId}`);
    }, 30000);

    // Store tracking info with user-specific key
    const deliveryKey = `${messageId}:${userId}`;
    this.pendingDeliveries.set(deliveryKey, {
      userId,
      messageData,
      timeout,
    });

    this.deliveryTimeouts.set(deliveryKey, timeout);
  }

  // Get next sequence number for user messages
  getNextSequenceNumber(userId) {
    const current = this.messageSequences.get(userId) || 0;
    const next = current + 1;
    this.messageSequences.set(userId, next);

    // OPTIMIZATION: Batch Redis writes instead of writing on every message
    if (this.redisClient) {
      this.sequenceBatch.set(userId, next);
      this.scheduleSequenceBatchFlush();
    }

    return next;
  }

  // Schedule batch flush of sequence numbers to Redis
  scheduleSequenceBatchFlush() {
    if (this.sequenceBatchTimeout) {
      return; // Already scheduled
    }

    this.sequenceBatchTimeout = setTimeout(() => {
      this.flushSequenceBatch();
    }, 5000); // Flush every 5 seconds
  }

  // Flush batched sequence numbers to Redis
  async flushSequenceBatch() {
    if (!this.redisClient || this.sequenceBatch.size === 0) {
      this.sequenceBatchTimeout = null;
      return;
    }

    try {
      const pipeline = this.redisClient.pipeline();

      for (const [userId, sequence] of this.sequenceBatch.entries()) {
        pipeline.set(`sequence:${userId}`, sequence);
      }

      await pipeline.exec();

      logger.debug(`✅ Flushed ${this.sequenceBatch.size} sequence numbers to Redis`);
      this.sequenceBatch.clear();
    } catch (error) {
      logger.error('❌ Error flushing sequence batch:', error);
    } finally {
      this.sequenceBatchTimeout = null;
    }
  }

  // Cleanup old sequence numbers from memory (keep only active users)
  cleanupOldSequences() {
    const MAX_SEQUENCES = 10000; // Keep max 10k users in memory
    const CLEANUP_THRESHOLD = 12000; // Cleanup when reaching this threshold

    if (this.messageSequences.size > CLEANUP_THRESHOLD) {
      // Convert to array and sort by value (sequence number)
      const entries = Array.from(this.messageSequences.entries());
      entries.sort((a, b) => b[1] - a[1]); // Sort descending by sequence

      // Keep only the most active users
      this.messageSequences.clear();
      for (let i = 0; i < MAX_SEQUENCES && i < entries.length; i++) {
        this.messageSequences.set(entries[i][0], entries[i][1]);
      }

      logger.info(
        `🧹 Cleaned up sequence numbers: ${entries.length} -> ${this.messageSequences.size}`
      );
    }
  }

  // Load sequence numbers from Redis on startup
  async loadSequenceNumbers() {
    if (!this.redisClient) {
      return;
    }

    try {
      // OPTIMIZATION: Use SCAN instead of KEYS to avoid blocking Redis
      let cursor = '0';
      const pattern = 'sequence:*';

      do {
        const [nextCursor, keys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        // Batch get sequence values using pipeline for efficiency
        if (keys.length > 0) {
          const pipeline = this.redisClient.pipeline();
          for (const key of keys) {
            pipeline.get(key);
          }

          const results = await pipeline.exec();

          // Process results
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const [err, sequence] = results[i];

            if (!err && sequence) {
              const userId = key.replace('sequence:', '');
              this.messageSequences.set(userId, parseInt(sequence, 10));
            }
          }
        }
      } while (cursor !== '0');

      logger.info(`✅ Loaded ${this.messageSequences.size} sequence numbers from Redis`);
    } catch (error) {
      logger.error('❌ Error loading sequence numbers:', error);
    }
  }

  // Handle cross-server message delivery (Redis pub/sub)
  async handleCrossServerMessageDelivery(data) {
    const { recipientId, messageData } = data;

    // Broadcast to local users
    getIO()
      .to(`user:${recipientId}`)
      .emit(WS_EVENTS.MESSAGE_SENT, {
        ...messageData,
        delivered: false,
        read: false,
      });
  }

  // Handle cross-server message read (Redis pub/sub)
  async handleCrossServerMessageRead(data) {
    const { messageId, readerId, readerName, timestamp, senderId } = data;

    // Broadcast read confirmation to sender across all servers
    const wsService = getWebSocketService();
    await wsService.broadcastToUser(senderId, WS_EVENTS.MESSAGE_READ, {
      messageId,
      readerId,
      readerName,
      timestamp,
    });
  }

  // Broadcast message to specific user across all servers
  async broadcastToUser(userId, event, data) {
    logger.debug('broadcastToUser called', {
      userId,
      event,
      room: `user:${userId}`,
    });

    // Broadcast locally via Socket.IO
    // Note: Cross-server broadcasting handled by Socket.IO Redis adapter
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
    logger.debug('Broadcast completed', { event, userId });
  }

  // Store message in database with proper validation and relationships
  async storeMessage(messageData) {
    const transaction = await sequelize.transaction();

    try {
      // Validate sender exists and is active
      const sender = await User.findByPk(messageData.senderId, { transaction });
      if (!sender) {
        throw new Error('Sender not found');
      }
      // Temporarily allow pending users for testing
      if (sender.approvalStatus === 'rejected') {
        throw new Error('Sender account is rejected');
      }

      // Validate recipient exists if it's a direct message
      if (messageData.recipientId) {
        const recipient = await User.findByPk(messageData.recipientId, { transaction });
        if (!recipient) {
          throw new Error('Recipient not found');
        }
        // Temporarily allow pending users for testing
        if (recipient.approvalStatus === 'rejected') {
          throw new Error('Recipient account is rejected');
        }
      }

      // Validate group exists and sender is member if it's a group message
      if (messageData.groupId) {
        const group = await Group.findByPk(messageData.groupId, { transaction });
        if (!group) {
          throw new Error('Group not found');
        }

        // Check if sender is an active member of the group
        const membership = await GroupMember.findOne({
          where: {
            groupId: messageData.groupId,
            userId: messageData.senderId,
            isActive: true,
          },
          transaction,
        });

        if (!membership) {
          throw new Error('Sender is not a member of this group');
        }
      }

      // Create message with transaction
      const message = await Message.create(
        {
          id: messageData.id,
          senderId: messageData.senderId,
          recipientId: messageData.recipientId,
          groupId: messageData.groupId,
          content: messageData.content,
          messageType: messageData.type || 'text',
          status: 'sent',
          replyToId: messageData.replyTo || null,
          metadata: messageData.metadata || {},
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          mimeType: messageData.mimeType,
        },
        { transaction }
      );

      await transaction.commit();

      return message;
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Error storing message:', error);
      throw error;
    }
  }

  // Update message delivery status with proper database integration
  async updateMessageDeliveryStatus(messageId, userId, status, timestamp = null) {
    try {
      // Validate message exists
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Validate user is the recipient
      if (message.recipientId !== userId) {
        throw new Error('User is not the recipient of this message');
      }

      // Update message status and delivery timestamp
      const updateData = {
        status: status === 'delivered' ? 'delivered' : message.status,
        deliveredAt: timestamp || new Date(),
      };

      await Message.update(updateData, {
        where: { id: messageId },
      });

      // Cache delivery status in Redis for 30 days
      if (this.redisClient) {
        const key = `delivery:${messageId}:${userId}`;
        await this.redisClient.setex(
          key,
          2592000, // 30 days
          JSON.stringify({
            status,
            timestamp: timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }

      logger.info(`✅ Message delivery status updated: ${messageId} to ${status}`);
    } catch (error) {
      logger.error('❌ Error updating message delivery status:', error);
      throw error;
    }
  }

  // Update message read status with proper database integration
  async updateMessageReadStatus(messageId, userId, timestamp = null) {
    try {
      logger.debug(
        `📖 Attempting to update read status for message: ${messageId} by user: ${userId}`
      );

      // Validate message exists
      const message = await Message.findByPk(messageId, {
        raw: false, // Get Sequelize instance
        attributes: ['id', 'senderId', 'recipientId', 'groupId', 'status'],
      });

      if (!message) {
        logger.warn(`⚠️ Message not found: ${messageId}`);
        // Don't throw error - just skip broadcasting
        return { alreadyRead: false, message: null };
      }

      logger.debug(`📖 Message found:`, {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        groupId: message.groupId,
        status: message.status,
      });

      // Validate user is the recipient (skip for group messages)
      if (message.recipientId && message.recipientId !== userId) {
        logger.warn(`⚠️ User ${userId} is not the recipient of message ${messageId}`);
        return { alreadyRead: false, message: null };
      }

      // Handle group messages - update GroupMessageStatus instead of Message.status
      if (message.groupId) {
        logger.debug(
          `📖 Handling group message read status for message: ${messageId} by user: ${userId}`
        );

        // Find or create GroupMessageStatus entry
        const [groupStatus, created] = await GroupMessageStatus.findOrCreate({
          where: { messageId, userId },
          defaults: {
            messageId,
            userId,
            status: 'read',
            deliveredAt: new Date(),
            readAt: timestamp || new Date(),
          },
        });

        // If already exists and is read, skip
        if (!created && groupStatus.status === 'read') {
          logger.debug(`Group message already marked as read: ${messageId} by ${userId}`);
          return { alreadyRead: true, message };
        }

        // Update to read status
        if (!created) {
          await groupStatus.update({
            status: 'read',
            readAt: timestamp || new Date(),
          });
        }

        logger.info(`👁️ Group message read status updated: ${messageId} by ${userId}`);
        return { alreadyRead: false, message };
      }

      // For 1-to-1 messages, update the Message table
      // FIX BUG-MSG-007: Make markAsRead idempotent
      // Check status field
      if (message.status === 'read') {
        logger.debug(`Message already marked as read: ${messageId}`);
        return { alreadyRead: true, message };
      }

      // Update message status to read
      logger.debug(`📖 Updating message ${messageId} to read status`);
      await Message.update(
        {
          status: 'read',
        },
        {
          where: { id: messageId },
        }
      );

      // OPTIMIZATION: Update instance in-memory instead of reloading from database
      message.status = 'read';

      // Cache read status in Redis for 30 days
      if (this.redisClient) {
        const key = `read:${messageId}:${userId}`;
        await this.redisClient.setex(
          key,
          2592000, // 30 days
          JSON.stringify({
            read: true,
            timestamp: timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }

      logger.info(`👁️ Message read status updated: ${messageId} by ${userId}`);
      return { alreadyRead: false, message };
    } catch (error) {
      logger.error('❌ Error updating message read status:', {
        error: error.message,
        stack: error.stack,
        messageId,
        userId,
      });
      // Don't throw - return gracefully to allow broadcasting to continue
      return { alreadyRead: false, message: null };
    }
  }

  // Get message by ID with proper database integration
  async getMessageById(messageId) {
    try {
      // Skip temp message IDs from frontend optimistic updates
      if (typeof messageId === 'string' && messageId.startsWith('temp-')) {
        logger.debug(`⏭️ Skipping temp message ID: ${messageId}`);
        return null;
      }

      const message = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
          },
        ],
      });

      return message;
    } catch (error) {
      logger.error('❌ Error getting message by ID:', error);
      return null;
    }
  }

  // Update group message delivery status with proper database integration
  async updateGroupMessageDeliveryStatus(messageId, userId, status, timestamp = null) {
    try {
      // Validate message exists and is a group message
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (!message.groupId) {
        throw new Error('Message is not a group message');
      }

      // Update or create group message status
      const [groupMessageStatus] = await GroupMessageStatus.findOrCreate({
        where: { messageId, userId },
        defaults: {
          messageId,
          userId,
          status: 'sent',
        },
      });

      // Update status and delivery timestamp
      const updateData = {
        status: status === 'delivered' ? 'delivered' : groupMessageStatus.status,
        deliveredAt: timestamp || new Date(),
      };

      await groupMessageStatus.update(updateData);

      // Cache delivery status in Redis for 30 days
      if (this.redisClient) {
        const key = `group_delivery:${messageId}:${userId}`;
        await this.redisClient.setex(
          key,
          2592000, // 30 days
          JSON.stringify({
            status,
            timestamp: timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }

      logger.info(
        `✅ Group message delivery status updated: ${messageId} to ${status} for user ${userId}`
      );
    } catch (error) {
      logger.error('❌ Error updating group message delivery status:', error);
      throw error;
    }
  }

  // Update group message read status with proper database integration
  async updateGroupMessageReadStatus(messageId, userId, timestamp = null) {
    try {
      // Validate message exists and is a group message
      const message = await Message.findByPk(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (!message.groupId) {
        throw new Error('Message is not a group message');
      }

      // Update or create group message status
      const [groupMessageStatus] = await GroupMessageStatus.findOrCreate({
        where: { messageId, userId },
        defaults: {
          messageId,
          userId,
          status: 'sent',
        },
      });

      // Update status to read
      await groupMessageStatus.update({
        status: 'read',
        readAt: timestamp || new Date(),
      });

      // Cache read status in Redis for 30 days
      if (this.redisClient) {
        const key = `group_read:${messageId}:${userId}`;
        await this.redisClient.setex(
          key,
          2592000, // 30 days
          JSON.stringify({
            read: true,
            timestamp: timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }

      logger.info(`👁️ Group message read status updated: ${messageId} by user ${userId}`);
    } catch (error) {
      logger.error('❌ Error updating group message read status:', error);
      throw error;
    }
  }

  // Handle group message delivery confirmation
  async handleGroupMessageDelivered(socket, deliveryData) {
    try {
      const { messageId, timestamp } = deliveryData;
      const userId = socket.userId;

      // Update delivery status in database
      await this.updateGroupMessageDeliveryStatus(messageId, userId, 'delivered', timestamp);

      // Broadcast delivery confirmation to group (excluding the user who confirmed)
      const message = await this.getMessageById(messageId);
      if (message && message.groupId) {
        socket.to(`group:${message.groupId}`).emit(WS_EVENTS.MESSAGE_DELIVERED, {
          messageId,
          userId,
          timestamp: timestamp || new Date().toISOString(),
        });
      }

      // Clear delivery timeout
      const deliveryKey = `${messageId}:${userId}`;
      if (this.deliveryTimeouts.has(deliveryKey)) {
        clearTimeout(this.deliveryTimeouts.get(deliveryKey));
        this.deliveryTimeouts.delete(deliveryKey);
      }

      // Remove from pending deliveries
      this.pendingDeliveries.delete(deliveryKey);

      logger.info(`✅ Group message delivered: ${messageId} to ${userId}`);
    } catch (error) {
      logger.error('❌ Error handling group message delivery:', error);
    }
  }

  // Handle group message read confirmation
  async handleGroupMessageRead(socket, readData) {
    try {
      const { messageId, timestamp } = readData;
      const userId = socket.userId;

      // Update read status in database
      await this.updateGroupMessageReadStatus(messageId, userId, timestamp);

      // Broadcast read confirmation to group (excluding the user who read)
      const message = await this.getMessageById(messageId);
      if (message && message.groupId) {
        socket.to(`group:${message.groupId}`).emit(WS_EVENTS.MESSAGE_READ, {
          messageId,
          userId,
          userName: socket.username,
          timestamp: timestamp || new Date().toISOString(),
        });
      }

      logger.info(`👁️ Group message read: ${messageId} by ${userId}`);
    } catch (error) {
      logger.error('❌ Error handling group message read:', error);
    }
  }

  // Clean up resources
  async cleanup() {
    // Clear all timeouts
    for (const timeout of this.deliveryTimeouts.values()) {
      clearTimeout(timeout);
    }

    // OPTIMIZATION: Flush pending sequence numbers before shutdown
    if (this.sequenceBatchTimeout) {
      clearTimeout(this.sequenceBatchTimeout);
      this.sequenceBatchTimeout = null;
    }
    await this.flushSequenceBatch();

    this.messageSequences.clear();
    this.pendingDeliveries.clear();
    this.deliveryTimeouts.clear();
    this.sequenceBatch.clear();

    if (this.redisClient) {
      await this.redisClient.unsubscribe('message_delivery');
      await this.redisClient.unsubscribe('message_read');
    }
  }
}

// Create singleton instance
const messageService = new MessageService();

export default messageService;
export { MessageService };
