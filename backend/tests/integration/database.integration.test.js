import { apiTestUtils } from '../apiTestUtils.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { Message, User, Group, GroupMember, File, sequelize } from '../../src/models/index.js';

describe('Database Integration Tests', () => {
  let testData;
  let authTokens;

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
    // Cleanup test data
    await global.testUtils.cleanupTestData();
  });

  describe('Data Consistency Integration', () => {
    it('should maintain referential integrity for messages', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Send a message
      const messageData = {
        recipientId: recipient.id,
        content: 'Message for referential integrity test',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Verify message exists with correct relationships
      const message = await Message.findByPk(messageId, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username'] },
          { model: User, as: 'recipient', attributes: ['id', 'username'] },
        ],
      });

      expect(message).toBeTruthy();
      expect(message.sender).toBeTruthy();
      expect(message.recipient).toBeTruthy();
      expect(message.sender.id).toBe(sender.id);
      expect(message.recipient.id).toBe(recipient.id);

      // Verify cascade behavior when sender is deleted
      await message.reload({ include: [{ model: User, as: 'sender' }] });
      expect(message.sender).toBeTruthy();

      // Delete sender (soft delete in real implementation)
      await sender.destroy({ force: true });

      // Message should still exist (no cascade delete for messages)
      const messageAfterSenderDelete = await Message.findByPk(messageId);
      expect(messageAfterSenderDelete).toBeTruthy();
      expect(messageAfterSenderDelete.senderId).toBe(sender.id); // Foreign key should remain
    });

    it('should maintain group membership consistency', async () => {
      const group = testData.groups[0];
      const user = testData.users[0];

      // Verify initial membership
      const initialMembership = await GroupMember.findOne({
        where: { groupId: group.id, userId: user.id, isActive: true },
      });
      expect(initialMembership).toBeTruthy();

      // Count initial group members
      const initialMemberCount = await group.getMemberCount();
      expect(initialMemberCount).toBeGreaterThan(0);

      // Remove user from group
      await group.removeMember(user.id);

      // Verify membership is inactive
      const updatedMembership = await GroupMember.findByPk(initialMembership.id);
      expect(updatedMembership.isActive).toBe(false);
      expect(updatedMembership.leftAt).toBeTruthy();

      // Verify member count is updated
      const updatedMemberCount = await group.getMemberCount();
      expect(updatedMemberCount).toBe(initialMemberCount - 1);

      // Verify user cannot send messages to group
      const userAuth = authTokens.get(user.id);
      const messageResponse = await apiTestUtils.sendMessage(userAuth.token, {
        groupId: group.id,
        content: 'Message from removed member',
      });
      expect(messageResponse.status).toBe(403);
    });

    it('should maintain file-message relationships', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file
      const testFilePath = await apiTestUtils.createTestFile('text');
      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Send message with file
      const messageResponse = await apiTestUtils.sendMessage(uploaderAuth.token, {
        recipientId: testData.users[1].id,
        content: 'Message with file attachment',
        fileId: fileId,
      });
      expect(messageResponse.status).toBe(201);
      const messageId = messageResponse.body.data.id;

      // Verify file-message relationship
      const file = await File.findByPk(fileId);
      expect(file.messageId).toBe(messageId);

      // Verify message-file relationship
      const message = await Message.findByPk(messageId, {
        include: [{ model: File, as: 'files' }],
      });
      expect(message.files).toBeTruthy();
      expect(message.files.length).toBeGreaterThan(0);
      expect(message.files[0].id).toBe(fileId);

      // Cleanup
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should handle concurrent data modifications safely', async () => {
      const user = testData.users[0];
      const userAuth = authTokens.get(user.id);

      // Perform concurrent operations on user profile
      const updatePromises = [];
      for (let i = 0; i < 10; i++) {
        updatePromises.push(
          apiTestUtils.updateUserProfile(userAuth.token, {
            firstName: `ConcurrentName${i}`,
            lastName: `ConcurrentLast${i}`,
          })
        );
      }

      const responses = await Promise.all(updatePromises);

      // All updates should succeed or handle conflicts appropriately
      const successful = responses.filter(r => r.status === 200);
      const conflicts = responses.filter(r => r.status === 409);

      expect(successful.length + conflicts.length).toBe(10);

      // Final state should be consistent
      await user.reload();
      expect(user.firstName).toBeTruthy();
      expect(user.lastName).toBeTruthy();
    });
  });

  describe('Transaction Handling Integration', () => {
    it('should rollback failed message transactions', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Count initial messages
      const initialMessageCount = await Message.count();

      // Try to send message with invalid data that should cause rollback
      const invalidMessageData = {
        recipientId: 'invalid-uuid',
        content: 'This should fail and rollback',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, invalidMessageData);
      expect(response.status).toBe(400);

      // Verify no message was created (transaction rolled back)
      const finalMessageCount = await Message.count();
      expect(finalMessageCount).toBe(initialMessageCount);
    });

    it('should handle database connection failures gracefully', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Temporarily break database connection (mock scenario)
      const originalQuery = sequelize.query;
      sequelize.query = async () => {
        throw new Error('Database connection lost');
      };

      try {
        // Try to send message during connection failure
        const response = await apiTestUtils.sendMessage(senderAuth.token, {
          recipientId: testData.users[1].id,
          content: 'Message during connection failure',
        });

        expect(response.status).toBe(500);
      } finally {
        // Restore original query method
        sequelize.query = originalQuery;
      }
    });

    it('should maintain consistency during bulk operations', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Count initial messages
      const initialCount = await Message.count({
        where: { senderId: sender.id, recipientId: recipient.id },
      });

      // Send multiple messages in rapid succession
      const messagePromises = [];
      for (let i = 0; i < 20; i++) {
        messagePromises.push(
          apiTestUtils.sendMessage(senderAuth.token, {
            recipientId: recipient.id,
            content: `Bulk message ${i + 1}`,
          })
        );
      }

      const responses = await Promise.all(messagePromises);

      // All messages should be sent successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify final count is consistent
      const finalCount = await Message.count({
        where: { senderId: sender.id, recipientId: recipient.id },
      });

      expect(finalCount).toBe(initialCount + 20);

      // Verify all messages are properly stored
      const messages = await Message.findConversation(sender.id, recipient.id);
      const recentMessages = messages.slice(-20);

      recentMessages.forEach((message, index) => {
        expect(message.content).toBe(`Bulk message ${index + 1}`);
        expect(message.senderId).toBe(sender.id);
        expect(message.recipientId).toBe(recipient.id);
      });
    });

    it('should handle transaction timeout scenarios', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Mock slow database operation
      const originalCreate = Message.create;
      Message.create = async function(data) {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 35000));
        return originalCreate.call(this, data);
      };

      try {
        // Try to send message with timeout
        const response = await Promise.race([
          apiTestUtils.sendMessage(senderAuth.token, {
            recipientId: testData.users[1].id,
            content: 'Message with timeout',
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          ),
        ]);

        // Should either succeed or timeout gracefully
        if (response.status) {
          expect(response.status).toBe(201);
        }
      } catch (error) {
        expect(error.message).toContain('timeout');
      } finally {
        // Restore original method
        Message.create = originalCreate;
      }
    });
  });

  describe('Data Integrity Integration', () => {
    it('should validate message data constraints', async () => {
      const sender = testData.users[0];

      // Try to create message with invalid data directly in database
      try {
        await Message.create({
          senderId: sender.id,
          // Missing both recipientId and groupId (should fail)
          content: 'Invalid message',
        });
        fail('Should not allow message without recipient or group');
      } catch (error) {
        expect(error.message).toContain('recipientId or groupId');
      }

      // Try to create message with both recipient and group (should fail)
      try {
        await Message.create({
          senderId: sender.id,
          recipientId: testData.users[1].id,
          groupId: testData.groups[0].id, // Both set
          content: 'Invalid message with both',
        });
        fail('Should not allow message with both recipient and group');
      } catch (error) {
        expect(error.message).toContain('recipientId or groupId');
      }
    });

    it('should validate group data constraints', async () => {
      const creator = testData.users[0];
      const creatorAuth = authTokens.get(creator.id);

      // Try to create group with invalid data
      const invalidGroupData = {
        name: '', // Empty name should fail
        description: 'Invalid group',
      };

      const response = await apiTestUtils.createGroup(creatorAuth.token, invalidGroupData);
      expect(response.status).toBe(400);

      // Try to create group with name too long
      const longNameData = {
        name: 'a'.repeat(101), // Exceed 100 char limit
        description: 'Group with long name',
      };

      const longNameResponse = await apiTestUtils.createGroup(creatorAuth.token, longNameData);
      expect(longNameResponse.status).toBe(400);
    });

    it('should validate file data constraints', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Try to upload file that exceeds size limit
      const largeFilePath = path.join(process.cwd(), 'temp', 'oversized_file.txt');
      try {
        // Create file larger than 25MB limit
        const largeContent = 'x'.repeat(26 * 1024 * 1024);
        await fs.writeFile(largeFilePath, largeContent);

        const response = await apiTestUtils.uploadFile(uploaderAuth.token, largeFilePath);
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('size');
      } finally {
        try {
          await fs.unlink(largeFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle orphaned data cleanup', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Create a message
      const message = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Message for cleanup test',
      });

      // Create associated file
      const file = await File.create({
        uploaderId: sender.id,
        messageId: message.id,
        filename: 'test.txt',
        originalName: 'test.txt',
        filePath: '/tmp/test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        fileType: 'document',
      });

      // Delete message (should cascade or mark file appropriately)
      await message.destroy();

      // File should still exist (no cascade delete)
      const fileAfterMessageDelete = await File.findByPk(file.id);
      expect(fileAfterMessageDelete).toBeTruthy();

      // File should be marked for cleanup or handled appropriately
      expect(fileAfterMessageDelete.messageId).toBe(message.id);
    });
  });

  describe('Database Performance Integration', () => {
    it('should handle large dataset queries efficiently', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Create a large number of messages
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

      // Test query performance
      const startTime = Date.now();

      const response = await apiTestUtils.getConversation(senderAuth.token, recipient.id, {
        limit: 200,
        offset: 0,
      });

      const queryTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBeGreaterThan(0);

      // Should complete within reasonable time
      expect(queryTime).toBeLessThan(2000);
    });

    it('should handle complex joins efficiently', async () => {
      const user = testData.users[0];
      const userAuth = authTokens.get(user.id);

      const startTime = Date.now();

      // Get user profile with related data
      const response = await apiTestUtils.getUserProfile(userAuth.token);

      const queryTime = Date.now() - startTime;

      expect(response.status).toBe(200);

      // Should complete within reasonable time even with complex joins
      expect(queryTime).toBeLessThan(1000);
    });

    it('should handle database index utilization', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Create messages with different statuses
      await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Unread message',
        status: 'sent',
      });

      await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Read message',
        status: 'read',
      });

      // Query by status (should use index)
      const startTime = Date.now();

      const unreadMessages = await Message.findAll({
        where: {
          recipientId: recipient.id,
          status: 'sent',
        },
      });

      const queryTime = Date.now() - startTime;

      expect(unreadMessages.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should use index efficiently
    });
  });

  describe('Database Recovery Integration', () => {
    it('should handle database connection recovery', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Simulate database connection loss
      const originalQuery = sequelize.query;
      let queryCount = 0;

      sequelize.query = async function(...args) {
        queryCount++;
        if (queryCount === 1) {
          throw new Error('Connection lost');
        }
        return originalQuery.call(this, ...args);
      };

      try {
        // First operation should fail
        const response1 = await apiTestUtils.sendMessage(senderAuth.token, {
          recipientId: testData.users[1].id,
          content: 'Message during connection loss',
        });

        expect(response1.status).toBe(500);
      } finally {
        // Restore connection for subsequent operations
        sequelize.query = originalQuery;
      }

      // Subsequent operations should work
      const response2 = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: testData.users[1].id,
        content: 'Message after recovery',
      });

      expect(response2.status).toBe(201);
    });

    it('should handle partial data corruption scenarios', async () => {
      const sender = testData.users[0];

      // Create a message with corrupted data
      const corruptedMessage = await Message.create({
        senderId: sender.id,
        recipientId: testData.users[1].id,
        content: null, // This should violate not-null constraint
      }).catch(error => {
        // Should fail validation
        expect(error.message).toContain('content');
        return null;
      });

      expect(corruptedMessage).toBeNull();
    });

    it('should validate data consistency across related tables', async () => {
      const group = testData.groups[0];
      const user = testData.users[0];

      // Get group members from different perspectives
      const membersFromGroup = await group.getMembers();
      const membersFromMembership = await GroupMember.findAll({
        where: { groupId: group.id, isActive: true },
        include: [{ model: User, as: 'user' }],
      });

      // Both should return consistent data
      expect(membersFromGroup.length).toBe(membersFromMembership.length);

      // All members should have valid user references
      membersFromGroup.forEach(member => {
        expect(member.id).toBeTruthy();
        expect(member.username).toBeTruthy();
      });
    });
  });

  describe('Database Constraints Integration', () => {
    it('should enforce unique constraints', async () => {
      const user = testData.users[0];

      // Try to create duplicate session (assuming unique constraint)
      try {
        await sequelize.models.Session.create({
          userId: user.id,
          token: 'duplicate-token',
        });

        await sequelize.models.Session.create({
          userId: user.id,
          token: 'duplicate-token', // Same token
        });

        fail('Should not allow duplicate session tokens');
      } catch (error) {
        expect(error.message).toContain('unique');
      }
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create message with non-existent sender
      try {
        await Message.create({
          senderId: 'non-existent-user-id',
          recipientId: testData.users[0].id,
          content: 'Message with invalid sender',
        });

        fail('Should not allow message with non-existent sender');
      } catch (error) {
        expect(error.message).toContain('foreign key');
      }
    });

    it('should handle constraint violations gracefully', async () => {
      const sender = testData.users[0];
      const senderAuth = authTokens.get(sender.id);

      // Try to send message that violates business rules
      const invalidMessageData = {
        recipientId: sender.id, // Sending to self (may be invalid)
        content: 'Message to self',
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, invalidMessageData);

      // Should either succeed or fail gracefully with proper error
      if (response.status !== 201) {
        expect(response.status).toBe(400);
        expect(response.body.error).toBeTruthy();
      }
    });
  });
});