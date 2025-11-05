import { Op } from 'sequelize';

import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

import notificationSettingsService from './notificationSettingsService.js';

/**
 * Notification Service
 * Handles business logic for notifications including rate limiting and auto-expiry
 */
class NotificationService {
  constructor() {
    // Rate limiting configuration
    this.rateLimits = {
      // Per user rate limits for notification creation
      creation: {
        maxPerMinute: 50, // Max 50 notifications per minute per user
        maxPerHour: 500, // Max 500 notifications per hour per user
        maxPerDay: 2000, // Max 2000 notifications per day per user
      },

      // Per user rate limits for notification actions (mark as read, delete, etc.)
      actions: {
        maxPerMinute: 100, // Max 100 actions per minute per user
        maxPerHour: 1000, // Max 1000 actions per hour per user
      },
    };

    // Rate limiting storage (in production, use Redis)
    this.userRateLimits = new Map(); // userId -> rate limit data

    // Cleanup interval for expired notifications (runs every hour)
    this.cleanupInterval = null;

    // Start auto-cleanup
    this.startAutoCleanup();
  }

  /**
   * Check if user can create a notification (rate limiting)
   */
  canCreateNotification(userId) {
    const now = Date.now();
    const userLimits = this.getUserRateLimits(userId);

    // Check minute limit
    if (
      this.isRateLimited(
        userLimits.creation.minute,
        this.rateLimits.creation.maxPerMinute,
        now,
        60000
      )
    ) {
      return {
        allowed: false,
        reason: 'MINUTE_LIMIT_EXCEEDED',
        retryAfter: this.getRetryAfter(userLimits.creation.minute, 60000),
      };
    }

    // Check hour limit
    if (
      this.isRateLimited(
        userLimits.creation.hour,
        this.rateLimits.creation.maxPerHour,
        now,
        3600000
      )
    ) {
      return {
        allowed: false,
        reason: 'HOUR_LIMIT_EXCEEDED',
        retryAfter: this.getRetryAfter(userLimits.creation.hour, 3600000),
      };
    }

    // Check day limit
    if (
      this.isRateLimited(userLimits.creation.day, this.rateLimits.creation.maxPerDay, now, 86400000)
    ) {
      return {
        allowed: false,
        reason: 'DAY_LIMIT_EXCEEDED',
        retryAfter: this.getRetryAfter(userLimits.creation.day, 86400000),
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can perform notification actions (rate limiting)
   */
  canPerformAction(userId) {
    const now = Date.now();
    const userLimits = this.getUserRateLimits(userId);

    // Check minute limit for actions
    if (
      this.isRateLimited(
        userLimits.actions.minute,
        this.rateLimits.actions.maxPerMinute,
        now,
        60000
      )
    ) {
      return {
        allowed: false,
        reason: 'ACTION_MINUTE_LIMIT_EXCEEDED',
        retryAfter: this.getRetryAfter(userLimits.actions.minute, 60000),
      };
    }

    // Check hour limit for actions
    if (
      this.isRateLimited(userLimits.actions.hour, this.rateLimits.actions.maxPerHour, now, 3600000)
    ) {
      return {
        allowed: false,
        reason: 'ACTION_HOUR_LIMIT_EXCEEDED',
        retryAfter: this.getRetryAfter(userLimits.actions.hour, 3600000),
      };
    }

    return { allowed: true };
  }

  /**
   * Record notification creation for rate limiting
   */
  recordNotificationCreation(userId) {
    const now = Date.now();
    const userLimits = this.getUserRateLimits(userId);

    // Record in all time windows
    this.recordInWindow(userLimits.creation.minute, now, 60000);
    this.recordInWindow(userLimits.creation.hour, now, 3600000);
    this.recordInWindow(userLimits.creation.day, now, 86400000);

    this.userRateLimits.set(userId, userLimits);
  }

  /**
   * Record notification action for rate limiting
   */
  recordNotificationAction(userId) {
    const now = Date.now();
    const userLimits = this.getUserRateLimits(userId);

    // Record in time windows
    this.recordInWindow(userLimits.actions.minute, now, 60000);
    this.recordInWindow(userLimits.actions.hour, now, 3600000);

    this.userRateLimits.set(userId, userLimits);
  }

  /**
   * Create a notification with rate limiting, validation, and preference checking
   */
  async createNotification(notificationData, createdByUserId = null) {
    try {
      const { userId, type: notificationType, category } = notificationData;

      // Check if user should receive this notification based on their preferences
      const shouldReceive = await notificationSettingsService.shouldReceiveNotification(
        userId,
        notificationType || category,
        'inApp'
      );

      if (!shouldReceive) {
        logger.info(
          `Notification blocked for user ${userId} due to preferences: ${notificationType || category}`
        );
        // Return a mock notification object that won't be persisted
        return {
          id: null,
          blocked: true,
          reason: 'User preferences prevent this notification',
          userId,
          type: notificationType || category,
        };
      }

      // Check rate limits if user is creating notifications for themselves
      if (createdByUserId && createdByUserId === userId) {
        const rateLimitCheck = this.canCreateNotification(createdByUserId);
        if (!rateLimitCheck.allowed) {
          throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        }
      }

      // Create notification using model
      const notification = await Notification.createNotification(notificationData);

      // Record rate limit usage
      if (createdByUserId && createdByUserId === userId) {
        this.recordNotificationCreation(createdByUserId);
      }

      logger.info(`Notification created: ${notification.id} for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Create notification service error:', error);
      throw error;
    }
  }

  /**
   * Bulk create notifications with rate limiting
   */
  async createBulkNotifications(notificationsData, createdByUserId) {
    try {
      const results = [];
      const errors = [];

      // Check overall rate limit for bulk operation
      const totalNotifications = notificationsData.length;
      const rateLimitCheck = this.canCreateNotification(createdByUserId);

      if (!rateLimitCheck.allowed) {
        throw new Error(`Bulk operation rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Check if bulk operation would exceed limits
      const userLimits = this.getUserRateLimits(createdByUserId);
      const minuteCount = userLimits.creation.minute.count + totalNotifications;
      const hourCount = userLimits.creation.hour.count + totalNotifications;
      const dayCount = userLimits.creation.day.count + totalNotifications;

      if (
        minuteCount > this.rateLimits.creation.maxPerMinute ||
        hourCount > this.rateLimits.creation.maxPerHour ||
        dayCount > this.rateLimits.creation.maxPerDay
      ) {
        throw new Error('Bulk operation would exceed rate limits');
      }

      // Create notifications
      for (const notificationData of notificationsData) {
        try {
          const notification = await this.createNotification(notificationData, createdByUserId);
          results.push(notification);
        } catch (error) {
          errors.push({ data: notificationData, error: error.message });
        }
      }

      // Record rate limit usage for successful creations
      const successCount = results.length;
      if (successCount > 0) {
        this.recordNotificationCreation(createdByUserId);
      }

      return { results, errors, successCount, errorCount: errors.length };
    } catch (error) {
      logger.error('Bulk create notifications error:', error);
      throw error;
    }
  }

  /**
   * Create notification with multi-channel support respecting user preferences
   */
  async createMultiChannelNotification(
    userId,
    notificationData,
    channels = ['inApp'],
    createdByUserId = null
  ) {
    try {
      const { type: notificationType, category } = notificationData;
      const notificationTypeToCheck = notificationType || category;

      // Check user preferences for each channel
      const channelPreferences =
        await notificationSettingsService.shouldReceiveNotificationMultiChannel(
          userId,
          notificationTypeToCheck,
          channels
        );

      const notificationsToCreate = [];
      const blockedChannels = [];

      // Create notifications only for channels where user should receive them
      for (const channel of channels) {
        if (channelPreferences[channel]) {
          notificationsToCreate.push({
            ...notificationData,
            userId,
            metadata: {
              ...notificationData.data,
              channel,
              originalNotificationType: notificationTypeToCheck,
            },
          });
        } else {
          blockedChannels.push({
            channel,
            reason: 'User preferences prevent this notification channel',
          });
        }
      }

      // Create notifications for allowed channels
      const results = [];
      for (const notificationDataToCreate of notificationsToCreate) {
        try {
          const notification = await this.createNotification(
            notificationDataToCreate,
            createdByUserId
          );
          results.push({
            channel: notificationDataToCreate.metadata.channel,
            notification,
            success: true,
          });
        } catch (error) {
          results.push({
            channel: notificationDataToCreate.metadata.channel,
            error: error.message,
            success: false,
          });
        }
      }

      return {
        results,
        blockedChannels,
        totalRequested: channels.length,
        totalCreated: results.filter(r => r.success).length,
        totalBlocked: blockedChannels.length,
      };
    } catch (error) {
      logger.error('Create multi-channel notification error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read with rate limiting
   */
  async markAsRead(notificationId, userId) {
    try {
      // Check action rate limit
      const rateLimitCheck = this.canPerformAction(userId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Action rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Find and update notification
      const notification = await Notification.findByIdAndUser(notificationId, userId);
      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      await notification.markAsRead();

      // Record rate limit usage
      this.recordNotificationAction(userId);

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Mark notification as read service error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read with rate limiting
   */
  async markAllAsRead(userId, filters = {}) {
    try {
      // Check action rate limit
      const rateLimitCheck = this.canPerformAction(userId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Action rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      const affectedRows = await Notification.markAllAsRead(userId, filters);

      // Record rate limit usage
      this.recordNotificationAction(userId);

      logger.info(`All notifications marked as read for user ${userId}. Affected: ${affectedRows}`);
      return affectedRows;
    } catch (error) {
      logger.error('Mark all notifications as read service error:', error);
      throw error;
    }
  }

  /**
   * Delete notification with rate limiting
   */
  async deleteNotification(notificationId, userId) {
    try {
      // Check action rate limit
      const rateLimitCheck = this.canPerformAction(userId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Action rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Find and delete notification
      const notification = await Notification.findByIdAndUser(notificationId, userId);
      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      await notification.destroy();

      // Record rate limit usage
      this.recordNotificationAction(userId);

      logger.info(`Notification ${notificationId} deleted by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Delete notification service error:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with advanced filtering and pagination
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        read,
        type,
        priority,
        category,
        includeExpired = false,
      } = options;

      const notificationOptions = {
        limit: Math.min(parseInt(limit), 100), // Cap at 100 per request
        offset: (parseInt(page) - 1) * parseInt(limit),
        read,
        type,
        priority,
        category,
        includeExpired,
      };

      const notifications = await Notification.findByUserId(userId, notificationOptions);

      // Get total count for pagination
      const totalCount = await Notification.count({
        where: {
          userId,
          ...(notificationOptions.read !== undefined && { read: notificationOptions.read }),
          ...(notificationOptions.type && { type: notificationOptions.type }),
          ...(notificationOptions.priority && { priority: notificationOptions.priority }),
          ...(notificationOptions.category && { category: notificationOptions.category }),
          ...(notificationOptions.includeExpired
            ? {}
            : {
                expiresAt: {
                  [Op.or]: [{ [Op.gt]: new Date() }, null],
                },
              }),
        },
      });

      return {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNext: parseInt(page) * parseInt(limit) < totalCount,
          hasPrev: parseInt(page) > 1,
        },
      };
    } catch (error) {
      logger.error('Get user notifications service error:', error);
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      logger.error('Get unread count service error:', error);
      throw error;
    }
  }

  /**
   * Auto cleanup expired notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const deletedCount = await Notification.deleteExpired();
      logger.info(`Auto-cleanup: ${deletedCount} expired notifications deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Auto cleanup expired notifications error:', error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup of expired notifications
   */
  startAutoCleanup() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      async () => {
        try {
          await this.cleanupExpiredNotifications();
        } catch (error) {
          logger.error('Auto cleanup interval error:', error);
        }
      },
      60 * 60 * 1000
    ); // 1 hour

    logger.info('Auto cleanup for expired notifications started');
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Auto cleanup for expired notifications stopped');
    }
  }

  /**
   * Helper: Check if rate limited
   */
  isRateLimited(window, maxCount, now, windowMs) {
    return window.count >= maxCount && now - window.resetTime < windowMs;
  }

  /**
   * Helper: Get retry after timestamp
   */
  getRetryAfter(window, windowMs) {
    const elapsed = Date.now() - window.resetTime;
    return Math.ceil((windowMs - elapsed) / 1000); // Return seconds
  }

  /**
   * Helper: Record action in time window
   */
  recordInWindow(window, now, windowMs) {
    // Reset window if expired
    if (!window.resetTime || now - window.resetTime >= windowMs) {
      window.count = 0;
      window.resetTime = now;
    }

    window.count++;
  }

  /**
   * Helper: Get user rate limits (create if not exists)
   */
  getUserRateLimits(userId) {
    if (!this.userRateLimits.has(userId)) {
      this.userRateLimits.set(userId, {
        creation: {
          minute: { count: 0, resetTime: 0 },
          hour: { count: 0, resetTime: 0 },
          day: { count: 0, resetTime: 0 },
        },
        actions: {
          minute: { count: 0, resetTime: 0 },
          hour: { count: 0, resetTime: 0 },
        },
      });
    }
    return this.userRateLimits.get(userId);
  }

  /**
   * Get rate limit status for user
   */
  getRateLimitStatus(userId) {
    const userLimits = this.getUserRateLimits(userId);
    const now = Date.now();

    return {
      creation: {
        minute: {
          count: userLimits.creation.minute.count,
          limit: this.rateLimits.creation.maxPerMinute,
          remaining: Math.max(
            0,
            this.rateLimits.creation.maxPerMinute - userLimits.creation.minute.count
          ),
          resetIn: Math.max(0, 60000 - (now - userLimits.creation.minute.resetTime)),
        },
        hour: {
          count: userLimits.creation.hour.count,
          limit: this.rateLimits.creation.maxPerHour,
          remaining: Math.max(
            0,
            this.rateLimits.creation.maxPerHour - userLimits.creation.hour.count
          ),
          resetIn: Math.max(0, 3600000 - (now - userLimits.creation.hour.resetTime)),
        },
        day: {
          count: userLimits.creation.day.count,
          limit: this.rateLimits.creation.maxPerDay,
          remaining: Math.max(
            0,
            this.rateLimits.creation.maxPerDay - userLimits.creation.day.count
          ),
          resetIn: Math.max(0, 86400000 - (now - userLimits.creation.day.resetTime)),
        },
      },
      actions: {
        minute: {
          count: userLimits.actions.minute.count,
          limit: this.rateLimits.actions.maxPerMinute,
          remaining: Math.max(
            0,
            this.rateLimits.actions.maxPerMinute - userLimits.actions.minute.count
          ),
          resetIn: Math.max(0, 60000 - (now - userLimits.actions.minute.resetTime)),
        },
        hour: {
          count: userLimits.actions.hour.count,
          limit: this.rateLimits.actions.maxPerHour,
          remaining: Math.max(
            0,
            this.rateLimits.actions.maxPerHour - userLimits.actions.hour.count
          ),
          resetIn: Math.max(0, 3600000 - (now - userLimits.actions.hour.resetTime)),
        },
      },
    };
  }

  /**
   * Clean up old rate limit data
   */
  cleanupRateLimitData() {
    const now = Date.now();
    const oneDayAgo = now - 86400000; // 24 hours

    for (const [userId, limits] of this.userRateLimits.entries()) {
      // Check if all windows are old
      const allWindowsOld =
        limits.creation.minute.resetTime < oneDayAgo &&
        limits.creation.hour.resetTime < oneDayAgo &&
        limits.creation.day.resetTime < oneDayAgo &&
        limits.actions.minute.resetTime < oneDayAgo &&
        limits.actions.hour.resetTime < oneDayAgo;

      if (allWindowsOld) {
        this.userRateLimits.delete(userId);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAutoCleanup();

    // Clean up rate limit data
    setTimeout(() => {
      this.userRateLimits.clear();
    }, 5000); // Clear after 5 seconds to allow pending operations

    logger.info('Notification service cleaned up');
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService };
