import NotificationSettings from '../models/NotificationSettings.js';
import logger from '../utils/logger.js';

/**
 * Notification Settings Controller
 * Handles user notification preferences and settings
 */
class NotificationSettingsController {
  constructor() {
    // Bind methods to preserve 'this' context when used as route handlers
    this.getSettings = this.getSettings.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
    this.previewSettings = this.previewSettings.bind(this);
  }

  /**
   * Get user's notification settings
   * GET /api/notification-settings
   */
  async getSettings(req, res) {
    try {
      const userId = req.user.id;

      const settings = await NotificationSettings.getOrCreateDefault(userId);

      logger.info(`Notification settings retrieved for user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification settings retrieved successfully',
        data: {
          settings: {
            id: settings.id,
            userId: settings.userId,
            inAppEnabled: settings.inAppEnabled,
            emailEnabled: settings.emailEnabled,
            pushEnabled: settings.pushEnabled,
            quietHoursStart: settings.quietHoursStart,
            quietHoursEnd: settings.quietHoursEnd,
            doNotDisturb: settings.doNotDisturb,
            messageNotifications: settings.messageNotifications,
            callNotifications: settings.callNotifications,
            mentionNotifications: settings.mentionNotifications,
            adminNotifications: settings.adminNotifications,
            systemNotifications: settings.systemNotifications,
            createdAt: settings.createdAt,
            updatedAt: settings.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get notification settings error:', error);
      console.error('NOTIFICATION SETTINGS ERROR:', error.message, error.stack);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve notification settings. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Update user's notification settings
   * PUT /api/notification-settings
   */
  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Validate input fields
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

      const filteredUpdates = {};
      for (const field of allowedFields) {
        if (updates.hasOwnProperty(field)) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'No valid fields provided for update',
          },
        });
      }

      // Get or create settings
      const settings = await NotificationSettings.getOrCreateDefault(userId);

      // Validate quiet hours if being updated
      if (
        filteredUpdates.quietHoursStart !== undefined ||
        filteredUpdates.quietHoursEnd !== undefined
      ) {
        const tempSettings = { ...settings.toJSON(), ...filteredUpdates };
        const validation = new NotificationSettings(tempSettings).validateQuietHours();
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: validation.error,
            },
          });
        }
      }

      // Update settings
      const updatedSettings = await settings.update(filteredUpdates);

      // Emit WebSocket event for real-time updates
      await this.emitSettingsUpdate(userId, 'notification-settings:updated', {
        settings: updatedSettings,
        updatedBy: userId,
      });

      logger.info(`Notification settings updated for user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification settings updated successfully',
        data: {
          settings: {
            id: updatedSettings.id,
            userId: updatedSettings.userId,
            inAppEnabled: updatedSettings.inAppEnabled,
            emailEnabled: updatedSettings.emailEnabled,
            pushEnabled: updatedSettings.pushEnabled,
            quietHoursStart: updatedSettings.quietHoursStart,
            quietHoursEnd: updatedSettings.quietHoursEnd,
            doNotDisturb: updatedSettings.doNotDisturb,
            messageNotifications: updatedSettings.messageNotifications,
            callNotifications: updatedSettings.callNotifications,
            mentionNotifications: updatedSettings.mentionNotifications,
            adminNotifications: updatedSettings.adminNotifications,
            systemNotifications: updatedSettings.systemNotifications,
            createdAt: updatedSettings.createdAt,
            updatedAt: updatedSettings.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Update notification settings error:', error);

      if (error.message.includes('Quiet hours')) {
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
          message: 'Failed to update notification settings. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Reset settings to defaults
   * POST /api/notification-settings/reset
   */
  async resetSettings(req, res) {
    try {
      const userId = req.user.id;

      const defaultSettings = await NotificationSettings.resetToDefaults(userId);

      // Emit WebSocket event for real-time updates
      await this.emitSettingsUpdate(userId, 'notification-settings:reset', {
        settings: defaultSettings,
        resetBy: userId,
      });

      logger.info(`Notification settings reset to defaults for user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification settings reset to defaults successfully',
        data: {
          settings: {
            id: defaultSettings.id,
            userId: defaultSettings.userId,
            inAppEnabled: defaultSettings.inAppEnabled,
            emailEnabled: defaultSettings.emailEnabled,
            pushEnabled: defaultSettings.pushEnabled,
            quietHoursStart: defaultSettings.quietHoursStart,
            quietHoursEnd: defaultSettings.quietHoursEnd,
            doNotDisturb: defaultSettings.doNotDisturb,
            messageNotifications: defaultSettings.messageNotifications,
            callNotifications: defaultSettings.callNotifications,
            mentionNotifications: defaultSettings.mentionNotifications,
            adminNotifications: defaultSettings.adminNotifications,
            systemNotifications: defaultSettings.systemNotifications,
            createdAt: defaultSettings.createdAt,
            updatedAt: defaultSettings.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Reset notification settings error:', error);
      console.error('RESET SETTINGS ERROR:', error.message, error.stack);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to reset notification settings. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Preview how settings would affect notifications
   * GET /api/notification-settings/preview
   */
  async previewSettings(req, res) {
    try {
      const userId = req.user.id;
      const { notificationType, channel } = req.query;

      if (!notificationType) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'notificationType query parameter is required',
          },
        });
      }

      // Get current settings
      const settings = await NotificationSettings.getOrCreateDefault(userId);

      // Test the notification preference
      const wouldReceive = settings.shouldReceiveNotification(notificationType, channel || 'inApp');

      // Generate sample notifications for preview
      const previewNotifications = this.generatePreviewNotifications(
        settings,
        notificationType,
        channel
      );

      logger.info(`Notification settings preview generated for user ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification settings preview generated successfully',
        data: {
          currentSettings: {
            notificationType,
            channel: channel || 'inApp',
            wouldReceive,
            isInQuietHours: settings.isInQuietHours(),
            doNotDisturb: settings.doNotDisturb,
          },
          preview: previewNotifications,
          settings: {
            id: settings.id,
            inAppEnabled: settings.inAppEnabled,
            emailEnabled: settings.emailEnabled,
            pushEnabled: settings.pushEnabled,
            quietHoursStart: settings.quietHoursStart,
            quietHoursEnd: settings.quietHoursEnd,
            doNotDisturb: settings.doNotDisturb,
            messageNotifications: settings.messageNotifications,
            callNotifications: settings.callNotifications,
            mentionNotifications: settings.mentionNotifications,
            adminNotifications: settings.adminNotifications,
            systemNotifications: settings.systemNotifications,
          },
        },
      });
    } catch (error) {
      logger.error('Preview notification settings error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to generate settings preview. Please try again.',
        },
      });
    }
  }

  /**
   * Generate preview notifications for different scenarios
   */
  generatePreviewNotifications(settings, notificationType, channel) {
    const previews = [];

    // Current time scenario
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    previews.push({
      scenario: 'Current time',
      time: currentTime,
      inQuietHours: settings.isInQuietHours(),
      doNotDisturb: settings.doNotDisturb,
      wouldReceive: settings.shouldReceiveNotification(notificationType, channel),
      reason: this.getRejectionReason(settings, notificationType, channel),
    });

    // During quiet hours scenario (if quiet hours are set)
    if (settings.quietHoursStart && settings.quietHoursEnd) {
      previews.push({
        scenario: 'During quiet hours',
        time: settings.quietHoursStart,
        inQuietHours: true,
        doNotDisturb: settings.doNotDisturb,
        wouldReceive: false,
        reason: 'In quiet hours',
      });
    }

    // DND enabled scenario
    if (!settings.doNotDisturb) {
      previews.push({
        scenario: 'Do Not Disturb enabled',
        time: currentTime,
        inQuietHours: settings.isInQuietHours(),
        doNotDisturb: true,
        wouldReceive: false,
        reason: 'Do Not Disturb is enabled',
      });
    }

    return previews;
  }

  /**
   * Get rejection reason for notification
   */
  getRejectionReason(settings, notificationType, channel) {
    if (settings.doNotDisturb) {
      return 'Do Not Disturb is enabled';
    }

    if (settings.isInQuietHours()) {
      return 'In quiet hours';
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
   * Emit WebSocket settings update
   */
  async emitSettingsUpdate(userId, event, data) {
    try {
      console.log(`🔔 Emitting WebSocket event: ${event} to userId: ${userId}`);

      // Import WebSocket service dynamically to avoid circular dependencies
      const { getWebSocketService } = await import('../services/websocket.js');

      const wsService = getWebSocketService();
      if (wsService) {
        // Use broadcastToUser method for cross-server support
        await wsService.broadcastToUser(userId, event, data);
        console.log(`✅ WebSocket event emitted successfully: ${event}`);
      } else {
        console.warn('⚠️ WebSocket service not available');
      }
    } catch (error) {
      logger.error('Failed to emit notification settings WebSocket event:', error);
      console.error('❌ WebSocket emission failed:', error.message);
      // Don't fail the request if WebSocket emission fails
    }
  }
}

export default new NotificationSettingsController();
