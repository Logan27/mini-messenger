import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { User, Call } from '../src/models/index.js';

// Note: Mocking is disabled for ES module compatibility
// These tests focus on API endpoints and database operations
// WebSocket and FCM service interactions are not tested here

describe('Call API', () => {
  const { factory: testFactory } = global.testUtils;

  beforeEach(async () => {
    await testFactory.cleanup();
  });

  afterEach(async () => {
    await testFactory.cleanup();
  });

  describe('POST /api/calls/initiate', () => {
    it('should initiate a call successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();
      const user2Auth = await testFactory.createAuthenticatedUser();

      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', user1Auth.authHeader)
        .send({
          recipientId: user2Auth.user.id,
          callType: 'video',
        })
        .expect(201);

      expect(response.body.callId).toBeDefined();
      expect(response.body.status).toBe('calling');

      const call = await Call.findByPk(response.body.callId);
      expect(call).toBeDefined();
      expect(call.callerId).toBe(user1Auth.user.id);
      expect(call.recipientId).toBe(user2Auth.user.id);
    });
  });

  describe('POST /api/calls/:id/accept', () => {
    it('should accept a call successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();
      const user2Auth = await testFactory.createAuthenticatedUser();

      const call = await testFactory.createCall(user1Auth.user, user2Auth.user, {
        callType: 'video',
        status: 'calling'
      });

      const response = await request(app)
        .post(`/api/calls/accept/${call.id}`)
        .set('Authorization', user2Auth.authHeader)
        .expect(200);

      expect(response.body.message).toBe('Call accepted');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('connected');
    });
  });

  describe('POST /api/calls/:id/reject', () => {
    it('should reject a call successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();
      const user2Auth = await testFactory.createAuthenticatedUser();

      const call = await testFactory.createCall(user1Auth.user, user2Auth.user, {
        callType: 'video',
        status: 'calling'
      });

      const response = await request(app)
        .post(`/api/calls/reject/${call.id}`)
        .set('Authorization', user2Auth.authHeader)
        .expect(200);

      expect(response.body.message).toBe('Call rejected');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('rejected');
    });
  });

  describe('POST /api/calls/:id/end', () => {
    it('should end a call successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();
      const user2Auth = await testFactory.createAuthenticatedUser();

      const call = await testFactory.createCall(user1Auth.user, user2Auth.user, {
        callType: 'video',
        status: 'connected',
        startedAt: new Date()
      });

      const response = await request(app)
        .post(`/api/calls/end/${call.id}`)
        .set('Authorization', user1Auth.authHeader)
        .expect(200);

      expect(response.body.message).toBe('Call ended');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('ended');
      expect(updatedCall.duration).toBeGreaterThan(0);
    });
  });

  describe('GET /api/calls/turn-credentials', () => {
    it('should return TURN credentials successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();

      const response = await request(app)
        .get('/api/calls/turn-credentials')
        .set('Authorization', user1Auth.authHeader)
        .expect(200);

      expect(response.body.username).toBeDefined();
      expect(response.body.password).toBeDefined();
      expect(response.body.uris).toBeDefined();
    });
  });

  describe('GET /api/calls/history', () => {
    it('should return call history successfully', async () => {
      const user1Auth = await testFactory.createAuthenticatedUser();
      const user2Auth = await testFactory.createAuthenticatedUser();

      await testFactory.createCall(user1Auth.user, user2Auth.user, {
        callType: 'video',
        status: 'ended'
      });

      const response = await request(app)
        .get('/api/calls/history')
        .set('Authorization', user1Auth.authHeader)
        .expect(200);

      expect(response.body.calls).toBeDefined();
      expect(response.body.calls.length).toBe(1);
    });
  });
});
