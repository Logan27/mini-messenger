import Queue from 'bull';
import { Op } from 'sequelize';

import { config } from '../config/index.js';
import { Message } from '../models/index.js';
import logger from '../utils/logger.js';

const redisConfig = {
  redis: config.redis.url,
};

// Queue default options with retry logic
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 seconds
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 200, // Keep last 200 failed jobs for debugging
};

/**
 * Email Queue
 * Handles asynchronous email sending
 */
export const emailQueue = new Queue('email', redisConfig);

/**
 * File Processing Queue
 * Handles file uploads, thumbnails, and virus scanning
 */
export const fileQueue = new Queue('file_processing', redisConfig);

/**
 * Message Cleanup Queue
 * Handles periodic cleanup of old messages (30-day retention)
 */
export const messageCleanupQueue = new Queue('message_cleanup', redisConfig);

/**
 * Notification Queue
 * Handles push notification sending
 */
export const notificationQueue = new Queue('notifications', redisConfig);

/**
 * Email Queue Processor
 */
emailQueue.process(async job => {
  const { to, subject, html, text, template, data } = job.data;

  try {
    const emailService = (await import('./emailService.js')).default;

    if (template) {
      // Send templated email
      await emailService.sendTemplatedEmail(to, subject, template, data);
    } else {
      // Send plain email
      await emailService.sendEmail(to, subject, html || text);
    }

    logger.info(`Email sent successfully to ${to}`, { jobId: job.id });
    return { success: true, to, subject };
  } catch (error) {
    logger.error(`Email sending failed for job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
});

/**
 * File Processing Queue Processor
 */
fileQueue.process(async job => {
  const { fileId, filePath, operation, options } = job.data;

  try {
    logger.info(`Processing file ${fileId}, operation: ${operation}`, { jobId: job.id });

    if (operation === 'thumbnail') {
      const thumbnailService = (await import('./thumbnailService.js')).default;
      await thumbnailService.generateThumbnail(filePath, options);
    } else if (operation === 'virus-scan') {
      const fileUploadService = (await import('./fileUploadService.js')).default;
      const { userId } = job.data;
      await fileUploadService.scanFile(filePath, fileId, userId);
    } else if (operation === 'process') {
      const fileUploadService = (await import('./fileUploadService.js')).default;
      await fileUploadService.processFile(fileId, options);
    }

    logger.info(`File processing completed for ${fileId}`, { jobId: job.id });
    return { success: true, fileId, operation };
  } catch (error) {
    logger.error(`File processing failed for job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
});

/**
 * Message Cleanup Queue Processor
 * Deletes messages older than the retention period
 */
messageCleanupQueue.process(async job => {
  const { days = 30 } = job.data;

  try {
    logger.info(`Starting message cleanup for messages older than ${days} days`, { jobId: job.id });

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deletedCount = await Message.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    logger.info(`Message cleanup completed: ${deletedCount} messages deleted`, { jobId: job.id });
    return { success: true, deletedCount, days };
  } catch (error) {
    logger.error(`Message cleanup failed for job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
});

/**
 * Notification Queue Processor
 */
notificationQueue.process(async job => {
  const { userId, title, body, data, tokens } = job.data;

  try {
    const notificationService = (await import('./notificationService.js')).default;
    await notificationService.sendPushNotification({ userId, title, body, data, tokens });

    logger.info(`Push notification sent to user ${userId}`, { jobId: job.id });
    return { success: true, userId };
  } catch (error) {
    logger.error(`Push notification failed for job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
});

// Event listeners for all queues
const setupQueueListeners = (queue, queueName) => {
  queue.on('completed', (job, result) => {
    logger.info(`${queueName} job ${job.id} completed`, { result });
  });

  queue.on('failed', (job, err) => {
    logger.error(`${queueName} job ${job?.id} failed`, {
      error: err.message,
      stack: err.stack,
      attempts: job?.attemptsMade,
      data: job?.data,
    });
  });

  queue.on('error', error => {
    logger.error(`${queueName} queue error`, { error: error.message });
  });

  queue.on('stalled', job => {
    logger.warn(`${queueName} job ${job.id} stalled`);
  });
};

setupQueueListeners(emailQueue, 'Email');
setupQueueListeners(fileQueue, 'File Processing');
setupQueueListeners(messageCleanupQueue, 'Message Cleanup');
setupQueueListeners(notificationQueue, 'Notification');

/**
 * Schedule recurring message cleanup job
 * Runs daily at 3 AM
 */
export const scheduleMessageCleanup = async () => {
  const retentionDays = parseInt(process.env.MESSAGE_RETENTION_DAYS || '30', 10);

  await messageCleanupQueue.add(
    { days: retentionDays },
    {
      ...defaultJobOptions,
      repeat: { cron: '0 3 * * *' }, // Daily at 3 AM
      jobId: 'message-cleanup-daily', // Prevent duplicates
    }
  );

  logger.info(`Message cleanup scheduled: daily at 3 AM (${retentionDays} day retention)`);
};

/**
 * Add email to queue
 * @param {Object} emailData - Email data
 * @param {Object} options - Job options
 */
export const queueEmail = async (emailData, options = {}) => {
  return emailQueue.add(emailData, {
    ...defaultJobOptions,
    ...options,
  });
};

/**
 * Add file processing to queue
 * @param {Object} fileData - File data
 * @param {Object} options - Job options
 */
export const queueFileProcessing = async (fileData, options = {}) => {
  return fileQueue.add(fileData, {
    ...defaultJobOptions,
    ...options,
  });
};

/**
 * Add notification to queue
 * @param {Object} notificationData - Notification data
 * @param {Object} options - Job options
 */
export const queueNotification = async (notificationData, options = {}) => {
  return notificationQueue.add(notificationData, {
    ...defaultJobOptions,
    ...options,
  });
};

/**
 * Gracefully close all queues
 */
export const closeQueues = async () => {
  await Promise.all([
    emailQueue.close(),
    fileQueue.close(),
    messageCleanupQueue.close(),
    notificationQueue.close(),
  ]);
  logger.info('All queues closed');
};

logger.info('Queue service initialized with retry logic and scheduled jobs');
