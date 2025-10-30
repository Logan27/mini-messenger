import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import { Sequelize } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Get application health status including database, Redis, and service checks
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: string
 *                 redis:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: string
 *       503:
 *         description: Application is unhealthy
 */
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      services: {
        websocket: await checkWebSocketHealth(),
        fileUpload: checkFileUploadHealth(),
        email: checkEmailServiceHealth(),
      },
    };

    // Determine overall health status
    const isHealthy =
      Object.values(healthCheck.services).every(service => service.status === 'healthy') &&
      healthCheck.database.status === 'healthy';

    healthCheck.status = isHealthy ? 'healthy' : 'unhealthy';

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Get comprehensive health information including system metrics, process stats, and service status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 system:
 *                   type: object
 *                   description: System information
 *                 process:
 *                   type: object
 *                   description: Process metrics
 *                 database:
 *                   type: object
 *                 redis:
 *                   type: object
 *                 services:
 *                   type: object
 *                 metrics:
 *                   type: object
 *       503:
 *         description: Application is unhealthy
 */
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',

      // System metrics
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        usedMemory: os.totalmem() - os.freemem(),
        loadAverage: os.loadavg(),
        networkInterfaces: os.networkInterfaces(),
      },

      // Process metrics
      process: {
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
      },

      // Database health
      database: await checkDatabaseHealth(),

      // Redis health
      redis: await checkRedisHealth(),

      // External services
      services: {
        websocket: checkWebSocketHealth(),
        fileUpload: checkFileUploadHealth(),
        email: checkEmailServiceHealth(),
        virusScanner: checkVirusScannerHealth(),
      },

      // Application metrics
      metrics: {
        activeConnections: getActiveConnections(),
        pendingMessages: await getPendingMessagesCount(),
        activeUsers: await getActiveUsersCount(),
        fileUploadsToday: await getFileUploadsToday(),
      },
    };

    // Determine overall health status
    const criticalServices = ['database', 'redis'];
    const isHealthy = criticalServices.every(
      service => detailedHealth[service]?.status === 'healthy'
    );

    detailedHealth.status = isHealthy ? 'healthy' : 'unhealthy';

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes readiness probe - checks if application is ready to serve traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                 redis:
 *                   type: object
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    const databaseHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth();

    const isReady = databaseHealthy.status === 'healthy' && redisHealthy.status === 'healthy';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      database: databaseHealthy,
      redis: redisHealthy,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes liveness probe - checks if application process is alive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database health check
async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    const database = await import('../config/database.js');
    // Test database connection with proper method
    await database.sequelize.query('SELECT 1');

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Redis health check
async function checkRedisHealth() {
  try {
    const startTime = Date.now();
    const redis = await import('../config/redis.js');

    // Test Redis connection
    await redis.pingRedis();

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// WebSocket health check
async function checkWebSocketHealth() {
  try {
    const { default: wsService } = await import('../services/websocket.js');
    const isConnected = wsService && wsService.getConnectionCount() >= 0;

    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      connections: wsService ? wsService.getConnectionCount() : 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// File upload health check
function checkFileUploadHealth() {
  try {
    // Check if upload directory exists and is writable
    const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');

    const exists = fs.existsSync(uploadPath);
    const writable = exists
      ? (() => {
          try {
            fs.accessSync(uploadPath, fs.constants.W_OK);
            return true;
          } catch {
            return false;
          }
        })()
      : false;

    return {
      status: exists && writable ? 'healthy' : 'unhealthy',
      uploadPath,
      exists,
      writable,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Email service health check
function checkEmailServiceHealth() {
  try {
    const emailService = import('../services/emailService.js');

    return {
      status: emailService ? 'healthy' : 'unhealthy',
      configured: !!process.env.SMTP_HOST,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Virus scanner health check
function checkVirusScannerHealth() {
  try {
    // Check if ClamAV is running and accessible
    const virusService = import('../services/virusUpdateService.js');

    return {
      status: virusService ? 'healthy' : 'unhealthy',
      lastUpdate: virusService ? virusService.getLastUpdateTime() : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Helper functions for metrics
function getActiveConnections() {
  // This would need to be implemented based on your WebSocket service
  return 0;
}

async function getPendingMessagesCount() {
  try {
    const { Message } = await import('../models/index.js');
    return await Message.count({
      where: {
        status: 'pending',
      },
    });
  } catch (error) {
    return 0;
  }
}

async function getActiveUsersCount() {
  try {
    const { User, Session } = await import('../models/index.js');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return await Session.count({
      where: {
        lastActivity: {
          [Sequelize.Op.gte]: oneHourAgo,
        },
      },
      include: [
        {
          model: User,
          where: {
            isApproved: true,
          },
        },
      ],
    });
  } catch (error) {
    return 0;
  }
}

async function getFileUploadsToday() {
  try {
    const { File } = await import('../models/index.js');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await File.count({
      where: {
        createdAt: {
          [Sequelize.Op.gte]: today,
        },
      },
    });
  } catch (error) {
    return 0;
  }
}

export default router;