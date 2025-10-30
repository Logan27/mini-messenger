import fs from 'fs';
import path from 'path';

import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import { config } from '../config/index.js';

// Create logs directory if it doesn't exist
const logsDir = path.dirname(config.logging.filePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Winston logger configuration
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
      ({
        timestamp,
        level,
        message,
        requestId,
        method,
        url,
        statusCode,
        duration,
        ip,
        userAgent,
        ...meta
      }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          request: {
            id: requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
          },
          ...meta,
        });
      }
    )
  ),
  defaultMeta: { service: 'messenger-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(
          ({ timestamp, level, message, requestId, method, url, statusCode, duration }) => {
            return `[${timestamp}] [${requestId}] ${method} ${url} ${statusCode} - ${duration}ms - ${message}`;
          }
        )
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.filePath,
      maxsize: parseInt(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
    }),
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
    }),
    // HTTP requests file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'requests.log'),
      maxsize: parseInt(config.logging.maxSize),
      maxFiles: config.logging.maxFiles,
    }),
  ],
});

// Request logger middleware
export const requestLogger = (req, res, next) => {
  // Generate unique request ID if not present
  const requestId = req.id || uuidv4();
  req.id = requestId;

  // Set start time for duration calculation
  req.startTime = Date.now();

  // Store original end method
  const originalEnd = res.end;

  // Override end method to log response
  res.end = function (chunk, encoding) {
    // Call original end method
    const result = originalEnd.call(this, chunk, encoding);

    // Calculate request duration
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Log the request
    logger.log({
      level: logLevel,
      message: `${method} ${url}`,
      requestId,
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return result;
  };

  next();
};

// Export logger for use in other modules
export { logger };
