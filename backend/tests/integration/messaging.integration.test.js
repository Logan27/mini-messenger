/**
 * Messaging Integration Tests
 * 
 * Tests the messaging API endpoints:
 * - POST /api/messages - Send a message
 * - GET /api/messages - Retrieve conversation messages
 * 
 * Note: Each test creates fresh users to avoid issues with session cleanup
 */

import request from 'supertest';
import app from '../../src/app.js';
import { testFactory } from '../testFactory.js';

describe('Messaging Integration Tests', () => {

  // Helper to create authenticated users
  async function createAuthPair() {
    const senderAuth = await testFactory.createAuthenticatedUser({
      username: `sender${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `sender${Date.now()}${Math.random().toString(36).substring(7)}@test.com`,
    });
    const recipientAuth = await testFactory.createAuthenticatedUser({
      username: `recipient${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `recipient${Date.now()}${Math.random().toString(36).substring(7)}@test.com`,
    });
    return { senderAuth, recipientAuth };
  }

  // Helper to create a group with members
  async function createGroupWithMembers() {
    const adminAuth = await testFactory.createAuthenticatedUser({
      username: `admin${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `admin${Date.now()}${Math.random().toString(36).substring(7)}@test.com`,
    });
    const memberAuth = await testFactory.createAuthenticatedUser({
      username: `member${Date.now()}${Math.random().toString(36).substring(7)}`,
      email: `member${Date.now()}${Math.random().toString(36).substring(7)}@test.com`,
    });
    const group = await testFactory.createGroup(adminAuth.user, {
      name: `TestGroup${Date.now()}`,
    });
    await testFactory.addGroupMember(group, memberAuth.user, 'user');
    return { adminAuth, memberAuth, group };
  }

  describe('POST /api/messages - Send Direct Message', () => {
    it('should send a direct message successfully', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Hello, this is a test message!',
          recipientId: recipientAuth.user.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello, this is a test message!');
      expect(response.body.data.senderId).toBe(senderAuth.user.id);
      expect(response.body.data.recipientId).toBe(recipientAuth.user.id);
    });

    it('should require authentication', async () => {
      const { recipientAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .send({
          content: 'Unauthenticated message',
          recipientId: recipientAuth.user.id,
        });

      expect(response.status).toBe(401);
    });

    it('should require either recipientId or groupId', async () => {
      const { senderAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Message without recipient',
        });

      expect(response.status).toBe(400);
    });

    it('should validate content length (min 1 char)', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: '',
          recipientId: recipientAuth.user.id,
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent recipient', async () => {
      const { senderAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Message to non-existent user',
          recipientId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/messages - Retrieve Messages', () => {
    it('should retrieve conversation messages', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      // Send a message first
      await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Test message for retrieval',
          recipientId: recipientAuth.user.id,
        });

      // Now retrieve
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .query({ conversationWith: recipientAuth.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should require conversationWith or groupId parameter', async () => {
      const { senderAuth } = await createAuthPair();

      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', senderAuth.authHeader);

      expect(response.status).toBe(400);
    });

    it('should return messages with correct structure', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      // Send a message
      await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Message for structure test',
          recipientId: recipientAuth.user.id,
        });

      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .query({ conversationWith: recipientAuth.user.id });

      expect(response.status).toBe(200);
      const message = response.body.data[0];

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('senderId');
      expect(message).toHaveProperty('messageType');
      expect(message).toHaveProperty('createdAt');
    });
  });

  describe('Group Messaging', () => {
    it('should send a group message successfully', async () => {
      const { adminAuth, group } = await createGroupWithMembers();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', adminAuth.authHeader)
        .send({
          content: 'Hello group!',
          groupId: group.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.groupId).toBe(group.id);
    });

    it('should allow group members to send messages', async () => {
      const { memberAuth, group } = await createGroupWithMembers();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', memberAuth.authHeader)
        .send({
          content: 'Message from group member',
          groupId: group.id,
        });

      expect(response.status).toBe(201);
    });

    it('should reject messages from non-members', async () => {
      const { group } = await createGroupWithMembers();
      const outsiderAuth = await testFactory.createAuthenticatedUser({
        username: `outsider${Date.now()}`,
        email: `outsider${Date.now()}@test.com`,
      });

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', outsiderAuth.authHeader)
        .send({
          content: 'Message from non-member',
          groupId: group.id,
        });

      expect(response.status).toBe(403);
    });

    it('should retrieve group messages', async () => {
      const { adminAuth, group } = await createGroupWithMembers();

      // Send a message first
      await request(app)
        .post('/api/messages')
        .set('Authorization', adminAuth.authHeader)
        .send({
          content: 'Group message for retrieval test',
          groupId: group.id,
        });

      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', adminAuth.authHeader)
        .query({ groupId: group.id });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Message Validation', () => {
    it('should accept valid message types', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Message with text type',
          recipientId: recipientAuth.user.id,
          messageType: 'text',
        });

      expect(response.status).toBe(201);
    });

    it('should validate message type enum', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Invalid type message',
          recipientId: recipientAuth.user.id,
          messageType: 'invalid_type',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Reply Messages', () => {
    it('should create a reply to a message', async () => {
      const { senderAuth, recipientAuth } = await createAuthPair();

      // Send original message
      const originalResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', senderAuth.authHeader)
        .send({
          content: 'Original message for reply',
          recipientId: recipientAuth.user.id,
        });

      expect(originalResponse.status).toBe(201);
      const originalMessageId = originalResponse.body.data.id;

      // Send a reply
      const replyResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', recipientAuth.authHeader)
        .send({
          content: 'This is a reply',
          recipientId: senderAuth.user.id,
          replyToId: originalMessageId,
        });

      expect(replyResponse.status).toBe(201);
      expect(replyResponse.body.data.replyToId).toBe(originalMessageId);
    });
  });
});