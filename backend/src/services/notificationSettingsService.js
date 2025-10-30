import NotificationSettings from '../models/NotificationSettings.js';
import logger from '../utils/logger.js';

/**
 * Notification Settings Service
 * Handles business logic for notification preferences and preference checking
 */
class NotificationSettingsService {
  constructor() {
    // Cache for notification settings to improve performance
    this.settingsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cacheTimestamps = new Map();
  }

  /**
   * Get user notification settings with caching
   */
  async getUserSettings(userId, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.settingsCache.has(userId)) {
        const cacheTimestamp = this.cacheTimestamps.get(userId);
        if (cacheTimestamp && Date.now() - cacheTimestamp < this.cacheTimeout) {
          logger.debug(`Using cached notification settings for user ${userId}`);
          return this.settingsCache.get(userId);
        }
      }

      // Get from database
      const settings = await NotificationSettings.getOrCreateDefault(userId);

      // Cache the settings
      if (useCache) {
        this.settingsCache.set(userId, settings);
        this.cacheTimestamps.set(userId, Date.now());
      }

      return settings;
    } catch (error) {
      logger.error('Get user notification settings service error:', error);
      throw error;
    }
  }

  /**
   * Update user notification settings
   */
  async updateUserSettings(userId, updates) {
    try {
      // Validate updates
      this.validateSettingsUpdate(updates);

      // Get current settings or create defaults
      const settings = await NotificationSettings.getOrCreateDefault(userId);

      // Apply updates
      const updatedSettings = await settings.update(updates);

      // Invalidate cache
      this.invalidateUserCache(userId);

      logger.info(`Notification settings updated for user ${userId}`);
      return updatedSettings;
    } catch (error) {
      logger.error('Update user notification settings service error:', error);
      throw error;
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetUserSettings(userId) {
    try {
      const defaultSettings = await NotificationSettings.resetToDefaults(userId);

      // Invalidate cache
      this.invalidateUserCache(userId);

      logger.info(`Notification settings reset to defaults for user ${userId}`);
      return defaultSettings;
    } catch (error) {
      logger.error('Reset user notification settings service error:', error);
      throw error;
    }
  }

  /**
   * Check if user should receive a specific notification
   */
  async shouldReceiveNotification(userId, notificationType, channel = 'inApp') {
    try {
      const settings = await this.getUserSettings(userId);

      return settings.shouldReceiveNotification(notificationType, channel);
    } catch (error) {
      logger.error('Check notification receipt service error:', error);

      // Default to true if there's an error checking preferences
      // This ensures notifications aren't accidentally blocked due to service issues
      return true;
    }
  }

  /**
   * Check if user should receive notification for multiple channels
   */
  async shouldReceiveNotificationMultiChannel(
    userId,
    notificationType,
    channels = ['inApp', 'email', 'push']
  ) {
    try {
      const settings = await this.getUserSettings(userId);
      const results = {};

      for (const channel of channels) {
        results[channel] = settings.shouldReceiveNotification(notificationType, channel);
      }

      return results;
    } catch (error) {
      logger.error('Check multi-channel notification receipt service error:', error);

      // Default to true for all channels if there's an error
      const results = {};
      for (const channel of channels) {
        results[channel] = true;
      }
      return results;
    }
  }

  /**
   * Get notification delivery preferences for a user
   */
  async getDeliveryPreferences(userId) {
    try {
      const settings = await this.getUserSettings(userId);

      return {
        inApp: settings.inAppEnabled,
        email: settings.emailEnabled,
        push: settings.pushEnabled,
        quietHours: {
          enabled: !!(settings.quietHoursStart && settings.quietHoursEnd),
          start: settings.quietHoursStart,
          end: settings.quietHoursEnd,
        },
        doNotDisturb: settings.doNotDisturb,
        granular: {
          message: settings.messageNotifications,
          call: settings.callNotifications,
          mention: settings.mentionNotifications,
          admin: settings.adminNotifications,
          system: settings.systemNotifications,
        },
      };
    } catch (error) {
      logger.error('Get delivery preferences service error:', error);
      throw error;
    }
  }

  /**
   * Bulk check notification preferences for multiple users
   */
  async bulkCheckNotificationPreferences(userIds, notificationType, channel = 'inApp') {
    try {
      const results = {};

      // Process in batches for performance
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async userId => {
          try {
            const shouldReceive = await this.shouldReceiveNotification(
              userId,
              notificationType,
              channel
            );
            return { userId, shouldReceive };
          } catch (error) {
            logger.error(`Error checking preferences for user ${userId}:`, error);
            return { userId, shouldReceive: true }; // Default to true on error
          }
        });

        const batchResults = await Promise.all(batchPromises);
        for (const result of batchResults) {
          results[result.userId] = result.shouldReceive;
        }
      }

      return results;
    } catch (error) {
      logger.error('Bulk check notification preferences service error:', error);
      throw error;
    }
  }

  /**
   * Get users who should receive a specific notification type
   */
  async getUsersForNotificationType(notificationType, channel = 'inApp', userIds = null) {
    try {
      const whereClause = {};

      // Build where clause based on notification type and channel
      switch (channel) {
        case 'inApp':
          whereClause.inAppEnabled = true;
          break;
        case 'email':
          whereClause.emailEnabled = true;
          break;
        case 'push':
          whereClause.pushEnabled = true;
          break;
      }

      // Add notification type preference
      switch (notificationType) {
        case 'message':
          whereClause.messageNotifications = true;
          break;
        case 'call':
          whereClause.callNotifications = true;
          break;
        case 'mention':
          whereClause.mentionNotifications = true;
          break;
        case 'admin':
          whereClause.adminNotifications = true;
          break;
        case 'system':
          whereClause.systemNotifications = true;
          break;
      }

      // Exclude users with DND enabled or in quiet hours
      whereClause.doNotDisturb = false;

      // If specific user IDs provided, filter by them
      if (userIds && userIds.length > 0) {
        whereClause.userId = userIds;
      }

      const settings = await NotificationSettings.findAll({
        where: whereClause,
        attributes: ['userId'],
      });

      return settings.map(setting => setting.userId);
    } catch (error) {
      logger.error('Get users for notification type service error:', error);
      throw error;
    }
  }

  /**
   * Generate notification preview for user settings
   */
  async generatePreview(userId, notificationType, channel = 'inApp') {
    try {
      const settings = await this.getUserSettings(userId);

      const wouldReceive = settings.shouldReceiveNotification(notificationType, channel);

      return {
        notificationType,
        channel,
        wouldReceive,
        isInQuietHours: settings.isInQuietHours(),
        doNotDisturb: settings.doNotDisturb,
        currentSettings: {
          inAppEnabled: settings.inAppEnabled,
          emailEnabled: settings.emailEnabled,
          pushEnabled: settings.pushEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          doNotDisturb: settings.doNotDisturb,
          [`${notificationType}Notifications`]: settings[`${notificationType}Notifications`],
        },
        reason: this.getRejectionReason(settings, notificationType, channel),
      };
    } catch (error) {
      logger.error('Generate preview service error:', error);
      throw error;
    }
  }

  /**
   * Get rejection reason for notification
   */
  getRejectionReason(settings, notificationType, channel) {
    if (settings.doNotDisturb) {
      return 'Do Not Disturb is enabled';
    }

    if (settings.isInQuietHours()) {
      return 'Currently in quiet hours';
    }

    switch (channel) {
      case 'inApp':
        if (!settings.inAppEnabled) {
          return 'In-app notifications disabled';
        }
        break;
      case 'email':
        if (!settings.emailEnabled) {
          return 'Email notifications disabled';
        }
        break;
      case 'push':
        if (!settings.pushEnabled) {
          return 'Push notifications disabled';
        }
        break;
    }

    switch (notificationType) {
      case 'message':
        if (!settings.messageNotifications) {
          return 'Message notifications disabled';
        }
        break;
      case 'call':
        if (!settings.callNotifications) {
          return 'Call notifications disabled';
        }
        break;
      case 'mention':
        if (!settings.mentionNotifications) {
          return 'Mention notifications disabled';
        }
        break;
      case 'admin':
        if (!settings.adminNotifications) {
          return 'Admin notifications disabled';
        }
        break;
      case 'system':
        if (!settings.systemNotifications) {
          return 'System notifications disabled';
        }
        break;
    }

    return 'Would be received';
  }

  /**
   * Validate settings update
   */
  validateSettingsUpdate(updates) {
    const allowedFields = [
      'inAppEnabled',
      'emailEnabled',
      'pushEnabled',
      'quietHoursStart',
      'quietHoursEnd',
      'doNotDisturb',
      'messageNotifications',
      'callNotifications',
      'mentionNotifications',
      'adminNotifications',
      'systemNotifications',
    ];

    for (const field of Object.keys(updates)) {
      if (!allowedFields.includes(field)) {
        throw new Error(`Invalid field: ${field}`);
      }

      // Validate boolean fields
      if (
        [
          'inAppEnabled',
          'emailEnabled',
          'pushEnabled',
          'doNotDisturb',
          'messageNotifications',
          'callNotifications',
          'mentionNotifications',
          'adminNotifications',
          'systemNotifications',
        ].includes(field)
      ) {
        if (typeof updates[field] !== 'boolean') {
          throw new Error(`${field} must be a boolean`);
        }
      }

      // Validate time format for quiet hours
      if (['quietHoursStart', 'quietHoursEnd'].includes(field)) {
        if (updates[field] !== null && updates[field] !== undefined) {
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updates[field])) {
            throw new Error(`${field} must be in HH:MM format or null`);
          }
        }
      }
    }
  }

  /**
   * Invalidate user cache
   */
  invalidateUserCache(userId) {
    this.settingsCache.delete(userId);
    this.cacheTimestamps.delete(userId);
  }

  /**
   * Clear all cached settings
   */
  clearCache() {
    this.settingsCache.clear();
    this.cacheTimestamps.clear();
    logger.info('Notification settings cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedUsers: this.settingsCache.size,
      cacheTimeout: this.cacheTimeout,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Calculate cache hit rate (requires tracking hits/misses)
   */
  calculateCacheHitRate() {
    // This would require additional tracking in getUserSettings method
    // For now, return a placeholder
    return null;
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const expiredEntries = [];

    for (const [userId, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp >= this.cacheTimeout) {
        expiredEntries.push(userId);
      }
    }

    for (const userId of expiredEntries) {
      this.settingsCache.delete(userId);
      this.cacheTimestamps.delete(userId);
    }

    if (expiredEntries.length > 0) {
      logger.debug(`Cleaned up ${expiredEntries.length} expired cache entries`);
    }

    return expiredEntries.length;
  }

  /**
   * Initialize cache cleanup interval
   */
  initializeCacheCleanup() {
    // Cleanup every 10 minutes
    setInterval(
      () => {
        this.cleanupCache();
      },
      10 * 60 * 1000
    );

    logger.info('Notification settings cache cleanup initialized');
  }
}

// Create singleton instance
const notificationSettingsService = new NotificationSettingsService();

// Initialize cache cleanup
notificationSettingsService.initializeCacheCleanup();

export default notificationSettingsService;
export { NotificationSettingsService };
