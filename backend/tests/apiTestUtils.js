import request from 'supertest';
import app from '../src/app.js';

/**
 * API testing utilities for comprehensive endpoint testing
 */
export class APITestUtils {
  constructor() {
    this.app = app;
    this.agent = request.agent(app);
    this.baseUrl = '/api';
  }

  /**
   * Make authenticated API request
   */
  async makeAuthRequest(method, endpoint, authToken, data = null, options = {}) {
    const url = endpoint.startsWith('/api') ? endpoint : `${this.baseUrl}${endpoint}`;
    const req = this.agent[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${authToken}`);

    // Add custom headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req.set(key, value);
      });
    }

    // Add query parameters if provided
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        req.query({ [key]: value });
      });
    }

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
   * Make unauthenticated API request
   */
  async makeRequest(method, endpoint, data = null, options = {}) {
    const url = endpoint.startsWith('/api') ? endpoint : `${this.baseUrl}${endpoint}`;
    const req = this.agent[method.toLowerCase()](url);

    // Add custom headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req.set(key, value);
      });
    }

    // Add query parameters if provided
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        req.query({ [key]: value });
      });
    }

    if (data) {
      if (method.toLowerCase() === 'get') {
        req.query(data);
      } else {
        req.send(data);
      }
    }

    return req;
  }

  // ===== MESSAGE API UTILITIES =====

  /**
   * Send a message via API
   */
  async sendMessage(senderToken, messageData, options = {}) {
    return this.makeAuthRequest('POST', '/messages/send', senderToken, messageData, options);
  }

  /**
   * Get messages via API
   */
  async getMessages(authToken, queryParams = {}, options = {}) {
    return this.makeAuthRequest('GET', '/messages', authToken, null, {
      query: queryParams,
      ...options,
    });
  }

  /**
   * Get conversation between two users
   */
  async getConversation(authToken, otherUserId, queryParams = {}, options = {}) {
    return this.getMessages(authToken, { userId: otherUserId, ...queryParams }, options);
  }

  /**
   * Get group messages
   */
  async getGroupMessages(authToken, groupId, queryParams = {}, options = {}) {
    return this.getMessages(authToken, { groupId, ...queryParams }, options);
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(authToken, messageIds, options = {}) {
    return this.makeAuthRequest('PUT', '/messages/mark-read', authToken, {
      messageIds,
    }, options);
  }

  /**
   * Edit a message
   */
  async editMessage(authToken, messageId, newContent, options = {}) {
    return this.makeAuthRequest('PUT', `/messages/${messageId}`, authToken, {
      content: newContent,
    }, options);
  }

  /**
   * Delete a message
   */
  async deleteMessage(authToken, messageId, deleteType = 'soft', options = {}) {
    return this.makeAuthRequest('DELETE', `/messages/${messageId}`, authToken, {
      deleteType,
    }, options);
  }

  // ===== FILE API UTILITIES =====

  /**
   * Upload a file via API
   */
  async uploadFile(authToken, filePath, fieldName = 'file', options = {}) {
    const req = this.makeAuthRequest('POST', '/files/upload', authToken, {}, options);

    // Attach file to request
    if (filePath) {
      req.attach(fieldName, filePath);
    }

    return req;
  }

  /**
   * Get file info
   */
  async getFile(authToken, fileId, options = {}) {
    return this.makeAuthRequest('GET', `/files/${fileId}`, authToken, null, options);
  }

  /**
   * Download a file
   */
  async downloadFile(authToken, fileId, options = {}) {
    return this.makeAuthRequest('GET', `/files/${fileId}/download`, authToken, null, options);
  }

  /**
   * Delete a file
   */
  async deleteFile(authToken, fileId, options = {}) {
    return this.makeAuthRequest('DELETE', `/files/${fileId}`, authToken, null, options);
  }

  // ===== GROUP API UTILITIES =====

  /**
   * Create a group
   */
  async createGroup(authToken, groupData, options = {}) {
    return this.makeAuthRequest('POST', '/groups', authToken, groupData, options);
  }

  /**
   * Get group info
   */
  async getGroup(authToken, groupId, options = {}) {
    return this.makeAuthRequest('GET', `/groups/${groupId}`, authToken, null, options);
  }

  /**
   * Update group
   */
  async updateGroup(authToken, groupId, updateData, options = {}) {
    return this.makeAuthRequest('PUT', `/groups/${groupId}`, authToken, updateData, options);
  }

  /**
   * Delete group
   */
  async deleteGroup(authToken, groupId, options = {}) {
    return this.makeAuthRequest('DELETE', `/groups/${groupId}`, authToken, null, options);
  }

  /**
   * Join a group
   */
  async joinGroup(authToken, groupId, options = {}) {
    return this.makeAuthRequest('POST', `/groups/${groupId}/join`, authToken, null, options);
  }

  /**
   * Leave a group
   */
  async leaveGroup(authToken, groupId, options = {}) {
    return this.makeAuthRequest('POST', `/groups/${groupId}/leave`, authToken, null, options);
  }

  /**
   * Get group members
   */
  async getGroupMembers(authToken, groupId, options = {}) {
    return this.makeAuthRequest('GET', `/groups/${groupId}/members`, authToken, null, options);
  }

  // ===== USER API UTILITIES =====

  /**
   * Get user profile
   */
  async getUserProfile(authToken, userId = null, options = {}) {
    const endpoint = userId ? `/users/${userId}` : '/users/profile';
    return this.makeAuthRequest('GET', endpoint, authToken, null, options);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(authToken, updateData, options = {}) {
    return this.makeAuthRequest('PUT', '/users/profile', authToken, updateData, options);
  }

  /**
   * Search users
   */
  async searchUsers(authToken, query, options = {}) {
    return this.makeAuthRequest('GET', '/users/search', authToken, null, {
      query: { q: query },
      ...options,
    });
  }

  // ===== AUTHENTICATION UTILITIES =====

  /**
   * Register a new user
   */
  async registerUser(userData, options = {}) {
    return this.makeRequest('POST', '/auth/register', userData, options);
  }

  /**
   * Login user
   */
  async loginUser(credentials, options = {}) {
    return this.makeRequest('POST', '/auth/login', credentials, options);
  }

  /**
   * Logout user
   */
  async logoutUser(authToken, options = {}) {
    return this.makeAuthRequest('POST', '/auth/logout', authToken, null, options);
  }

  /**
   * Refresh token
   */
  async refreshToken(authToken, options = {}) {
    return this.makeAuthRequest('POST', '/auth/refresh', authToken, null, options);
  }

  // ===== UTILITY METHODS =====

  /**
   * Wait for a specified time
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate test file path for different file types
   */
  generateTestFilePath(fileType = 'text') {
    const fileTypes = {
      text: { ext: '.txt', content: 'Test file content' },
      image: { ext: '.png', content: 'fake-png-data' },
      pdf: { ext: '.pdf', content: 'fake-pdf-data' },
      video: { ext: '.mp4', content: 'fake-video-data' },
    };

    const config = fileTypes[fileType] || fileTypes.text;
    return {
      path: `/tmp/test_${fileType}_${Date.now()}${config.ext}`,
      content: config.content,
      mimeType: this.getMimeType(fileType),
    };
  }

  /**
   * Get MIME type for file type
   */
  getMimeType(fileType) {
    const mimeTypes = {
      text: 'text/plain',
      image: 'image/png',
      pdf: 'application/pdf',
      video: 'video/mp4',
    };
    return mimeTypes[fileType] || 'application/octet-stream';
  }

  /**
   * Create test file on disk
   */
  async createTestFile(fileType = 'text') {
    const fs = await import('fs/promises');
    const { path, content } = this.generateTestFilePath(fileType);

    try {
      await fs.writeFile(path, content);
      return path;
    } catch (error) {
      console.error('Error creating test file:', error);
      throw error;
    }
  }

  /**
   * Clean up test file
   */
  async cleanupTestFile(filePath) {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Generate random string for testing
   */
  randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  /**
   * Generate test message content
   */
  generateMessageContent(prefix = 'Test message') {
    return `${prefix} ${Date.now()} ${this.randomString(5)}`;
  }

  /**
   * Validate response structure
   */
  validateResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();

    if (expectedStatus < 400) {
      // Success response should have consistent structure
      if (response.body.success !== false) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
      }
    } else {
      // Error response should have error structure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    }

    return response.body;
  }

  /**
   * Validate message response structure
   */
  validateMessageResponse(responseBody) {
    expect(responseBody).toHaveProperty('id');
    expect(responseBody).toHaveProperty('content');
    expect(responseBody).toHaveProperty('senderId');
    expect(responseBody).toHaveProperty('messageType');
    expect(responseBody).toHaveProperty('createdAt');
    return responseBody;
  }

  /**
   * Validate file response structure
   */
  validateFileResponse(responseBody) {
    expect(responseBody).toHaveProperty('id');
    expect(responseBody).toHaveProperty('filename');
    expect(responseBody).toHaveProperty('originalName');
    expect(responseBody).toHaveProperty('fileSize');
    expect(responseBody).toHaveProperty('mimeType');
    expect(responseBody).toHaveProperty('fileType');
    return responseBody;
  }
}

// Export singleton instance
export const apiTestUtils = new APITestUtils();