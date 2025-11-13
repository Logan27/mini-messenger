import path from 'path';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import responseTime from 'response-time';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import adminRoutes from './routes/admin.js';
import announcementRoutes from './routes/announcements.js';
import authRoutes from './routes/auth.js';
import callRoutes from './routes/calls.js';
import contactRoutes from './routes/contacts.js';
import encryptionRoutes from './routes/encryption.js';
import fileRoutes from './routes/files.js';
import groupRoutes from './routes/groups.js';
import healthRoutes from './routes/health.js';
import messageRoutes from './routes/messages.js';
import notificationSettingsRoutes from './routes/notification-settings.js';
import notificationRoutes from './routes/notifications.js';
import pushNotificationRoutes from './routes/pushNotifications.js';
import twoFactorRoutes from './routes/twoFactor.js';
import userRoutes from './routes/users.js';
import fileCleanupService from './services/fileCleanupService.js';
import fileUploadService from './services/fileUploadService.js';
import thumbnailService from './services/thumbnailService.js';
import virusUpdateService from './services/virusUpdateService.js';
import { initializeWebSocket } from './services/websocket.js';
import './jobs/dataRetentionJob.js';
import startCallExpiryJob from './jobs/expireCallsJob.js';

const app = express();

// Trust proxy configuration
if (config.trustProxy.enabled) {
  app.set('trust proxy', config.trustProxy.hops);
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'http:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(cors(config.security.cors));

// Compression middleware
app.use(
  compression({
    threshold: config.compression?.threshold || 1024,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response time tracking
app.use(responseTime());

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logging
app.use(requestLogger);

// Rate limiting - DISABLED FOR WEBSOCKET TESTING
// const limiter = rateLimit({
//   windowMs: config.security.rateLimit.windowMs,
//   max: process.env.NODE_ENV === 'test' ? 1000 : config.security.rateLimit.maxRequests,
//   skipSuccessfulRequests: config.security.rateLimit.skipSuccessfulRequests,
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiting to all routes - DISABLED FOR TESTING
// app.use(limiter);

// Serve static files from uploads directory with CORS headers
const uploadPath = path.resolve(config.fileUpload.uploadPath);
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  },
  express.static(uploadPath)
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/2fa', twoFactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/push', pushNotificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/health', healthRoutes);

// API Documentation (Swagger)
if (config.swagger.enabled) {
  // Swagger UI options
  const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Messenger API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  // Serve Swagger JSON
  app.get(`${config.swagger.path}.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(config.swagger.path, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  console.log(`📚 Swagger UI will be available at ${config.swagger.path}`);
}

// Export the Express app (server creation handled by server.js)
export const expressApp = app;

// Export server creation function for use in server.js
export const createServer = () => {
  const server = app.listen(config.port, config.host, () => {
    console.log(`🚀 Server running on ${config.host}:${config.port}`);
    console.log(
      `📚 API Documentation available at http://localhost:${config.port}${config.swagger.path}`
    );
    console.log(`🏥 Health check available at http://localhost:${config.port}/health`);
  });

  // Initialize WebSocket server
  initializeWebSocket(server);

  return server;
};

export const initializeServices = async () => {
  // Initialize file upload service (required for file operations)
  try {
    await fileUploadService.initialize();
    console.log('✅ File upload service initialized');
  } catch (error) {
    console.warn('Failed to initialize file upload service:', error.message);
  }

  // Initialize virus update service (will skip on Windows)
  try {
    await virusUpdateService.initialize();
  } catch (error) {
    console.warn('Failed to initialize virus update service:', error.message);
  }

  // Initialize thumbnail service
  try {
    await thumbnailService.initialize();
  } catch (error) {
    console.warn('Failed to initialize thumbnail service:', error.message);
  }

  // Initialize file cleanup service
  try {
    await fileCleanupService.initialize();
  } catch (error) {
    console.warn('Failed to initialize file cleanup service:', error.message);
  }

  // FIX BUG-C008: Initialize call expiry job
  try {
    startCallExpiryJob();
    console.log('✅ Call expiry job initialized');
  } catch (error) {
    console.warn('Failed to initialize call expiry job:', error.message);
  }
};

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
