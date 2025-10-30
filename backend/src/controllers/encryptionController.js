import User from '../models/User.js';
import encryptionService from '../utils/encryption.js';
import logger from '../utils/logger.js';

/**
 * Encryption Controller
 * Handles E2E encryption key management
 */
class EncryptionController {
  /**
   * Generate and store E2E encryption key pair for current user
   * POST /api/encryption/keypair
   */
  async generateKeyPair(req, res) {
    try {
      const userId = req.user.id;

      // Check if user already has a public key
      const user = await User.findByPk(userId);

      if (user.publicKey) {
        return res.status(409).json({
          success: false,
          error: {
            type: 'KEYPAIR_EXISTS',
            message: 'User already has an encryption key pair',
          },
        });
      }

      // Generate new key pair
      const { publicKey, privateKey } = await encryptionService.generateKeyPair();

      // Store public key in database
      user.publicKey = publicKey;
      await user.save();

      logger.info(`Generated E2E encryption key pair for user: ${user.username}`);

      // Return both keys (client should store private key securely)
      res.status(201).json({
        success: true,
        message: 'Encryption key pair generated successfully',
        data: {
          publicKey,
          privateKey, // IMPORTANT: Client must store this securely (never send to server again)
        },
      });
    } catch (error) {
      logger.error('Generate key pair error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to generate key pair. Please try again.',
        },
      });
    }
  }

  /**
   * Get user's public key (for other users to encrypt messages)
   * GET /api/encryption/public-key/:userId
   */
  async getPublicKey(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'publicKey'],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.publicKey) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NO_PUBLIC_KEY',
            message: 'User has not set up E2E encryption',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          publicKey: user.publicKey,
        },
      });
    } catch (error) {
      logger.error('Get public key error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get public key. Please try again.',
        },
      });
    }
  }

  /**
   * Get public keys for multiple users (batch)
   * POST /api/encryption/public-keys
   */
  async getPublicKeys(req, res) {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_REQUEST',
            message: 'userIds must be a non-empty array',
          },
        });
      }

      if (userIds.length > 50) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'TOO_MANY_USERS',
            message: 'Maximum 50 users per request',
          },
        });
      }

      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'publicKey'],
      });

      const publicKeys = users
        .filter(user => user.publicKey)
        .map(user => ({
          userId: user.id,
          username: user.username,
          publicKey: user.publicKey,
        }));

      res.status(200).json({
        success: true,
        data: {
          publicKeys,
        },
      });
    } catch (error) {
      logger.error('Get public keys error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to get public keys. Please try again.',
        },
      });
    }
  }

  /**
   * Update user's public key (in case of key rotation)
   * PUT /api/encryption/public-key
   */
  async updatePublicKey(req, res) {
    try {
      const userId = req.user.id;
      const { publicKey } = req.body;

      if (!publicKey || typeof publicKey !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'INVALID_PUBLIC_KEY',
            message: 'Valid public key is required',
          },
        });
      }

      const user = await User.findByPk(userId);

      user.publicKey = publicKey;
      await user.save();

      logger.info(`Updated public key for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Public key updated successfully',
      });
    } catch (error) {
      logger.error('Update public key error:', error);

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update public key. Please try again.',
        },
      });
    }
  }
}

export default new EncryptionController();
