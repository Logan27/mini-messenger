import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { config } from '../config/index.js';

let logger = null;

export const initializeLogger = () => {
  if (logger) {
    return logger;
  }

  const transports = [];

  // Console transport for development and tests
  if (config.isDevelopment || config.isTest) {
    transports.push(
      new winston.transports.Console({
        level: config.logging.level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        ),
      })
    );
  }

  // File transport for production
  if (config.isProduction) {
    transports.push(
      new DailyRotateFile({
        level: config.logging.level,
        filename: config.logging.filePath,
        datePattern: 'YYYY-MM-DD',
        maxSize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      })
    );
  }

  logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports,
    exitOnError: false,
  });

  return logger;
};

export const getLogger = () => {
  if (!logger) {
    initializeLogger();
  }
  return logger;
};

// Create default export for convenience
export default getLogger();
