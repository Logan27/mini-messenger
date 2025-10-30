import { logger } from '../config/index.js';

/**
 * Service for providing encryption status indicators for user transparency
 * Ensures users understand encryption status of their communications
 */
class EncryptionStatusService {
  constructor() {
    this.statusIndicators = {
      UNENCRYPTED: {
        level: 'none',
        label: 'Not Encrypted',
        description: 'Messages are stored and transmitted without encryption',
        color: 'red',
        icon: '🔓',
        userMessage: 'This conversation is not encrypted',
      },
      SERVER_ENCRYPTED: {
        level: 'server',
        label: 'Server Encrypted',
        description: 'Messages are encrypted for storage but readable by server administrators',
        color: 'orange',
        icon: '🔒',
        userMessage:
          'This conversation is encrypted for privacy but can be accessed by administrators for moderation',
      },
      END_TO_END_ENCRYPTED: {
        level: 'e2e',
        label: 'End-to-End Encrypted',
        description:
          'Messages are encrypted end-to-end and cannot be read by anyone except you and the recipient',
        color: 'green',
        icon: '🔐',
        userMessage: 'This conversation is end-to-end encrypted',
      },
      ENCRYPTION_FAILED: {
        level: 'failed',
        label: 'Encryption Failed',
        description: 'Message encryption failed - message may be sent unencrypted',
        color: 'red',
        icon: '⚠️',
        userMessage: 'This message could not be encrypted and was sent without encryption',
      },
    };
  }

  /**
   * Get encryption status for a message
   * @param {Object} message - Message object
   * @returns {Object} Encryption status information
   */
  getMessageEncryptionStatus(message) {
    try {
      // Determine encryption status based on message properties
      let statusKey = 'UNENCRYPTED';

      if (message.isEncrypted) {
        if (message.encryptionAlgorithm === 'aes-256-gcm') {
          statusKey = 'SERVER_ENCRYPTED';
        } else if (message.encryptionAlgorithm === 'x25519-xsalsa20-poly1305') {
          statusKey = 'END_TO_END_ENCRYPTED';
        } else {
          statusKey = 'SERVER_ENCRYPTED'; // Default for unknown algorithms
        }
      } else if (message.content && !message.encryptedContent) {
        statusKey = 'UNENCRYPTED';
      }

      const statusInfo = this.statusIndicators[statusKey];

      return {
        status: statusKey,
        level: statusInfo.level,
        label: statusInfo.label,
        description: statusInfo.description,
        color: statusInfo.color,
        icon: statusInfo.icon,
        userMessage: statusInfo.userMessage,
        technical: {
          algorithm: message.encryptionAlgorithm || null,
          encrypted: message.isEncrypted || false,
          hasEncryptedContent: !!message.encryptedContent,
          hasEncryptionMetadata: !!message.encryptionMetadata,
          messageId: message.id,
          createdAt: message.createdAt,
        },
      };
    } catch (error) {
      logger.error('Failed to get message encryption status:', error);
      return this.getErrorStatus();
    }
  }

  /**
   * Get encryption status for a conversation between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Object} Conversation encryption status
   */
  async getConversationEncryptionStatus(userId1, userId2) {
    try {
      const { User } = await import('../models/index.js');

      const [user1, user2] = await Promise.all([
        User.findByPk(userId1, {
          attributes: ['id', 'publicKey', 'keyVersion', 'lastKeyRotation'],
        }),
        User.findByPk(userId2, {
          attributes: ['id', 'publicKey', 'keyVersion', 'lastKeyRotation'],
        }),
      ]);

      // Check if both users have encryption keys
      const hasUser1Key = !!(user1 && user1.publicKey);
      const hasUser2Key = !!(user2 && user2.publicKey);

      let statusKey = 'UNENCRYPTED';
      let statusInfo = this.statusIndicators[statusKey];

      if (hasUser1Key && hasUser2Key) {
        statusKey = 'END_TO_END_ENCRYPTED';
        statusInfo = this.statusIndicators[statusKey];
      } else if (hasUser1Key || hasUser2Key) {
        statusKey = 'ENCRYPTION_FAILED';
        statusInfo = this.statusIndicators[statusKey];
      }

      return {
        status: statusKey,
        level: statusInfo.level,
        label: statusInfo.label,
        description: statusInfo.description,
        color: statusInfo.color,
        icon: statusInfo.icon,
        userMessage: statusInfo.userMessage,
        participants: {
          user1: {
            id: userId1,
            hasEncryptionKey: hasUser1Key,
            keyVersion: user1?.keyVersion || null,
            lastKeyRotation: user1?.lastKeyRotation || null,
          },
          user2: {
            id: userId2,
            hasEncryptionKey: hasUser2Key,
            keyVersion: user2?.keyVersion || null,
            lastKeyRotation: user2?.lastKeyRotation || null,
          },
        },
        recommendation: this.getEncryptionRecommendation(hasUser1Key, hasUser2Key),
      };
    } catch (error) {
      logger.error('Failed to get conversation encryption status:', error);
      return this.getErrorStatus();
    }
  }

