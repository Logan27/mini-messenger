import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { userRateLimit } from '../middleware/rateLimit.js';
import { Contact } from '../models/Contact.js';
import { Device } from '../models/Device.js';
import { User } from '../models/User.js';
import fcmService from '../services/fcmService.js';
import { getWebSocketService } from '../services/websocket.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting
router.use(userRateLimit);

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get user's contacts list
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, blocked]
 *         description: Filter by contact status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Contacts list retrieved successfully
 *       400:
 *         description: Invalid parameters
 */
router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'blocked'])
      .withMessage('Status must be pending, accepted, or blocked'),
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
      const { status = 'accepted', page = 1, limit = 50 } = req.query;

      const offset = (page - 1) * limit;

      // Build where condition
      // For pending status, show BOTH incoming requests (contactUserId) AND outgoing requests (userId)
      // For accepted/blocked, show the user's contacts (where current user is userId)
      const whereCondition =
        status === 'pending'
          ? {
              [Op.or]: [
                { contactUserId: userId, status: 'pending' }, // Incoming requests
                { userId, status: 'pending' }, // Outgoing requests
              ],
            }
          : { userId, status };

      // Get contacts with pagination
      // For pending requests, include BOTH user (sender) and contact (recipient)
      const includeModels =
        status === 'pending'
          ? [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatar', 'status', 'lastLoginAt'],
              },
              {
                model: User,
                as: 'contact',
                attributes: ['id', 'username', 'avatar', 'status', 'lastLoginAt'],
              },
            ]
          : [
              {
                model: User,
                as: 'contact',
                attributes: ['id', 'username', 'avatar', 'status', 'lastLoginAt'],
              },
            ];

      const { count, rows: contacts } = await Contact.findAndCountAll({
        where: whereCondition,
        include: includeModels,
        order: [
          ['isFavorite', 'DESC'],
          ['lastContactAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Contacts retrieved successfully',
        data: contacts.map(contact => {
          // For pending requests, determine if incoming (show sender) or outgoing (show recipient)
          // If contactUserId === userId, it's an incoming request (show sender = user)
          // If userId === userId, it's an outgoing request (show recipient = contact)
          let contactUser;
          if (status === 'pending') {
            // If current user is the recipient, show the sender
            // If current user is the sender, show the recipient
            contactUser = contact.contactUserId === userId ? contact.user : contact.contact;
          } else {
            contactUser = contact.contact;
          }

          return {
            id: contact.id,
            status: contact.status,
            userId: contact.userId, // Include userId to identify request sender
            contactUserId: contact.contactUserId, // Include contactUserId to identify request recipient
            nickname: contact.nickname,
            notes: contact.notes,
            isFavorite: contact.isFavorite,
            isMuted: contact.isMuted, // Include mute status
            lastContactAt: contact.lastContactAt,
            blockedAt: contact.blockedAt,
            user: contactUser
              ? {
                  id: contactUser.id,
                  username: contactUser.username,
                  avatar: contactUser.avatar,
                  profilePicture: contactUser.avatar,
                  onlineStatus: contactUser.status,
                  lastSeen: contactUser.lastLoginAt,
                }
              : null,
            createdAt: contact.createdAt,
          };
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalContacts: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      logger.error('❌ Error getting contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contacts',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Add user to contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to add as contact
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *                 description: Optional nickname for contact
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional notes about contact
 *     responses:
 *       201:
 *         description: Contact added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       409:
 *         description: Contact already exists
 */
router.post(
  '/',
  [
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('nickname')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Nickname must be less than 100 characters'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
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

      const currentUserId = req.user.id;
      const { userId: contactUserId, nickname, notes } = req.body;

      // Prevent adding self as contact
      if (currentUserId === contactUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add yourself as a contact',
        });
      }

      // Check if contact user exists
      const contactUser = await User.findByPk(contactUserId);
      if (!contactUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Use the Contact model's sendRequest method to create pending request
      const contact = await Contact.sendRequest(currentUserId, contactUserId);

      // Update optional fields if provided
      if (nickname || notes) {
        contact.nickname = nickname;
        contact.notes = notes;
        await contact.save();
      }

      // Load contact with user details
      const contactWithUser = await Contact.findByPk(contact.id, {
        include: [
          {
            model: User,
            as: 'contact',
            attributes: ['id', 'username', 'avatar', 'status'],
          },
        ],
      });

      // Send WebSocket notification to the recipient
      try {
        const wsService = getWebSocketService();
        const requesterUser = await User.findByPk(currentUserId, {
          attributes: ['id', 'username', 'avatar', 'status'],
        });

        await wsService.broadcastToUser(contactUserId, 'contact.request', {
          contactId: contact.id,
          from: {
            id: requesterUser.id,
            username: requesterUser.username,
            avatar: requesterUser.avatar,
            status: requesterUser.status,
          },
          timestamp: new Date().toISOString(),
        });
        logger.info(`✅ Contact request notification sent to user ${contactUserId}`);
      } catch (wsError) {
        logger.error('❌ Failed to send contact request notification via WebSocket:', wsError);
        // Don't fail the request if WebSocket notification fails
      }

      // Send push notification if user is offline
      try {
        const wsService = getWebSocketService();
        const userSockets = wsService.getUserSockets(contactUserId);

        // Only send push notification if user has no active connections
        if (!userSockets || userSockets.size === 0) {
          const devices = await Device.findAll({
            where: { userId: contactUserId },
          });

          if (devices.length > 0) {
            const requesterUser = await User.findByPk(currentUserId, {
              attributes: ['id', 'username', 'firstName', 'lastName'],
            });

            const senderName = requesterUser.username || requesterUser.firstName || 'Someone';

            for (const device of devices) {
              try {
                await fcmService.sendPushNotification(
                  device.token,
                  'New Contact Request',
                  `${senderName} wants to connect with you`,
                  {
                    type: 'contact_request',
                    contactId: contact.id.toString(),
                    senderId: currentUserId.toString(),
                  }
                );
                logger.info(`✅ Push notification sent to device ${device.id} for contact request`);
              } catch (fcmError) {
                logger.error(
                  `❌ Failed to send push notification to device ${device.id}:`,
                  fcmError
                );
              }
            }
          } else {
            logger.info(`ℹ️ No devices registered for user ${contactUserId}`);
          }
        } else {
          logger.info(`ℹ️ User ${contactUserId} is online, skipping push notification`);
        }
      } catch (pushError) {
        logger.error('❌ Failed to send contact request push notification:', pushError);
        // Don't fail the request if push notification fails
      }

      res.status(201).json({
        success: true,
        message: 'Contact request sent successfully',
        data: {
          id: contactWithUser.id,
          userId: contactWithUser.userId,
          contactUserId: contactWithUser.contactUserId,
          status: contactWithUser.status,
          nickname: contactWithUser.nickname,
          notes: contactWithUser.notes,
          isFavorite: contactWithUser.isFavorite,
          createdAt: contactWithUser.createdAt,
        },
      });
    } catch (error) {
      logger.error('❌ Error adding contact:', error);

      // Handle specific known errors with appropriate status codes
      if (
        error.message.includes('already exists') ||
        error.message.includes('already contacts') ||
        error.message.includes('already pending')
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('blocked')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}:
 *   delete:
 *     summary: Remove contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact removed successfully
 *       404:
 *         description: Contact not found
 */
router.delete(
  '/:contactId',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      // Find contact
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      // Delete contact
      await contact.destroy();

      res.status(200).json({
        success: true,
        message: 'Contact removed successfully',
        data: {
          id: contactId,
          removedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Error removing contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/accept:
 *   post:
 *     summary: Accept pending contact request
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact request ID
 *     responses:
 *       200:
 *         description: Contact request accepted
 *       404:
 *         description: Contact request not found
 *       400:
 *         description: Contact request not pending
 */
router.post(
  '/:contactId/accept',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      // Find pending contact request where current user is the recipient
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          contactUserId: userId,
          status: 'pending',
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Pending contact request not found',
        });
      }

      // Accept the request and create reverse relationship
      // Original: userId=A, contactUserId=B (requester -> recipient)
      // Reverse: userId=B, contactUserId=A (recipient -> requester)
      const requesterId = contact.userId;

      // Use transaction to ensure both records are created
      await sequelize.transaction(async t => {
        // Check if reverse relationship already exists (including soft-deleted)
        const existingReverse = await Contact.findOne({
          where: {
            userId: userId,
            contactUserId: requesterId,
          },
          paranoid: false, // Include soft-deleted records
          transaction: t,
        });

        // Create or restore reverse relationship BEFORE accepting the request
        // This prevents the beforeCreate hook from finding the accepted original request
        if (existingReverse) {
          // If reverse exists but is deleted, restore it
          if (existingReverse.deletedAt) {
            await existingReverse.restore({ transaction: t });
          }
          // Update status to accepted
          existingReverse.status = 'accepted';
          existingReverse.blockedAt = null;
          await existingReverse.save({ transaction: t });
        } else {
          // Create new reverse relationship
          await Contact.create(
            {
              userId: userId,
              contactUserId: requesterId,
              status: 'accepted',
            },
            { transaction: t, hooks: false }
          ); // Skip hooks to avoid the duplicate check
        }

        // Now accept the original request
        contact.status = 'accepted';
        await contact.save({ transaction: t });
      });

      // Load contact with user details
      const contactWithUser = await Contact.findByPk(contact.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar', 'status'],
          },
        ],
      });

      // Send WebSocket notification to the requester
      try {
        const wsService = getWebSocketService();
        const acceptorUser = await User.findByPk(userId, {
          attributes: ['id', 'username', 'avatar', 'status'],
        });

        await wsService.broadcastToUser(requesterId, 'contact.accepted', {
          contactId: contact.id,
          acceptedBy: {
            id: acceptorUser.id,
            username: acceptorUser.username,
            avatar: acceptorUser.avatar,
            status: acceptorUser.status,
          },
          timestamp: new Date().toISOString(),
        });
        logger.info(`✅ Contact acceptance notification sent to user ${requesterId}`);
      } catch (wsError) {
        logger.error('❌ Failed to send contact acceptance notification via WebSocket:', wsError);
      }

      res.status(200).json({
        success: true,
        message: 'Contact request accepted',
        data: contactWithUser,
      });
    } catch (error) {
      logger.error('❌ Error accepting contact request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept contact request',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/reject:
 *   post:
 *     summary: Reject pending contact request
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact request ID
 *     responses:
 *       200:
 *         description: Contact request rejected
 *       404:
 *         description: Contact request not found
 */
router.post(
  '/:contactId/reject',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      // Find pending contact request where current user is the recipient
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          contactUserId: userId,
          status: 'pending',
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Pending contact request not found',
        });
      }

      // Delete the request (reject = delete)
      await contact.destroy();

      res.status(200).json({
        success: true,
        message: 'Contact request rejected',
        data: {
          id: contactId,
          rejectedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Error rejecting contact request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject contact request',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/block:
 *   post:
 *     summary: Block contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for blocking
 *     responses:
 *       200:
 *         description: Contact blocked successfully
 *       404:
 *         description: Contact not found
 */
router.post(
  '/:contactId/block',
  [
    param('contactId').isUUID().withMessage('Invalid contact ID format'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
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
      const { contactId } = req.params;
      const { reason } = req.body;

      // Find contact
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      // Block contact
      await contact.block();

      // Optionally store reason in notes
      if (reason) {
        contact.notes = `Blocked: ${reason}`;
        await contact.save();
      }

      res.status(200).json({
        success: true,
        message: 'Contact blocked successfully',
        data: {
          id: contact.id,
          status: contact.status,
          blockedAt: contact.blockedAt,
        },
      });
    } catch (error) {
      logger.error('❌ Error blocking contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/block:
 *   delete:
 *     summary: Unblock contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact unblocked successfully
 *       404:
 *         description: Contact not found or not blocked
 */
router.delete(
  '/:contactId/block',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      // Find contact
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      if (contact.status !== 'blocked') {
        return res.status(400).json({
          success: false,
          message: 'Contact is not blocked',
        });
      }

      // Unblock contact
      await contact.unblock();

      res.status(200).json({
        success: true,
        message: 'Contact unblocked successfully',
        data: {
          id: contact.id,
          status: contact.status,
          unblockedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Error unblocking contact:', error);

      if (error.message.includes('not blocked')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to unblock contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/unblock:
 *   post:
 *     summary: Unblock a previously blocked contact
 *     description: Removes the block status from a contact, allowing communication to resume. The contact must be currently blocked.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID to unblock
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Contact unblocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Contact unblocked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Contact ID
 *                     status:
 *                       type: string
 *                       enum: [active, blocked, pending]
 *                       example: active
 *                     unblockedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when contact was unblocked
 *       400:
 *         description: Bad request - Contact is not blocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Contact is not blocked"
 *       401:
 *         description: Unauthorized - No token provided or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Contact not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:contactId/unblock',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      // Find contact
      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      if (contact.status !== 'blocked') {
        return res.status(400).json({
          success: false,
          message: 'Contact is not blocked',
        });
      }

      // Unblock contact
      await contact.unblock();

      res.status(200).json({
        success: true,
        message: 'Contact unblocked successfully',
        data: {
          id: contact.id,
          status: contact.status,
          unblockedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Error unblocking contact:', error);

      if (error.message.includes('not blocked')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to unblock contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/mute:
 *   post:
 *     summary: Mute contact notifications
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact muted successfully
 *       404:
 *         description: Contact not found
 */
router.post(
  '/:contactId/mute',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      await contact.mute();

      // Emit WebSocket event to notify client about contact update
      try {
        const wsService = getWebSocketService();

        // Enhanced safety check for WebSocket service
        if (!wsService) {
          logger.warn('⚠️ WebSocket service not available for mute notification');
        } else if (!wsService.broadcastToUser || typeof wsService.broadcastToUser !== 'function') {
          logger.warn('⚠️ WebSocket broadcastToUser is not a function');
        } else {
          // WebSocket service is properly initialized, proceed with broadcast
          await wsService.broadcastToUser(userId, 'contact.updated', {
            contactId: contact.id,
            isMuted: contact.isMuted,
            timestamp: new Date().toISOString(),
          });

          // Also emit contact.muted event for frontend real-time updates
          await wsService.broadcastToUser(userId, 'contact.muted', {
            contactId: contact.id,
            isMuted: true,
            action: 'muted',
            timestamp: new Date().toISOString(),
          });
          logger.info(`✅ Contact mute notification sent to user ${userId}`);
        }
      } catch (wsError) {
        logger.error('❌ Failed to send WebSocket notification for contact mute:', wsError);
        // Don't fail the request if WebSocket notification fails
      }

      res.status(200).json({
        success: true,
        message: 'Contact muted successfully',
        data: {
          id: contact.id,
          isMuted: contact.isMuted,
        },
      });
    } catch (error) {
      logger.error('❌ Error muting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mute contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/{contactId}/mute:
 *   delete:
 *     summary: Unmute contact notifications
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact unmuted successfully
 *       404:
 *         description: Contact not found
 */
router.delete(
  '/:contactId/mute',
  [param('contactId').isUUID().withMessage('Invalid contact ID format')],
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
      const { contactId } = req.params;

      const contact = await Contact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }

      await contact.unmute();

      // Emit WebSocket event to notify client about contact update
      try {
        const wsService = getWebSocketService();

        // Enhanced safety check for WebSocket service
        if (!wsService) {
          logger.warn('⚠️ WebSocket service not available for unmute notification');
        } else if (!wsService.broadcastToUser || typeof wsService.broadcastToUser !== 'function') {
          logger.warn('⚠️ WebSocket broadcastToUser is not a function');
        } else {
          // WebSocket service is properly initialized, proceed with broadcast
          await wsService.broadcastToUser(userId, 'contact.updated', {
            contactId: contact.id,
            isMuted: contact.isMuted,
            timestamp: new Date().toISOString(),
          });

          // Also emit contact.unmuted event for frontend real-time updates
          await wsService.broadcastToUser(userId, 'contact.unmuted', {
            contactId: contact.id,
            isMuted: false,
            action: 'unmuted',
            timestamp: new Date().toISOString(),
          });
          logger.info(`✅ Contact unmute notification sent to user ${userId}`);
        }
      } catch (wsError) {
        logger.error('❌ Failed to send WebSocket notification for contact unmute:', wsError);
        // Don't fail the request if WebSocket notification fails
      }

      res.status(200).json({
        success: true,
        message: 'Contact unmuted successfully',
        data: {
          id: contact.id,
          isMuted: contact.isMuted,
        },
      });
    } catch (error) {
      logger.error('❌ Error unmuting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unmute contact',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/contacts/search:
 *   get:
 *     summary: Search contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (username, nickname)
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Alternative search query parameter
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
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query required
 */
router.get(
  '/search',
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
      // Accept both 'query' and 'q' parameters for flexibility
      const { query: searchQuery, q, page = 1, limit = 20 } = req.query;
      const searchTerm = searchQuery || q;

      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required (use ?query=... or ?q=...)',
        });
      }

      const offset = (page - 1) * limit;

      // Search contacts by nickname or user's username
      const { count, rows: contacts } = await Contact.findAndCountAll({
        where: {
          userId,
          status: 'accepted', // Only search accepted contacts
        },
        include: [
          {
            model: User,
            as: 'contact',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
            where: {
              [Op.or]: [
                { username: { [Op.iLike]: `%${searchTerm}%` } },
                { firstName: { [Op.iLike]: `%${searchTerm}%` } },
                { lastName: { [Op.iLike]: `%${searchTerm}%` } },
              ],
            },
          },
        ],
        order: [['lastContactAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Contact search completed successfully',
        data: contacts.map(contact => ({
          id: contact.id,
          status: contact.status,
          nickname: contact.nickname,
          notes: contact.notes,
          isFavorite: contact.isFavorite,
                                  user: contact.contact
                                  ? {
                                      id: contact.contact.id,
                                      username: contact.contact.username,
                                      firstName: contact.contact.firstName,
                                      lastName: contact.contact.lastName,
                                      avatar: contact.contact.avatar,
                                      profilePicture: contact.contact.avatar,
                                      onlineStatus: contact.contact.status,
                                    }
                                  : null,        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResults: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      logger.error('❌ Error searching contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search contacts',
        error: error.message,
      });
    }
  }
);

export default router;
