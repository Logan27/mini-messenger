import { TestHelpers } from './testHelpers.js';
import { Group, GroupMember, Message, File, User } from '../src/models/index.js';
import { fileUploadService } from '../src/services/fileUploadService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced test helpers specifically for messaging functionality
 */
export class MessagingTestHelpers extends TestHelpers {
  constructor() {
    super();
    this.testGroups = new Map();
    this.testMessages = new Map();
    this.testFiles = new Map();
    this.testWebSocketClients = new Map();
  }

  /**
   * Create a test group with members
   */
  async createTestGroup(groupData = {}) {
    const defaultData = {
      name: `TestGroup${Date.now()}`,
      description: 'Test group for integration testing',
      createdBy: null, // Will be set when adding creator
      isPrivate: false,
      maxMembers: 50,
      ...groupData,
    };

    const group = await Group.create(defaultData);
    this.testGroups.set(group.id, group);

    // Add creator as first member if specified
    if (groupData.createdBy) {
      await this.addUserToGroup(group.id, groupData.createdBy, 'admin');
    }

    return group;
  }

  /**
   * Add a user to a group
   */
  async addUserToGroup(groupId, userId, role = 'member') {
    const membership = await GroupMember.create({
      groupId,
      userId,
      role,
      joinedAt: new Date(),
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
      const user = await this.createTestUser({
        username: `groupmember${i}_${Date.now()}`,
        email: `groupmember${i}_${Date.now()}@example.com`,
        firstName: `Group`,
        lastName: `Member${i}`,
      });

      await this.addUserToGroup(group.id, user.id, i === 0 ? 'admin' : 'member');
      users.push({ user, role: i === 0 ? 'admin' : 'member' });
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
    const fileName = `testfile_${Date.now()}.txt`;
    const filePath = path.join(tempDir, fileName);

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, `Test file content ${Date.now()}`);
    } catch (error) {
      console.error('Error creating test file:', error);
    }

    const defaultData = {
      originalName: fileName,
      mimeType: 'text/plain',
      size: 1024,
      uploadedBy: null,
      isPublic: false,
      virusScanStatus: 'clean',
      ...fileData,
    };

    const fileRecord = await File.create(defaultData);
    this.testFiles.set(fileRecord.id, { record: fileRecord, path: filePath });

    return { record: fileRecord, path: filePath };
  }

  /**
   * Create test file with different types for comprehensive testing
   */
  async createTestFileByType(fileType = 'text') {
    const fileTypes = {
      text: { ext: '.txt', content: 'Test text file content', mime: 'text/plain' },
      image: { ext: '.png', content: 'fake-png-content', mime: 'image/png' },
      pdf: { ext: '.pdf', content: 'fake-pdf-content', mime: 'application/pdf' },
      video: { ext: '.mp4', content: 'fake-video-content', mime: 'video/mp4' },
    };

    const config = fileTypes[fileType] || fileTypes.text;
    const fileName = `test_${fileType}_${Date.now()}${config.ext}`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, config.content);
    } catch (error) {
      console.error(`Error creating test ${fileType} file:`, error);
    }

    return this.createTestFile({
      originalName: fileName,
      mimeType: config.mime,
      size: config.content.length,
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

    const response = await this.makeAuthRequest(
      'POST',
      '/api/messages/send',
      senderAuth.token,
      messageData
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

    const response = await this.makeAuthRequest(
      'POST',
      '/api/messages/send',
      senderAuth.token,
      messageData
    );

    return response;
  }

  /**
   * Upload a file via API
   */
  async uploadFile(senderAuth, filePath, options = {}) {
    const response = await this.makeAuthRequest(
      'POST',
      '/api/files/upload',
      senderAuth.token,
      options
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

    const response = await this.makeAuthRequest(
      'GET',
      '/api/messages',
      userAuth.token,
      query
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

    const response = await this.makeAuthRequest(
      'GET',
      '/api/messages',
      userAuth.token,
      query
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

    // Call parent cleanup
    await super.cleanup();
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