import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { userRateLimit } from '../middleware/rateLimit.js';
import { Contact } from '../models/Contact.js';
import { Group } from '../models/Group.js';
import { GroupMember } from '../models/GroupMember.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import messageService from '../services/messageService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting (100 messages per minute per user)
router.use(userRateLimit);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *                 description: Message content (max 10,000 characters)
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: Recipient user ID for direct messages
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Group ID for group messages
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, system, call, location]
 *                 default: text
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of message being replied to
 *               metadata:
 *                 type: object
 *                 description: Additional message metadata
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Message' }
 *       400:
 *         description: Validation error
 *       404:
 *         description: Recipient or group not found
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/',
  [
    body('content')
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message content must be between 1 and 10,000 characters'),
    body('recipientId').optional().isUUID().withMessage('Invalid recipient ID format'),
    body('groupId').optional().isUUID().withMessage('Invalid group ID format'),
    body('messageType')
      .optional()
      .isIn(['text', 'image', 'file', 'system', 'call', 'location'])
      .withMessage('Invalid message type'),
    body('replyToId').optional().isUUID().withMessage('Invalid reply message ID format'),
    body().custom((value, { _req }) => {
      if (!value.recipientId && !value.groupId) {
        throw new Error('Either recipientId or groupId must be provided');
      }
      if (value.recipientId && value.groupId) {
        throw new Error('Cannot specify both recipientId and groupId');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      logger.info('📬 POST /api/messages route hit', {
        body: req.body,
        userId: req.user?.id,
        username: req.user?.username,
      });

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { content, recipientId, groupId, messageType = 'text', replyToId, metadata } = req.body;
      const senderId = req.user.id;

      // FIXED BUG-M002: Validate recipient exists and is approved
      if (recipientId) {
        const recipient = await User.findByPk(recipientId);

        if (!recipient) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'RECIPIENT_NOT_FOUND',
              message: 'Recipient user not found',
            },
          });
        }

        // Allow sending messages to users regardless of online status
        // Messages will be delivered when recipient comes online

        if (recipient.approvalStatus !== 'approved') {
          return res.status(403).json({
            success: false,
            error: {
              type: 'RECIPIENT_NOT_APPROVED',
              message: 'Cannot send message to unapproved user',
            },
          });
        }
      }

      // FIXED BUG-M004: Validate group membership
      if (groupId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'GROUP_NOT_FOUND',
              message: 'Group not found',
            },
          });
        }

        const membership = await GroupMember.findOne({
          where: {
            groupId,
            userId: senderId,
            isActive: true,
          },
        });

        if (!membership) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'NOT_GROUP_MEMBER',
              message: 'You are not a member of this group',
            },
          });
        }
      }

      // Create message ID
      const messageId = uuidv4();

      // FIXED BUG-M005: Wrap in transaction for data consistency
      const transaction = await sequelize.transaction();

      try {
        // Create message in database
        const message = await Message.create({
          id: messageId,
          senderId,
          recipientId,
          groupId,
          content,
          messageType: messageType || 'text',
          status: 'sent',
          replyToId: replyToId || null,
          metadata: metadata || {},
        }, { transaction });

        // Get the created message with sender info
        const messageWithSender = await Message.findByPk(messageId, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'firstName', 'lastName'],
            },
          ],
          transaction,
        });

        // Commit transaction
        await transaction.commit();

        // Broadcast new message via WebSocket
        try {
          logger.info('🔵 Attempting to broadcast message', {
            messageId: messageWithSender.id,
            recipientId,
            groupId,
            senderId,
          });
          
          const { getIO } = await import('../services/websocket.js');
          const io = getIO();
          
          logger.info('🔵 Got IO instance:', { ioExists: !!io });
          
          if (io) {
            const messageData = {
              id: messageWithSender.id,
              senderId: messageWithSender.senderId,
              recipientId: messageWithSender.recipientId,
              groupId: messageWithSender.groupId,
              content: messageWithSender.content,
              messageType: messageWithSender.messageType,
              status: messageWithSender.status,
              replyToId: messageWithSender.replyToId,
              metadata: messageWithSender.metadata,
              createdAt: messageWithSender.createdAt,
              sender: messageWithSender.sender
                ? {
                    id: messageWithSender.sender.id,
                    username: messageWithSender.sender.username,
                    firstName: messageWithSender.sender.firstName,
                    lastName: messageWithSender.sender.lastName,
                  }
                : null,
            };

            // Emit to recipient for direct messages
            if (recipientId) {
              logger.info('📤 Broadcasting message.new to recipient', {
                messageId: messageData.id,
                recipientId,
                room: `user:${recipientId}`,
              });
              io.to(`user:${recipientId}`).emit('message.new', messageData);
              
              // Also emit to sender for multi-device sync
              logger.info('📤 Broadcasting message.new to sender', {
                messageId: messageData.id,
                senderId,
                room: `user:${senderId}`,
              });
              io.to(`user:${senderId}`).emit('message.new', messageData);
            }
            
            // Emit to group members for group messages
            if (groupId) {
              io.to(`group:${groupId}`).emit('message.new', messageData);
            }
          }
        } catch (wsError) {
          logger.warn('WebSocket broadcast failed for new message', {
            messageId,
            error: wsError.message,
          });
        }

        res.status(201).json({
          success: true,
          message: 'Message sent successfully',
          data: {
            id: messageWithSender.id,
            senderId: messageWithSender.senderId,
            recipientId: messageWithSender.recipientId,
            groupId: messageWithSender.groupId,
            content: messageWithSender.content,
            messageType: messageWithSender.messageType,
            status: messageWithSender.status,
            replyToId: messageWithSender.replyToId,
            metadata: messageWithSender.metadata,
            createdAt: messageWithSender.createdAt,
            updatedAt: messageWithSender.updatedAt,
            sender: messageWithSender.sender
              ? {
                  id: messageWithSender.sender.id,
                  username: messageWithSender.sender.username,
                  firstName: messageWithSender.sender.firstName,
                  lastName: messageWithSender.sender.lastName,
                }
              : null,
          },
        });
      } catch (innerError) {
        // Rollback transaction on error
        await transaction.rollback();
        throw innerError;
      }
    } catch (error) {
      logger.error('❌ Error sending message:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('not active')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get message history with pagination
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationWith
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID for direct message conversation
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Group ID for group message conversation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of messages per page (max 100)
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search within message content
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Message' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       400:
 *         description: Invalid parameters
 */
router.get(
  '/',
  [
    query('conversationWith')
      .optional()
      .isUUID()
      .withMessage('Invalid conversationWith user ID format'),
    query('groupId').optional().isUUID().withMessage('Invalid group ID format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('before').optional().isISO8601().withMessage('Invalid before timestamp format'),
    query('after').optional().isISO8601().withMessage('Invalid after timestamp format'),
    query().custom((value, { _req }) => {
      if (!value.conversationWith && !value.groupId) {
        throw new Error('Either conversationWith or groupId must be provided');
      }
      if (value.conversationWith && value.groupId) {
        throw new Error('Cannot specify both conversationWith and groupId');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { conversationWith, groupId, page = 1, limit = 50, before, after, search } = req.query;

      let whereCondition = {};
      const include = [];

      // Build query conditions
      if (conversationWith) {
        // Direct message conversation
        whereCondition = {
          [Op.or]: [
            { senderId: userId, recipientId: conversationWith },
            { senderId: conversationWith, recipientId: userId },
          ],
        };

        include.push(
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
          },
          {
            model: Message,
            as: 'replyTo',
            attributes: ['id', 'content', 'senderId', 'messageType'],
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'firstName', 'lastName'],
            }],
          }
        );
      } else if (groupId) {
        // Group message conversation
        whereCondition = {
          groupId: groupId,
        };

        // Verify user is an active member of the group
        const membership = await GroupMember.findOne({
          where: {
            groupId,
            userId,
            isActive: true,
          },
        });

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: 'You are not a member of this group',
          });
        }

        include.push(
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'description'],
          },
          {
            model: Message,
            as: 'replyTo',
            attributes: ['id', 'content', 'senderId', 'messageType'],
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'firstName', 'lastName'],
            }],
          }
        );
      }

      // Add soft delete filter (exclude deleted messages)
      whereCondition.deletedAt = null;

      // Add timestamp filters
      if (before) {
        whereCondition.createdAt = {
          ...whereCondition.createdAt,
          [sequelize.Op.lt]: new Date(before),
        };
      }
      if (after) {
        whereCondition.createdAt = {
          ...whereCondition.createdAt,
          [sequelize.Op.gt]: new Date(after),
        };
      }

      // Add search filter if provided
      if (search) {
        whereCondition[sequelize.Op.and] = [
          ...(whereCondition[sequelize.Op.and] || []),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('content')),
            'ILIKE',
            `%${search.toLowerCase()}%`
          ),
        ];
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Get messages with pagination
      const { count, rows: messages } = await Message.findAndCountAll({
        where: whereCondition,
        include,
        order: [['createdAt', 'DESC']], // Newest first (will be reversed on client for chat display)
        limit: parseInt(limit),
        offset: offset,
      });

      // Get total pages
      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Message history retrieved successfully',
        data: messages.map(message => ({
          id: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          groupId: message.groupId,
          content: message.content,
          messageType: message.messageType,
          status: message.status,
          replyToId: message.replyToId,
          replyTo: message.replyTo
            ? {
                id: message.replyTo.id,
                content: message.replyTo.content,
                senderId: message.replyTo.senderId,
                messageType: message.replyTo.messageType,
                sender: message.replyTo.sender
                  ? {
                      id: message.replyTo.sender.id,
                      username: message.replyTo.sender.username,
                      firstName: message.replyTo.sender.firstName,
                      lastName: message.replyTo.sender.lastName,
                    }
                  : null,
              }
            : null,
          metadata: message.metadata,
          editedAt: message.editedAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          sender: message.sender
            ? {
                id: message.sender.id,
                username: message.sender.username,
                firstName: message.sender.firstName,
                lastName: message.sender.lastName,
                avatar: message.sender.avatar,
              }
            : null,
          group: message.group
            ? {
                id: message.group.id,
                name: message.group.name,
                description: message.group.description,
              }
            : null,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      logger.error('❌ Error getting message history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get message history',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}/read:
 *   post:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *       404:
 *         description: Message not found
 */
router.post(
  '/:id/read',
  [param('id').isUUID().withMessage('Invalid message ID format')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id: messageId } = req.params;
      const userId = req.user.id;

      // Mark message as read
      await messageService.handleMessageRead(
        { userId, username: req.user.username },
        { messageId, timestamp: new Date().toISOString() }
      );

      res.status(200).json({
        success: true,
        message: 'Message marked as read successfully',
      });
    } catch (error) {
      logger.error('❌ Error marking message as read:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to mark message as read',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}/delivered:
 *   post:
 *     summary: Mark message as delivered
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as delivered successfully
 *       404:
 *         description: Message not found
 */
router.post(
  '/:id/delivered',
  [param('id').isUUID().withMessage('Invalid message ID format')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id: messageId } = req.params;
      const userId = req.user.id;

      // Mark message as delivered
      await messageService.handleMessageDelivered(
        { userId, username: req.user.username },
        { messageId, timestamp: new Date().toISOString() }
      );

      res.status(200).json({
        success: true,
        message: 'Message marked as delivered successfully',
      });
    } catch (error) {
      logger.error('❌ Error marking message as delivered:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to mark message as delivered',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}:
 *   put:
 *     summary: Edit a message (within 5-minute window)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *                 description: New message content
 *     responses:
 *       200:
 *         description: Message edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Message' }
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized or edit window expired
 *       404:
 *         description: Message not found
 *       429:
 *         description: Rate limit exceeded
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid message ID format'),
    body('content')
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message content must be between 1 and 10,000 characters'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id: messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      // Find the message
      const message = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName'],
          },
        ],
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      // Check if user can edit this message
      if (!message.canBeEditedBy(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this message or edit window has expired',
        });
      }

      // Edit the message (this will create edit history automatically)
      await message.edit(content, userId);

      // Reload message with updated data
      await message.reload();

      // Broadcast message edit event via WebSocket
      // FIXED BUG-M012: Add null check for WebSocket
      const { getIO } = await import('../services/websocket.js');
      const io = getIO();

      if (io) {
        const editEventData = {
          messageId,
          newContent: content,
          editedAt: message.editedAt,
          editedBy: userId,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to conversation participants
        if (message.recipientId) {
          // Direct message
          io.to(`user:${message.recipientId}`).emit('message_edited', editEventData);
        } else if (message.groupId) {
          // Group message
          io.to(`group:${message.groupId}`).emit('message_edited', editEventData);
        }
      } else {
        logger.warn('WebSocket not available, skipping real-time broadcast for message edit', {
          messageId,
          editedBy: userId,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message edited successfully',
        data: {
          id: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          groupId: message.groupId,
          content: message.content,
          messageType: message.messageType,
          status: message.status,
          replyToId: message.replyToId,
          metadata: message.metadata,
          editedAt: message.editedAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          sender: message.sender
            ? {
                id: message.sender.id,
                username: message.sender.username,
                firstName: message.sender.firstName,
                lastName: message.sender.lastName,
              }
            : null,
        },
      });
    } catch (error) {
      logger.error('❌ Error editing message:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('authorized') || error.message.includes('edit window')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to edit message',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete a message (soft or hard delete)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *       - in: query
 *         name: deleteType
 *         schema:
 *           type: string
 *           enum: [soft, hard]
 *           default: soft
 *         description: Delete type - soft (for me) or hard (for everyone)
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 deleteType: { type: string }
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized or hard delete window expired
 *       404:
 *         description: Message not found
 *       429:
 *         description: Rate limit exceeded
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid message ID format'),
    query('deleteType')
      .optional()
      .isIn(['soft', 'hard'])
      .withMessage('Delete type must be either soft or hard'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id: messageId } = req.params;
      const { deleteType = 'soft' } = req.query;
      const userId = req.user.id;

      // Find the message
      const message = await Message.findByPk(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      // Check if user can delete this message
      if (!message.canBeDeletedBy(userId, deleteType)) {
        return res.status(403).json({
          success: false,
          message:
            deleteType === 'hard'
              ? 'Not authorized or hard delete window has expired (24 hours)'
              : 'Not authorized to delete this message',
        });
      }

      // Store the original message data for WebSocket broadcast
      const originalData = {
        messageId,
        deleteType,
        deletedBy: userId,
        deletedAt: new Date(),
        originalSenderId: message.senderId,
        originalRecipientId: message.recipientId,
        originalGroupId: message.groupId,
        timestamp: new Date().toISOString(),
      };

      // If hard deleting, mark associated files for deletion
      if (deleteType === 'hard') {
        try {
          const { File } = await import('../models/index.js');
          const { fileCleanupService } = await import('../services/fileCleanupService.js');

          // Find all files associated with this message
          const associatedFiles = await File.findByMessage(messageId);

          // Mark files for deletion
          for (const file of associatedFiles) {
            await fileCleanupService.markFileForDeletion(file.id, 'message_hard_deleted');
          }

          logger.info('Associated files marked for deletion', {
            messageId,
            fileCount: associatedFiles.length,
          });
        } catch (fileError) {
          logger.error('Error marking associated files for deletion:', fileError);
          // Continue with message deletion even if file cleanup fails
        }
      }

      // Delete the message
      await message.softDelete(deleteType);

      // Broadcast message deletion event via WebSocket
      // FIXED BUG-M012: Add null check for WebSocket
      const { getIO } = await import('../services/websocket.js');
      const io = getIO();

      if (io) {
        if (deleteType === 'hard') {
          // Hard delete - broadcast to conversation and remove for everyone
          if (message.recipientId) {
            // Direct message
            io.to(`user:${message.recipientId}`).emit('message_hard_deleted', originalData);
          } else if (message.groupId) {
            // Group message
            io.to(`group:${message.groupId}`).emit('message_hard_deleted', originalData);
          }
        } else {
          // Soft delete - broadcast to conversation
          if (message.recipientId) {
            // Direct message - only sender sees it as deleted
            io.to(`user:${userId}`).emit('message_soft_deleted', originalData);
          } else if (message.groupId) {
            // Group message - broadcast to group
            io.to(`group:${message.groupId}`).emit('message_soft_deleted', originalData);
          }
        }
      } else {
        logger.warn('WebSocket not available, skipping real-time broadcast for message deletion', {
          messageId,
          deleteType,
          deletedBy: userId,
        });
      }

      res.status(200).json({
        success: true,
        message: `Message ${deleteType} deleted successfully`,
        deleteType,
      });
    } catch (error) {
      logger.error('❌ Error deleting message:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('authorized') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}/edit-history:
 *   get:
 *     summary: Get edit history for a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Edit history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: array, items: { type: object } }
 *       403:
 *         description: Not authorized to view edit history
 *       404:
 *         description: Message not found
 */
router.get(
  '/:id/edit-history',
  [param('id').isUUID().withMessage('Invalid message ID format')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id: messageId } = req.params;
      const userId = req.user.id;

      // Find the message
      const message = await Message.findByPk(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      // Check if user can view this message (participants in conversation)
      let canView = false;
      if (message.senderId === userId || message.recipientId === userId) {
        canView = true;
      } else if (message.groupId) {
        // Check if user is member of the group
        const { GroupMember } = await import('../models/GroupMember.js');
        const membership = await GroupMember.findOne({
          where: { groupId: message.groupId, userId },
        });
        canView = !!membership;
      }

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view edit history for this message',
        });
      }

      // Get edit history
      const editHistory = await message.getEditHistory();

      res.status(200).json({
        success: true,
        message: 'Edit history retrieved successfully',
        data: editHistory.map(edit => ({
          id: edit.id,
          messageId: edit.messageId,
          previousContent: edit.previousContent,
          newContent: edit.newContent,
          editedAt: edit.editedAt,
          editor: edit.editor
            ? {
                id: edit.editor.id,
                username: edit.editor.username,
                firstName: edit.editor.firstName,
                lastName: edit.editor.lastName,
              }
            : null,
        })),
      });
    } catch (error) {
      logger.error('❌ Error getting edit history:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('authorized')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get edit history',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/search:
 *   get:
 *     summary: Search messages with full-text search and filters
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query for full-text search in message content
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sender user ID
 *       - in: query
 *         name: conversationWith
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Search in direct messages with this user
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Search in messages from this group
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for date range filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results per page (max 50)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, date]
 *           default: relevance
 *         description: Sort results by relevance or date
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Message' } }
 *                 pagination: { $ref: '#/components/schemas/SearchPagination' }
 *                 searchMetadata: { type: object }
 *       400:
 *         description: Invalid parameters
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/search',
  [
    query('q').optional().isLength({ min: 1 }).withMessage('Search query must not be empty'),
    query('senderId').optional().isUUID().withMessage('Invalid sender ID format'),
    query('conversationWith')
      .optional()
      .isUUID()
      .withMessage('Invalid conversationWith user ID format'),
    query('groupId').optional().isUUID().withMessage('Invalid group ID format'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('sortBy')
      .optional()
      .isIn(['relevance', 'date'])
      .withMessage('Sort by must be relevance or date'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query().custom((value, { _req }) => {
      // Must have either search query or filters
      if (!value.q && !value.senderId && !value.conversationWith && !value.groupId) {
        throw new Error(
          'At least one search parameter (q, senderId, conversationWith, or groupId) must be provided'
        );
      }
      // Cannot specify both conversationWith and groupId
      if (value.conversationWith && value.groupId) {
        throw new Error('Cannot specify both conversationWith and groupId');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const {
        q: searchQuery,
        senderId,
        conversationWith,
        groupId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc',
      } = req.query;

      // Build the base query conditions
      const whereConditions = [];
      const include = [];

      // Add 30-day retention policy filter
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      whereConditions.push({
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      });

      // Add search query using PostgreSQL full-text search
      // FIXED BUG-M001: Use safe ILIKE operator instead of vulnerable sequelize.literal
      if (searchQuery) {
        // Escape special characters for ILIKE pattern matching
        const sanitizedQuery = searchQuery.replace(/[%_]/g, '\\$&');
        whereConditions.push({
          content: {
            [Op.iLike]: `%${sanitizedQuery}%`
          }
        });
      }

      // FIXED BUG-M008: Validate senderId authorization
      if (senderId) {
        // Sender filter must match authenticated user
        if (senderId !== userId) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: 'Cannot search messages from other users',
            },
          });
        }
        whereConditions.push({ senderId });
      }

      // Add conversation filter (direct messages)
      if (conversationWith) {
        whereConditions.push({
          [Op.or]: [
            { senderId: userId, recipientId: conversationWith },
            { senderId: conversationWith, recipientId: userId },
          ],
        });
      }

      // Add group filter
      if (groupId) {
        // Verify user is an active member of the group
        const membership = await GroupMember.findOne({
          where: {
            groupId,
            userId,
            isActive: true,
          },
        });

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: 'You are not a member of this group',
          });
        }

        whereConditions.push({ groupId });
      }

      // Add date range filters
      if (startDate) {
        whereConditions.push({
          createdAt: {
            ...whereConditions.find(c => c.createdAt)?.createdAt,
            [Op.gte]: new Date(startDate),
          },
        });
      }

      if (endDate) {
        whereConditions.push({
          createdAt: {
            ...whereConditions.find(c => c.createdAt)?.createdAt,
            [Op.lte]: new Date(endDate),
          },
        });
      }

      // Combine all where conditions
      const whereClause = { [Op.and]: whereConditions };

      // Add includes for related data
      include.push({
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
      });

      if (groupId) {
        include.push({
          model: Group,
          attributes: ['id', 'name', 'description'],
        });
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Determine order by
      // FIXED BUG-M001: Remove SQL injection vulnerability in sorting
      const order = [];
      // When sorting by relevance with search query, use date as fallback
      // (removed vulnerable ts_rank implementation)
      order.push(['createdAt', sortOrder.toUpperCase()]);

      // Execute search query with performance optimization
      const startTime = Date.now();
      const { count, rows: messages } = await Message.findAndCountAll({
        where: whereClause,
        include,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      const queryTime = Date.now() - startTime;

      // Get total pages
      const totalPages = Math.ceil(count / limit);

      // Prepare response data
      const responseData = messages.map(message => ({
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        groupId: message.groupId,
        content: message.content,
        messageType: message.messageType,
        status: message.status,
        replyToId: message.replyToId,
        metadata: message.metadata,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        sender: message.sender
          ? {
              id: message.sender.id,
              username: message.sender.username,
              firstName: message.sender.firstName,
              lastName: message.sender.lastName,
              avatar: message.sender.avatar,
            }
          : null,
        group: message.Group
          ? {
              id: message.Group.id,
              name: message.Group.name,
              description: message.Group.description,
            }
          : null,
      }));

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: responseData,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResults: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          resultsPerPage: parseInt(limit),
        },
        searchMetadata: {
          query: searchQuery,
          filters: {
            senderId,
            conversationWith,
            groupId,
            startDate,
            endDate,
          },
          sortBy,
          sortOrder,
          queryTimeMs: queryTime,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Error searching messages:', error);

      if (error.message.includes('not a member')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get list of user's conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Conversations list retrieved successfully
 *       400:
 *         description: Invalid parameters
 */
router.get(
  '/conversations',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      // Get all unique conversations (direct messages and groups)
      const directMessages = await sequelize.query(
        `
        SELECT
          CASE
            WHEN "senderId" = :userId THEN "recipientId"
            ELSE "senderId"
          END as "otherUserId",
          MAX("createdAt") as "lastMessageAt",
          COUNT(*) as "messageCount",
          SUM(CASE WHEN "recipientId" = :userId AND "status" != 'read' THEN 1 ELSE 0 END) as "unreadCount"
        FROM messages
        WHERE ("senderId" = :userId OR "recipientId" = :userId)
          AND "recipientId" IS NOT NULL
          AND "deletedAt" IS NULL
        GROUP BY "otherUserId"
        ORDER BY "lastMessageAt" DESC
        LIMIT :limit
        OFFSET :offset
        `,
        {
          replacements: {
            userId,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Get user details for each conversation
      const conversations = await Promise.all(
        directMessages.map(async dm => {
          const otherUser = await User.findByPk(dm.otherUserId, {
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
          });

          // Get contact to check if muted
          const contact = await Contact.findOne({
            where: {
              userId,
              contactUserId: dm.otherUserId,
            },
            attributes: ['isMuted'],
          });

          // Get last message
          const lastMessage = await Message.findOne({
            where: {
              [Op.or]: [
                { senderId: userId, recipientId: dm.otherUserId },
                { senderId: dm.otherUserId, recipientId: userId },
              ],
              deletedAt: null,
            },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'content', 'messageType', 'createdAt', 'senderId'],
          });

          return {
            type: 'direct',
            user: otherUser
              ? {
                  id: otherUser.id,
                  username: otherUser.username,
                  firstName: otherUser.firstName,
                  lastName: otherUser.lastName,
                  profilePicture: otherUser.avatar,
                  onlineStatus: otherUser.status,
                }
              : null,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  type: lastMessage.messageType,
                  createdAt: lastMessage.createdAt,
                  isOwn: lastMessage.senderId === userId,
                }
              : null,
            messageCount: parseInt(dm.messageCount),
            unreadCount: parseInt(dm.unreadCount || 0),
            lastMessageAt: dm.lastMessageAt,
            isMuted: contact?.isMuted || false,
          };
        })
      );

      // Get group conversations
      const groupConversations = await GroupMember.findAll({
        where: {
          userId,
          isActive: true,
        },
        include: [
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name', 'description', 'avatar', 'creatorId'],
          },
        ],
      });

      const groupConversationsData = await Promise.all(
        groupConversations.map(async gm => {
          const lastMessage = await Message.findOne({
            where: {
              groupId: gm.groupId,
              deletedAt: null,
            },
            order: [['createdAt', 'DESC']],
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'username'],
              },
            ],
          });

          const unreadCount = await Message.count({
            where: {
              groupId: gm.groupId,
              status: { [Op.ne]: 'read' },
              senderId: { [Op.ne]: userId },
              deletedAt: null,
            },
          });

          return {
            type: 'group',
            group: gm.group
              ? {
                  id: gm.group.id,
                  name: gm.group.name,
                  description: gm.group.description,
                  avatar: gm.group.avatar,
                  creatorId: gm.group.creatorId,
                }
              : null,
            userRole: gm.role, // Include user's role in the group (admin, member, etc.)
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  type: lastMessage.messageType,
                  createdAt: lastMessage.createdAt,
                  sender: lastMessage.sender
                    ? {
                        id: lastMessage.sender.id,
                        username: lastMessage.sender.username,
                      }
                    : null,
                  isOwn: lastMessage.senderId === userId,
                }
              : null,
            unreadCount,
            lastMessageAt: lastMessage ? lastMessage.createdAt : gm.joinedAt,
            isMuted: gm.isMuted || false,
          };
        })
      );

      // Combine and sort all conversations by last message time
      const allConversations = [...conversations, ...groupConversationsData].sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );

      res.status(200).json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: allConversations,
        pagination: {
          currentPage: parseInt(page),
          totalResults: allConversations.length,
        },
      });
    } catch (error) {
      logger.error('❌ Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversations',
        error: error.message,
      });
    }
  }
);

export default router;
