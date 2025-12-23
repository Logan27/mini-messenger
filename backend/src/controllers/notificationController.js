import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

/**
 * Notification Controller
 */
class NotificationController {
  constructor() {
    // Bind methods to preserve 'this' context when used as route handlers
    this.getNotifications = this.getNotifications.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
    this.createNotification = this.createNotification.bind(this);
  }

  /**
   * Get user notifications with pagination and filtering
   * GET /api/notifications
   */
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 50, read, type, priority, category } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build filter options
      const options = {
        limit: parseInt(limit),
        offset,
        read: read !== undefined ? read === 'true' : undefined,
        type,
        priority,
        category,
        includeExpired: false,
      };

      // Get notifications for the authenticated user
      const notifications = await Notification.findByUserId(req.user.id, options);
      const totalCount = await Notification.count({
        where: {
          userId: req.user.id,
          ...(options.read !== undefined && { read: options.read }),
          ...(options.type && { type: options.type }),
          ...(options.priority && { priority: options.priority }),
          ...(options.category && { category: options.category }),
          expiresAt: {
            [Op.or]: [{ [Op.gt]: new Date() }, null],
          },
        },
      });

      logger.info(
        `Notifications retrieved for user ${req.user.username}: ${notifications.length} items`
      );

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            userId: n.userId,
            senderId: n.senderId,
            senderName: n.sender ? (n.sender.firstName || n.sender.username) : undefined,
            senderAvatar: n.sender ? n.sender.avatar : undefined,
            type: n.type,
            category: n.category,
            title: n.title,
            content: n.content,
            body: n.content, // Alias for frontend
            priority: n.priority,
            read: n.read,
            data: n.data,
            createdAt: n.createdAt,
            expiresAt: n.expiresAt
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNext: offset + parseInt(limit) < totalCount,
            hasPrev: parseInt(page) > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Get notifications error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve notifications. Please try again.',
        },
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const unreadCount = await Notification.getUnreadCount(req.user.id);

      logger.info(`Unread count retrieved for user ${req.user.username}: ${unreadCount}`);

      res.status(200).json({
        success: true,
        data: {
          unreadCount,
        },
      });
    } catch (error) {
      logger.error('Get unread count error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get unread count. Please try again.',
        },
      });
    }
  }

  /**
   * Mark single notification as read
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    // FIX BUG-N002: Wrap database operations in transaction
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      // Find notification and verify ownership (within transaction)
      const notification = await Notification.findByIdAndUser(id, req.user.id, { transaction });

      if (!notification) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found or access denied',
          },
        });
      }

      // Check if already read
      if (notification.read) {
        await transaction.rollback();
        return res.status(200).json({
          success: true,
          message: 'Notification is already marked as read',
          data: { notification },
        });
      }

      // Mark as read (within transaction)
      await notificationService.markAsRead(id, req.user.id, { transaction });

      // Get unread count (within transaction for consistency)
      const unreadCount = await Notification.getUnreadCount(req.user.id, { transaction });

      // Commit transaction before WebSocket emissions
      await transaction.commit();

      // Emit WebSocket events AFTER commit (don't block transaction)
      await this.emitNotificationUpdate(req.user.id, 'notification:read', {
        notificationId: id,
        userId: req.user.id,
      });

      await this.emitNotificationUpdate(req.user.id, 'notification:badge-update', {
        unreadCount,
      });

      logger.info(`Notification ${id} marked as read by user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Mark notification as read error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to mark notification as read. Please try again.',
        },
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/mark-all-read
   */
  async markAllAsRead(req, res) {
    // FIX BUG-N003: Wrap database operations in transaction
    const transaction = await sequelize.transaction();
    try {
      const { type, category, priority } = req.body;

      // Build filters
      const filters = {};
      if (type) {
        filters.type = type;
      }
      if (category) {
        filters.category = category;
      }
      if (priority) {
        filters.priority = priority;
      }

      // Mark all as read (within transaction)
      const affectedRows = await notificationService.markAllAsRead(req.user.id, filters, {
        transaction,
      });

      // Get unread count (within transaction for consistency)
      const unreadCount = await Notification.getUnreadCount(req.user.id, { transaction });

      // Commit transaction before WebSocket emissions
      await transaction.commit();

      // Emit WebSocket event for badge update AFTER commit
      await this.emitNotificationUpdate(req.user.id, 'notification:badge-update', {
        unreadCount,
      });

      logger.info(
        `All notifications marked as read for user ${req.user.username}. Affected rows: ${affectedRows}`
      );

      res.status(200).json({
        success: true,
        message: `Marked ${affectedRows} notifications as read`,
        data: {
          affectedCount: affectedRows,
          filters: filters,
        },
      });
    } catch (error) {
      await transaction.rollback();
      // FIX BUG-N001: Use structured logger instead of console.error
      logger.error('Mark all notifications as read error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        filters: { type, category, priority },
      });

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to mark all notifications as read. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Delete single notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res) {
    // FIX BUG-N004: Wrap database operations in transaction
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      // Find notification and verify ownership (within transaction)
      const notification = await Notification.findByIdAndUser(id, req.user.id, { transaction });

      if (!notification) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found or access denied',
          },
        });
      }

      // Store read status before deletion
      const wasUnread = !notification.read;

      // Delete notification (within transaction)
      await notificationService.deleteNotification(id, req.user.id, { transaction });

      // Get unread count if needed (within transaction for consistency)
      let unreadCount = null;
      if (wasUnread) {
        unreadCount = await Notification.getUnreadCount(req.user.id, { transaction });
      }

      // Commit transaction before WebSocket emissions
      await transaction.commit();

      // Emit WebSocket events AFTER commit (don't block transaction)
      await this.emitNotificationUpdate(req.user.id, 'notification:deleted', {
        notificationId: id,
        userId: req.user.id,
      });

      // Emit badge update if it was unread
      if (wasUnread && unreadCount !== null) {
        await this.emitNotificationUpdate(req.user.id, 'notification:badge-update', {
          unreadCount,
        });
      }

      logger.info(`Notification ${id} deleted by user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Delete notification error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to delete notification. Please try again.',
        },
      });
    }
  }

  /**
   * Create a new notification (for internal use by other services)
   * POST /api/notifications
   */
  async createNotification(req, res) {
    try {
      const {
        userId,
        senderId,
        type,
        title,
        content,
        data = {},
        priority = 'normal',
        category,
        expiresAt,
      } = req.body;

      // Validate required fields
      if (!userId || !type || !title || !content || !category) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Missing required fields: userId, type, title, content, category',
          },
        });
      }

      // Validate enums
      const validTypes = ['message', 'call', 'admin', 'system'];
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const validCategories = ['general', 'message', 'group', 'call', 'system', 'admin'];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid notification type',
          },
        });
      }

      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid priority level',
          },
        });
      }

      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid notification category',
          },
        });
      }

      const notification = await notificationService.createNotification(
        {
          userId,
          senderId,
          type,
          title,
          content,
          data,
          priority,
          category,
          expiresAt,
        },
        userId
      );

      // Get sender info if available
      let sender = null;
      if (notification.senderId) {
        const { User } = await import('../models/index.js');
        sender = await User.findByPk(notification.senderId, {
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        });
      }

      // Emit WebSocket event for real-time delivery
      await this.emitNotificationUpdate(userId, 'notification:new', {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          priority: notification.priority,
          category: notification.category,
          createdAt: notification.createdAt,
          senderId: notification.senderId,
          senderName: sender ? (sender.firstName || sender.username) : undefined,
          senderAvatar: sender ? sender.avatar : undefined,
        },
      });

      // Emit badge update for the user
      const unreadCount = await Notification.getUnreadCount(userId);
      await this.emitNotificationUpdate(userId, 'notification:badge-update', {
        unreadCount,
      });

      logger.info(`Notification created: ${notification.id} for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification },
      });
    } catch (error) {
      logger.error('Create notification error:', error);

      if (error.message === 'Missing required notification fields') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to create notification. Please try again.',
        },
      });
    }
  }

  /**
   * Emit WebSocket notification update
   */
  async emitNotificationUpdate(userId, event, data) {
    try {
      // Import WebSocket service dynamically to avoid circular dependencies
      const { getWebSocketService } = await import('../services/websocket.js');

      const wsService = getWebSocketService();
      if (wsService) {
        // Use broadcastToUser method for cross-server support
        await wsService.broadcastToUser(userId, event, data);
      }
    } catch (error) {
      logger.error('Failed to emit notification WebSocket event:', error);
      // Don't fail the request if WebSocket emission fails
    }
  }

  /**
   * Clean up expired notifications (for scheduled job)
   */
  async cleanupExpired(req, res) {
    try {
      // Only allow admins to run cleanup
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            type: 'ACCESS_DENIED',
            message: 'Admin access required',
          },
        });
      }

      const deletedCount = await Notification.deleteExpired();

      logger.info(`Expired notifications cleaned up: ${deletedCount} deleted`);

      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} expired notifications`,
        data: {
          deletedCount,
        },
      });
    } catch (error) {
      logger.error('Cleanup expired notifications error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to cleanup expired notifications. Please try again.',
        },
      });
    }
  }
}

export default new NotificationController();
