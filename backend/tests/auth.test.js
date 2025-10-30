import request from 'supertest';
import { User, Session } from '../src/models/index.js';
import app from '../src/app.js';
import { testHelpers } from './testHelpers.js';

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean up before each test
    await testHelpers.cleanup();
  });

  afterAll(async () => {
    // Clean up after all tests
    await testHelpers.cleanup();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testHelpers.createTestUser({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.passwordHash).toBeUndefined(); // Should not expose password

      // Check that user was created in database
      const createdUser = await User.findOne({ where: { email: userData.email } });
      expect(createdUser).toBeTruthy();
      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.approvalStatus).toBe('pending'); // Should be pending by default
    });

    it('should not register user with existing email', async () => {
      const userData = testHelpers.createTestUser({
        username: 'user1',
        email: 'existing@example.com',
      });

      // Create user first
      await testHelpers.createTestUser(userData);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          username: 'differentuser', // Different username
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should not register user with existing username', async () => {
      const userData = testHelpers.createTestUser({
        username: 'existinguser',
        email: 'user1@example.com',
      });

      // Create user first
      await testHelpers.createTestUser(userData);

      // Try to register again with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'different@example.com', // Different email
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          // Missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak', // Weak password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('valid email');
    });

    it('should validate username format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Too short
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 3 and 50');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser({
        username: 'logintest',
        email: 'login@example.com',
        password: 'LoginPass123!',
        approvalStatus: 'approved',
        emailVerified: true,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'LoginPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should login successfully with username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'LoginPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for unapproved user', async () => {
      // Create user with pending approval
      const pendingUser = await testHelpers.createTestUser({
        username: 'pendinguser',
        email: 'pending@example.com',
        approvalStatus: 'pending',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: pendingUser.email,
          password: 'PendingPass123!',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('USER_NOT_APPROVED');
    });

    it('should reject login for rejected user', async () => {
      // Create user with rejected status
      const rejectedUser = await testHelpers.createTestUser({
        username: 'rejecteduser',
        email: 'rejected@example.com',
        approvalStatus: 'rejected',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: rejectedUser.email,
          password: 'RejectedPass123!',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('USER_REJECTED');
    });

    it('should track failed login attempts', async () => {
      const user = await testHelpers.createTestUser({
        username: 'trackuser',
        email: 'track@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            identifier: user.email,
            password: 'WrongPassword123!',
          })
          .expect(401);
      }

      // Check that failed attempts were tracked
      await user.reload();
      expect(user.failedLoginAttempts).toBe(3);
    });

    it('should lock account after max failed attempts', async () => {
      const user = await testHelpers.createTestUser({
        username: 'lockuser',
        email: 'lock@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Make maximum failed attempts (5 based on User model)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            identifier: user.email,
            password: 'WrongPassword123!',
          })
          .expect(401);
      }

      // Account should be locked
      await user.reload();
      expect(user.lockedUntil).toBeTruthy();
      expect(user.isLocked()).toBe(true);

      // Login should now fail with account locked error
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.email,
          password: 'LockPass123!', // Correct password but account locked
        })
        .expect(423);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const authData = await testHelpers.authenticateUser(
        await testHelpers.createTestUser({
          username: 'logoutuser',
          email: 'logout@example.com',
          approvalStatus: 'approved',
          emailVerified: true,
        })
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');

      // Session should be invalidated
      const session = await Session.findByPk(authData.session.id);
      expect(session).toBeFalsy(); // Should be deleted
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const authData = await testHelpers.authenticateUser(
        await testHelpers.createTestUser({
          username: 'refreshtest',
          email: 'refresh@example.com',
          approvalStatus: 'approved',
          emailVerified: true,
        })
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', authData.authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const user = await testHelpers.createTestUser({
        username: 'forgotuser',
        email: 'forgot@example.com',
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: user.email,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');

      // Check that reset token was generated
      await user.reload();
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeTruthy();
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200); // Should not reveal if email exists

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('valid email');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const user = await testHelpers.createTestUser({
        username: 'resetuser',
        email: 'reset@example.com',
      });

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const newPassword = 'NewSecurePass123!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');

      // Check that password was changed
      await user.reload();
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpires).toBeNull();

      // Verify new password works
      const isValidPassword = await user.comparePassword(newPassword);
      expect(isValidPassword).toBe(true);
    });

    it('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewSecurePass123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject reset with expired token', async () => {
      const user = await testHelpers.createTestUser({
        username: 'expireduser',
        email: 'expired@example.com',
      });

      // Generate expired reset token
      user.passwordResetToken = 'expired-token';
      user.passwordResetExpires = new Date(Date.now() - 1000); // 1 second ago
      await user.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewSecurePass123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });

    it('should validate password strength', async () => {
      const user = await testHelpers.createTestUser({
        username: 'validateuser',
        email: 'validate@example.com',
      });

      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak', // Weak password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const user = await testHelpers.createTestUser({
        username: 'ratelimit',
        email: 'ratelimit@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              identifier: user.email,
              password: 'WrongPassword123!',
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});