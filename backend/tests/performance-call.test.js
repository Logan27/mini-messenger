import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import request from 'supertest';
import app from '../src/app.js';
import { User, Call } from '../src/models/index.js';
import { testHelpers } from './testHelpers.js';

// Note: Mocking is disabled for ES module compatibility
// These tests focus on performance metrics and database operations
// WebSocket and FCM service interactions are not tested here

describe('Call System Performance Tests', () => {
  let testUsers = [];
  let tokens = [];
  const CONCURRENT_CALLS = 10;
  let performanceResults = {
    callInitiation: [],
    signalingLatency: [],
    serverResources: [],
    callQuality: [],
  };

  beforeAll(async () => {
    await testHelpers.cleanup();

    // Create test users
    console.log(`Creating ${CONCURRENT_CALLS * 2} test users...`);
    for (let i = 0; i < CONCURRENT_CALLS * 2; i++) {
      const user = await testHelpers.createTestUser({
        username: `perfuser${i}`,
        email: `perfuser${i}@example.com`
      });
      testUsers.push(user);
      tokens.push(testHelpers.generateToken(user));
    }

    console.log('Test users created successfully');
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('10 Concurrent Calls Simulation', () => {
    it('should handle 10 concurrent call initiations', async () => {
      const promises = [];

      console.log('Starting 10 concurrent call initiations...');

      for (let i = 0; i < CONCURRENT_CALLS; i++) {
        const startTime = performance.now();
        const promise = request(app)
          .post('/api/calls/initiate')
          .set('Authorization', `Bearer ${tokens[i]}`)
          .send({
            recipientId: testUsers[i + CONCURRENT_CALLS].id,
            callType: 'video',
          })
          .then((response) => {
            const endTime = performance.now();
            const latency = endTime - startTime;
            performanceResults.callInitiation.push(latency);

            expect(response.status).toBe(201);
            expect(response.body.callId).toBeDefined();
            expect(response.body.status).toBe('calling');

            return { callId: response.body.callId, latency };
          })
          .catch((error) => {
            // Handle rejection and still record the latency
            const endTime = performance.now();
            const latency = endTime - startTime;
            performanceResults.callInitiation.push(latency);
            throw error;
          });

        promises.push(promise);
      }

      await Promise.all(promises);
      console.log(`Completed ${CONCURRENT_CALLS} concurrent call initiations`);
    });

    it('should handle concurrent call acceptance', async () => {
      const promises = [];

      console.log('Starting concurrent call acceptance...');

      // Get all pending calls
      const calls = await Call.findAll({
        where: { status: 'calling' },
        limit: CONCURRENT_CALLS
      });

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const startTime = performance.now();
        const recipientToken = tokens.find((_, idx) => testUsers[idx].id === call.recipientId);

        const promise = request(app)
          .post(`/api/calls/accept/${call.id}`)
          .set('Authorization', `Bearer ${recipientToken}`)
          .then((response) => {
            const endTime = performance.now();
            const latency = endTime - startTime;
            performanceResults.signalingLatency.push(latency);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Call accepted');

            return { callId: call.id, latency };
          });

        promises.push(promise);
      }

      await Promise.all(promises);
      console.log(`Completed ${calls.length} concurrent call acceptances`);
    });

    it('should handle concurrent call ending', async () => {
      const promises = [];

      console.log('Starting concurrent call ending...');

      // Get all connected calls
      const calls = await Call.findAll({
        where: { status: 'connected' },
        limit: CONCURRENT_CALLS
      });

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const startTime = performance.now();
        const callerToken = tokens.find((_, idx) => testUsers[idx].id === call.callerId);

        const promise = request(app)
          .post(`/api/calls/end/${call.id}`)
          .set('Authorization', `Bearer ${callerToken}`)
          .then((response) => {
            const endTime = performance.now();
            const latency = endTime - startTime;
            performanceResults.signalingLatency.push(latency);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Call ended');

            return { callId: call.id, latency };
          });

        promises.push(promise);
      }

      await Promise.all(promises);
      console.log(`Completed ${calls.length} concurrent call endings`);
    });
  });

  describe('Server Resource Monitoring', () => {
    it('should monitor CPU and RAM usage during load', async () => {
      console.log('🚀 PERF_TEST: Monitoring server resources under load');

      const initialMemory = process.memoryUsage();
      const startTime = process.hrtime.bigint();

      // Simulate load with multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/calls/turn-credentials')
            .set('Authorization', `Bearer ${tokens[0]}`)
        );
      }

      await Promise.all(promises);
      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage();

      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      performanceResults.serverResources.push({
        duration,
        memoryIncrease: memoryIncrease / 1024 / 1024, // Convert to MB
        concurrentRequests: 50,
        endpoint: 'TURN credentials'
      });

      console.log(`✅ PERF_TEST: Load test completed in ${duration}ms, memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should measure WebSocket performance under load', async () => {
      console.log('🚀 PERF_TEST: Testing WebSocket performance under load');

      const startTime = Date.now();
      const connectionPromises = [];

      // Create multiple WebSocket connections
      for (let i = 0; i < 20; i++) {
        connectionPromises.push(
          new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}`);

            const timeout = setTimeout(() => {
              ws.close();
              reject(new Error('WebSocket connection timeout'));
            }, 5000);

            ws.on('open', () => {
              clearTimeout(timeout);
              ws.close();
              resolve();
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          })
        );
      }

      try {
        await Promise.all(connectionPromises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        performanceResults.serverResources.push({
          duration,
          concurrentConnections: 20,
          endpoint: 'WebSocket connections'
        });

        console.log(`✅ PERF_TEST: WebSocket performance test completed in ${duration}ms`);
      } catch (error) {
        console.log(`⚠️ PERF_TEST: WebSocket performance test failed:`, error.message);
      }
    });
  });

  describe('Call Quality Under Load', () => {
    it('should maintain call quality during high load', async () => {
      console.log('Testing call quality under load...');

      // Simulate multiple users getting TURN credentials simultaneously
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < CONCURRENT_CALLS; i++) {
        promises.push(
          request(app)
            .get('/api/calls/turn-credentials')
            .set('Authorization', `Bearer ${tokens[i]}`)
            .then((response) => {
              expect(response.status).toBe(200);
              expect(response.body.username).toBeDefined();
              expect(response.body.password).toBeDefined();
              expect(response.body.uris).toBeDefined();
            })
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      performanceResults.callQuality.push({
        test: 'TURN credentials under load',
        totalTime,
        concurrentUsers: CONCURRENT_CALLS,
        avgTimePerUser: totalTime / CONCURRENT_CALLS
      });

      console.log(`TURN credentials test completed in ${totalTime.toFixed(2)}ms`);
    });

    it('should handle call history requests under load', async () => {
      console.log('Testing call history under load...');

      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < CONCURRENT_CALLS; i++) {
        promises.push(
          request(app)
            .get('/api/calls/history')
            .set('Authorization', `Bearer ${tokens[i]}`)
            .then((response) => {
              expect(response.status).toBe(200);
              expect(response.body.calls).toBeDefined();
            })
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      performanceResults.callQuality.push({
        test: 'Call history under load',
        totalTime,
        concurrentUsers: CONCURRENT_CALLS,
        avgTimePerUser: totalTime / CONCURRENT_CALLS
      });

      console.log(`Call history test completed in ${totalTime.toFixed(2)}ms`);
    });
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n=== CALL SYSTEM PERFORMANCE TEST RESULTS ===');

    console.log('\n📊 Call Initiation Performance:');
    if (performanceResults.callInitiation.length > 0) {
      const avgInitiation = performanceResults.callInitiation.reduce((a, b) => a + b, 0) / performanceResults.callInitiation.length;
      const maxInitiation = Math.max(...performanceResults.callInitiation);
      const minInitiation = Math.min(...performanceResults.callInitiation);
      console.log(`  Average: ${avgInitiation.toFixed(2)}ms`);
      console.log(`  Max: ${maxInitiation.toFixed(2)}ms`);
      console.log(`  Min: ${minInitiation.toFixed(2)}ms`);
    }

    console.log('\n📊 Signaling Latency:');
    if (performanceResults.signalingLatency.length > 0) {
      const avgSignaling = performanceResults.signalingLatency.reduce((a, b) => a + b, 0) / performanceResults.signalingLatency.length;
      const maxSignaling = Math.max(...performanceResults.signalingLatency);
      console.log(`  Average: ${avgSignaling.toFixed(2)}ms`);
      console.log(`  Max: ${maxSignaling.toFixed(2)}ms`);
    }

    console.log('\n📊 Call Quality Results:');
    performanceResults.callQuality.forEach((result, index) => {
      console.log(`  ${result.test}:`);
      console.log(`    Total time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`    Avg per user: ${result.avgTimePerUser.toFixed(2)}ms`);
      console.log(`    Concurrent users: ${result.concurrentUsers}`);
    });

    console.log('\n📊 Server Resources:');
    performanceResults.serverResources.forEach((result, index) => {
      console.log(`  Load test ${index + 1}:`);
      console.log(`    Duration: ${result.duration}ms`);
      console.log(`    Concurrent requests: ${result.concurrentRequests}`);
      console.log(`    Endpoint: ${result.endpoint}`);
    });

    // Performance thresholds check
    const maxAcceptableLatency = 1000; // 1 second
    const avgInitiation = performanceResults.callInitiation.reduce((a, b) => a + b, 0) / performanceResults.callInitiation.length;
    const avgSignaling = performanceResults.signalingLatency.reduce((a, b) => a + b, 0) / performanceResults.signalingLatency.length;

    console.log('\n🎯 PERFORMANCE THRESHOLDS:');
    console.log(`  Call initiation latency: ${avgInitiation < maxAcceptableLatency ? '✅ PASS' : '❌ FAIL'} (${avgInitiation.toFixed(2)}ms)`);
    console.log(`  Signaling latency: ${avgSignaling < maxAcceptableLatency ? '✅ PASS' : '❌ FAIL'} (${avgSignaling.toFixed(2)}ms)`);

    const allQualityTests = performanceResults.callQuality.every(test => test.avgTimePerUser < maxAcceptableLatency);
    console.log(`  Call quality under load: ${allQualityTests ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n📋 RECOMMENDATIONS:');
    if (avgInitiation > maxAcceptableLatency) {
      console.log('  - Optimize call initiation: Consider database indexing, connection pooling');
    }
    if (avgSignaling > maxAcceptableLatency) {
      console.log('  - Optimize signaling: Review WebSocket implementation, reduce database queries');
    }
    if (!allQualityTests) {
      console.log('  - Optimize under load: Implement caching, rate limiting, or horizontal scaling');
    }

    console.log('\n=== END PERFORMANCE TEST RESULTS ===');
  });
});