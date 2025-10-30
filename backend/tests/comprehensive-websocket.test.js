import { apiTestUtils } from './apiTestUtils.js';
import { messagingTestHelpers } from './messagingTestHelpers.js';
import { webSocketTestManager, WebSocketTestClient } from './websocketTestClient.js';
import { Message, User, Group, GroupMember, Notification } from '../src/models/index.js';
import { config } from '../src/config/index.js';

describe('Comprehensive WebSocket Tests', () => {
  let testData;
  let authTokens;
  let wsClients = [];
  let testResults = {
    connectionTests: {},
    messagingTests: {},
    notificationTests: {},
    groupTests: {},
    eventTests: {},
    redisTests: {},
    performanceTests: {}
  };

  beforeAll(async () => {
    // Setup test data
    testData = await global.testUtils.setupTestData('comprehensive');
    authTokens = new Map();

    // Get auth tokens for all test users
    for (const user of testData.users) {
      const authData = await messagingTestHelpers.authenticateUser(user);
      authTokens.set(user.id, authData);
    }
  });

  afterAll(async () => {
    // Disconnect all WebSocket clients
    webSocketTestManager.disconnectAll();

    // Cleanup test data
    await global.testUtils.cleanupTestData();
  });

  beforeEach(async () => {
    // Clear any previous events/messages from clients
    for (const client of wsClients) {
      client.clear();
    }
  });

  describe('1. WebSocket Connection Testing', () => {
    test('should establish WebSocket connection successfully', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);
      const startTime = Date.now();

      try {
        const client = await webSocketTestManager.createClient(user.id, authData.token);
        wsClients.push(client);
        
        const connectionTime = Date.now() - startTime;
        
        expect(client.isConnected()).toBe(true);
        expect(client.getInfo().userId).toBe(user.id);
        
        // Check for authentication event
        const authEvent = await client.waitForEvent('authenticated', 2000);
        expect(authEvent).toBeTruthy();
        expect(authEvent.data[0]).toHaveProperty('userId', user.id);
        
        testResults.connectionTests.establishConnection = {
          status: 'PASS',
          connectionTime,
          userId: user.id
        };
      } catch (error) {
        testResults.connectionTests.establishConnection = {
          status: 'FAIL',
          error: error.message
        };
        throw error;
      }
    });

    test('should reject WebSocket connection with invalid token', async () => {
      const startTime = Date.now();
      
      try {
        const client = new WebSocketTestClient();
        await client.connect('user-id', 'invalid-token');
        
        testResults.connectionTests.invalidToken = {
          status: 'FAIL',
          error: 'Connection should have failed with invalid token'
        };
        fail('Connection should have failed with invalid token');
      } catch (error) {
        const responseTime = Date.now() - startTime;
        expect(error.message).toContain('authentication');
        
        testResults.connectionTests.invalidToken = {
          status: 'PASS',
          responseTime,
          error: error.message
        };
      }
    });

    test('should handle multiple concurrent WebSocket connections', async () => {
      const users = testData.users.slice(0, 5);
      const startTime = Date.now();
      const connectionResults = [];

      try {
        // Connect multiple users simultaneously
        const connectionPromises = users.map(async (user, index) => {
          const authData = authTokens.get(user.id);
          const connStart = Date.now();
          
          try {
            const client = await webSocketTestManager.createClient(user.id, authData.token);
            wsClients.push(client);
            
            const connTime = Date.now() - connStart;
            connectionResults.push({ userId: user.id, status: 'SUCCESS', connTime });
            return client;
          } catch (error) {
            connectionResults.push({ userId: user.id, status: 'FAILED', error: error.message });
            throw error;
          }
        });

        const clients = await Promise.all(connectionPromises);
        const totalTime = Date.now() - startTime;

        // All clients should be connected
        clients.forEach(client => {
          expect(client.isConnected()).toBe(true);
        });

        // Manager should track all clients
        const managerInfo = webSocketTestManager.getInfo();
        expect(managerInfo.connectedClients).toBe(5);

        testResults.connectionTests.concurrentConnections = {
          status: 'PASS',
          totalTime,
          connectionResults,
          connectedClients: managerInfo.connectedClients
        };
      } catch (error) {
        testResults.connectionTests.concurrentConnections = {
          status: 'FAIL',
          error: error.message,
          connectionResults
        };
        throw error;
      }
    });

    test('should handle WebSocket disconnection and cleanup', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Create and connect client
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      expect(client.isConnected()).toBe(true);

      // Test heartbeat/ping
      client.socket.emit('heartbeat');
      const pongEvent = await client.waitForEvent('pong', 2000);
      expect(pongEvent).toBeTruthy();

      // Disconnect client
      client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Manager should no longer track this client as connected
      const managerInfo = webSocketTestManager.getInfo();
      const connectedClients = managerInfo.connectedClients.filter(c => c.userId === user.id);
      expect(connectedClients.length).toBe(0);

      testResults.connectionTests.disconnectionCleanup = {
        status: 'PASS',
        heartbeatReceived: !!pongEvent,
        cleanupSuccessful: connectedClients.length === 0
      };
    });

    test('should test connection stability under load', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      const stabilityResults = {
        messagesSent: 0,
        messagesReceived: 0,
        disconnections: 0,
        errors: []
      };

      // Send 1000 messages over 30 seconds to test stability
      const interval = setInterval(() => {
        try {
          client.socket.emit('heartbeat');
          stabilityResults.messagesSent++;
        } catch (error) {
          stabilityResults.errors.push(error.message);
          stabilityResults.disconnections++;
        }
      }, 30);

      // Listen for pong responses
      client.socket.on('pong', () => {
        stabilityResults.messagesReceived++;
      });

      // Listen for disconnects
      client.socket.on('disconnect', () => {
        stabilityResults.disconnections++;
      });

      // Run for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      clearInterval(interval);

      const successRate = (stabilityResults.messagesReceived / stabilityResults.messagesSent) * 100;

      testResults.connectionTests.stabilityUnderLoad = {
        status: successRate > 95 ? 'PASS' : 'FAIL',
        successRate,
        messagesSent: stabilityResults.messagesSent,
        messagesReceived: stabilityResults.messagesReceived,
        disconnections: stabilityResults.disconnections,
        errors: stabilityResults.errors
      };

      expect(successRate).toBeGreaterThan(95);
    });
  });

  describe('2. Real-time Messaging', () => {
    test('should send and receive messages in real-time', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users via WebSocket
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      const messageContent = `Real-time test message ${Date.now()}`;
      const startTime = Date.now();

      // Send message via WebSocket
      senderClient.socket.emit('send_message', {
        recipientId: recipient.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for real-time delivery
      const messageEvent = await recipientClient.waitForMessage(5000);
      const deliveryTime = Date.now() - startTime;

      expect(messageEvent).toBeTruthy();
      expect(messageEvent.data[0]).toHaveProperty('content', messageContent);
      expect(messageEvent.data[0]).toHaveProperty('senderId', sender.id);
      expect(messageEvent.data[0]).toHaveProperty('recipientId', recipient.id);

      testResults.messagingTests.realtimeDelivery = {
        status: 'PASS',
        deliveryTime,
        messageContent,
        senderId: sender.id,
        recipientId: recipient.id
      };
    });

    test('should handle message delivery confirmation', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message
      const messageContent = 'Message for delivery confirmation test';
      senderClient.socket.emit('send_message', {
        recipientId: recipient.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for message delivery
      const messageEvent = await recipientClient.waitForMessage(5000);
      const messageId = messageEvent.data[0].id;

      // Send delivery confirmation
      recipientClient.socket.emit('message_delivered', {
        messageId,
        senderId: sender.id
      });

      // Wait for delivery confirmation on sender side
      const deliveryEvent = await senderClient.waitForEvent('message_delivered', 3000);

      expect(deliveryEvent).toBeTruthy();
      expect(deliveryEvent.data[0]).toHaveProperty('messageId', messageId);

      testResults.messagingTests.deliveryConfirmation = {
        status: 'PASS',
        messageId,
        deliveryReceived: !!deliveryEvent
      };
    });

    test('should handle read receipts', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message
      const messageContent = 'Message for read receipt test';
      senderClient.socket.emit('send_message', {
        recipientId: recipient.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for message delivery
      const messageEvent = await recipientClient.waitForMessage(5000);
      const messageId = messageEvent.data[0].id;

      // Send read receipt
      recipientClient.socket.emit('message_read', {
        messageId,
        senderId: sender.id
      });

      // Wait for read receipt on sender side
      const readEvent = await senderClient.waitForEvent('message_read', 3000);

      expect(readEvent).toBeTruthy();
      expect(readEvent.data[0]).toHaveProperty('messageId', messageId);

      testResults.messagingTests.readReceipts = {
        status: 'PASS',
        messageId,
        readReceived: !!readEvent
      };
    });

    test('should handle high-frequency messaging', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      const messageCount = 100;
      const startTime = Date.now();
      const results = {
        sent: 0,
        received: 0,
        errors: []
      };

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        try {
          senderClient.socket.emit('send_message', {
            recipientId: recipient.id,
            content: `High frequency message ${i + 1}`,
            messageType: 'text'
          });
          results.sent++;
        } catch (error) {
          results.errors.push(error.message);
        }
      }

      // Wait for all messages to be delivered
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          results.received = recipientClient.getMessages().length;
          if (results.received >= messageCount || Date.now() - startTime > 15000) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      const totalTime = Date.now() - startTime;
      const deliveryRate = (results.received / results.sent) * 100;
      const messagesPerSecond = results.received / (totalTime / 1000);

      testResults.messagingTests.highFrequencyMessaging = {
        status: deliveryRate > 90 ? 'PASS' : 'FAIL',
        messageCount,
        sent: results.sent,
        received: results.received,
        deliveryRate,
        totalTime,
        messagesPerSecond,
        errors: results.errors
      };

      expect(deliveryRate).toBeGreaterThan(90);
    });
  });

  describe('3. Real-time Notifications', () => {
    test('should deliver typing indicators in real-time', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      const startTime = Date.now();

      // Send typing indicator
      senderClient.socket.emit('typing', {
        recipientId: recipient.id
      });

      // Wait for typing indicator
      const typingEvent = await recipientClient.waitForEvent('typing', 3000);
      const typingTime = Date.now() - startTime;

      expect(typingEvent).toBeTruthy();
      expect(typingEvent.data[0]).toHaveProperty('userId', sender.id);

      // Send stop typing
      senderClient.socket.emit('stop_typing', {
        recipientId: recipient.id
      });

      // Wait for stop typing
      const stopTypingEvent = await recipientClient.waitForEvent('stop_typing', 3000);

      testResults.notificationTests.typingIndicators = {
        status: 'PASS',
        typingTime,
        typingReceived: !!typingEvent,
        stopTypingReceived: !!stopTypingEvent
      };
    });

    test('should handle online status updates', async () => {
      const user1 = testData.users[0];
      const user2 = testData.users[1];
      const auth1 = authTokens.get(user1.id);
      const auth2 = authTokens.get(user2.id);

      // Connect first user
      const client1 = await webSocketTestManager.createClient(user1.id, auth1.token);
      wsClients.push(client1);

      // Wait for user to come online
      const onlineEvent = await client1.waitForEvent('user_online', 3000);

      // Connect second user and listen for their online status
      const client2 = await webSocketTestManager.createClient(user2.id, auth2.token);
      wsClients.push(client2);

      const user2OnlineEvent = await client1.waitForEvent('user_online', 3000);

      expect(user2OnlineEvent).toBeTruthy();
      expect(user2OnlineEvent.data[0]).toHaveProperty('userId', user2.id);

      // Disconnect second user and check offline status
      client2.disconnect();
      
      const offlineEvent = await client1.waitForEvent('user_offline', 5000);

      testResults.notificationTests.onlineStatus = {
        status: 'PASS',
        onlineEventReceived: !!onlineEvent,
        user2OnlineReceived: !!user2OnlineEvent,
        offlineEventReceived: !!offlineEvent
      };
    });

    test('should handle presence/availability status', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Connect user
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      // Update status to away
      client.socket.emit('user_status_update', {
        status: 'away'
      });

      // Wait for status update confirmation
      const statusEvent = await client.waitForEvent('user_status_update', 3000);

      expect(statusEvent).toBeTruthy();
      expect(statusEvent.data[0]).toHaveProperty('status', 'away');

      // Update status back to online
      client.socket.emit('user_status_update', {
        status: 'online'
      });

      const onlineStatusEvent = await client.waitForEvent('user_status_update', 3000);

      testResults.notificationTests.presenceStatus = {
        status: 'PASS',
        awayStatusReceived: !!statusEvent,
        onlineStatusReceived: !!onlineStatusEvent
      };
    });
  });

  describe('4. Real-time Group Features', () => {
    test('should broadcast group messages to all members', async () => {
      const sender = testData.users[0];
      const group = testData.groups[0];
      const senderAuth = authTokens.get(sender.id);

      // Get group members
      const members = await GroupMember.findAll({
        where: { groupId: group.id, isActive: true },
        include: [{ model: User, as: 'user' }]
      });

      // Connect sender and members
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const memberClients = [];

      for (const member of members) {
        if (member.userId !== sender.id) {
          const memberAuth = authTokens.get(member.userId);
          const memberClient = await webSocketTestManager.createClient(member.userId, memberAuth.token);
          memberClients.push(memberClient);
          wsClients.push(memberClient);
        }
      }

      wsClients.push(senderClient);

      // Join group rooms
      await senderClient.joinGroup(group.id);
      for (const client of memberClients) {
        await client.joinGroup(group.id);
      }

      // Send group message
      const messageContent = `Group message test ${Date.now()}`;
      senderClient.socket.emit('send_group_message', {
        groupId: group.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for all members to receive the message
      const deliveryResults = [];
      for (let i = 0; i < memberClients.length; i++) {
        try {
          const messageEvent = await memberClients[i].waitForGroupMessage(3000);
          deliveryResults.push({
            memberIndex: i,
            received: !!messageEvent,
            message: messageEvent?.data[0]
          });
        } catch (error) {
          deliveryResults.push({
            memberIndex: i,
            received: false,
            error: error.message
          });
        }
      }

      const successCount = deliveryResults.filter(r => r.received).length;
      const successRate = (successCount / memberClients.length) * 100;

      testResults.groupTests.messageBroadcast = {
        status: successRate > 90 ? 'PASS' : 'FAIL',
        groupSize: memberClients.length,
        successCount,
        successRate,
        deliveryResults
      };

      expect(successRate).toBeGreaterThan(90);
    });

    test('should handle member join/leave notifications', async () => {
      const group = testData.groups[0];
      const existingMember = testData.users[0];
      const existingAuth = authTokens.get(existingMember.id);

      // Connect existing member
      const existingClient = await webSocketTestManager.createClient(existingMember.id, existingAuth.token);
      wsClients.push(existingClient);
      await existingClient.joinGroup(group.id);

      // Create a new user
      const newUser = await messagingTestHelpers.createTestUser({
        username: 'newgroupmember',
        email: 'newgroupmember@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Connect new user
      const newAuth = await messagingTestHelpers.authenticateUser(newUser);
      const newClient = await webSocketTestManager.createClient(newUser.id, newAuth.token);
      wsClients.push(newClient);

      // Add new user to group
      await apiTestUtils.addUserToGroup(existingAuth.token, group.id, newUser.id);

      // Wait for join notification
      const joinEvent = await existingClient.waitForEvent('user_joined_group', 3000);

      expect(joinEvent).toBeTruthy();
      expect(joinEvent.data[0]).toHaveProperty('groupId', group.id);
      expect(joinEvent.data[0]).toHaveProperty('userId', newUser.id);

      // Remove user from group
      await apiTestUtils.removeUserFromGroup(existingAuth.token, group.id, newUser.id);

      // Wait for leave notification
      const leaveEvent = await existingClient.waitForEvent('user_left_group', 3000);

      testResults.groupTests.memberJoinLeave = {
        status: 'PASS',
        joinEventReceived: !!joinEvent,
        leaveEventReceived: !!leaveEvent
      };

      // Cleanup
      await newUser.destroy({ force: true });
    });

    test('should handle group typing indicators', async () => {
      const group = testData.groups[0];
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect both users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Join group
      await senderClient.joinGroup(group.id);
      await recipientClient.joinGroup(group.id);

      // Send group typing indicator
      senderClient.socket.emit('typing', {
        groupId: group.id
      });

      // Wait for typing indicator
      const typingEvent = await recipientClient.waitForEvent('typing', 3000);

      expect(typingEvent).toBeTruthy();
      expect(typingEvent.data[0]).toHaveProperty('userId', sender.id);
      expect(typingEvent.data[0]).toHaveProperty('groupId', group.id);

      testResults.groupTests.groupTyping = {
        status: 'PASS',
        typingReceived: !!typingEvent
      };
    });
  });

  describe('5. WebSocket Events', () => {
    test('should validate event payload structure', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Connect users
      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message
      const messageContent = 'Event validation test message';
      senderClient.socket.emit('send_message', {
        recipientId: recipient.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for message event
      const messageEvent = await recipientClient.waitForMessage(3000);

      // Validate event structure
      expect(messageEvent).toBeTruthy();
      expect(messageEvent.name).toBe('message');
      expect(messageEvent.data).toBeInstanceOf(Array);
      expect(messageEvent.timestamp).toBeInstanceOf(Date);

      // Validate message data structure
      const messageData = messageEvent.data[0];
      const requiredFields = ['id', 'content', 'senderId', 'recipientId', 'createdAt', 'messageType'];
      const missingFields = requiredFields.filter(field => !(field in messageData));

      testResults.eventTests.payloadStructure = {
        status: missingFields.length === 0 ? 'PASS' : 'FAIL',
        eventName: messageEvent.name,
        hasData: Array.isArray(messageEvent.data),
        hasTimestamp: messageEvent.timestamp instanceof Date,
        requiredFields,
        missingFields
      };

      expect(missingFields.length).toBe(0);
    });

    test('should handle all WebSocket event types', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Connect user
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      const eventTypes = [
        { name: 'heartbeat', expectedResponse: 'pong' },
        { name: 'user_status_update', data: { status: 'away' } },
        { name: 'typing', data: { recipientId: testData.users[1].id } },
        { name: 'stop_typing', data: { recipientId: testData.users[1].id } }
      ];

      const eventResults = [];

      for (const eventType of eventTypes) {
        try {
          client.socket.emit(eventType.name, eventType.data || {});
          
          if (eventType.expectedResponse) {
            const responseEvent = await client.waitForEvent(eventType.expectedResponse, 2000);
            eventResults.push({
              type: eventType.name,
              status: responseEvent ? 'PASS' : 'FAIL',
              responseReceived: !!responseEvent
            });
          } else {
            // For events that don't have immediate responses, just check no errors
            await new Promise(resolve => setTimeout(resolve, 500));
            eventResults.push({
              type: eventType.name,
              status: 'PASS',
              noErrors: true
            });
          }
        } catch (error) {
          eventResults.push({
            type: eventType.name,
            status: 'FAIL',
            error: error.message
          });
        }
      }

      const passCount = eventResults.filter(r => r.status === 'PASS').length;
      const overallStatus = passCount === eventTypes.length ? 'PASS' : 'FAIL';

      testResults.eventTypes = {
        status: overallStatus,
        totalEvents: eventTypes.length,
        passedEvents: passCount,
        eventResults
      };

      expect(overallStatus).toBe('PASS');
    });

    test('should handle error events gracefully', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Connect user
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      // Send invalid data to trigger error
      client.socket.emit('send_message', {
        // Missing required fields
      });

      // Wait for error event
      const errorEvent = await client.waitForEvent('error', 3000);

      expect(errorEvent).toBeTruthy();
      expect(errorEvent.data[0]).toHaveProperty('type');

      testResults.eventTests.errorHandling = {
        status: 'PASS',
        errorReceived: !!errorEvent,
        errorType: errorEvent?.data[0]?.type
      };
    });
  });

  describe('6. Redis Integration', () => {
    test('should test Redis adapter for WebSocket scaling', async () => {
      if (!config.redis.url) {
        testResults.redisTests.redisAdapter = {
          status: 'SKIP',
          reason: 'Redis not configured'
        };
        return;
      }

      const user1 = testData.users[0];
      const user2 = testData.users[1];
      const auth1 = authTokens.get(user1.id);
      const auth2 = authTokens.get(user2.id);

      // Connect users
      const client1 = await webSocketTestManager.createClient(user1.id, auth1.token);
      const client2 = await webSocketTestManager.createClient(user2.id, auth2.token);
      wsClients.push(client1, client2);

      // Test message delivery through Redis
      const messageContent = 'Redis integration test message';
      client1.socket.emit('send_message', {
        recipientId: user2.id,
        content: messageContent,
        messageType: 'text'
      });

      // Wait for message delivery
      const messageEvent = await client2.waitForMessage(5000);

      testResults.redisTests.redisAdapter = {
        status: messageEvent ? 'PASS' : 'FAIL',
        messageDelivered: !!messageEvent,
        redisConfigured: !!config.redis.url
      };

      expect(messageEvent).toBeTruthy();
    });

    test('should test cross-server message broadcasting', async () => {
      if (!config.redis.url) {
        testResults.redisTests.crossServerBroadcast = {
          status: 'SKIP',
          reason: 'Redis not configured'
        };
        return;
      }

      // This test simulates cross-server broadcasting
      // In a real multi-server setup, this would test actual cross-server communication
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Connect user
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      // Test broadcasting to user's own room
      client.socket.emit('user_status_update', {
        status: 'away'
      });

      // Wait for status update
      const statusEvent = await client.waitForEvent('user_status_update', 3000);

      testResults.redisTests.crossServerBroadcast = {
        status: statusEvent ? 'PASS' : 'FAIL',
        broadcastReceived: !!statusEvent,
        note: 'Simulated cross-server test'
      };

      expect(statusEvent).toBeTruthy();
    });

    test('should check Redis connection health', async () => {
      if (!config.redis.url) {
        testResults.redisTests.redisHealth = {
          status: 'SKIP',
          reason: 'Redis not configured'
        };
        return;
      }

      try {
        const { pingRedis } = await import('../src/config/redis.js');
        const pong = await pingRedis();
        
        testResults.redisTests.redisHealth = {
          status: 'PASS',
          connectionHealthy: pong === 'PONG',
          response: pong
        };

        expect(pong).toBe('PONG');
      } catch (error) {
        testResults.redisTests.redisHealth = {
          status: 'FAIL',
          error: error.message
        };
        throw error;
      }
    });
  });

  describe('7. Performance Testing', () => {
    test('should measure WebSocket latency', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Connect user
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      const latencyMeasurements = [];
      const testCount = 50;

      for (let i = 0; i < testCount; i++) {
        const startTime = process.hrtime.bigint();
        
        client.socket.emit('heartbeat');
        
        await client.waitForEvent('pong', 2000);
        
        const endTime = process.hrtime.bigint();
        const latency = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        latencyMeasurements.push(latency);
      }

      const avgLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
      const minLatency = Math.min(...latencyMeasurements);
      const maxLatency = Math.max(...latencyMeasurements);

      testResults.performanceTests.latency = {
        status: avgLatency < 100 ? 'PASS' : 'FAIL', // Less than 100ms average
        avgLatency,
        minLatency,
        maxLatency,
        testCount,
        measurements: latencyMeasurements
      };

      expect(avgLatency).toBeLessThan(100);
    });

    test('should test concurrent connection performance', async () => {
      const userCount = 20;
      const users = testData.users.slice(0, userCount);
      const startTime = Date.now();

      // Connect all users simultaneously
      const connectionPromises = users.map(async (user) => {
        const authData = authTokens.get(user.id);
        return webSocketTestManager.createClient(user.id, authData.token);
      });

      const clients = await Promise.all(connectionPromises);
      wsClients.push(...clients);

      const connectionTime = Date.now() - startTime;
      const avgConnectionTime = connectionTime / userCount;

      // Test message sending between all connected users
      const messageStartTime = Date.now();
      const messagePromises = [];

      for (let i = 0; i < userCount - 1; i++) {
        messagePromises.push(
          new Promise(async (resolve) => {
            clients[i].socket.emit('send_message', {
              recipientId: users[i + 1].id,
              content: `Concurrent test message ${i}`,
              messageType: 'text'
            });
            
            const messageEvent = await clients[i + 1].waitForMessage(3000);
            resolve(!!messageEvent);
          })
        );
      }

      const messageResults = await Promise.all(messagePromises);
      const messageTime = Date.now() - messageStartTime;
      const successCount = messageResults.filter(r => r).length;

      testResults.performanceTests.concurrentConnections = {
        status: successCount > (userCount - 1) * 0.9 ? 'PASS' : 'FAIL',
        userCount,
        connectionTime,
        avgConnectionTime,
        messageTime,
        messagesSent: messagePromises.length,
        messagesDelivered: successCount,
        successRate: (successCount / messagePromises.length) * 100
      };

      expect(successCount).toBeGreaterThan((userCount - 1) * 0.9);
    });
  });

  // Export test results for documentation
  afterAll(() => {
    global.websocketTestResults = testResults;
  });
});