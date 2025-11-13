import request from 'supertest';
import app from '../src/app.js';
import { User, Session, Group, Announcement, Report, AuditLog } from '../src/models/index.js';

/**
 * Comprehensive Admin API Test Suite
 * Tests all admin endpoints with proper authentication and authorization
 */

describe('Admin API Tests', () => {
  const { factory: testFactory } = global.testUtils;

  beforeEach(async () => {
    await testFactory.cleanup();
  });

  afterEach(async () => {
    await testFactory.cleanup();
  });

  describe('Admin Authentication & Authorization', () => {
    it('should reject admin endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('TOKEN_MISSING');
    });

    it('should reject admin endpoints with regular user token', async () => {
      const regularAuth = await testFactory.createAuthenticatedUser();

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', regularAuth.authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin endpoints with admin token', async () => {
      const adminAuth = await testFactory.createAuthenticatedAdmin();

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const response = await request(app)
          .get('/api/admin/users?page=1&limit=3')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        expect(response.body.data.users.length).toBeLessThanOrEqual(3);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(3);
      });

      it('should support filtering by role', async () => {
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const response = await request(app)
          .get('/api/admin/users?role=admin')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.users.forEach(user => {
          expect(user.role).toBe('admin');
        });
      });

      it('should support filtering by approval status', async () => {
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const pendingUser = await testFactory.createUser({ approvalStatus: 'pending' });

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const pendingUser = await testFactory.createUser({ approvalStatus: 'pending' });

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
            userId: adminAuth.user.id
          }
        });
        expect(auditLog).toBeTruthy();
        expect(auditLog.details.newStatus).toBe('approved');
      });
    });

    describe('PUT /api/admin/users/{userId}/reject', () => {
      it('should reject a pending user', async () => {
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const pendingUser = await testFactory.createUser({ approvalStatus: 'pending' });

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const activeUser = await testFactory.createUser({ approvalStatus: 'approved', status: 'active' });

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const response = await request(app)
          .put(`/api/admin/users/${adminAuth.user.id}/deactivate`)
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const inactiveUser = await testFactory.createUser({ status: 'inactive' });

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
      });
    });
  });

  describe('Admin Statistics', () => {
    describe('GET /api/admin/stats', () => {
      it('should get system statistics', async () => {
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const response = await request(app)
          .get('/api/admin/audit-logs?action=user_approve')
          .set('Authorization', adminAuth.authHeader)
          .expect(200);

        response.body.data.logs.forEach(log => {
          expect(log.action).toBe('user_approve');
        });
      });

      it('should support date range filtering', async () => {
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const reportingUser = await testFactory.createUser();
        const reportedUser = await testFactory.createUser();
        const pendingReport = await Report.create({
          reportedBy: reportingUser.id,
          reportedUser: reportedUser.id,
          reason: 'Test report reason',
          description: 'Test report description',
          status: 'pending',
        });

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const creatorUser = await testFactory.createUser();
        const announcement = await Announcement.create({
          title: 'Test Announcement',
          content: 'Test announcement content',
          type: 'info',
          isActive: true,
          createdBy: creatorUser.id,
        });
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
        const creatorUser = await testFactory.createUser();
        const announcement = await Announcement.create({
          title: 'Test Announcement to Delete',
          content: 'Test announcement content',
          type: 'info',
          isActive: true,
          createdBy: creatorUser.id,
        });

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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
        const adminAuth = await testFactory.createAuthenticatedAdmin();
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
      const adminAuth = await testFactory.createAuthenticatedAdmin();
      const response = await request(app)
        .put('/api/admin/users/99999/approve')
        .set('Authorization', adminAuth.authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should handle invalid user status update', async () => {
      const adminAuth = await testFactory.createAuthenticatedAdmin();
      const user = await testFactory.createUser({ approvalStatus: 'approved' });
      const response = await request(app)
        .put(`/api/admin/users/${user.id}/approve`)
        .set('Authorization', adminAuth.authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      // Should fail because user is already approved
    });

    it('should handle malformed request data', async () => {
      const adminAuth = await testFactory.createAuthenticatedAdmin();
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
      const adminAuth = await testFactory.createAuthenticatedAdmin();
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
      const adminAuth = await testFactory.createAuthenticatedAdmin();
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