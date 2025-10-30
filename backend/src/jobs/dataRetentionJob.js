import cron from 'node-cron';

import dataRetentionService from '../services/dataRetentionService.js';
import logger from '../utils/logger.js';

// Schedule cleanup tasks to run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  logger.info('Running data retention cleanup jobs...');
  dataRetentionService.cleanupMessages();
  dataRetentionService.cleanupCallLogs();
  dataRetentionService.cleanupAuditLogs();
});

logger.info('Data retention job scheduled.');
