import { Op } from 'sequelize';

import { User, AuditLog } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Audit Log Model
 */
// Import the AuditLog model from models/index.js instead of redefining it
// This ensures we use the correct model definition with proper field mappings

/**
 * Audit Service
 * Handles comprehensive audit logging for security and compliance
 */
class AuditService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize audit service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Sync audit log model
      await AuditLog.sync();

      this.initialized = true;
      logger.info('Audit service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize audit service:', error);
      throw error;
    }
  }

  /**
   * Log admin action
   */
  async logAdminAction({
    requestId,
    adminId,
    action,
    resource,
    resourceId,
    details = {},
    ipAddress,
    userAgent,
    severity = 'medium',
    status = 'success',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: adminId,
        action,
        resourceType: resource,
        resourceId: resourceId,
        details,
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.info('Admin action logged', {
        auditLogId: auditLog.id,
        adminId,
        action,
        resource,
        resourceId,
        severity,
        status,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log admin action:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log user profile change
   */
  async logProfileChange({
    requestId,
    userId,
    changes,
    ipAddress,
    userAgent,
    severity = 'low',
    status = 'success',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action: 'profile_update',
        resourceType: 'user_profile',
        resourceId: userId,
        details: {
          changes,
          sensitiveChange: this.isSensitiveChange(changes),
        },
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.info('Profile change logged', {
        auditLogId: auditLog.id,
        userId,
        changes: Object.keys(changes),
        sensitiveChange: this.isSensitiveChange(changes),
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log profile change:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent({
    requestId,
    userId,
    action,
    details = {},
    ipAddress,
    userAgent,
    severity = 'medium',
    status = 'success',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action,
        resourceType: 'authentication',
        details,
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.info('Auth event logged', {
        auditLogId: auditLog.id,
        userId,
        action,
        severity,
        status,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log auth event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent({
    requestId,
    userId,
    action,
    details = {},
    ipAddress,
    userAgent,
    severity = 'high',
    status = 'warning',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action,
        resourceType: 'security',
        details,
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.warn('Security event logged', {
        auditLogId: auditLog.id,
        userId,
        action,
        severity,
        status,
        details,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log security event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log encryption operation
   */
  async logEncryptionOperation({
    requestId,
    userId,
    operation,
    algorithm,
    messageId = null,
    recipientId = null,
    groupId = null,
    keyVersion = null,
    details = {},
    ipAddress,
    userAgent,
    severity = 'low',
    status = 'success',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action: `encryption_${operation}`,
        resourceType: 'message_encryption',
        resourceId: messageId,
        details: {
          operation,
          algorithm,
          recipientId,
          groupId,
          keyVersion,
          ...details,
        },
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.info('Encryption operation logged', {
        auditLogId: auditLog.id,
        userId,
        operation,
        algorithm,
        messageId,
        recipientId,
        groupId,
        severity,
        status,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log encryption operation:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log key rotation operation
   */
  async logKeyRotation({
    requestId,
    userId,
    keyType,
    previousVersion,
    newVersion,
    details = {},
    ipAddress,
    userAgent,
    severity = 'medium',
    status = 'success',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action: 'key_rotation',
        resourceType: 'encryption_keys',
        details: {
          keyType,
          previousVersion,
          newVersion,
          rotatedAt: new Date().toISOString(),
          ...details,
        },
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      logger.info('Key rotation logged', {
        auditLogId: auditLog.id,
        userId,
        keyType,
        previousVersion,
        newVersion,
        severity,
        status,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log key rotation:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log decryption attempt
   */
  async logDecryptionAttempt({
    requestId,
    userId,
    operation,
    algorithm,
    messageId = null,
    targetUserId = null,
    groupId = null,
    success,
    details = {},
    ipAddress,
    userAgent,
    severity = success ? 'low' : 'medium',
    status = success ? 'success' : 'failure',
    errorMessage = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const auditLog = await AuditLog.create({
        userId: userId,
        action: `decryption_${operation}`,
        resourceType: 'message_decryption',
        resourceId: messageId,
        details: {
          operation,
          algorithm,
          targetUserId,
          groupId,
          success,
          ...details,
        },
        ipAddress: ipAddress,
        userAgent: userAgent,
        severity,
        status,
        errorMessage: errorMessage,
      });

      if (!success) {
        logger.warn('Decryption attempt failed', {
          auditLogId: auditLog.id,
          userId,
          operation,
          algorithm,
          messageId,
          errorMessage,
        });
      } else {
        logger.info('Decryption successful', {
          auditLogId: auditLog.id,
          userId,
          operation,
          algorithm,
          messageId,
        });
      }

      return auditLog;
    } catch (error) {
      logger.error('Failed to log decryption attempt:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Get encryption-related audit logs
   */
  async getEncryptionLogs({
    page = 1,
    limit = 50,
    userId = null,
    operation = null,
    algorithm = null,
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const offset = (page - 1) * limit;
      const whereClause = {
        resourceType: {
          [Op.in]: ['message_encryption', 'message_decryption', 'encryption_keys'],
        },
      };

      if (userId) {
        whereClause.userId = userId;
      }
      if (operation) {
        whereClause.action = { [Op.like]: `%${operation}%` };
      }
      if (algorithm) {
        whereClause.details = { algorithm };
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = startDate;
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = endDate;
        }
      }

      const { rows: logs, count: totalLogs } = await AuditLog.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
      });

      const totalPages = Math.ceil(totalLogs / limit);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve encryption logs:', error);
      throw error;
    }
  }

  /**
   * Check if profile change is sensitive
   */
  isSensitiveChange(changes) {
    const sensitiveFields = ['email', 'username', 'password'];
    return sensitiveFields.some(field => changes[field] !== undefined);
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs({
    page = 1,
    limit = 50,
    userId = null,
    adminId = null,
    action = null,
    resource = null,
    severity = null,
    status = null,
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      if (userId) {
        whereClause.userId = userId;
      }
      if (adminId) {
        whereClause.userId = adminId;
      }
      if (action) {
        whereClause.action = action;
      }
      if (resource) {
        whereClause.resourceType = resource;
      }
      if (severity) {
        whereClause.severity = severity;
      }
      if (status) {
        whereClause.status = status;
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = startDate;
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = endDate;
        }
      }

      const { rows: logs, count: totalLogs } = await AuditLog.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email'],
            required: false,
          },
          {
            model: User,
            as: 'admin',
            attributes: ['username', 'email'],
            required: false,
          },
        ],
      });

      const totalPages = Math.ceil(totalLogs / limit);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const deletedCount = await AuditLog.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      logger.info('Audit log cleanup completed', { deletedCount, cutoffDate });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const auditService = new AuditService();
export default auditService;

// Export model for migrations
export { AuditLog };
