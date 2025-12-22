import { Group, GroupMember, Message, File, User } from '../src/models/index.js';
import fileUploadService from '../src/services/fileUploadService.js';
import { generateTokens } from '../src/utils/jwt.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced test helpers specifically for messaging functionality
 */
export class MessagingTestHelpers {
  constructor() {
    this.testGroups = new Map();
    this.testMessages = new Map();
    this.testFiles = new Map();
    this.testWebSocketClients = new Map();
  }

  /**
   * Create a test user (wrapper for testFactory)
   */
  async createTestUser(userData = {}) {
    return await global.testUtils.factory.createUser(userData);
  }

  /**
   * Authenticate a user (wrapper for testFactory)
   */
  async authenticateUser(user) {
    const tokens = generateTokens(user);
    return {
      user,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      authHeader: `Bearer ${tokens.accessToken}`,
    };
  }

  /**
   * Create a test group with members
   */
  async createTestGroup(groupData = {}) {
    const defaultData = {
      name: `TestGroup${Date.now()}`,
      description: 'Test group for integration testing',
      creatorId: groupData.creatorId || groupData.createdBy || null,
      isPrivate: false,
      maxMembers: 20,
      ...groupData,
    };

    const group = await Group.create(defaultData);
    this.testGroups.set(group.id, group);

    // Add creator as first member if specified
    if (defaultData.creatorId) {
      await this.addUserToGroup(group.id, defaultData.creatorId, 'admin');
    }

    return group;
  }

  /**
   * Add a user to a group
   */
  async addUserToGroup(groupId, userId, role = 'user') {
    const [membership] = await GroupMember.findOrCreate({
      where: {
        groupId,
        userId,
      },
      defaults: {
        role,
        joinedAt: new Date(),
      },
    });

    return membership;
  }

  /**
   * Create multiple test users for group messaging
   */
  async createTestGroupMembers(count = 3, groupId = null) {
    const users = [];
    const group = groupId ? await Group.findByPk(groupId) : await this.createTestGroup();

    for (let i = 0; i < count; i++) {
      const user = await global.testUtils.factory.createUser({
        username: `groupmember${i}_${Date.now()}`,
        email: `groupmember${i}_${Date.now()}@example.com`,
        firstName: `Group`,
        lastName: `Member${i}`,
      });

      await this.addUserToGroup(group.id, user.id, i === 0 ? 'admin' : 'user');
      users.push({ user, role: i === 0 ? 'admin' : 'user' });
    }

    return { group, users };
  }

  /**
   * Create a test message
   */
  async createTestMessage(messageData = {}) {
    const defaultData = {
      content: `Test message ${Date.now()}`,
      senderId: null, // Will be set by sender
      recipientId: null, // For 1-to-1 messages
      groupId: null, // For group messages
      messageType: 'text',
      isEncrypted: false,
      encryptionVersion: null,
      ...messageData,
    };

    const message = await Message.create(defaultData);
    this.testMessages.set(message.id, message);

    return message;
  }