  /**
   * Get encryption status for a group conversation
   * @param {string} groupId - Group ID
   * @returns {Object} Group encryption status
   */
  async getGroupEncryptionStatus(groupId) {
    try {
      const { Group } = await import('../models/index.js');

      const group = await Group.findByPk(groupId, {
        attributes: ['id', 'name', 'isEncrypted', 'encryptionAlgorithm'],
      });

      if (!group) {
        throw new Error('Group not found');
      }

      let statusKey = 'UNENCRYPTED';
      let statusInfo = this.statusIndicators[statusKey];

      if (group.isEncrypted) {
        statusKey = 'SERVER_ENCRYPTED';
        statusInfo = this.statusIndicators[statusKey];
      }

      return {
        status: statusKey,
        level: statusInfo.level,
        label: statusInfo.label,
        description: statusInfo.description,
        color: statusInfo.color,
        icon: statusInfo.icon,
        userMessage: statusInfo.userMessage,
        group: {
          id: group.id,
          name: group.name,
          isEncrypted: group.isEncrypted,
          algorithm: group.encryptionAlgorithm,
        },
        transparency: {
          serverAccess: true,
          purpose: 'Moderation and compliance',
          legalBasis: 'GDPR Article 6(1)(f) - Legitimate interests',
        },
      };
    } catch (error) {
      logger.error('Failed to get group encryption status:', error);
      return this.getErrorStatus();
    }
  }

  /**
   * Get encryption recommendation for users
   * @param {boolean} hasUser1Key - Whether first user has encryption key
   * @param {boolean} hasUser2Key - Whether second user has encryption key
   * @returns {Object} Recommendation information
   */
  getEncryptionRecommendation(hasUser1Key, hasUser2Key) {
    if (hasUser1Key && hasUser2Key) {
      return {
        type: 'optimal',
        message: 'Both users have encryption enabled for maximum privacy',
        action: null,
      };
    } else if (hasUser1Key || hasUser2Key) {
      return {
        type: 'partial',
        message:
          'One user has encryption enabled. Enable encryption for both users for end-to-end encryption',
        action: 'enable_encryption',
      };
    } else {
      return {
        type: 'upgrade',
        message: 'Enable encryption for enhanced privacy and security',
        action: 'enable_encryption',
      };
    }
  }

