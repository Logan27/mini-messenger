import { User, Session, Call, Message, File, Group, GroupMember, NotificationSettings } from '../src/models/index.js';
import { generateTokens } from '../src/utils/jwt.js';

/**
 * Comprehensive test data factory
 * Provides helper methods to create test data with all required relationships
 */
class TestFactory {
  constructor() {
    this.createdRecords = {
      users: [],
      sessions: [],
      calls: [],
      messages: [],
      files: [],
      groups: [],
      groupMembers: [],
      notificationSettings: [],
    };
  }

  /**
   * Create user data for API registration (no DB record)
   */
  createUserData(overrides = {}) {
    return {
      username: `testuser${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    };
  }

  /**
   * Create user in database
   */
  async createUser(overrides = {}) {
    const userData = {
      username: `testuser${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
      passwordHash: 'TestPassword123!', // Will be hashed by User model's beforeCreate hook
      firstName: 'Test',
      lastName: 'User',
      approvalStatus: 'approved',
      emailVerified: true,
      ...overrides,
    };

    const user = await User.create(userData);
    this.createdRecords.users.push(user);
    return user;
  }

  /**
   * Create user with auth session and tokens
   */
  async createAuthenticatedUser(overrides = {}) {
    const user = await this.createUser(overrides);
    const tokens = generateTokens(user);

    // Create session with real JWT tokens
    const timestamp = Date.now();
    const session = await Session.create({
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(timestamp + 7 * 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    this.createdRecords.sessions.push(session);

    return {
      user,
      session,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      authHeader: `Bearer ${tokens.accessToken}`,
    };
  }

  /**
   * Create admin user
   */
  async createAdmin(overrides = {}) {
    return this.createUser({
      role: 'admin',
      ...overrides,
    });
  }

  /**
   * Create authenticated admin user with session
   */
  async createAuthenticatedAdmin(overrides = {}) {
    return this.createAuthenticatedUser({
      role: 'admin',
      ...overrides,
    });
  }

  /**
   * Create session for user
   */
  async createSession(user) {
    const timestamp = Date.now();
    const session = await Session.create({
      userId: user.id,
      token: `test-token-${timestamp}-${Math.random().toString(36).substring(7)}`,
      refreshToken: `test-refresh-${timestamp}-${Math.random().toString(36).substring(7)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    this.createdRecords.sessions.push(session);
    return session;
  }

  /**
   * Create call between two users
   */
  async createCall(caller, recipient, overrides = {}) {
    const call = await Call.create({
      callerId: caller.id,
      recipientId: recipient.id,
      callType: 'video',
      status: 'calling',
      ...overrides,
    });

    this.createdRecords.calls.push(call);
    return call;
  }

  /**
   * Create message
   */
  async createMessage(sender, recipient = null, overrides = {}) {
    const message = await Message.create({
      senderId: sender.id,
      recipientId: recipient?.id || null,
      content: `Test message ${Date.now()}`,
      messageType: 'text',
      ...overrides,
    });

    this.createdRecords.messages.push(message);
    return message;
  }

  /**
   * Create group
   */
  async createGroup(creator, overrides = {}) {
    const group = await Group.create({
      name: `Test Group ${Date.now()}`,
      description: 'Test group for integration testing',
      creatorId: creator.id,
      isPrivate: false,
      ...overrides,
    });

    this.createdRecords.groups.push(group);

    // Add creator as admin member
    await this.addGroupMember(group, creator, 'admin');

    return group;
  }

  /**
   * Add user to group
   */
  async addGroupMember(group, user, role = 'member') {
    const member = await GroupMember.create({
      groupId: group.id,
      userId: user.id,
      role,
      joinedAt: new Date(),
    });

    this.createdRecords.groupMembers.push(member);
    return member;
  }

  /**
   * Create notification settings for user
   */
  async createNotificationSettings(user, overrides = {}) {
    const settings = await NotificationSettings.create({
      userId: user.id,
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      doNotDisturb: false,
      messageNotifications: true,
      callNotifications: true,
      mentionNotifications: true,
      adminNotifications: true,
      systemNotifications: true,
      ...overrides,
    });

    this.createdRecords.notificationSettings.push(settings);
    return settings;
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    try {
      // Clean up in reverse order of dependencies
      for (const settings of this.createdRecords.notificationSettings) {
        await settings.destroy({ force: true }).catch(() => {});
      }

      for (const member of this.createdRecords.groupMembers) {
        await member.destroy({ force: true }).catch(() => {});
      }

      for (const group of this.createdRecords.groups) {
        await group.destroy({ force: true }).catch(() => {});
      }

      for (const message of this.createdRecords.messages) {
        await message.destroy({ force: true }).catch(() => {});
      }

      for (const file of this.createdRecords.files) {
        await file.destroy({ force: true }).catch(() => {});
      }

      for (const call of this.createdRecords.calls) {
        await call.destroy({ force: true }).catch(() => {});
      }

      for (const session of this.createdRecords.sessions) {
        await session.destroy({ force: true }).catch(() => {});
      }

      for (const user of this.createdRecords.users) {
        await user.destroy({ force: true }).catch(() => {});
      }

      // Reset tracking arrays
      this.createdRecords = {
        users: [],
        sessions: [],
        calls: [],
        messages: [],
        files: [],
        groups: [],
        groupMembers: [],
        notificationSettings: [],
      };
    } catch (error) {
      console.error('Error during factory cleanup:', error);
    }
  }
}

// Export singleton instance
export const testFactory = new TestFactory();
export default testFactory;