  /**
   * Create a test file for upload testing
   */
  async createTestFile(fileData = {}) {
    // Create a temporary test file
    const tempDir = path.join(process.cwd(), 'temp');
    const storedFileName = `stored_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`;
    const originalFileName = fileData.originalName || `testfile_${Date.now()}.txt`;
    const filePath = path.join(tempDir, storedFileName);

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, `Test file content ${Date.now()}`);
    } catch (error) {
      console.error('Error creating test file:', error);
    }

    // Get file size
    let fileSize = 1024;
    try {
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
    } catch {
      // Use default size if stat fails
    }

    // Determine fileType from mimeType
    let fileType = 'document'; // default
    const mimeType = fileData.mimeType || 'text/plain';
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';
    else if (mimeType.startsWith('audio/')) fileType = 'audio';

    const defaultData = {
      filename: storedFileName,
      originalName: originalFileName,
      filePath: filePath,
      fileSize: fileSize,
      mimeType: mimeType,
      fileType: fileType,
      uploaderId: fileData.uploaderId || null, // Must be set by caller or in fileData
      virusScanStatus: 'clean',
      ...fileData,
    };

    // Validate required uploaderId
    if (!defaultData.uploaderId) {
      throw new Error('uploaderId is required to create a test file');
    }

    const fileRecord = await File.create(defaultData);
    this.testFiles.set(fileRecord.id, { record: fileRecord, path: filePath });

    return { record: fileRecord, path: filePath };
  }

  /**
   * Create test file with different types for comprehensive testing
   * @param {string} fileType - Type of file to create
   * @param {string} uploaderId - UUID of the user uploading the file (required)
   */
  async createTestFileByType(fileType = 'text', uploaderId = null) {
    if (!uploaderId) {
      throw new Error('uploaderId is required to create a test file');
    }

    const fileTypes = {
      text: { ext: '.txt', content: 'Test text file content', mime: 'text/plain' },
      image: { ext: '.png', content: 'fake-png-content', mime: 'image/png' },
      pdf: { ext: '.pdf', content: 'fake-pdf-content', mime: 'application/pdf' },
      video: { ext: '.mp4', content: 'fake-video-content', mime: 'video/mp4' },
    };

    const config = fileTypes[fileType] || fileTypes.text;
    const fileName = `test_${fileType}_${Date.now()}${config.ext}`;

    return this.createTestFile({
      originalName: fileName,
      mimeType: config.mime,
      fileSize: config.content.length,
      uploaderId: uploaderId,
    });
  }

  /**
   * Send a message via API (1-to-1)
   */
  async sendMessage(senderAuth, recipientId, content, options = {}) {
    const messageData = {
      recipientId,
      content,
      messageType: 'text',
      ...options,
    };

    const response = await global.testUtils.api.post(
      '/api/messages/send',
      messageData,
      senderAuth.token
    );

    return response;
  }

  /**
   * Send a group message via API
   */
  async sendGroupMessage(senderAuth, groupId, content, options = {}) {
    const messageData = {
      groupId,
      content,
      messageType: 'text',
      ...options,
    };

    const response = await global.testUtils.api.post(
      '/api/messages/send',
      messageData,
      senderAuth.token
    );

    return response;
  }

  /**
   * Upload a file via API
   */
  async uploadFile(senderAuth, filePath, options = {}) {
    const response = await global.testUtils.api.post(
      '/api/files/upload',
      options,
      senderAuth.token
    );

    // Attach file to the request
    if (response.req && response.req.attach) {
      response.req.attach('file', filePath);
    }

    return response;
  }

  /**
   * Get messages via API
   */
  async getMessages(userAuth, options = {}) {
    const query = {
      limit: 50,
      offset: 0,
      ...options,
    };

    const response = await global.testUtils.api.get(
      '/api/messages',
      query,
      userAuth.token
    );

    return response;
  }

  /**
   * Get group messages via API
   */
  async getGroupMessages(userAuth, groupId, options = {}) {
    const query = {
      groupId,
      limit: 50,
      offset: 0,
      ...options,
    };

    const response = await global.testUtils.api.get(
      '/api/messages',
      query,
      userAuth.token
    );

    return response;
  }

  /**
   * WebSocket client for testing real-time features
   */
  createWebSocketClient(userAuth) {
    // Mock WebSocket client for testing
    // In real implementation, this would connect to Socket.IO server
    const client = {
      id: `ws_${Date.now()}`,
      auth: userAuth,
      connected: false,
      messages: [],
      events: [],

      connect: async () => {
        client.connected = true;
        return client;
      },

      disconnect: () => {
        client.connected = false;
      },

      send: (event, data) => {
        client.events.push({ event, data, timestamp: new Date() });
      },

      onMessage: (callback) => {
        client.messageCallback = callback;
      },

      simulateMessage: (message) => {
        if (client.messageCallback) {
          client.messageCallback(message);
        }
        client.messages.push(message);
      },

      getReceivedMessages: () => client.messages,
      getEvents: () => client.events,
    };

    this.testWebSocketClients.set(client.id, client);
    return client;
  }

  /**
   * Enhanced cleanup for messaging tests
   */
  async cleanup() {
    // Clean up WebSocket clients
    for (const client of this.testWebSocketClients.values()) {
      client.disconnect();
    }
    this.testWebSocketClients.clear();

    // Clean up test files
    for (const { path: filePath } of this.testFiles.values()) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.testFiles.clear();

    // Clean up groups and group members
    for (const group of this.testGroups.values()) {
      try {
        await GroupMember.destroy({ where: { groupId: group.id } });
        await group.destroy({ force: true });
      } catch (error) {
        console.error('Error deleting test group:', error);
      }
    }
    this.testGroups.clear();

    // Clean up messages
    for (const message of this.testMessages.values()) {
      try {
        await message.destroy({ force: true });
      } catch (error) {
        console.error('Error deleting test message:', error);
      }
    }
    this.testMessages.clear();

    // Clean up base test data using global testUtils
    if (global.testUtils && global.testUtils.cleanup) {
      await global.testUtils.cleanup();
    }
  }

  /**
   * Wait for WebSocket message
   */
  async waitForWebSocketMessage(client, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkMessages = () => {
        if (client.messages.length > 0) {
          resolve(client.messages[client.messages.length - 1]);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for WebSocket message'));
        } else {
          setTimeout(checkMessages, 100);
        }
      };

      checkMessages();
    });
  }
}

// Export singleton instance
export const messagingTestHelpers = new MessagingTestHelpers();