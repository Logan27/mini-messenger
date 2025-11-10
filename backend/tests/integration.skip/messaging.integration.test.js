import { apiTestUtils } from '../apiTestUtils.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { webSocketTestManager } from '../websocketTestClient.js';
import { Message, User, Group, GroupMember } from '../../src/models/index.js';

describe('Messaging Integration Tests', () => {
  let testData;
  let authTokens;

  beforeAll(async () => {
    // Setup comprehensive test data
    testData = await global.testUtils.setupTestData('comprehensive');
    authTokens = new Map();

    // Get auth tokens for all test users
    for (const user of testData.users) {
      const authData = await messagingTestHelpers.authenticateUser(user);
      authTokens.set(user.id, authData);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await global.testUtils.cleanupTestData();
    webSocketTestManager.disconnectAll();
  });

  describe('1-to-1 Messaging Integration', () => {
    it('should send and receive message between two users', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      const messageContent = apiTestUtils.generateMessageContent('Direct message test');
      const messageData = {
        recipientId: recipient.id,
        content: messageContent,
        messageType: 'text',
      };

      // Send message via API
      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      const responseBody = apiTestUtils.validateResponse(response, 201);
      const sentMessage = apiTestUtils.validateMessageResponse(responseBody.data);

      // Verify message was created in database
      const dbMessage = await Message.findByPk(sentMessage.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username'] },
          { model: User, as: 'recipient', attributes: ['id', 'username'] },
        ],
      });

      expect(dbMessage).toBeTruthy();
      expect(dbMessage.content).toBe(messageContent);
      expect(dbMessage.senderId).toBe(sender.id);
      expect(dbMessage.recipientId).toBe(recipient.id);
      expect(dbMessage.messageType).toBe('text');
      expect(dbMessage.status).toBe('sent');

      // Verify message appears in conversation
      const conversation = await Message.findConversation(sender.id, recipient.id);
      expect(conversation.length).toBeGreaterThan(0);
      expect(conversation.some(msg => msg.id === dbMessage.id)).toBe(true);
    });

    it('should mark messages as delivered when recipient views them', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send a message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message for delivery status test',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Initially message should be 'sent'
      const message = await Message.findByPk(messageId);
      expect(message.status).toBe('sent');

      // Get conversation as recipient (should mark as delivered)
      const recipientAuth = authTokens.get(recipient.id);
      const getResponse = await apiTestUtils.getConversation(recipientAuth.token, sender.id);

      expect(getResponse.status).toBe(200);

      // Message should now be 'delivered'
      await message.reload();
      expect(message.status).toBe('delivered');
    });

    it('should mark messages as read when recipient reads them', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send a message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message for read status test',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Mark message as delivered first
      const recipientAuth = authTokens.get(recipient.id);
      await apiTestUtils.getConversation(recipientAuth.token, sender.id);

      // Mark as read
      const markReadResponse = await apiTestUtils.markMessagesAsRead(
        recipientAuth.token,
        [messageId]
      );

      expect(markReadResponse.status).toBe(200);

      // Verify message is now read
      const message = await Message.findByPk(messageId);
      expect(message.status).toBe('read');
    });

    it('should handle message editing within time limit', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send a message
      const originalContent = 'Original message content';
      const messageData = {
        recipientId: recipient.id,
        content: originalContent,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Edit message within 5-minute limit
      const editedContent = 'Edited message content';
      const editResponse = await apiTestUtils.editMessage(
        senderAuth.token,
        messageId,
        editedContent
      );

      expect(editResponse.status).toBe(200);

      // Verify message was edited
      const message = await Message.findByPk(messageId);
      expect(message.content).toBe(editedContent);
      expect(message.editedAt).toBeTruthy();

      // Verify edit history was created
      const editHistory = await message.getEditHistory();
      expect(editHistory.length).toBe(1);
      expect(editHistory[0].previousContent).toBe(originalContent);
      expect(editHistory[0].newContent).toBe(editedContent);
    });

    it('should prevent editing messages after time limit', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Create message directly in database to bypass time check
      const message = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Old message',
        createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      });

      // Try to edit after 5-minute limit
      const editResponse = await apiTestUtils.editMessage(
        senderAuth.token,
        message.id,
        'Edited content'
      );

      expect(editResponse.status).toBe(400);

      // Message should remain unchanged
      await message.reload();
      expect(message.content).toBe('Old message');
      expect(message.editedAt).toBeNull();
    });

    it('should handle soft delete of messages', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send a message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message to be soft deleted',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Soft delete message
      const deleteResponse = await apiTestUtils.deleteMessage(
        senderAuth.token,
        messageId,
        'soft'
      );

      expect(deleteResponse.status).toBe(200);

      // Verify message is soft deleted
      const message = await Message.findByPk(messageId);
      expect(message.deletedAt).toBeTruthy();
      expect(message.deleteType).toBe('soft');

      // Message should not appear in normal queries
      const conversation = await Message.findConversation(sender.id, recipient.id, {
        includeDeleted: false,
      });
      expect(conversation.some(msg => msg.id === messageId)).toBe(false);

      // But should appear when including deleted
      const conversationWithDeleted = await Message.findConversation(sender.id, recipient.id, {
        includeDeleted: true,
      });
      expect(conversationWithDeleted.some(msg => msg.id === messageId)).toBe(true);
    });

    it('should handle concurrent message sending', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send multiple messages concurrently
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          recipientId: recipient.id,
          content: `Concurrent message ${i + 1}`,
        });
      }

      const promises = messages.map(messageData =>
        apiTestUtils.sendMessage(senderAuth.token, messageData)
      );

      const responses = await Promise.all(promises);

      // All messages should be sent successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
        apiTestUtils.validateMessageResponse(response.body.data);
      });

      // Verify all messages exist in database
      const conversation = await Message.findConversation(sender.id, recipient.id);
      expect(conversation.length).toBeGreaterThanOrEqual(10);

      // Messages should be in correct order
      const recentMessages = conversation.slice(-10);
      for (let i = 0; i < recentMessages.length; i++) {
        expect(recentMessages[i].content).toBe(`Concurrent message ${i + 1}`);
      }
    });

    it('should enforce rate limiting on message sending', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      const messageData = {
        recipientId: recipient.id,
        content: 'Rate limit test message',
      };

      // Send messages rapidly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 150; i++) { // Exceed rate limit
        promises.push(apiTestUtils.sendMessage(senderAuth.token, messageData));
      }

      const responses = await Promise.allSettled(promises);

      // Some requests should be rate limited
      const rateLimited = responses.filter(result =>
        result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should validate message content and length', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Test empty message
      const emptyResponse = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: recipient.id,
        content: '',
      });
      expect(emptyResponse.status).toBe(400);

      // Test message too long
      const longContent = 'a'.repeat(10001); // Exceed 10000 char limit
      const longResponse = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: recipient.id,
        content: longContent,
      });
      expect(longResponse.status).toBe(400);

      // Test message with valid length
      const validResponse = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: recipient.id,
        content: 'Valid message content',
      });
      expect(validResponse.status).toBe(201);
    });
  });

  describe('Group Messaging Integration', () => {
    it('should send message to group and notify all members', async () => {
      const sender = testData.users[0];
      const group = testData.groups[0];
      const senderAuth = authTokens.get(sender.id);

      // Verify sender is a member of the group
      const membership = await GroupMember.findOne({
        where: { groupId: group.id, userId: sender.id, isActive: true },
      });
      expect(membership).toBeTruthy();

      const messageContent = `Group message test ${Date.now()}`;
      const messageData = {
        groupId: group.id,
        content: messageContent,
        messageType: 'text',
      };

      // Send group message via API
      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      const responseBody = apiTestUtils.validateResponse(response, 201);
      const sentMessage = apiTestUtils.validateMessageResponse(responseBody.data);

      // Verify message was created in database
      const dbMessage = await Message.findByPk(sentMessage.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username'] },
          { model: Group, as: 'group', attributes: ['id', 'name'] },
        ],
      });

      expect(dbMessage).toBeTruthy();
      expect(dbMessage.content).toBe(messageContent);
      expect(dbMessage.senderId).toBe(sender.id);
      expect(dbMessage.groupId).toBe(group.id);
      expect(dbMessage.recipientId).toBeNull();

      // Verify message appears in group messages
      const groupMessages = await Message.findGroupMessages(group.id);
      expect(groupMessages.length).toBeGreaterThan(0);
      expect(groupMessages.some(msg => msg.id === dbMessage.id)).toBe(true);

      // Verify group lastMessageAt was updated
      await group.reload();
      expect(group.lastMessageAt).toBeTruthy();
    });

    it('should prevent non-members from sending group messages', async () => {
      // Create a user who is not a member of any group
      const nonMember = await messagingTestHelpers.createTestUser({
        username: 'nonmember',
        email: 'nonmember@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      const authData = await messagingTestHelpers.authenticateUser(nonMember);
      const group = testData.groups[0];

      const messageData = {
        groupId: group.id,
        content: 'Message from non-member',
      };

      const response = await apiTestUtils.sendMessage(authData.token, messageData);
      expect(response.status).toBe(403);

      // Cleanup
      await nonMember.destroy({ force: true });
    });

    it('should retrieve group messages with pagination', async () => {
      const user = testData.users[0];
      const group = testData.groups[0];
      const authToken = authTokens.get(user.id);

      // Get first page of messages
      const page1Response = await apiTestUtils.getGroupMessages(
        authToken,
        group.id,
        { limit: 5, offset: 0 }
      );

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.messages.length).toBeLessThanOrEqual(5);

      if (page1Response.body.data.messages.length === 5) {
        // Get second page if first page is full
        const page2Response = await apiTestUtils.getGroupMessages(
          authToken,
          group.id,
          { limit: 5, offset: 5 }
        );

        expect(page2Response.status).toBe(200);
        expect(page2Response.body.data.messages.length).toBeLessThanOrEqual(5);

        // Messages should be different between pages
        const page1Ids = page1Response.body.data.messages.map(m => m.id);
        const page2Ids = page2Response.body.data.messages.map(m => m.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should handle user joining and leaving groups', async () => {
      // Create a new group
      const creator = testData.users[0];
      const creatorAuth = authTokens.get(creator.id);

      const groupData = {
        name: 'Test Join/Leave Group',
        description: 'Group for testing join/leave functionality',
        groupType: 'public',
      };

      const createResponse = await apiTestUtils.createGroup(creatorAuth.token, groupData);
      expect(createResponse.status).toBe(201);
      const groupId = createResponse.body.data.id;

      // Create a user to join the group
      const joiner = await messagingTestHelpers.createTestUser({
        username: 'joiner',
        email: 'joiner@example.com',
        approvalStatus: 'approved',
        emailVerified: true,
      });

      const joinerAuth = await messagingTestHelpers.authenticateUser(joiner);

      // Join the group
      const joinResponse = await apiTestUtils.joinGroup(joinerAuth.token, groupId);
      expect(joinResponse.status).toBe(200);

      // Verify membership
      const membership = await GroupMember.findOne({
        where: { groupId, userId: joiner.id, isActive: true },
      });
      expect(membership).toBeTruthy();

      // Send a message to the group
      const messageResponse = await apiTestUtils.sendMessage(joinerAuth.token, {
        groupId,
        content: 'Message from new group member',
      });
      expect(messageResponse.status).toBe(201);

      // Leave the group
      const leaveResponse = await apiTestUtils.leaveGroup(joinerAuth.token, groupId);
      expect(leaveResponse.status).toBe(200);

      // Verify membership is inactive
      await membership.reload();
      expect(membership.isActive).toBe(false);
      expect(membership.leftAt).toBeTruthy();

      // Should not be able to send messages after leaving
      const messageAfterLeaveResponse = await apiTestUtils.sendMessage(joinerAuth.token, {
        groupId,
        content: 'Message after leaving group',
      });
      expect(messageAfterLeaveResponse.status).toBe(403);

      // Cleanup
      await joiner.destroy({ force: true });
    });
  });

  describe('Message Retrieval Integration', () => {
    it('should retrieve conversation history between users', async () => {
      const user1 = testData.users[0];
      const user2 = testData.users[1];
      const authToken = authTokens.get(user1.id);

      const response = await apiTestUtils.getConversation(authToken, user2.id, {
        limit: 50,
        offset: 0,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messages');
      expect(Array.isArray(response.body.data.messages)).toBe(true);

      // Verify message structure
      if (response.body.data.messages.length > 0) {
        response.body.data.messages.forEach(message => {
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('content');
          expect(message).toHaveProperty('senderId');
          expect(message).toHaveProperty('recipientId');
          expect(message).toHaveProperty('createdAt');
        });
      }
    });

    it('should retrieve group message history', async () => {
      const user = testData.users[0];
      const group = testData.groups[0];
      const authToken = authTokens.get(user.id);

      const response = await apiTestUtils.getGroupMessages(authToken, group.id, {
        limit: 50,
        offset: 0,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messages');
      expect(Array.isArray(response.body.data.messages)).toBe(true);

      // Verify message structure
      if (response.body.data.messages.length > 0) {
        response.body.data.messages.forEach(message => {
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('content');
          expect(message).toHaveProperty('senderId');
          expect(message).toHaveProperty('groupId');
          expect(message).toHaveProperty('createdAt');
        });
      }
    });

    it('should handle large conversation history efficiently', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Create a large number of messages for performance testing
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          apiTestUtils.sendMessage(senderAuth.token, {
            recipientId: recipient.id,
            content: `Performance test message ${i + 1}`,
          })
        );
      }

      await Promise.all(messagePromises);

      const startTime = Date.now();

      // Retrieve large conversation
      const response = await apiTestUtils.getConversation(senderAuth.token, recipient.id, {
        limit: 200,
        offset: 0,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBeGreaterThan(0);

      // Should respond within reasonable time (less than 2 seconds)
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid recipient gracefully', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      const response = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: 'invalid-uuid',
        content: 'Message to invalid recipient',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid group gracefully', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      const response = await apiTestUtils.sendMessage(senderAuth.token, {
        groupId: 'invalid-uuid',
        content: 'Message to invalid group',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthenticated requests', async () => {
      const response = await apiTestUtils.sendMessage(null, {
        recipientId: testData.users[1].id,
        content: 'Unauthenticated message',
      });

      expect(response.status).toBe(401);
    });

    it('should handle malformed message data', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Missing content
      const response1 = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: testData.users[1].id,
      });

      expect(response1.status).toBe(400);

      // Missing recipient/group
      const response2 = await apiTestUtils.sendMessage(senderAuth.token, {
        content: 'Message without recipient',
      });

      expect(response2.status).toBe(400);
    });
  });
});