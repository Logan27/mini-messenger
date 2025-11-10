import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import NotificationSettings from '../src/models/NotificationSettings.js';
import notificationSettingsController from '../src/controllers/notificationSettingsController.js';
import notificationSettingsService from '../src/services/notificationSettingsService.js';
import { sequelize } from '../src/config/database.js';

// Mock the WebSocket service
jest.mock('../src/services/websocket.js', () => ({
  getWebSocketService: () => ({
    broadcastToUser: jest.fn(),
  }),
}));

describe('NotificationSettings', () => {
  beforeEach(async () => {
    // Clear database before each test
    await NotificationSettings.destroy({ where: {} });
  });

  afterEach(async () => {
    // Clean up after each test
    await NotificationSettings.destroy({ where: {} });
  });

  describe('Model', () => {
    it('should create default notification settings', async () => {
      const settings = await NotificationSettings.createDefaultSettings('user-123');

      expect(settings.userId).toBe('user-123');
      expect(settings.inAppEnabled).toBe(true);
      expect(settings.emailEnabled).toBe(true);
      expect(settings.pushEnabled).toBe(true);
      expect(settings.doNotDisturb).toBe(false);
      expect(settings.messageNotifications).toBe(true);
      expect(settings.callNotifications).toBe(true);
      expect(settings.mentionNotifications).toBe(true);
      expect(settings.adminNotifications).toBe(true);
      expect(settings.systemNotifications).toBe(true);
    });

    it('should get or create default settings', async () => {
      // First call should create new settings
      const settings1 = await NotificationSettings.getOrCreateDefault('user-123');
      expect(settings1).toBeTruthy();

      // Second call should return existing settings
      const settings2 = await NotificationSettings.getOrCreateDefault('user-123');
      expect(settings2.id).toBe(settings1.id);
    });

    it('should validate quiet hours correctly', async () => {
      const settings = await NotificationSettings.create({
        userId: 'user-123',
        quietHoursStart: '09:00',
        quietHoursEnd: '17:00',
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        doNotDisturb: false,
        messageNotifications: true,
        callNotifications: true,
        mentionNotifications: true,
        adminNotifications: true,
        systemNotifications: true,
      });

      expect(settings.quietHoursStart).toBe('09:00');
      expect(settings.quietHoursEnd).toBe('17:00');
    });

    it('should reject invalid quiet hours', async () => {
      await expect(
        NotificationSettings.create({
          userId: 'user-123',
          quietHoursStart: '25:00', // Invalid hour
          quietHoursEnd: '17:00',
          inAppEnabled: true,
          emailEnabled: true,
          pushEnabled: true,
          doNotDisturb: false,
          messageNotifications: true,
          callNotifications: true,
          mentionNotifications: true,
          adminNotifications: true,
          systemNotifications: true,
        })
      ).rejects.toThrow();
    });

    it('should check if user should receive notification correctly', async () => {
      const settings = await NotificationSettings.create({
        userId: 'user-123',
        quietHoursStart: '09:00',
        quietHoursEnd: '17:00',
        doNotDisturb: false,
        inAppEnabled: true,
        messageNotifications: true,
        callNotifications: false,
        mentionNotifications: true,
        adminNotifications: true,
        systemNotifications: true,
      });

      // Should receive message notification
      expect(settings.shouldReceiveNotification('message', 'inApp')).toBe(true);

      // Should not receive call notification
      expect(settings.shouldReceiveNotification('call', 'inApp')).toBe(false);

      // Should not receive during quiet hours (mock current time)
      jest.spyOn(settings, 'isInQuietHours').mockReturnValue(true);
      expect(settings.shouldReceiveNotification('message', 'inApp')).toBe(false);
    });

    it('should reset settings to defaults', async () => {
      const settings = await NotificationSettings.create({
        userId: 'user-123',
        inAppEnabled: false,
        emailEnabled: false,
        pushEnabled: false,
        doNotDisturb: true,
        messageNotifications: false,
        callNotifications: false,
        mentionNotifications: false,
        adminNotifications: false,
        systemNotifications: false,
      });

      const resetSettings = await NotificationSettings.resetToDefaults('user-123');

      expect(resetSettings.inAppEnabled).toBe(true);
      expect(resetSettings.emailEnabled).toBe(true);
      expect(resetSettings.pushEnabled).toBe(true);
      expect(resetSettings.doNotDisturb).toBe(false);
      expect(resetSettings.messageNotifications).toBe(true);
    });
  });

  describe('Service', () => {
    beforeEach(() => {
      // Clear service cache before each test
      notificationSettingsService.clearCache();
    });

    it('should get user settings with caching', async () => {
      const settings1 = await notificationSettingsService.getUserSettings('user-123');
      const settings2 = await notificationSettingsService.getUserSettings('user-123');

      // Should return the same instance due to caching
      expect(settings1).toBe(settings2);
    });

    it('should update user settings and invalidate cache', async () => {
      await notificationSettingsService.updateUserSettings('user-123', {
        inAppEnabled: false,
      });

      const settings = await notificationSettingsService.getUserSettings('user-123');
      expect(settings.inAppEnabled).toBe(false);
    });

    it('should validate settings updates', async () => {
      await expect(
        notificationSettingsService.updateUserSettings('user-123', {
          invalidField: 'value',
        })
      ).rejects.toThrow('Invalid field: invalidField');
    });

    it('should check notification preferences correctly', async () => {
      await notificationSettingsService.updateUserSettings('user-123', {
        messageNotifications: false,
      });

      const shouldReceive = await notificationSettingsService.shouldReceiveNotification(
        'user-123',
        'message'
      );

      expect(shouldReceive).toBe(false);
    });

    it('should generate preview correctly', async () => {
      const preview = await notificationSettingsService.generatePreview(
        'user-123',
        'message',
        'inApp'
      );

      expect(preview).toHaveProperty('notificationType');
      expect(preview).toHaveProperty('channel');
      expect(preview).toHaveProperty('wouldReceive');
      expect(preview).toHaveProperty('reason');
    });

    it('should handle bulk preference checking', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const preferences = await notificationSettingsService.bulkCheckNotificationPreferences(
        userIds,
        'message'
      );

      expect(Object.keys(preferences)).toHaveLength(3);
      expect(preferences).toHaveProperty('user-1');
      expect(preferences).toHaveProperty('user-2');
      expect(preferences).toHaveProperty('user-3');
    });
  });

  describe('API Endpoints', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Create test user and get auth token
      testUser = await NotificationSettings.create({
        userId: 'test-user-123',
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        doNotDisturb: false,
        messageNotifications: true,
        callNotifications: true,
        mentionNotifications: true,
        adminNotifications: true,
        systemNotifications: true,
      });

      // Mock auth token - in real tests, this would be obtained from auth endpoints
      authToken = 'valid-jwt-token';
    });

    it('should get notification settings', async () => {
      // This would require setting up a proper test app with authentication middleware
      // For now, we'll test the controller method directly
      const mockReq = {
        user: { id: 'test-user-123', username: 'testuser' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await notificationSettingsController.getSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification settings retrieved successfully',
        })
      );
    });

    it('should update notification settings', async () => {
      const mockReq = {
        user: { id: 'test-user-123', username: 'testuser' },
        body: {
          inAppEnabled: false,
          messageNotifications: false,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await notificationSettingsController.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification settings updated successfully',
        })
      );
    });

    it('should reset settings to defaults', async () => {
      const mockReq = {
        user: { id: 'test-user-123', username: 'testuser' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await notificationSettingsController.resetSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification settings reset to defaults successfully',
        })
      );
    });

    it('should preview notification settings', async () => {
      const mockReq = {
        user: { id: 'test-user-123', username: 'testuser' },
        query: {
          notificationType: 'message',
          channel: 'inApp',
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await notificationSettingsController.previewSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification settings preview generated successfully',
        })
      );
    });

    it('should validate quiet hours format', async () => {
      const mockReq = {
        user: { id: 'test-user-123', username: 'testuser' },
        body: {
          quietHoursStart: '25:00', // Invalid format
          quietHoursEnd: '17:00',
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await notificationSettingsController.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('Integration', () => {
    it('should handle complete notification settings workflow', async () => {
      const userId = 'workflow-user-123';

      // 1. Create default settings
      const settings = await NotificationSettings.createDefaultSettings(userId);
      expect(settings.inAppEnabled).toBe(true);

      // 2. Update settings via service
      await notificationSettingsService.updateUserSettings(userId, {
        doNotDisturb: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      // 3. Check that preferences are respected
      const shouldReceive = await notificationSettingsService.shouldReceiveNotification(
        userId,
        'message'
      );
      expect(shouldReceive).toBe(false); // Should be blocked due to DND

      // 4. Reset to defaults
      await notificationSettingsService.resetUserSettings(userId);

      // 5. Verify reset worked
      const resetSettings = await notificationSettingsService.getUserSettings(userId);
      expect(resetSettings.doNotDisturb).toBe(false);
      expect(resetSettings.quietHoursStart).toBeNull();
      expect(resetSettings.quietHoursEnd).toBeNull();
    });

    it('should handle quiet hours logic correctly', async () => {
      const settings = await NotificationSettings.create({
        userId: 'quiet-hours-user',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00', // Overnight quiet hours
        doNotDisturb: false,
        inAppEnabled: true,
        messageNotifications: true,
      });

      // Mock time to be during quiet hours (23:00)
      jest.spyOn(settings, 'isInQuietHours').mockReturnValue(true);

      const shouldReceive = settings.shouldReceiveNotification('message', 'inApp');
      expect(shouldReceive).toBe(false);

      // Mock time to be outside quiet hours (12:00)
      jest.spyOn(settings, 'isInQuietHours').mockReturnValue(false);

      const shouldReceive2 = settings.shouldReceiveNotification('message', 'inApp');
      expect(shouldReceive2).toBe(true);
    });
  });
});