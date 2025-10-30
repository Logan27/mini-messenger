import request from 'supertest';
import app from './src/app.js';
import { User, Session, Group, Announcement, Report, AuditLog } from './src/models/index.js';
import { testHelpers } from './tests/testHelpers.js';

/**
 * Comprehensive Admin API Test Suite
 * Tests all admin endpoints with proper authentication and authorization
 */

describe('Admin API Tests', () => {
  let adminUser, regularUser, adminAuth, regularAuth;
  let testUsers = [];
  let testGroups = [];
  let testAnnouncements = [];
  let testReports = [];

  beforeAll(async () => {
    // Create admin user
    adminUser = await testHelpers.createTestAdmin({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'AdminPass123!',
    });
    adminAuth = await testHelpers.authenticateUser(adminUser);

    // Create regular user
    regularUser = await testHelpers.createTestUser({
      username: 'regularuser',
      email: 'regular@test.com',
      password: 'RegularPass123!',
    });
    regularAuth = await testHelpers.authenticateUser(regularUser);

    // Create additional test users for testing
    for (let i = 0; i < 5; i++) {
      const user = await testHelpers.createTestUser({
        username: `testuser${i}`,
        email: `testuser${i}@test.com`,
        approvalStatus: i % 2 === 0 ? 'pending' : 'approved',
      });
      testUsers.push(user);
    }

    // Create test groups
    for (let i = 0; i < 3; i++) {
      const group = await Group.create({
        name: `Test Group ${i}`,
        description: `Test group description ${i}`,
        isPrivate: i % 2 === 0,
        creatorId: adminUser.id,
      });
      testGroups.push(group);
    }

    // Create test announcements
    for (let i = 0; i < 3; i++) {
      const announcement = await Announcement.create({
        title: `Test Announcement ${i}`,
        content: `Test announcement content ${i}`,
        type: i % 2 === 0 ? 'info' : 'warning',
        isActive: true,
        createdBy: adminUser.id,
      });
      testAnnouncements.push(announcement);
    }

    // Create test reports
    for (let i = 0; i < 3; i++) {
      const report = await Report.create({
        reportedBy: regularUser.id,
        reportedUser: testUsers[i]?.id || regularUser.id,
        reason: `Test report reason ${i}`,
        description: `Test report description ${i}`,
        status: 'pending',
      });
      testReports.push(report);
    }
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('Admin Authentication & Authorization', () => {
    it('should reject admin endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('MISSING_TOKEN');
    });

    it('should reject admin endpoints with regular user token', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', regularAuth.authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin endpoints with admin token', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', adminAuth.authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/admin/users', () => {
      it('should get all users as admin', async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);
        const responseTime = Date.now() - startTime;

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toBeDefined();
        expect(response.body.data.users.length).toBeGreaterThan(0);
        expect(response.body.data.pagination).toBeDefined();
        
        // Check response time is reasonable
        expect(responseTime).toBeLessThan(1000);
        
        // Verify user data structure
        const user = response.body.data.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('approvalStatus');
        expect(user).toHaveProperty('status');
        expect(user).not.toHaveProperty('passwordHash'); // Password should not be exposed
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/admin/users?page=1&limit=3')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.data.users.length).toBeLessThanOrEqual(3);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(3);
      });

      it('should support filtering by role', async () => {
        const response = await request(app)
          .get('/api/admin/users?role=admin')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.users.forEach(user => {
          expect(user.role).toBe('admin');
        });
      });

      it('should support filtering by approval status', async () => {
        const response = await request(app)
          .get('/api/admin/users?approvalStatus=pending')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.users.forEach(user => {
          expect(user.approvalStatus).toBe('pending');
        });
      });
    });

    describe('GET /api/admin/users/pending', () => {
      it('should get pending users', async () => {
        const response = await request(app)
          .get('/api/admin/users/pending')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toBeDefined();
        
        // All returned users should have pending status
        response.body.data.users.forEach(user => {
          expect(user.approvalStatus).toBe('pending');
        });
      });
    });

    describe('PUT /api/admin/users/{userId}/approve', () => {
      it('should approve a pending user', async () => {
        const pendingUser = testUsers.find(u => u.approvalStatus === 'pending');
        expect(pendingUser).toBeDefined();

        const response = await request(app)
          .put(`/api/admin/users/${pendingUser.id}/approve`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            adminNotes: 'Approved after manual review'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.approvalStatus).toBe('approved');

        // Verify user was updated in database
        await pendingUser.reload();
        expect(pendingUser.approvalStatus).toBe('approved');
      });

      it('should log approval action', async () => {
        const pendingUser = testUsers.find(u => u.approvalStatus === 'pending');
        
        await request(app)
          .put(`/api/admin/users/${pendingUser.id}/approve`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            adminNotes: 'Test approval log'
          });

        // Check audit log was created
        const auditLog = await AuditLog.findOne({
          where: {
            action: 'user_approve',
            userId: adminUser.id
          }
        });
        expect(auditLog).toBeTruthy();
        expect(auditLog.details.newStatus).toBe('approved');
      });
    });

    describe('PUT /api/admin/users/{userId}/reject', () => {
      it('should reject a pending user', async () => {
        const pendingUser = testUsers.find(u => u.approvalStatus === 'pending');
        expect(pendingUser).toBeDefined();

        const response = await request(app)
          .put(`/api/admin/users/${pendingUser.id}/reject`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            reason: 'Incomplete profile information',
            adminNotes: 'User did not provide required information'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.approvalStatus).toBe('rejected');

        // Verify user was updated in database
        await pendingUser.reload();
        expect(pendingUser.approvalStatus).toBe('rejected');
      });
    });

    describe('PUT /api/admin/users/{userId}/deactivate', () => {
      it('should deactivate an active user', async () => {
        const activeUser = testUsers.find(u => u.approvalStatus === 'approved' && u.status === 'active');
        expect(activeUser).toBeDefined();

        const response = await request(app)
          .put(`/api/admin/users/${activeUser.id}/deactivate`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            reason: 'Policy violation',
            adminNotes: 'User violated terms of service'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.status).toBe('inactive');

        // Verify user was updated in database
        await activeUser.reload();
        expect(activeUser.status).toBe('inactive');
      });

      it('should prevent deactivating admin users', async () => {
        const response = await request(app)
          .put(`/api/admin/users/${adminUser.id}/deactivate`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            reason: 'Test deactivation'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Cannot deactivate admin');
      });
    });

    describe('PUT /api/admin/users/{userId}/reactivate', () => {
      it('should reactivate an inactive user', async () => {
        const inactiveUser = testUsers.find(u => u.status === 'inactive');
        if (inactiveUser) {
          const response = await request(app)
            .put(`/api/admin/users/${inactiveUser.id}/reactivate`)
            .set('Authorization', adminAuth.authHeader)
            .send({
              adminNotes: 'User has been reviewed and reactivated'
            })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.user.status).toBe('active');

          // Verify user was updated in database
          await inactiveUser.reload();
          expect(inactiveUser.status).toBe('active');
        }
      });
    });
  });

  describe('Admin Statistics', () => {
    describe('GET /api/admin/stats', () => {
      it('should get system statistics', async () => {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/admin/stats')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);
        const responseTime = Date.now() - startTime;

        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toBeDefined();
        
        const stats = response.body.data.statistics;
        expect(stats).toHaveProperty('users');
        expect(stats).toHaveProperty('groups');
        expect(stats).toHaveProperty('messages');
        expect(stats).toHaveProperty('reports');
        
        // Check user statistics
        expect(stats.users).toHaveProperty('total');
        expect(stats.users).toHaveProperty('active');
        expect(stats.users).toHaveProperty('pending');
        expect(stats.users).toHaveProperty('approved');
        expect(stats.users).toHaveProperty('rejected');
        
        // Check response time is reasonable
        expect(responseTime).toBeLessThan(2000);
      });

      it('should include accurate data', async () => {
        const response = await request(app)
          .get('/api/admin/stats')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        const stats = response.body.data.statistics;
        
        // Verify counts match database
        const totalUsers = await User.count();
        expect(stats.users.total).toBe(totalUsers);
        
        const pendingUsers = await User.count({ where: { approvalStatus: 'pending' } });
        expect(stats.users.pending).toBe(pendingUsers);
      });
    });
  });

  describe('Admin Audit Logs', () => {
    describe('GET /api/admin/audit-logs', () => {
      it('should get audit logs', async () => {
        const response = await request(app)
          .get('/api/admin/audit-logs')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.logs).toBeDefined();
        expect(Array.isArray(response.body.data.logs)).toBe(true);
        expect(response.body.data.pagination).toBeDefined();
        
        // Check log structure
        if (response.body.data.logs.length > 0) {
          const log = response.body.data.logs[0];
          expect(log).toHaveProperty('id');
          expect(log).toHaveProperty('action');
          expect(log).toHaveProperty('createdAt');
          expect(log).toHaveProperty('user');
        }
      });

      it('should support filtering by action', async () => {
        const response = await request(app)
          .get('/api/admin/audit-logs?action=user_approve')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.logs.forEach(log => {
          expect(log.action).toBe('user_approve');
        });
      });

      it('should support date range filtering', async () => {
        const today = new Date().toISOString().split('T')[0];
        const response = await request(app)
          .get(`/api/admin/audit-logs?startDate=${today}&endDate=${today}`)
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Admin Reports', () => {
    describe('GET /api/admin/reports', () => {
      it('should get all reports', async () => {
        const response = await request(app)
          .get('/api/admin/reports')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reports).toBeDefined();
        expect(Array.isArray(response.body.data.reports)).toBe(true);
        
        // Check report structure
        if (response.body.data.reports.length > 0) {
          const report = response.body.data.reports[0];
          expect(report).toHaveProperty('id');
          expect(report).toHaveProperty('reason');
          expect(report).toHaveProperty('status');
          expect(report).toHaveProperty('reportedBy');
          expect(report).toHaveProperty('reportedUser');
        }
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/api/admin/reports?status=pending')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.reports.forEach(report => {
          expect(report.status).toBe('pending');
        });
      });
    });

    describe('PUT /api/admin/reports/{reportId}/resolve', () => {
      it('should resolve a report', async () => {
        const pendingReport = testReports.find(r => r.status === 'pending');
        expect(pendingReport).toBeDefined();

        const response = await request(app)
          .put(`/api/admin/reports/${pendingReport.id}/resolve`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            resolution: 'Warning issued to user',
            adminNotes: 'User has been warned about behavior'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.report.status).toBe('resolved');

        // Verify report was updated in database
        await pendingReport.reload();
        expect(pendingReport.status).toBe('resolved');
      });
    });
  });

  describe('Admin Announcements', () => {
    describe('GET /api/admin/announcements', () => {
      it('should get all announcements', async () => {
        const response = await request(app)
          .get('/api/admin/announcements')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.announcements).toBeDefined();
        expect(Array.isArray(response.body.data.announcements)).toBe(true);
        
        // Check announcement structure
        if (response.body.data.announcements.length > 0) {
          const announcement = response.body.data.announcements[0];
          expect(announcement).toHaveProperty('id');
          expect(announcement).toHaveProperty('title');
          expect(announcement).toHaveProperty('content');
          expect(announcement).toHaveProperty('type');
          expect(announcement).toHaveProperty('isActive');
        }
      });
    });

    describe('POST /api/admin/announcements', () => {
      it('should create a new announcement', async () => {
        const announcementData = {
          title: 'System Maintenance',
          content: 'System will be under maintenance from 2AM to 4AM EST',
          type: 'warning',
          isActive: true,
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        };

        const response = await request(app)
          .post('/api/admin/announcements')
          .set('Authorization', adminAuth.authHeader)
          .send(announcementData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.announcement.title).toBe(announcementData.title);
        expect(response.body.data.announcement.content).toBe(announcementData.content);
        expect(response.body.data.announcement.type).toBe(announcementData.type);
      });

      it('should validate announcement data', async () => {
        const response = await request(app)
          .post('/api/admin/announcements')
          .set('Authorization', adminAuth.authHeader)
          .send({
            // Missing required title and content
            type: 'invalid_type'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('PUT /api/admin/announcements/{announcementId}', () => {
      it('should update an announcement', async () => {
        const announcement = testAnnouncements[0];
        const updateData = {
          title: 'Updated Announcement Title',
          content: 'Updated announcement content',
          isActive: false
        };

        const response = await request(app)
          .put(`/api/admin/announcements/${announcement.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.announcement.title).toBe(updateData.title);
        expect(response.body.data.announcement.content).toBe(updateData.content);
        expect(response.body.data.announcement.isActive).toBe(updateData.isActive);
      });
    });

    describe('DELETE /api/admin/announcements/{announcementId}', () => {
      it('should delete an announcement', async () => {
        const announcement = testAnnouncements[testAnnouncements.length - 1];

        const response = await request(app)
          .delete(`/api/admin/announcements/${announcement.id}`)
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify announcement was deleted
        const deletedAnnouncement = await Announcement.findByPk(announcement.id);
        expect(deletedAnnouncement).toBeNull();
      });
    });
  });

  describe('Admin Export Functions', () => {
    describe('GET /api/admin/export/audit-logs/csv', () => {
      it('should export audit logs as CSV', async () => {
        const response = await request(app)
          .get('/api/admin/export/audit-logs/csv')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('id,action,userId');
      });
    });

    describe('GET /api/admin/export/reports/csv', () => {
      it('should export reports as CSV', async () => {
        const response = await request(app)
          .get('/api/admin/export/reports/csv')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('id,reason,status');
      });
    });

    describe('GET /api/admin/export/statistics/csv', () => {
      it('should export statistics as CSV', async () => {
        const response = await request(app)
          .get('/api/admin/export/statistics/csv')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
      });
    });
  });

  describe('Admin System Settings', () => {
    describe('GET /api/admin/settings', () => {
      it('should get system settings', async () => {
        const response = await request(app)
          .get('/api/admin/settings')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settings).toBeDefined();
      });
    });

    describe('PUT /api/admin/settings', () => {
      it('should update system settings', async () => {
        const settingsData = {
          siteName: 'Test Messenger',
          maxUsers: 100,
          allowRegistration: true
        };

        const response = await request(app)
          .put('/api/admin/settings')
          .set('Authorization', adminAuth.authHeader)
          .send(settingsData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settings.siteName).toBe(settingsData.siteName);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user ID', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999/approve')
        .set('Authorization', adminAuth.authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should handle invalid user status update', async () => {
      const user = testUsers[0];
      const response = await request(app)
        .put(`/api/admin/users/${user.id}/approve`)
        .set('Authorization', adminAuth.authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      // Should fail because user is already approved
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/admin/announcements')
        .set('Authorization', adminAuth.authHeader)
        .send({
          title: '', // Empty title should fail validation
          content: 'Test content'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large user list efficiently', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/admin/users?limit=100')
        .set('Authorization', adminAuth.authHeader)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent admin requests', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/admin/stats')
            .set('Authorization', adminAuth.authHeader)
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});