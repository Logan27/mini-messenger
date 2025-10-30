import { sequelize } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
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
    this.messageSequences = new Map(); // userId -> current sequence number
    this.pendingDeliveries = new Map(); // messageId -> delivery info
    this.deliveryTimeouts = new Map(); // messageId -> timeout handle
  }

  async initialize() {
    this.redisClient = getRedisClient();

    // Subscribe to cross-server message events
    if (this.redisClient) {
      await this.redisClient.subscribe('message_delivery', message => {
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

      await this.redisClient.subscribe('message_read', message => {
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
    console.log('🔵 Backend: handleMessageSent called', {
      senderId: socket.userId,
      recipientId: messageData.recipientId,
      groupId: messageData.groupId,
      socketId: socket.id
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

      // Generate sequence number for this sender
      const sequenceNumber = this.getNextSequenceNumber(senderId);

      // Enhanced message data with metadata
      const enhancedMessage = {
        id: messageId,
        senderId,
        senderName: socket.username,
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
        console.log('🔵 Backend: Broadcasting message_sent to recipientId:', recipientId);
        await this.broadcastToUser(recipientId, WS_EVENTS.MESSAGE_SENT, {
          ...enhancedMessage,
          delivered: false,
          read: false,
        });
        console.log('✅ Backend: Broadcast completed');

        // Send push notification if user is offline
        const wsService = getWebSocketService();
        const userSockets = wsService.getUserSockets(recipientId);
        if (!userSockets || userSockets.size === 0) {
          const devices = await Device.findAll({ where: { userId: recipientId } });
          for (const device of devices) {
            fcmService.sendPushNotification(
              device.token,
              `New message from ${socket.username}`,
              content,
              { messageId: messageId.toString() }
            );
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

        // Create group message status records for all members (except sender)
        const statusPromises = groupMembers
          .filter(member => member.userId !== senderId)
          .map(member =>
            GroupMessageStatus.findOrCreate({
              where: { messageId, userId: member.userId },
              defaults: {
                messageId,
                userId: member.userId,
                status: 'sent',
              },
            })
          );

        await Promise.all(statusPromises);

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

      // Notify sender about read
      const wsService = getWebSocketService();
      logger.debug(`📖 Broadcasting read receipt to sender: ${message.senderId}`);

      await wsService.broadcastToUser(message.senderId, WS_EVENTS.MESSAGE_READ, {
        messageId,
        readerId: userId,
        readerName: socket.username,
        timestamp: timestamp || new Date().toISOString(),
      });

      logger.info(`👁️ Message read: ${messageId} by ${userId}, notified sender: ${message.senderId}`);
    } catch (error) {
      logger.error('❌ Error handling message read:', {
        error: error.message,
        stack: error.stack,
        messageId: readData?.messageId,
        userId: socket?.userId
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

    // Persist sequence number in Redis for consistency across restarts
    if (this.redisClient) {
      this.redisClient.set(`sequence:${userId}`, next);
    }

    return next;
  }

  // Load sequence numbers from Redis on startup
  async loadSequenceNumbers() {
    if (!this.redisClient) {
      return;
    }

    try {
      // Get all sequence keys
      const keys = await this.redisClient.keys('sequence:*');
      for (const key of keys) {
        const userId = key.replace('sequence:', '');
        const sequence = await this.redisClient.get(key);
        if (sequence) {
          this.messageSequences.set(userId, parseInt(sequence, 10));
        }
      }
    } catch (error) {
      logger.error('❌ Error loading sequence numbers:', error);
    }
  }

  // Handle cross-server message delivery (Redis pub/sub)
  async handleCrossServerMessageDelivery(data) {
    const { messageId, recipientId, messageData } = data;

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
    console.log('🔵 Backend: broadcastToUser called', {
      userId,
      event,
      room: `user:${userId}`,
      hasRedis: !!this.redisClient
    });

    // SKIP REDIS PUB/SUB - Redis client is in subscriber mode and can't publish
    // This needs separate Redis clients for pub and sub
    // For now, use local Socket.IO broadcasting only
    // if (this.redisClient) {
    //   await this.redisClient.publish(`broadcast:user:${userId}`, JSON.stringify({ event, data }));
    //   console.log('📡 Backend: Published to Redis');
    // }

    // Broadcast locally via Socket.IO
    const io = getIO();
    console.log('📡 Backend: Emitting to room:', `user:${userId}`, 'with event:', event);
    io.to(`user:${userId}`).emit(event, data);
    console.log('✅ Backend: Emit completed');
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

        // Check if sender is a member of the group
        const membership = await GroupMember.findOne({
          where: {
            groupId: messageData.groupId,
            userId: messageData.senderId,
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

      // Cache message in Redis for 30 days for quick access
      // Temporarily disabled for testing
      // if (this.redisClient) {
      //   await this.redisClient.setex(
      //     `message:${messageData.id}`,
      //     2592000, // 30 days
      //     JSON.stringify({
      //       ...messageData,
      //       id: message.id,
      //       createdAt: message.createdAt,
      //       updatedAt: message.updatedAt,
      //     })
      //   );
      // }

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
      logger.debug(`📖 Attempting to update read status for message: ${messageId} by user: ${userId}`);

      // Validate message exists
      const message = await Message.findByPk(messageId, {
        raw: false, // Get Sequelize instance
        attributes: ['id', 'senderId', 'recipientId', 'groupId', 'status', 'readAt']
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
        status: message.status
      });

      // Validate user is the recipient (skip for group messages)
      if (message.recipientId && message.recipientId !== userId) {
        logger.warn(`⚠️ User ${userId} is not the recipient of message ${messageId}`);
        return { alreadyRead: false, message: null };
      }

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
          readAt: timestamp || new Date(),
        },
        {
          where: { id: messageId },
        }
      );

      // Refresh message instance
      await message.reload();

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
        userId
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

    this.messageSequences.clear();
    this.pendingDeliveries.clear();
    this.deliveryTimeouts.clear();

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
