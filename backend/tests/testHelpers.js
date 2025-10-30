import request from 'supertest';
import app from '../src/app.js';
import { User, Session } from '../src/models/index.js';
import { generateTokens } from '../src/utils/jwt.js';

/**
 * Test helper utilities for backend testing
 */
export class TestHelpers {
  constructor() {
    this.app = app;
    this.agent = request.agent(app);
    this.testUsers = new Map();
    this.testSessions = new Map();
  }

  generateToken(user) {
    return generateTokens(user).accessToken;
  }

  /**
   * Create a test user
   */
  async createTestUser(userData = {}) {
    const defaultData = {
      username: `testuser${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      approvalStatus: 'approved',
      emailVerified: true,
      ...userData,
    };

    const user = await User.create(defaultData);
    this.testUsers.set(user.id, user);
    return user;
  }

  /**
   * Create a test admin
   */
  async createTestAdmin(adminData = {}) {
    return this.createTestUser({
      role: 'admin',
      approvalStatus: 'approved',
      emailVerified: true,
      ...adminData,
    });
  }

  /**
   * Create a test session for a user
   */
  async createTestSession(user) {
    const session = await Session.create({
      userId: user.id,
      token: `test-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    this.testSessions.set(session.token, session);
    return session;
  }

  /**
   * Authenticate user and get auth token
   */
  async authenticateUser(user) {
    const session = await this.createTestSession(user);

    return {
      user,
      session,
      token: session.token,
      authHeader: `Bearer ${session.token}`,
    };
  }

  /**
   * Make authenticated request
   */
  async makeAuthRequest(method, url, token, data = null) {
    const req = this.agent[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${token}`);

    if (data) {
      if (method.toLowerCase() === 'get') {
        req.query(data);
      } else {
        req.send(data);
      }
    }

    return req;
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    // Delete test users
    for (const user of this.testUsers.values()) {
      try {
        await user.destroy({ force: true });
      } catch (error) {
        console.error('Error deleting test user:', error);
      }
    }

    // Delete test sessions
    for (const session of this.testSessions.values()) {
      try {
        await session.destroy({ force: true });
      } catch (error) {
        console.error('Error deleting test session:', error);
      }
    }

    this.testUsers.clear();
    this.testSessions.clear();
  }

  /**
   * Wait for async operations
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random string
   */
  randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }
}

// Export singleton instance
export const testHelpers = new TestHelpers();