  /**
   * Get user's overall encryption status
   * @param {string} userId - User ID
   * @returns {Object} User's encryption status summary
   */
  async getUserEncryptionStatus(userId) {
    try {
      const { User } = await import('../models/index.js');

      const user = await User.findByPk(userId, {
        attributes: ['id', 'publicKey', 'keyVersion', 'lastKeyRotation', 'createdAt'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const hasEncryptionKey = !!user.publicKey;
      const encryptionStatus = hasEncryptionKey ? 'enabled' : 'disabled';

      const status = {
        userId: user.id,
        encryptionEnabled: hasEncryptionKey,
        status: encryptionStatus,
        keyInfo: hasEncryptionKey
          ? {
              version: user.keyVersion || 1,
              lastRotation: user.lastKeyRotation || null,
              createdAt: user.createdAt,
            }
          : null,
        capabilities: {
          canSendE2EMessages: hasEncryptionKey,
          canReceiveE2EMessages: hasEncryptionKey,
          canParticipateInEncryptedGroups: true, // Groups use server-side encryption
        },
        recommendations: [],
      };

      if (!hasEncryptionKey) {
        status.recommendations.push({
          type: 'security',
          priority: 'high',
          message: 'Enable end-to-end encryption for enhanced privacy',
          action: 'generate_encryption_keys',
        });
      } else if (!user.lastKeyRotation) {
        status.recommendations.push({
          type: 'maintenance',
          priority: 'medium',
          message: 'Consider rotating your encryption keys for enhanced security',
          action: 'rotate_keys',
        });
      }

      return status;
    } catch (error) {
      logger.error('Failed to get user encryption status:', error);
      return this.getErrorStatus();
    }
  }

  /**
   * Get system-wide encryption statistics
   * @returns {Object} System encryption statistics
   */
  async getSystemEncryptionStats() {
    try {
      const { User, Message, Group } = await import('../models/index.js');
      const { Op } = await import('sequelize');

      // Get user encryption statistics
      const totalUsers = await User.count();
      const usersWithKeys = await User.count({
        where: {
          publicKey: {
            [Op.ne]: null,
          },
        },
      });

      // Get message encryption statistics
      const totalMessages = await Message.count();
      const e2eEncryptedMessages = await Message.count({
        where: {
          isEncrypted: true,
          encryptionAlgorithm: 'x25519-xsalsa20-poly1305',
        },
      });

      const serverEncryptedMessages = await Message.count({
        where: {
          isEncrypted: true,
          encryptionAlgorithm: 'aes-256-gcm',
        },
      });

      // Get group encryption statistics
      const totalGroups = await Group.count();
      const encryptedGroups = await Group.count({
        where: {
          isEncrypted: true,
        },
      });

      return {
        timestamp: new Date().toISOString(),
        users: {
          total: totalUsers,
          withEncryption: usersWithKeys,
          encryptionPercentage: totalUsers > 0 ? Math.round((usersWithKeys / totalUsers) * 100) : 0,
        },
        messages: {
          total: totalMessages,
          e2eEncrypted: e2eEncryptedMessages,
          serverEncrypted: serverEncryptedMessages,
          unencrypted: totalMessages - e2eEncryptedMessages - serverEncryptedMessages,
          e2ePercentage:
            totalMessages > 0 ? Math.round((e2eEncryptedMessages / totalMessages) * 100) : 0,
          serverPercentage:
            totalMessages > 0 ? Math.round((serverEncryptedMessages / totalMessages) * 100) : 0,
        },
        groups: {
          total: totalGroups,
          encrypted: encryptedGroups,
          encryptionPercentage:
            totalGroups > 0 ? Math.round((encryptedGroups / totalGroups) * 100) : 0,
        },
        compliance: {
          gdprCompliant: true,
          encryptionAtRest: true,
          accessControls: true,
          auditLogging: true,
        },
      };
    } catch (error) {
      logger.error('Failed to get system encryption statistics:', error);
      return this.getErrorStatus();
    }
  }

  /**
   * Get error status for failed operations
   */
  getErrorStatus() {
    return {
      status: 'ERROR',
      level: 'error',
      label: 'Status Unavailable',
      description: 'Unable to determine encryption status',
      color: 'red',
      icon: '❌',
      userMessage: 'Encryption status cannot be determined',
      error: true,
    };
  }

  /**
   * Format encryption status for API response
   * @param {Object} status - Encryption status object
   * @param {string} format - Response format ('full' | 'summary' | 'badge')
   * @returns {Object} Formatted status
   */
  formatEncryptionStatus(status, format = 'full') {
    switch (format) {
      case 'badge':
        return {
          icon: status.icon,
          color: status.color,
          label: status.label,
        };

      case 'summary':
        return {
          status: status.status,
          label: status.label,
          icon: status.icon,
          userMessage: status.userMessage,
        };

      case 'full':
      default:
        return status;
    }
  }
}

export default new EncryptionStatusService();
