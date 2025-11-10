import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { User, Call } from '../src/models/index.js';
import { testHelpers } from './testHelpers.js';

// Mock the services
jest.mock('../src/services/websocket.js', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  })),
}));

jest.mock('../src/services/fcmService.js', () => ({
  sendPushNotification: jest.fn(),
}));

describe('Call API', () => {
  let user1;
  let user2;
  let token1;
  let token2;

  beforeAll(async () => {
    await testHelpers.cleanup();
    user1 = await testHelpers.createTestUser({ username: 'calluser1', email: 'calluser1@example.com' });
    user2 = await testHelpers.createTestUser({ username: 'calluser2', email: 'calluser2@example.com' });
    token1 = testHelpers.generateToken(user1);
    token2 = testHelpers.generateToken(user2);
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('POST /api/calls/initiate', () => {
    it('should initiate a call successfully', async () => {
      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          recipientId: user2.id,
          callType: 'video',
        })
        .expect(201);

      expect(response.body.callId).toBeDefined();
      expect(response.body.status).toBe('calling');

      const call = await Call.findByPk(response.body.callId);
      expect(call).toBeDefined();
      expect(call.callerId).toBe(user1.id);
      expect(call.recipientId).toBe(user2.id);
    });
  });

  describe('POST /api/calls/:id/accept', () => {
    it('should accept a call successfully', async () => {
      const call = await Call.create({ callerId: user1.id, recipientId: user2.id, callType: 'video', status: 'calling' });

      const response = await request(app)
        .post(`/api/calls/accept/${call.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.message).toBe('Call accepted');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('connected');
    });
  });

  describe('POST /api/calls/:id/reject', () => {
    it('should reject a call successfully', async () => {
      const call = await Call.create({ callerId: user1.id, recipientId: user2.id, callType: 'video', status: 'calling' });

      const response = await request(app)
        .post(`/api/calls/reject/${call.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.message).toBe('Call rejected');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('rejected');
    });
  });

  describe('POST /api/calls/:id/end', () => {
    it('should end a call successfully', async () => {
      const call = await Call.create({ callerId: user1.id, recipientId: user2.id, callType: 'video', status: 'connected', startedAt: new Date() });

      const response = await request(app)
        .post(`/api/calls/end/${call.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.message).toBe('Call ended');

      const updatedCall = await Call.findByPk(call.id);
      expect(updatedCall.status).toBe('ended');
      expect(updatedCall.duration).toBeGreaterThan(0);
    });
  });

  describe('GET /api/calls/turn-credentials', () => {
    it('should return TURN credentials successfully', async () => {
      const response = await request(app)
        .get('/api/calls/turn-credentials')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.username).toBeDefined();
      expect(response.body.password).toBeDefined();
      expect(response.body.uris).toBeDefined();
    });
  });

  describe('GET /api/calls/history', () => {
    it('should return call history successfully', async () => {
      await Call.create({ callerId: user1.id, recipientId: user2.id, callType: 'video', status: 'ended' });

      const response = await request(app)
        .get('/api/calls/history')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.calls).toBeDefined();
      expect(response.body.calls.length).toBe(1);
    });
  });
});
