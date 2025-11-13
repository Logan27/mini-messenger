import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import NotificationSettings from '../src/models/NotificationSettings.js';
import notificationSettingsController from '../src/controllers/notificationSettingsController.js';
import notificationSettingsService from '../src/services/notificationSettingsService.js';
import { sequelize } from '../src/config/database.js';

// Note: Mocking is disabled for ES module compatibility
// These tests focus on notification settings model and database operations
// WebSocket service interactions are not tested here

describe('NotificationSettings', () => {
  const { factory: testFactory } = global.testUtils;

  beforeEach(async () => {
    // Clean up using testFactory
    await testFactory.cleanup();
  });

  afterEach(async () => {
    // Clean up after each test
    await testFactory.cleanup();
  });

  describe('Model', () => {
    it('should create default notification settings', async () => {
      const user = await testFactory.createUser();
      const settings = await NotificationSettings.createDefaultSettings(user.id);

      expect(settings.userId).toBe(user.id);
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
      const user = await testFactory.createUser();

      // First call should create new settings
      const settings1 = await NotificationSettings.getOrCreateDefault(user.id);
      expect(settings1).toBeTruthy();

      // Second call should return existing settings
      const settings2 = await NotificationSettings.getOrCreateDefault(user.id);
      expect(settings2.id).toBe(settings1.id);
    });

    it('should validate quiet hours correctly', async () => {
      const user = await testFactory.createUser();
      const settings = await NotificationSettings.create({
        userId: user.id,
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

      expect(settings.quietHoursStart).toBe('09:00:00');
      expect(settings.quietHoursEnd).toBe('17:00:00');
    });

    it('should reject invalid quiet hours', async () => {
      const user = await testFactory.createUser();
      await expect(
        NotificationSettings.create({
          userId: user.id,
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
      const user = await testFactory.createUser();
      const settings = await NotificationSettings.create({
        userId: user.id,
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
      const user = await testFactory.createUser();
      const settings = await NotificationSettings.create({
        userId: user.id,
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

      const resetSettings = await NotificationSettings.resetToDefaults(user.id);

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
      const user = await testFactory.createUser();
      const settings1 = await notificationSettingsService.getUserSettings(user.id);
      const settings2 = await notificationSettingsService.getUserSettings(user.id);

      // Should return the same instance due to caching
      expect(settings1).toBe(settings2);
    });

    it('should update user settings and invalidate cache', async () => {
      const user = await testFactory.createUser();
      await notificationSettingsService.updateUserSettings(user.id, {
        inAppEnabled: false,
      });

      const settings = await notificationSettingsService.getUserSettings(user.id);
      expect(settings.inAppEnabled).toBe(false);
    });

    it('should validate settings updates', async () => {
      const user = await testFactory.createUser();
      await expect(
        notificationSettingsService.updateUserSettings(user.id, {
          invalidField: 'value',
        })
      ).rejects.toThrow('Invalid field: invalidField');
    });

    it('should check notification preferences correctly', async () => {
      const user = await testFactory.createUser();
      await notificationSettingsService.updateUserSettings(user.id, {
        messageNotifications: false,
      });

      const shouldReceive = await notificationSettingsService.shouldReceiveNotification(
        user.id,
        'message'
      );

      expect(shouldReceive).toBe(false);
    });

    it('should generate preview correctly', async () => {
      const user = await testFactory.createUser();
      const preview = await notificationSettingsService.generatePreview(
        user.id,
        'message',
        'inApp'
      );

      expect(preview).toHaveProperty('notificationType');
      expect(preview).toHaveProperty('channel');
      expect(preview).toHaveProperty('wouldReceive');
      expect(preview).toHaveProperty('reason');
    });

    it('should handle bulk preference checking', async () => {
      const user1 = await testFactory.createUser();
      const user2 = await testFactory.createUser();
      const user3 = await testFactory.createUser();
      const userIds = [user1.id, user2.id, user3.id];
      const preferences = await notificationSettingsService.bulkCheckNotificationPreferences(
        userIds,
        'message'
      );

      expect(Object.keys(preferences)).toHaveLength(3);
      expect(preferences).toHaveProperty(user1.id);
      expect(preferences).toHaveProperty(user2.id);
      expect(preferences).toHaveProperty(user3.id);
    });
  });

  describe('API Endpoints', () => {
    let authToken;
    let testUser;
    let testSettings;

    beforeEach(async () => {
      // Import User model
      const { User } = await import('../src/models/index.js');

      // Create test user first
      testUser = await User.create({
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        passwordHash: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Create notification settings for the user
      testSettings = await NotificationSettings.create({
        userId: testUser.id,
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
        user: { id: testUser.id, username: testUser.username },
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
        user: { id: testUser.id, username: testUser.username },
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
        user: { id: testUser.id, username: testUser.username },
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
        user: { id: testUser.id, username: testUser.username },
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
        user: { id: testUser.id, username: testUser.username },
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
      const user = await testFactory.createUser();

      // 1. Create default settings
      const settings = await NotificationSettings.createDefaultSettings(user.id);
      expect(settings.inAppEnabled).toBe(true);

      // 2. Update settings via service
      await notificationSettingsService.updateUserSettings(user.id, {
        doNotDisturb: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      // 3. Check that preferences are respected
      const shouldReceive = await notificationSettingsService.shouldReceiveNotification(
        user.id,
        'message'
      );
      expect(shouldReceive).toBe(false); // Should be blocked due to DND

      // 4. Reset to defaults
      await notificationSettingsService.resetUserSettings(user.id);

      // 5. Verify reset worked
      const resetSettings = await notificationSettingsService.getUserSettings(user.id);
      expect(resetSettings.doNotDisturb).toBe(false);
      expect(resetSettings.quietHoursStart).toBeNull();
      expect(resetSettings.quietHoursEnd).toBeNull();
    });

    it('should handle quiet hours logic correctly', async () => {
      // Create a test user for quiet hours testing
      const quietHoursUser = await testFactory.createUser({
        firstName: 'Quiet',
        lastName: 'User',
      });

      const settings = await NotificationSettings.create({
        userId: quietHoursUser.id,
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