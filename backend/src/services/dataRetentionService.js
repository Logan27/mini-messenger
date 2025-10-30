import { Op } from 'sequelize';

import { Message, Call, AuditLog } from '../models/index.js';
import logger from '../utils/logger.js';

class DataRetentionService {
  async cleanupMessages() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Message.destroy({
        where: {
          createdAt: {
            [Op.lt]: thirtyDaysAgo,
          },
        },
      });
      logger.info(`Cleaned up ${result} old messages.`);
    } catch (error) {
      logger.error('Error cleaning up messages', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async cleanupCallLogs() {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await Call.destroy({
        where: {
          createdAt: {
            [Op.lt]: ninetyDaysAgo,
          },
        },
      });
      logger.info(`Cleaned up ${result} old call logs.`);
    } catch (error) {
      logger.error('Error cleaning up call logs', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async cleanupAuditLogs() {
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const result = await AuditLog.destroy({
        where: {
          createdAt: {
            [Op.lt]: oneYearAgo,
          },
        },
      });
      logger.info(`Cleaned up ${result} old audit logs.`);
    } catch (error) {
      logger.error('Error cleaning up audit logs', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

const dataRetentionService = new DataRetentionService();
export default dataRetentionService;
