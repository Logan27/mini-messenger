import request from 'supertest';
import { User, Notification } from '../src/models/index.js';
import notificationService from '../src/services/notificationService.js';
import app from '../src/app.js';
import { testHelpers } from './testHelpers.js';

describe('Notification System', () => {
  let testUser, adminUser, authData;

  beforeEach(async () => {
    // Clean up before each test
    await testHelpers.cleanup();

    // Create test users
    testUser = await testHelpers.createTestUser({
      username: 'notificationuser',
      email: 'notification@example.com',
      approvalStatus: 'approved',
      emailVerified: true,
    });

    adminUser = await testHelpers.createTestUser({
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'admin',
      approvalStatus: 'approved',
      emailVerified: true,
    });

    // Authenticate test user
    authData = await testHelpers.authenticateUser(testUser);
  });

  afterAll(async () => {
    // Clean up after all tests
    await testHelpers.cleanup();
  });

  describe('Notification Model', () => {
    describe('Notification Creation', () => {
      it('should create a notification successfully', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'message',
          title: 'New Message',
          content: 'You have received a new message',
          category: 'message',
          priority: 'medium',
          data: { messageId: 'test-message-id' }
        };

        const notification = await Notification.createNotification(notificationData);

        expect(notification).toBeTruthy();
        expect(notification.id).toBeDefined();
        expect(notification.userId).toBe(testUser.id);
        expect(notification.type).toBe('message');
        expect(notification.title).toBe('New Message');
        expect(notification.content).toBe('You have received a new message');
        expect(notification.category).toBe('message');
        expect(notification.priority).toBe('medium');
        expect(notification.read).toBe(false);
        expect(notification.expiresAt).toBeDefined();
        expect(notification.data.messageId).toBe('test-message-id');
      });

      it('should set default expiration to 30 days', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'system',
          title: 'System Update',
          content: 'System has been updated',
          category: 'system'
        };

        const notification = await Notification.createNotification(notificationData);
        const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        expect(notification.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -1000); // Within 1 second
      });

      it('should validate required fields', async () => {
        await expect(Notification.createNotification({
          userId: testUser.id,
          // Missing type, title, content, category
        })).rejects.toThrow('Missing required notification fields');
      });

      it('should validate notification type', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'invalid_type',
          title: 'Test',
          content: 'Test content',
          category: 'message'
        };

        await expect(Notification.createNotification(notificationData)).rejects.toThrow();
      });

      it('should validate priority level', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'message',
          title: 'Test',
          content: 'Test content',
          category: 'message',
          priority: 'invalid_priority'
        };

        await expect(Notification.createNotification(notificationData)).rejects.toThrow();
      });

      it('should validate category', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'message',
          title: 'Test',
          content: 'Test content',
          category: 'invalid_category'
        };

        await expect(Notification.createNotification(notificationData)).rejects.toThrow();
      });
    });

    describe('Notification Queries', () => {
      beforeEach(async () => {
        // Create test notifications
        await Notification.createNotification({
          userId: testUser.id,
          type: 'message',
          title: 'Message 1',
          content: 'Content 1',
          category: 'message',
          priority: 'high',
          read: false
        });

        await Notification.createNotification({
          userId: testUser.id,
          type: 'call',
          title: 'Call Notification',
          content: 'Missed call',
          category: 'call',
          priority: 'medium',
          read: true
        });

        await Notification.createNotification({
          userId: testUser.id,
          type: 'mention',
          title: 'Mention',
          content: 'You were mentioned',
          category: 'mention',
          priority: 'low',
          read: false
        });
      });

      it('should find notifications by user ID', async () => {
        const notifications = await Notification.findByUserId(testUser.id);

        expect(notifications).toHaveLength(3);
        expect(notifications[0].priority).toBe('high'); // Should be sorted by priority DESC
      });

      it('should filter by read status', async () => {
        const unreadNotifications = await Notification.findByUserId(testUser.id, { read: false });
        const readNotifications = await Notification.findByUserId(testUser.id, { read: true });

        expect(unreadNotifications).toHaveLength(2);
        expect(readNotifications).toHaveLength(1);
      });

      it('should filter by type', async () => {
        const messageNotifications = await Notification.findByUserId(testUser.id, { type: 'message' });

        expect(messageNotifications).toHaveLength(1);
        expect(messageNotifications[0].type).toBe('message');
      });

      it('should filter by priority', async () => {
        const highPriorityNotifications = await Notification.findByUserId(testUser.id, { priority: 'high' });

        expect(highPriorityNotifications).toHaveLength(1);
        expect(highPriorityNotifications[0].priority).toBe('high');
      });

      it('should get unread count', async () => {
        const unreadCount = await Notification.getUnreadCount(testUser.id);

        expect(unreadCount).toBe(2);
      });

      it('should mark all as read', async () => {
        const affectedRows = await Notification.markAllAsRead(testUser.id);

        expect(affectedRows).toBe(2); // 2 unread notifications

        const unreadCount = await Notification.getUnreadCount(testUser.id);
        expect(unreadCount).toBe(0);
      });

      it('should find notification by ID and user', async () => {
        const notifications = await Notification.findByUserId(testUser.id);
        const notificationId = notifications[0].id;

        const foundNotification = await Notification.findByIdAndUser(notificationId, testUser.id);
        expect(foundNotification).toBeTruthy();
        expect(foundNotification.id).toBe(notificationId);
      });

      it('should not find notification for different user', async () => {
        const notifications = await Notification.findByUserId(testUser.id);
        const notificationId = notifications[0].id;

        const foundNotification = await Notification.findByIdAndUser(notificationId, adminUser.id);
        expect(foundNotification).toBeFalsy();
      });
    });

    describe('Notification Instance Methods', () => {
      let notification;

      beforeEach(async () => {
        notification = await Notification.createNotification({
          userId: testUser.id,
          type: 'system',
          title: 'System Notification',
          content: 'System update available',
          category: 'system'
        });
      });

      it('should mark notification as read', async () => {
        expect(notification.read).toBe(false);

        await notification.markAsRead();

        expect(notification.read).toBe(true);
        await notification.reload();
        expect(notification.read).toBe(true);
      });

      it('should mark notification as unread', async () => {
        await notification.markAsRead();
        expect(notification.read).toBe(true);

        await notification.markAsUnread();

        expect(notification.read).toBe(false);
        await notification.reload();
        expect(notification.read).toBe(false);
      });

      it('should check if notification is expired', async () => {
        expect(notification.isExpired()).toBe(false);

        // Set expiration to past date
        notification.expiresAt = new Date(Date.now() - 1000);
        expect(notification.isExpired()).toBe(true);
      });
    });
  });

  describe('Notification Service', () => {
    describe('Rate Limiting', () => {
      it('should allow notification creation within limits', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'message',
          title: 'Test Notification',
          content: 'Test content',
          category: 'message'
        };

        // Should allow within limits
        const rateLimitCheck = notificationService.canCreateNotification(testUser.id);
        expect(rateLimitCheck.allowed).toBe(true);
      });

      it('should track notification creation for rate limiting', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'message',
          title: 'Test Notification',
          content: 'Test content',
          category: 'message'
        };

        // Create notification and check rate limiting is tracked
        const notification = await notificationService.createNotification(notificationData, testUser.id);

        const rateLimitStatus = notificationService.getRateLimitStatus(testUser.id);
        expect(rateLimitStatus.creation.minute.count).toBe(1);
      });

      it('should allow actions within limits', async () => {
        const rateLimitCheck = notificationService.canPerformAction(testUser.id);
        expect(rateLimitCheck.allowed).toBe(true);
      });

      it('should track actions for rate limiting', async () => {
        // Create a notification first
        const notification = await Notification.createNotification({
          userId: testUser.id,
          type: 'message',
          title: 'Test Notification',
          content: 'Test content',
          category: 'message'
        });

        // Perform action and check rate limiting is tracked
        await notificationService.markAsRead(notification.id, testUser.id);

        const rateLimitStatus = notificationService.getRateLimitStatus(testUser.id);
        expect(rateLimitStatus.actions.minute.count).toBe(1);
      });
    });

    describe('Notification Operations', () => {
      let testNotification;

      beforeEach(async () => {
        testNotification = await Notification.createNotification({
          userId: testUser.id,
          type: 'message',
          title: 'Test Notification',
          content: 'Test content',
          category: 'message'
        });
      });

      it('should create notification through service', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'system',
          title: 'Service Notification',
          content: 'Created through service',
          category: 'system'
        };

        const notification = await notificationService.createNotification(notificationData, testUser.id);

        expect(notification).toBeTruthy();
        expect(notification.title).toBe('Service Notification');
      });

      it('should mark notification as read through service', async () => {
        expect(testNotification.read).toBe(false);

        await notificationService.markAsRead(testNotification.id, testUser.id);

        await testNotification.reload();
        expect(testNotification.read).toBe(true);
      });

      it('should mark all notifications as read through service', async () => {
        // Create another unread notification
        await Notification.createNotification({
          userId: testUser.id,
          type: 'call',
          title: 'Another Notification',
          content: 'Another content',
          category: 'call'
        });

        const affectedRows = await notificationService.markAllAsRead(testUser.id);

        expect(affectedRows).toBe(2); // Both notifications should be marked as read

        const unreadCount = await notificationService.getUnreadCount(testUser.id);
        expect(unreadCount).toBe(0);
      });

      it('should delete notification through service', async () => {
        const notificationId = testNotification.id;

        const result = await notificationService.deleteNotification(notificationId, testUser.id);

        expect(result).toBe(true);

        // Verify notification is deleted
        const deletedNotification = await Notification.findByPk(notificationId);
        expect(deletedNotification).toBeFalsy();
      });

      it('should get user notifications through service', async () => {
        const result = await notificationService.getUserNotifications(testUser.id);

        expect(result.notifications).toHaveLength(1);
        expect(result.pagination.totalCount).toBe(1);
        expect(result.pagination.currentPage).toBe(1);
      });
    });
  });

  describe('Notification API Endpoints', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.createNotification({
        userId: testUser.id,
        type: 'message',
        title: 'New Message',
        content: 'You received a message',
        category: 'message',
        priority: 'high',
        read: false
      });

      await Notification.createNotification({
        userId: testUser.id,
        type: 'call',
        title: 'Missed Call',
        content: 'You have a missed call',
        category: 'call',
        priority: 'medium',
        read: true
      });
    });

    describe('GET /api/notifications', () => {
      it('should get user notifications', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.totalCount).toBe(2);
      });

      it('should filter by read status', async () => {
        const response = await request(app)
          .get('/api/notifications?read=false')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].read).toBe(false);
      });

      it('should filter by type', async () => {
        const response = await request(app)
          .get('/api/notifications?type=message')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].type).toBe('message');
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/notifications?page=1&limit=1')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.pagination.currentPage).toBe(1);
        expect(response.body.data.pagination.hasNext).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('MISSING_TOKEN');
      });

      it('should validate query parameters', async () => {
        const response = await request(app)
          .get('/api/notifications?limit=150') // Exceeds max limit
          .set('Authorization', authData.authHeader)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/notifications/unread-count', () => {
      it('should get unread count', async () => {
        const response = await request(app)
          .get('/api/notifications/unread-count')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.unreadCount).toBe(1);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/notifications/unread-count')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        const notifications = await Notification.findByUserId(testUser.id, { read: false });
        const notificationId = notifications[0].id;

        const response = await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('marked as read');

        // Verify in database
        await notifications[0].reload();
        expect(notifications[0].read).toBe(true);
      });

      it('should handle already read notification', async () => {
        const notifications = await Notification.findByUserId(testUser.id, { read: true });
        const notificationId = notifications[0].id;

        const response = await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('already marked as read');
      });

      it('should return 404 for non-existent notification', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';

        const response = await request(app)
          .put(`/api/notifications/${fakeId}/read`)
          .set('Authorization', authData.authHeader)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('NOTIFICATION_NOT_FOUND');
      });

      it('should validate notification ID format', async () => {
        const response = await request(app)
          .put('/api/notifications/invalid-id/read')
          .set('Authorization', authData.authHeader)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/notifications/mark-all-read', () => {
      it('should mark all notifications as read', async () => {
        const response = await request(app)
          .put('/api/notifications/mark-all-read')
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.affectedCount).toBe(1); // Only unread notifications

        // Verify in database
        const unreadCount = await Notification.getUnreadCount(testUser.id);
        expect(unreadCount).toBe(0);
      });

      it('should mark only specific type as read', async () => {
        // Create another notification of different type
        await Notification.createNotification({
          userId: testUser.id,
          type: 'call',
          title: 'Another Call',
          content: 'Another call notification',
          category: 'call',
          read: false
        });

        const response = await request(app)
          .put('/api/notifications/mark-all-read')
          .send({ type: 'call' })
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.type).toBe('call');
      });

      it('should validate request body', async () => {
        const response = await request(app)
          .put('/api/notifications/mark-all-read')
          .send({ type: 'invalid_type' })
          .set('Authorization', authData.authHeader)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /api/notifications/:id', () => {
      it('should delete notification', async () => {
        const notifications = await Notification.findByUserId(testUser.id);
        const notificationId = notifications[0].id;

        const response = await request(app)
          .delete(`/api/notifications/${notificationId}`)
          .set('Authorization', authData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted successfully');

        // Verify in database
        const deletedNotification = await Notification.findByPk(notificationId);
        expect(deletedNotification).toBeFalsy();
      });

      it('should return 404 for non-existent notification', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';

        const response = await request(app)
          .delete(`/api/notifications/${fakeId}`)
          .set('Authorization', authData.authHeader)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('NOTIFICATION_NOT_FOUND');
      });

      it('should validate notification ID format', async () => {
        const response = await request(app)
          .delete('/api/notifications/invalid-id')
          .set('Authorization', authData.authHeader)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/notifications', () => {
      it('should create notification', async () => {
        const notificationData = {
          userId: testUser.id,
          type: 'system',
          title: 'System Notification',
          content: 'System maintenance scheduled',
          category: 'system',
          priority: 'high',
          data: { maintenanceId: 'maint-123' }
        };

        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', authData.authHeader)
          .send(notificationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notification.title).toBe('System Notification');
        expect(response.body.data.notification.priority).toBe('high');
        expect(response.body.data.notification.data.maintenanceId).toBe('maint-123');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', authData.authHeader)
          .send({
            userId: testUser.id,
            // Missing required fields
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });

      it('should validate notification type', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', authData.authHeader)
          .send({
            userId: testUser.id,
            type: 'invalid_type',
            title: 'Test',
            content: 'Test content',
            category: 'message'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });

      it('should validate priority level', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .set('Authorization', authData.authHeader)
          .send({
            userId: testUser.id,
            type: 'message',
            title: 'Test',
            content: 'Test content',
            category: 'message',
            priority: 'invalid_priority'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/notifications/cleanup', () => {
      beforeEach(async () => {
        // Create expired notification
        await Notification.create({
          userId: testUser.id,
          type: 'system',
          title: 'Expired Notification',
          content: 'This should be cleaned up',
          category: 'system',
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        });
      });

      it('should cleanup expired notifications (admin only)', async () => {
        const adminAuthData = await testHelpers.authenticateUser(adminUser);

        const response = await request(app)
          .post('/api/notifications/cleanup')
          .set('Authorization', adminAuthData.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBe(1);
      });

      it('should reject non-admin users', async () => {
        const response = await request(app)
          .post('/api/notifications/cleanup')
          .set('Authorization', authData.authHeader)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('ACCESS_DENIED');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete notification workflow', async () => {
      // 1. Create notification
      const notificationData = {
        userId: testUser.id,
        type: 'message',
        title: 'Integration Test',
        content: 'Testing complete workflow',
        category: 'message'
      };

      const createResponse = await request(app)
        .post('/api/notifications')
        .set('Authorization', authData.authHeader)
        .send(notificationData)
        .expect(201);

      const notificationId = createResponse.body.data.notification.id;

      // 2. Verify notification appears in list
      const listResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(listResponse.body.data.notifications).toHaveLength(3); // 2 existing + 1 new

      // 3. Check unread count
      const unreadResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(unreadResponse.body.data.unreadCount).toBe(2); // 1 existing unread + 1 new

      // 4. Mark as read
      await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', authData.authHeader)
        .expect(200);

      // 5. Verify unread count decreased
      const updatedUnreadResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(updatedUnreadResponse.body.data.unreadCount).toBe(1); // Only the original unread

      // 6. Delete notification
      await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', authData.authHeader)
        .expect(200);

      // 7. Verify notification is deleted
      const finalListResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(finalListResponse.body.data.notifications).toHaveLength(2); // Back to 2 original
    });

    it('should handle rate limiting for notification creation', async () => {
      const notificationData = {
        userId: testUser.id,
        type: 'system',
        title: 'Rate Limit Test',
        content: 'Testing rate limits',
        category: 'system'
      };

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 60; i++) { // Exceed minute limit
        promises.push(
          request(app)
            .post('/api/notifications')
            .set('Authorization', authData.authHeader)
            .send(notificationData)
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Successful requests should be within limits
      const successfulResponses = responses.filter(r => r.status === 201);
      expect(successfulResponses.length).toBeLessThanOrEqual(50); // Should not exceed minute limit
    });
  });
});