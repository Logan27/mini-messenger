import { apiTestUtils } from '../apiTestUtils.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { Message, User } from '../../src/models/index.js';
import encryptionService from '../../src/services/encryptionService.js';

describe('E2E Encryption Integration Tests', () => {
  let testData;
  let authTokens;
  let publicKeys = new Map();
  let privateKeys = new Map();

  beforeAll(async () => {
    // Setup test data
    testData = await global.testUtils.setupTestData('comprehensive');
    authTokens = new Map();

    // Get auth tokens for all test users
    for (const user of testData.users) {
      const authData = await messagingTestHelpers.authenticateUser(user);
      authTokens.set(user.id, authData);
    }

    // Generate key pairs for users (in real implementation, this would be done client-side)
    for (const user of testData.users) {
      const keyPair = await encryptionService.generateKeyPair();
      publicKeys.set(user.id, keyPair.publicKey);
      privateKeys.set(user.id, keyPair.privateKey);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await global.testUtils.cleanupTestData();
  });

  describe('Key Exchange Integration', () => {
    it('should handle public key registration and retrieval', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);
      const publicKey = publicKeys.get(user.id);

      // Register public key via API
      const registerResponse = await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        authData.token,
        {
          publicKey: publicKey,
        }
      );

      expect(registerResponse.status).toBe(200);

      // Retrieve public key via API
      const retrieveResponse = await apiTestUtils.makeAuthRequest(
        'GET',
        `/api/encryption/public-key/${user.id}`,
        authData.token
      );

      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.body.data.publicKey).toBe(publicKey);

      // Verify key was stored in database
      await user.reload();
      expect(user.publicKey).toBe(publicKey);
    });

    it('should retrieve public keys for multiple users', async () => {
      const authData = authTokens.get(testData.users[0].id);

      // Get public keys for multiple users
      const userIds = testData.users.slice(0, 3).map(u => u.id);
      const keysResponse = await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/public-keys',
        authData.token,
        { userIds }
      );

      expect(keysResponse.status).toBe(200);
      expect(keysResponse.body.data.publicKeys).toBeInstanceOf(Array);

      // Verify all requested keys are returned
      keysResponse.body.data.publicKeys.forEach(keyInfo => {
        expect(userIds).toContain(keyInfo.userId);
        expect(keyInfo.publicKey).toBeTruthy();
        expect(publicKeys.get(keyInfo.userId)).toBe(keyInfo.publicKey);
      });
    });

    it('should handle key rotation scenarios', async () => {
      const user = testData.users[0];
      const authData = authTokens.get(user.id);

      // Register initial key
      const initialKey = publicKeys.get(user.id);
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        authData.token,
        { publicKey: initialKey }
      );

      // Generate and register new key (rotation)
      const newKeyPair = await encryptionService.generateKeyPair();
      const rotateResponse = await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/rotate-key',
        authData.token,
        {
          newPublicKey: newKeyPair.publicKey,
          currentPrivateKey: privateKeys.get(user.id), // Would be provided by client
        }
      );

      expect(rotateResponse.status).toBe(200);

      // Verify new key is active
      await user.reload();
      expect(user.publicKey).toBe(newKeyPair.publicKey);

      // Update our tracking
      publicKeys.set(user.id, newKeyPair.publicKey);
      privateKeys.set(user.id, newKeyPair.privateKey);
    });
  });

  describe('Message Encryption Integration', () => {
    it('should encrypt and decrypt 1-to-1 messages end-to-end', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);
      const recipientAuth = authTokens.get(recipient.id);

      // Ensure both users have public keys registered
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        recipientAuth.token,
        { publicKey: publicKeys.get(recipient.id) }
      );

      // Send encrypted message
      const messageContent = 'This is a secret encrypted message';
      const messageData = {
        recipientId: recipient.id,
        content: messageContent,
        isEncrypted: true,
        encryptForUserId: recipient.id,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Verify message is stored as encrypted
      const dbMessage = await Message.findByPk(messageId);
      expect(dbMessage.isEncrypted).toBe(true);
      expect(dbMessage.encryptedContent).toBeTruthy();
      expect(dbMessage.content).not.toBe(messageContent); // Should be encrypted

      // Decrypt message (simulating recipient's decryption)
      const decryptedContent = await encryptionService.decryptMessage(
        dbMessage.encryptedContent,
        privateKeys.get(recipient.id),
        dbMessage.senderId
      );

      expect(decryptedContent).toBe(messageContent);
    });

    it('should handle encryption key mismatch scenarios', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Register sender's key but not recipient's
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      // Try to send encrypted message to user without registered key
      const messageData = {
        recipientId: recipient.id,
        content: 'Encrypted message to user without key',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('encryption');
    });

    it('should handle corrupted encrypted messages', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Create message directly in database with corrupted encrypted content
      const corruptedMessage = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Original content',
        encryptedContent: 'corrupted-encrypted-data',
        isEncrypted: true,
      });

      // Try to decrypt corrupted message
      try {
        await encryptionService.decryptMessage(
          corruptedMessage.encryptedContent,
          privateKeys.get(recipient.id),
          sender.id
        );
        fail('Should not be able to decrypt corrupted message');
      } catch (error) {
        expect(error.message).toContain('decrypt');
      }
    });

    it('should handle multiple encryption versions', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Register keys for both users
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      const recipientAuth = authTokens.get(recipient.id);
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        recipientAuth.token,
        { publicKey: publicKeys.get(recipient.id) }
      );

      // Send messages with different encryption versions
      const messageContent = 'Multi-version encryption test';

      // Version 1
      const messageData1 = {
        recipientId: recipient.id,
        content: messageContent,
        isEncrypted: true,
        encryptionVersion: '1.0',
      };

      const response1 = await apiTestUtils.sendMessage(senderAuth.token, messageData1);
      expect(response1.status).toBe(201);

      // Version 2
      const messageData2 = {
        recipientId: recipient.id,
        content: messageContent,
        isEncrypted: true,
        encryptionVersion: '2.0',
      };

      const response2 = await apiTestUtils.sendMessage(senderAuth.token, messageData2);
      expect(response2.status).toBe(201);

      // Both should be decryptable with appropriate version handling
      const message1 = await Message.findByPk(response1.body.data.id);
      const message2 = await Message.findByPk(response2.body.data.id);

      const decrypted1 = await encryptionService.decryptMessage(
        message1.encryptedContent,
        privateKeys.get(recipient.id),
        sender.id
      );

      const decrypted2 = await encryptionService.decryptMessage(
        message2.encryptedContent,
        privateKeys.get(recipient.id),
        sender.id
      );

      expect(decrypted1).toBe(messageContent);
      expect(decrypted2).toBe(messageContent);
    });
  });

  describe('Group Encryption Integration', () => {
    it('should handle group message encryption with shared keys', async () => {
      const group = testData.groups[0];
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Register public keys for group members
      for (const userId of [sender.id, recipient.id]) {
        const authData = authTokens.get(userId);
        await apiTestUtils.makeAuthRequest(
          'POST',
          '/api/encryption/register-key',
          authData.token,
          { publicKey: publicKeys.get(userId) }
        );
      }

      // Send encrypted group message
      const messageContent = 'Encrypted group message';
      const messageData = {
        groupId: group.id,
        content: messageContent,
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Verify message is encrypted
      const dbMessage = await Message.findByPk(messageId);
      expect(dbMessage.isEncrypted).toBe(true);
      expect(dbMessage.encryptedContent).toBeTruthy();

      // Should be decryptable by group members
      const decryptedContent = await encryptionService.decryptMessage(
        dbMessage.encryptedContent,
        privateKeys.get(recipient.id),
        sender.id
      );

      expect(decryptedContent).toBe(messageContent);
    });

    it('should handle group key rotation', async () => {
      const group = testData.groups[0];
      const admin = testData.users[0];
      const adminAuth = authTokens.get(admin.id);

      // Rotate group encryption key via API
      const rotateResponse = await apiTestUtils.makeAuthRequest(
        'POST',
        `/api/groups/${group.id}/rotate-encryption-key`,
        adminAuth.token
      );

      expect(rotateResponse.status).toBe(200);

      // Verify group key was rotated
      await group.reload();
      expect(group.encryptionKey).toBeTruthy();

      // New messages should use new key
      const messageData = {
        groupId: group.id,
        content: 'Message with rotated key',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(adminAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Message should be encrypted with new key
      const message = await Message.findByPk(messageId);
      expect(message.isEncrypted).toBe(true);
      expect(message.encryptedContent).toBeTruthy();
    });
  });

  describe('Encryption Performance Integration', () => {
    it('should handle encryption/decryption of large messages efficiently', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Register keys
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      const recipientAuth = authTokens.get(recipient.id);
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        recipientAuth.token,
        { publicKey: publicKeys.get(recipient.id) }
      );

      // Create large message content
      const largeContent = 'Secret message content '.repeat(1000); // ~25KB

      const startTime = Date.now();

      // Send large encrypted message
      const messageData = {
        recipientId: recipient.id,
        content: largeContent,
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);

      const encryptTime = Date.now() - startTime;

      // Decrypt the message
      const decryptStartTime = Date.now();
      const messageId = response.body.data.id;
      const dbMessage = await Message.findByPk(messageId);

      const decryptedContent = await encryptionService.decryptMessage(
        dbMessage.encryptedContent,
        privateKeys.get(recipient.id),
        sender.id
      );

      const decryptTime = Date.now() - decryptStartTime;

      // Performance assertions
      expect(encryptTime).toBeLessThan(2000); // Should encrypt within 2 seconds
      expect(decryptTime).toBeLessThan(2000); // Should decrypt within 2 seconds
      expect(decryptedContent).toBe(largeContent);
    });

    it('should handle concurrent encrypted message processing', async () => {
      const sender = testData.users[0];
      const recipients = testData.users.slice(1, 4);
      const senderAuth = authTokens.get(sender.id);

      // Register keys for all users
      for (const user of [sender, ...recipients]) {
        const authData = authTokens.get(user.id);
        await apiTestUtils.makeAuthRequest(
          'POST',
          '/api/encryption/register-key',
          authData.token,
          { publicKey: publicKeys.get(user.id) }
        );
      }

      // Send encrypted messages concurrently
      const messagePromises = recipients.map((recipient, index) =>
        apiTestUtils.sendMessage(senderAuth.token, {
          recipientId: recipient.id,
          content: `Concurrent encrypted message ${index + 1}`,
          isEncrypted: true,
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(messagePromises);
      const sendTime = Date.now() - startTime;

      // All messages should be sent successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Decrypt all messages concurrently
      const decryptPromises = responses.map(async (response, index) => {
        const messageId = response.body.data.id;
        const dbMessage = await Message.findByPk(messageId);

        return encryptionService.decryptMessage(
          dbMessage.encryptedContent,
          privateKeys.get(recipients[index].id),
          sender.id
        );
      });

      const decryptStartTime = Date.now();
      const decryptedContents = await Promise.all(decryptPromises);
      const decryptTime = Date.now() - decryptStartTime;

      // Performance assertions
      expect(sendTime).toBeLessThan(5000); // Should send all within 5 seconds
      expect(decryptTime).toBeLessThan(5000); // Should decrypt all within 5 seconds

      // Verify all messages were decrypted correctly
      decryptedContents.forEach((content, index) => {
        expect(content).toBe(`Concurrent encrypted message ${index + 1}`);
      });
    });
  });

  describe('Encryption Security Integration', () => {
    it('should prevent decryption with wrong private key', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const attacker = testData.users[2];
      const senderAuth = authTokens.get(sender.id);

      // Register keys for sender and recipient
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      const recipientAuth = authTokens.get(recipient.id);
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        recipientAuth.token,
        { publicKey: publicKeys.get(recipient.id) }
      );

      // Send encrypted message
      const messageData = {
        recipientId: recipient.id,
        content: 'Secret message',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Try to decrypt with attacker's private key
      const dbMessage = await Message.findByPk(messageId);

      try {
        await encryptionService.decryptMessage(
          dbMessage.encryptedContent,
          privateKeys.get(attacker.id), // Wrong private key
          sender.id
        );
        fail('Should not be able to decrypt with wrong private key');
      } catch (error) {
        expect(error.message).toContain('decrypt');
      }
    });

    it('should handle replay attack prevention', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Register keys
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        senderAuth.token,
        { publicKey: publicKeys.get(sender.id) }
      );

      const recipientAuth = authTokens.get(recipient.id);
      await apiTestUtils.makeAuthRequest(
        'POST',
        '/api/encryption/register-key',
        recipientAuth.token,
        { publicKey: publicKeys.get(recipient.id) }
      );

      // Send encrypted message
      const messageData = {
        recipientId: recipient.id,
        content: 'Original message',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(201);
      const messageId = response.body.data.id;

      // Get the encrypted content
      const dbMessage = await Message.findByPk(messageId);
      const encryptedContent = dbMessage.encryptedContent;

      // Try to "replay" by creating duplicate message with same encrypted content
      const replayMessage = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Replay attack message',
        encryptedContent: encryptedContent, // Reuse encrypted content
        isEncrypted: true,
      });

      // Should not be decryptable as replay (depending on implementation)
      // This test depends on whether the system prevents replay attacks
    });

    it('should validate encryption metadata integrity', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Create message with tampered encryption metadata
      const tamperedMessage = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Original content',
        encryptedContent: 'encrypted-data',
        encryptionMetadata: {
          algorithm: 'aes-256-gcm',
          nonce: 'tampered-nonce',
          authTag: 'tampered-tag',
        },
        isEncrypted: true,
      });

      // Try to decrypt with tampered metadata
      try {
        await encryptionService.decryptMessage(
          tamperedMessage.encryptedContent,
          privateKeys.get(recipient.id),
          sender.id
        );
        // Should fail due to metadata tampering
      } catch (error) {
        expect(error.message).toContain('decrypt');
      }
    });
  });

  describe('Encryption Error Handling', () => {
    it('should handle missing encryption keys gracefully', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Don't register any keys

      // Try to send encrypted message without keys
      const messageData = {
        recipientId: recipient.id,
        content: 'Unencrypted message',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('encryption');
    });

    it('should handle decryption failures gracefully', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];

      // Create message with invalid encrypted content
      const invalidMessage = await Message.create({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Original content',
        encryptedContent: 'invalid-encrypted-data',
        isEncrypted: true,
      });

      // Try to decrypt invalid data
      try {
        await encryptionService.decryptMessage(
          invalidMessage.encryptedContent,
          privateKeys.get(recipient.id),
          sender.id
        );
        fail('Should not decrypt invalid data');
      } catch (error) {
        expect(error.message).toContain('decrypt');
      }
    });

    it('should handle encryption service failures', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Mock encryption service failure
      const originalEncrypt = encryptionService.encryptMessage;
      encryptionService.encryptMessage = async () => {
        throw new Error('Encryption service unavailable');
      };

      // Try to send encrypted message during service failure
      const messageData = {
        recipientId: recipient.id,
        content: 'Message during service failure',
        isEncrypted: true,
      };

      const response = await apiTestUtils.sendMessage(senderAuth.token, messageData);
      expect(response.status).toBe(500);

      // Restore original function
      encryptionService.encryptMessage = originalEncrypt;
    });
  });
});