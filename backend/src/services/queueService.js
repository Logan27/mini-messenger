import Queue from 'bull';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const redisConfig = {
  redis: config.redis.url,
};

export const emailQueue = new Queue('email', redisConfig);
export const fileQueue = new Queue('file_processing', redisConfig);

// Processors
emailQueue.process(async job => {
  const { emailService } = await import('./emailService.js');
  const { to, subject, html } = job.data;
  await emailService.sendEmail(to, subject, html);
});

fileQueue.process(async job => {
  const { fileUploadService } = await import('./fileUploadService.js');
  const { file, options } = job.data;
  await fileUploadService.processFile(file, options);
});

// Event listeners
emailQueue.on('completed', job => {
  logger.info(`Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} failed: ${err.message}`);
});

fileQueue.on('completed', job => {
  logger.info(`File processing job ${job.id} completed`);
});

fileQueue.on('failed', (job, err) => {
  logger.error(`File processing job ${job.id} failed: ${err.message}`);
});

logger.info('Queue service initialized.');
