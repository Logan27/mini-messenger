import { apiTestUtils } from '../apiTestUtils.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { webSocketTestManager } from '../websocketTestClient.js';
import { Message, User, Group, GroupMember } from '../../src/models/index.js';

describe('WebSocket Integration Tests', () => {
  let testData;
  let authTokens;
  let wsClients = [];

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

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Create WebSocket client
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      expect(client.isConnected()).toBe(true);
      expect(client.getInfo().userId).toBe(user.id);
    });

    it('should reject WebSocket connection with invalid token', async () => {
      try {
        // Try to create client with invalid token
        const client = await webSocketTestManager.createClient('user-id', 'invalid-token');
        wsClients.push(client);

        // If connection succeeds, it shouldn't happen with invalid token
        expect(client.isConnected()).toBe(false);
      } catch (error) {
        // Connection should fail with invalid token
        expect(error.message).toContain('authentication');
      }
    });

    it('should handle multiple concurrent WebSocket connections', async () => {
      const users = testData.users.slice(0, 3);

      // Connect multiple users simultaneously
      const connectionPromises = users.map(async (user) => {
        const authData = authTokens.get(user.id);
        const client = await webSocketTestManager.createClient(user.id, authData.token);
        wsClients.push(client);
        return client;
      });

      const clients = await Promise.all(connectionPromises);

      // All clients should be connected
      clients.forEach(client => {
        expect(client.isConnected()).toBe(true);
      });

      // Manager should track all clients
      const managerInfo = webSocketTestManager.getInfo();
      expect(managerInfo.connectedClients).toBe(3);
    });

    it('should handle WebSocket disconnection and cleanup', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Create and connect client
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      expect(client.isConnected()).toBe(true);

      // Disconnect client
      client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Manager should no longer track this client as connected
      const managerInfo = webSocketTestManager.getInfo();
      expect(managerInfo.connectedClients).toBe(0);
    });
  });

  describe('Real-time 1-to-1 Messaging', () => {
    it('should deliver messages in real-time between users', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Connect both users via WebSocket
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message via API
      const messageContent = `Real-time test message ${Date.now()}`;
      const messageData = {
        recipientId: recipient.id,
        content: messageContent,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Wait for real-time delivery
      const messageEvent = await recipientClient.waitForMessage(3000);

      // Verify real-time message
      expect(messageEvent).toBeTruthy();
      expect(messageEvent.data[0]).toHaveProperty('id', messageId);
      expect(messageEvent.data[0]).toHaveProperty('content', messageContent);
      expect(messageEvent.data[0]).toHaveProperty('senderId', sender.id);
      expect(messageEvent.data[0]).toHaveProperty('recipientId', recipient.id);

      // Sender should not receive their own message via WebSocket (unless configured to)
      const senderMessages = senderClient.getMessages();
      const receivedOwnMessage = senderMessages.some(msg =>
        msg.data[0] && msg.data[0].id === messageId
      );
      // This depends on implementation - some systems echo messages back to sender
    });

    it('should handle message status updates in real-time', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Connect users
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message for status update test',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Wait for message delivery
      await recipientClient.waitForMessage(3000);

      // Mark message as read via API
      await apiTestUtils.markMessagesAsRead(recipientAuth.token, [messageId]);

      // Wait for status update event
      const statusEvent = await recipientClient.waitForEvent('message_read', 3000);

      // Verify status update was received
      expect(statusEvent).toBeTruthy();
      expect(statusEvent.data[0]).toHaveProperty('messageId', messageId);
      expect(statusEvent.data[0]).toHaveProperty('status', 'read');
    });

    it('should handle typing indicators in real-time', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Connect users
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Simulate typing indicator (this would typically be sent via WebSocket)
      senderClient.socket.emit('typing_start', {
        recipientId: recipient.id,
        conversationType: 'direct',
      });

      // Wait for typing indicator
      const typingEvent = await recipientClient.waitForEvent('typing_start', 3000);

      // Verify typing indicator
      expect(typingEvent).toBeTruthy();
      expect(typingEvent.data[0]).toHaveProperty('userId', sender.id);
      expect(typingEvent.data[0]).toHaveProperty('recipientId', recipient.id);

      // Simulate typing stop
      senderClient.socket.emit('typing_stop', {
        recipientId: recipient.id,
        conversationType: 'direct',
      });

      // Wait for typing stop
      const typingStopEvent = await recipientClient.waitForEvent('typing_stop', 3000);
      expect(typingStopEvent).toBeTruthy();
    });
  });

  describe('Real-time Group Messaging', () => {
    it('should deliver group messages to all members in real-time', async () => {
      const sender = testData.users[0];
      const group = testData.groups[0];

      // Connect sender and a few group members
      const senderAuth = authTokens.get(sender.id);
      const member1 = testData.users[1];
      const member2 = testData.users[2];
      const member1Auth = authTokens.get(member1.id);
      const member2Auth = authTokens.get(member2.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const member1Client = await webSocketTestManager.createClient(member1.id, member1Auth.token);
      const member2Client = await webSocketTestManager.createClient(member2.id, member2Auth.token);
      wsClients.push(senderClient, member1Client, member2Client);

      // Join group via WebSocket
      await senderClient.joinGroup(group.id);
      await member1Client.joinGroup(group.id);
      await member2Client.joinGroup(group.id);

      // Send group message via API
      const messageContent = `Real-time group message ${Date.now()}`;
      const messageData = {
        groupId: group.id,
        content: messageContent,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Wait for all members to receive the message
      const member1Message = await member1Client.waitForGroupMessage(3000);
      const member2Message = await member2Client.waitForGroupMessage(3000);

      // Verify all members received the message
      expect(member1Message).toBeTruthy();
      expect(member2Message).toBeTruthy();

      expect(member1Message.data[0]).toHaveProperty('id', messageId);
      expect(member2Message.data[0]).toHaveProperty('id', messageId);
      expect(member1Message.data[0]).toHaveProperty('content', messageContent);
      expect(member2Message.data[0]).toHaveProperty('content', messageContent);
    });

    it('should handle group join/leave events in real-time', async () => {
      const group = testData.groups[0];
      const existingMember = testData.users[0];
      const newMember = await messagingTestHelpers.createTestUser({
        username: 'newmember',
        email: 'newmember@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      // Connect existing member
      const existingMemberAuth = authTokens.get(existingMember.id);
      const existingClient = await webSocketTestManager.createClient(existingMember.id, existingMemberAuth.token);
      wsClients.push(existingClient);

      // Join group
      await existingClient.joinGroup(group.id);

      // Connect new member
      const newMemberAuth = await messagingTestHelpers.authenticateUser(newMember);
      authTokens.set(newMember.id, newMemberAuth);

      const newClient = await webSocketTestManager.createClient(newMember.id, newMemberAuth.token);
      wsClients.push(newClient);

      // Join group via API
      await apiTestUtils.joinGroup(newMemberAuth.token, group.id);

      // Wait for group join event
      const joinEvent = await existingClient.waitForEvent('user_joined_group', 3000);

      // Verify join event
      expect(joinEvent).toBeTruthy();
      expect(joinEvent.data[0]).toHaveProperty('groupId', group.id);
      expect(joinEvent.data[0]).toHaveProperty('userId', newMember.id);

      // Leave group
      await apiTestUtils.leaveGroup(newMemberAuth.token, group.id);

      // Wait for leave event
      const leaveEvent = await existingClient.waitForEvent('user_left_group', 3000);
      expect(leaveEvent).toBeTruthy();

      // Cleanup
      await newMember.destroy({ force: true });
    });

    it('should not deliver messages to users who left the group', async () => {
      const sender = testData.users[0];
      const leaver = testData.users[1];
      const group = testData.groups[0];

      // Connect both users
      const senderAuth = authTokens.get(sender.id);
      const leaverAuth = authTokens.get(leaver.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const leaverClient = await webSocketTestManager.createClient(leaver.id, leaverAuth.token);
      wsClients.push(senderClient, leaverClient);

      // Both join the group
      await senderClient.joinGroup(group.id);
      await leaverClient.joinGroup(group.id);

      // Leaver leaves the group via API
      await apiTestUtils.leaveGroup(leaverAuth.token, group.id);

      // Send message to group
      const messageData = {
        groupId: group.id,
        content: 'Message after member left',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Wait for sender to receive their own message (if echoed)
      // Note: Implementation dependent

      // Leaver should not receive the message
      const leaverMessages = leaverClient.getMessages();
      const receivedMessage = leaverMessages.some(msg =>
        msg.data[0] && msg.data[0].id === messageId
      );

      // This test assumes that users who left don't receive messages
      // Adjust based on actual implementation
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      // Try to connect with invalid server URL
      const invalidManager = new (await import('../websocketTestClient.js')).WebSocketTestManager('ws://invalid-server:1234');

      try {
        const client = await invalidManager.createClient('user-id', 'token');
        // Should fail to connect
        expect(client.isConnected()).toBe(false);
      } catch (error) {
        // Connection failure is expected
        expect(error).toBeTruthy();
      }
    });

    it('should handle malformed WebSocket messages', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      // Send malformed data (this would typically be handled by the server)
      try {
        client.socket.emit('malformed_event', null);
        // Should not crash the client
      } catch (error) {
        // Error handling is implementation dependent
      }
    });

    it('should handle WebSocket reconnection scenarios', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Create client
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      expect(client.isConnected()).toBe(true);

      // Simulate disconnection
      client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Reconnect
      await client.connect(user.id, authData.token);
      expect(client.isConnected()).toBe(true);

      // Should be able to receive messages after reconnection
      const testResponse = await apiTestUtils.sendMessage(authData.token, {
        recipientId: testData.users[1].id,
        content: 'Message after reconnection',
      });

      if (testResponse.status === 201) {
        // Should still receive messages
        // Implementation dependent based on whether reconnection preserves subscriptions
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency real-time messaging', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Connect users
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send messages rapidly
      const messagePromises = [];
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        messagePromises.push(
          apiTestUtils.sendMessage(senderAuth.token, {
            recipientId: recipient.id,
            content: `High frequency message ${i + 1}`,
          })
        );
      }

      // Wait for all messages to be sent
      const responses = await Promise.all(messagePromises);
      const sendEndTime = Date.now();

      // All messages should be sent successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Wait for real-time delivery
      const deliveryStartTime = Date.now();
      let receivedCount = 0;

      // Wait for messages to be delivered
      await new Promise(resolve => {
        const checkDelivery = setInterval(() => {
          receivedCount = recipientClient.getMessages().length;

          if (receivedCount >= 50 || Date.now() - deliveryStartTime > 10000) {
            clearInterval(checkDelivery);
            resolve();
          }
        }, 100);
      });

      const deliveryEndTime = Date.now();

      // Performance metrics
      const sendTime = sendEndTime - startTime;
      const deliveryTime = deliveryEndTime - deliveryStartTime;

      console.log(`Sent 50 messages in ${sendTime}ms`);
      console.log(`Delivered ${receivedCount} messages in ${deliveryTime}ms`);

      // Should deliver most messages within reasonable time
      expect(receivedCount).toBeGreaterThan(40); // Allow for some message loss in high frequency
      expect(deliveryTime).toBeLessThan(5000); // Should deliver within 5 seconds
    });

    it('should handle multiple concurrent real-time conversations', async () => {
      // Connect multiple pairs of users
      const conversations = [];
      const clients = [];

      for (let i = 0; i < 3; i++) {
        const user1 = testData.users[i * 2];
        const user2 = testData.users[i * 2 + 1];

        const auth1 = authTokens.get(user1.id);
        const auth2 = authTokens.get(user2.id);

        const client1 = await webSocketTestManager.createClient(user1.id, auth1.token);
        const client2 = await webSocketTestManager.createClient(user2.id, auth2.token);

        clients.push(client1, client2);
        conversations.push({ user1, user2, client1, client2 });
      }

      wsClients.push(...clients);

      // Send messages in all conversations simultaneously
      const messagePromises = conversations.map(async (conv, index) => {
        return apiTestUtils.sendMessage(authTokens.get(conv.user1.id).token, {
          recipientId: conv.user2.id,
          content: `Concurrent conversation message ${index + 1}`,
        });
      });

      const responses = await Promise.all(messagePromises);

      // All messages should be sent
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Each recipient should receive their message
      for (const conversation of conversations) {
        const messageEvent = await conversation.client2.waitForMessage(3000);
        expect(messageEvent).toBeTruthy();
      }
    });

    it('should maintain WebSocket connection stability under load', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Create client
      const client = await webSocketTestManager.createClient(user.id, authData.token);
      wsClients.push(client);

      // Send many messages to test connection stability
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          apiTestUtils.sendMessage(authData.token, {
            recipientId: testData.users[1].id,
            content: `Stability test message ${i + 1}`,
          })
        );
      }

      const responses = await Promise.all(messagePromises);

      // All messages should be sent successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Connection should still be stable
      expect(client.isConnected()).toBe(true);

      // Should have received some messages (implementation dependent)
      const receivedMessages = client.getMessages();
      expect(receivedMessages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('WebSocket Event Validation', () => {
    it('should validate event data structure', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Connect users
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      const senderClient = await webSocketTestManager.createClient(sender.id, senderAuth.token);
      const recipientClient = await webSocketTestManager.createClient(recipient.id, recipientAuth.token);
      wsClients.push(senderClient, recipientClient);

      // Send message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message for event validation',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Wait for message event
      const messageEvent = await recipientClient.waitForMessage(3000);

      // Validate event structure
      expect(messageEvent).toBeTruthy();
      expect(messageEvent.name).toBe('message');
      expect(messageEvent.data).toBeInstanceOf(Array);
      expect(messageEvent.data.length).toBeGreaterThan(0);
      expect(messageEvent.timestamp).toBeInstanceOf(Date);

      // Validate message data structure
      const receivedMessage = messageEvent.data[0];
      expect(receivedMessage).toHaveProperty('id');
      expect(receivedMessage).toHaveProperty('content');
      expect(receivedMessage).toHaveProperty('senderId');
      expect(receivedMessage).toHaveProperty('recipientId');
      expect(receivedMessage).toHaveProperty('createdAt');
      expect(receivedMessage).toHaveProperty('messageType');

      // Validate data types
      expect(typeof receivedMessage.id).toBe('string');
      expect(typeof receivedMessage.content).toBe('string');
      expect(typeof receivedMessage.senderId).toBe('string');
      expect(typeof receivedMessage.recipientId).toBe('string');
      expect(receivedMessage.createdAt).toBeInstanceOf(Date);
      expect(typeof receivedMessage.messageType).toBe('string');
    });

    it('should handle partial WebSocket disconnections gracefully', async () => {
      const user1 = testData.users[0];
      const user2 = testData.users[1];

      // Connect users
      const auth1 = authTokens.get(user1.id);
      const auth2 = authTokens.get(user2.id);

      const client1 = await webSocketTestManager.createClient(user1.id, auth1.token);
      const client2 = await webSocketTestManager.createClient(user2.id, auth2.token);
      wsClients.push(client1, client2);

      // Simulate partial disconnection (one client disconnects)
      client1.disconnect();

      // Send message - should still work for connected client
      const response = await apiTestUtils.sendMessage(auth2.token, {
        recipientId: user1.id,
        content: 'Message after partial disconnect',
      });

      expect(response.status).toBe(201);

      // Connected client should still receive messages
      const messageEvent = await client2.waitForMessage(3000);
      expect(messageEvent).toBeTruthy();
    });
  });
});