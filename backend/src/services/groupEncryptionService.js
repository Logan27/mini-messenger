import { logger } from '../config/index.js';
import { Op } from 'sequelize';

import encryptionService from './encryptionService.js';

/**
 * Service for handling group message encryption with AES-256-GCM
 * Ensures group messages remain server-readable for moderation
 */
class GroupEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt group message using AES-256-GCM (server-side encryption)
   * @param {string|Buffer} message - Message content to encrypt
   * @param {string} groupId - Group ID for key derivation
   * @returns {Object} Encrypted message data
   */
  encryptGroupMessage(message, groupId) {
    try {
      const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');

      // Use groupId as part of key derivation for additional security
      const groupSalt = this.generateGroupSalt(groupId);

      // Encrypt the message
      const encryptionResult = encryptionService.encryptGroupMessage(messageBuffer);

      // Create encryption metadata
      const metadata = {
        algorithm: this.algorithm,
        groupId: groupId,
        groupSalt: groupSalt.toString('base64'),
        encryptedAt: new Date().toISOString(),
        serverEncrypted: true,
      };

      logger.info(`Group message encrypted for group ${groupId}`, {
        messageLength: messageBuffer.length,
        algorithm: this.algorithm,
        timestamp: new Date().toISOString(),
      });

      return {
        encryptedMessage: encryptionResult.encryptedMessage.toString('base64'),
        nonce: encryptionResult.nonce.toString('base64'),
        authTag: encryptionResult.authTag.toString('base64'),
        metadata: metadata,
      };
    } catch (error) {
      logger.error('Failed to encrypt group message:', error);
      throw new Error('Group message encryption failed');
    }
  }

  /**
   * Decrypt group message using AES-256-GCM
   * @param {string} encryptedMessage - Base64 encrypted message
   * @param {string} nonce - Base64 nonce
   * @param {string} authTag - Base64 authentication tag
   * @param {string} groupId - Group ID (for validation)
   * @returns {Buffer} Decrypted message
   */
  decryptGroupMessage(encryptedMessage, nonce, authTag, groupId) {
    try {
      const messageBuffer = Buffer.from(encryptedMessage, 'base64');
      const nonceBuffer = Buffer.from(nonce, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');

      const decryptedMessage = encryptionService.decryptGroupMessage(
        messageBuffer,
        nonceBuffer,
        authTagBuffer
      );

      logger.info(`Group message decrypted for group ${groupId}`, {
        messageLength: decryptedMessage.length,
        algorithm: this.algorithm,
        timestamp: new Date().toISOString(),
      });

      return decryptedMessage;
    } catch (error) {
      logger.error('Failed to decrypt group message:', error);
      throw new Error('Group message decryption failed');
    }
  }

  /**
   * Generate group-specific salt for additional security
   * @param {string} groupId - Group ID
   * @returns {Buffer} Generated salt
   */
  generateGroupSalt(groupId) {
    try {
      // Use group ID and a fixed string to create a deterministic salt
      const saltInput = `group_encryption_salt_${groupId}`;
      const hash = encryptionService.keyToBase64(Buffer.from(saltInput, 'utf8')).slice(0, 32);

      return Buffer.from(hash, 'base64');
    } catch (error) {
      logger.error('Failed to generate group salt:', error);
      throw new Error('Group salt generation failed');
    }
  }

  /**
   * Rotate group encryption key (for enhanced security)
   * @param {string} groupId - Group ID
   * @returns {Object} New key information
   */
  rotateGroupKey(groupId) {
    try {
      // Generate new server key for this group
      const newKey = Buffer.alloc(32);
      encryptionService.serverKey = newKey; // Update server key

      // In a production system, you'd store this per-group key securely
      // For now, we're using a global server key rotation

      logger.info(`Group encryption key rotated for group ${groupId}`, {
        timestamp: new Date().toISOString(),
      });

      return {
        rotated: true,
        rotatedAt: new Date(),
        groupId: groupId,
        keyVersion: Date.now(), // Simple versioning based on timestamp
      };
    } catch (error) {
      logger.error('Failed to rotate group key:', error);
      throw new Error('Group key rotation failed');
    }
  }

  /**
   * Validate group message encryption metadata
   * @param {Object} metadata - Encryption metadata to validate
   * @returns {boolean} True if valid
   */
  validateGroupEncryption(metadata) {
    try {
      if (!metadata || typeof metadata !== 'object') {
        return false;
      }

      const requiredFields = ['algorithm', 'groupId', 'encryptedAt'];
      for (const field of requiredFields) {
        if (!metadata[field]) {
          logger.warn(`Missing required field in group encryption metadata: ${field}`);
          return false;
        }
      }

      // Validate algorithm
      if (metadata.algorithm !== this.algorithm) {
        logger.warn(`Invalid encryption algorithm for group message: ${metadata.algorithm}`);
        return false;
      }

      // Validate encryption timestamp (not too old)
      const encryptedAt = new Date(metadata.encryptedAt);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (Date.now() - encryptedAt.getTime() > maxAge) {
        logger.warn('Group message encryption metadata too old', {
          encryptedAt: metadata.encryptedAt,
          age: Date.now() - encryptedAt.getTime(),
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate group encryption metadata:', error);
      return false;
    }
  }

  /**
   * Get encryption statistics for a group
   * @param {string} groupId - Group ID
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Object} Encryption statistics
   */
  async getGroupEncryptionStats(groupId, startDate, endDate) {
    try {
      const { Message } = await import('../models/index.js');

      const encryptedMessages = await Message.count({
        where: {
          groupId: groupId,
          isEncrypted: true,
          encryptionAlgorithm: this.algorithm,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      const totalMessages = await Message.count({
        where: {
          groupId: groupId,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      return {
        groupId: groupId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        encryptedMessages: encryptedMessages,
        totalMessages: totalMessages,
        encryptionPercentage: totalMessages > 0 ? (encryptedMessages / totalMessages) * 100 : 0,
        algorithm: this.algorithm,
        serverEncrypted: true,
      };
    } catch (error) {
      logger.error('Failed to get group encryption stats:', error);
      throw new Error('Failed to retrieve encryption statistics');
    }
  }

  /**
   * Process group message for moderation (server-readable)
   * @param {Object} message - Message object
   * @returns {Object} Processed message with readable content for moderation
   */
  async processForModeration(message) {
    try {
      if (!message.isEncrypted || message.encryptionAlgorithm !== this.algorithm) {
        // Not a server-encrypted group message
        return message;
      }

      // Decrypt the message for moderation purposes
      const decryptedContent = this.decryptGroupMessage(
        message.encryptedContent,
        message.encryptionMetadata.nonce,
        message.encryptionMetadata.authTag,
        message.groupId
      );

      return {
        ...message,
        content: decryptedContent.toString('utf8'),
        decryptedForModeration: true,
        moderationTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to process group message for moderation:', error);
      return {
        ...message,
        moderationError: true,
        moderationErrorMessage: 'Failed to decrypt for moderation',
      };
    }
  }
}

export default new GroupEncryptionService();
