import { DeviceToken } from '../models/index.js';
import fcmService from '../services/fcmService.js';
import auditService from '../services/auditService.js';
import logger from '../utils/logger.js';

class PushNotificationController {
  /**
   * Register a device token for push notifications
   * POST /api/push/register
   */
  async registerToken(req, res) {
    try {
      const userId = req.user.id;
      const { token, deviceType = 'web', deviceName } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Device token is required',
          },
        });
      }

      // Check if token already exists for this user
      const existingToken = await DeviceToken.findByUserIdAndToken(userId, token);

      if (existingToken) {
        // Update existing token
        existingToken.isActive = true;
        existingToken.deviceType = deviceType;
        existingToken.deviceName = deviceName || existingToken.deviceName;
        existingToken.userAgent = req.get('User-Agent');
        await existingToken.save();

        logger.info(`Device token updated for user ${userId}`);

        return res.status(200).json({
          success: true,
          message: 'Device token updated successfully',
          data: {
            tokenId: existingToken.id,
          },
        });
      }

      // Create new token
      const deviceToken = await DeviceToken.create({
        userId,
        token,
        deviceType,
        deviceName: deviceName || req.get('User-Agent'),
        userAgent: req.get('User-Agent'),
        isActive: true,
      });

      await auditService.log({
        action: 'push_notification:token_registered',
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          tokenId: deviceToken.id,
          deviceType,
        },
      });

      logger.info(`Device token registered for user ${userId}`);

      return res.status(201).json({
        success: true,
        message: 'Device token registered successfully',
        data: {
          tokenId: deviceToken.id,
        },
      });
    } catch (error) {
      logger.error('Register token error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to register device token',
        },
      });
    }
  }

  /**
   * Unregister a device token
   * POST /api/push/unregister
   */
  async unregisterToken(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Device token is required',
          },
        });
      }

      await DeviceToken.deactivateToken(userId, token);

      await auditService.log({
        action: 'push_notification:token_unregistered',
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          token: token.substring(0, 20) + '...',
        },
      });

      logger.info(`Device token unregistered for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Device token unregistered successfully',
      });
    } catch (error) {
      logger.error('Unregister token error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to unregister device token',
        },
      });
    }
  }

  /**
   * Get all device tokens for the current user
   * GET /api/push/tokens
   */
  async getTokens(req, res) {
    try {
      const userId = req.user.id;

      const tokens = await DeviceToken.findByUserId(userId);

      const formattedTokens = tokens.map(token => ({
        id: token.id,
        deviceType: token.deviceType,
        deviceName: token.deviceName,
        isActive: token.isActive,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
      }));

      return res.status(200).json({
        success: true,
        data: {
          tokens: formattedTokens,
        },
      });
    } catch (error) {
      logger.error('Get tokens error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve device tokens',
        },
      });
    }
  }

  /**
   * Test push notification
   * POST /api/push/test
   */
  async testNotification(req, res) {
    try {
      const userId = req.user.id;

      // Get all active tokens for the user
      const tokens = await DeviceToken.findByUserId(userId);

      if (tokens.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'NO_TOKENS',
            message: 'No device tokens registered. Please register a token first.',
          },
        });
      }

      const deviceTokens = tokens.map(t => t.token);

      // Send test notification
      const result = await fcmService.sendMulticastNotification(
        deviceTokens,
        'Test Notification',
        'This is a test push notification from Messenger',
        {
          type: 'test',
          timestamp: new Date().toISOString(),
        }
      );

      // Deactivate invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        for (const invalidToken of result.invalidTokens) {
          await DeviceToken.deactivateToken(userId, invalidToken);
        }
      }

      logger.info(`Test notification sent to user ${userId}`, {
        successCount: result.successCount,
        failureCount: result.failureCount,
      });

      return res.status(200).json({
        success: true,
        message: 'Test notification sent',
        data: {
          successCount: result.successCount || 0,
          failureCount: result.failureCount || 0,
          totalTokens: tokens.length,
        },
      });
    } catch (error) {
      logger.error('Test notification error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to send test notification',
        },
      });
    }
  }

  /**
   * Check FCM status
   * GET /api/push/status
   */
  async getStatus(req, res) {
    try {
      const isInitialized = fcmService.isInitialized();
      const userId = req.user.id;

      // Get token count for the user
      const tokens = await DeviceToken.findByUserId(userId);

      return res.status(200).json({
        success: true,
        data: {
          fcmInitialized: isInitialized,
          registeredTokens: tokens.length,
          pushNotificationsAvailable: isInitialized && tokens.length > 0,
        },
      });
    } catch (error) {
      logger.error('Get push status error:', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get push notification status',
        },
      });
    }
  }
}

export default new PushNotificationController();
