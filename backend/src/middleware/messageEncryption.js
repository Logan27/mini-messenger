import { logger } from '../config/index.js';
import encryptionService from '../services/encryptionService.js';

/**
 * Middleware for handling message encryption/decryption in 1-to-1 conversations
 * Ensures server cannot decrypt E2E encrypted messages
 */
export class MessageEncryptionMiddleware {
  /**
   * Middleware to encrypt outgoing messages for 1-to-1 conversations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  static encryptOutgoingMessage(req, res, next) {
    try {
      const { recipientId, content } = req.body;

      // Only encrypt direct messages (not group messages)
      if (!recipientId || req.body.groupId) {
        return next();
      }

      // Check if both users have encryption enabled
      const shouldEncrypt = MessageEncryptionMiddleware.shouldEncryptMessage(
        req.user.id,
        recipientId
      );

      if (shouldEncrypt) {
        MessageEncryptionMiddleware.encryptMessageForUser(req, recipientId, content)
          .then(() => next())
          .catch(error => {
            logger.error('Failed to encrypt outgoing message:', error);
            next(error);
          });
      } else {
        next();
      }
    } catch (error) {
      logger.error('Message encryption middleware error:', error);
      next(error);
    }
  }

  /**
   * Middleware to decrypt incoming messages for display
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  static decryptIncomingMessage(req, res, next) {
    try {
      const messages = req.body.messages || [req.body];

      // Process each message for decryption
      const decryptedMessages = messages.map(message => {
        if (message.isEncrypted && message.encryptedContent) {
          try {
            // Server cannot decrypt E2E encrypted messages
            // Return metadata indicating encryption without content
            return {
              ...message,
              content: '[Encrypted Message - Decrypt on client]',
              decrypted: false,
              encryptionInfo: {
                algorithm: message.encryptionAlgorithm || 'unknown',
                encrypted: true,
              },
            };
          } catch (error) {
            logger.error('Failed to process encrypted message:', error);
            return {
              ...message,
              content: '[Encrypted Message - Decryption Failed]',
              decrypted: false,
              encryptionError: true,
            };
          }
        }

        return message;
      });

      req.body.messages = decryptedMessages;
      next();
    } catch (error) {
      logger.error('Message decryption middleware error:', error);
      next(error);
    }
  }

  /**
   * Encrypt message for a specific user
   * @param {Object} req - Express request object
   * @param {string} recipientId - Recipient user ID
   * @param {string} content - Message content to encrypt
   */
  static async encryptMessageForUser(req, recipientId, content) {
    try {
      // Get recipient's public key
      const { User } = await import('../models/index.js');
      const recipient = await User.findByPk(recipientId);

      if (!recipient || !recipient.publicKey) {
        logger.warn(`Cannot encrypt message - recipient ${recipientId} has no public key`);
        return;
      }

      // Get sender's private key
      const sender = await User.findByPk(req.user.id);
      if (!sender || !sender.encryptedPrivateKey) {
        logger.warn(`Cannot encrypt message - sender ${req.user.id} has no private key`);
        return;
      }

      // Decrypt sender's private key
      const senderPrivateKey = encryptionService.decryptPrivateKey(
        Buffer.from(sender.encryptedPrivateKey, 'base64'),
        req.user.password || req.body.senderPassword // Password needed for decryption
      );

      // Encrypt the message
      const recipientPublicKey = encryptionService.keyFromBase64(recipient.publicKey);
      const encryptionResult = encryptionService.encryptMessage(
        content,
        recipientPublicKey,
        senderPrivateKey
      );

      // Store encryption metadata in request for later use
      req.body.encryptedContent = encryptionResult.encryptedMessage.toString('base64');
      req.body.encryptionMetadata = {
        nonce: encryptionResult.nonce.toString('base64'),
        algorithm: encryptionResult.algorithm,
      };
      req.body.isEncrypted = true;
      req.body.encryptionAlgorithm = encryptionResult.algorithm;

      // Clear plain text content for E2E encrypted messages
      req.body.content = null;

      // Log encryption operation for audit
      logger.info(`Message encrypted for user ${recipientId}`, {
        messageId: req.body.id,
        senderId: req.user.id,
        algorithm: encryptionResult.algorithm,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to encrypt message for user:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Check if message should be encrypted based on user preferences
   * @param {string} senderId - Sender user ID
   * @param {string} recipientId - Recipient user ID
   * @returns {boolean} True if message should be encrypted
   */
  static async shouldEncryptMessage(senderId, recipientId) {
    try {
      const { User } = await import('../models/index.js');

      // Check if both users have public keys (indicating encryption capability)
      const [sender, recipient] = await Promise.all([
        User.findByPk(senderId, { attributes: ['publicKey'] }),
        User.findByPk(recipientId, { attributes: ['publicKey'] }),
      ]);

      // Encrypt if both users have public keys
      return !!(sender?.publicKey && recipient?.publicKey);
    } catch (error) {
      logger.error('Failed to check encryption eligibility:', error);
      return false;
    }
  }

  /**
   * Handle key exchange detection for first conversation
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Object} Key exchange status
   */
  static async detectKeyExchange(userId1, userId2) {
    try {
      const { Message } = await import('../models/index.js');

      // Check if this is the first conversation between these users
      const existingMessages = await Message.findConversation(userId1, userId2, {
        limit: 1,
        attributes: ['id'],
      });

      const isFirstConversation = existingMessages.length === 0;

      return {
        isFirstConversation,
        shouldInitiateKeyExchange: isFirstConversation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to detect key exchange:', error);
      return {
        isFirstConversation: false,
        shouldInitiateKeyExchange: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate that server cannot decrypt E2E encrypted messages
   * @param {Object} message - Message object to validate
   * @returns {boolean} True if validation passes
   */
  static validateE2EEncryption(message) {
    try {
      // For E2E encrypted messages, content should be null and encryptedContent should exist
      if (message.isEncrypted) {
        if (message.content !== null && message.content !== undefined) {
          logger.warn('E2E encrypted message has plain text content', {
            messageId: message.id,
            hasContent: !!message.content,
            hasEncryptedContent: !!message.encryptedContent,
          });
          return false;
        }

        if (!message.encryptedContent) {
          logger.warn('E2E encrypted message missing encrypted content', {
            messageId: message.id,
          });
          return false;
        }

        if (!message.encryptionMetadata) {
          logger.warn('E2E encrypted message missing encryption metadata', {
            messageId: message.id,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate E2E encryption:', error);
      return false;
    }
  }

  /**
   * Middleware to validate encryption integrity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  static validateEncryption(req, res, next) {
    try {
      const message = req.body;

      if (message.isEncrypted && !MessageEncryptionMiddleware.validateE2EEncryption(message)) {
        const error = new Error('Invalid E2E encryption configuration');
        error.statusCode = 400;
        return next(error);
      }

      next();
    } catch (error) {
      logger.error('Encryption validation middleware error:', error);
      next(error);
    }
  }
}

export default MessageEncryptionMiddleware;
