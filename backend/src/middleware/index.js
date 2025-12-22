import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from '../config/index.js';


import rateLimitMiddleware, {
  apiRateLimit,
  authRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  userRateLimit,
  enhancedAuthRateLimit,
  distributedRateLimit,
} from './rateLimit.js';

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = config.security.cors.origin;

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.security.cors.credentials,
  methods: config.security.cors.methods,
  allowedHeaders: config.security.cors.allowedHeaders,
  optionsSuccessStatus: 200,
};

// Security headers with Helmet
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

// Body parsing middleware
const bodyParser = express.json({
  limit: '10mb',
  strict: true,
});

const urlencodedParser = express.urlencoded({
  extended: true,
  limit: '10mb',
});

// Compression middleware
const compressionOptions = {
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
};

// Trust proxy configuration
const trustProxyConfig = config.trustProxy.enabled ? { trust: config.trustProxy.hops } : false;

export const setupMiddleware = app => {
  // Trust proxy configuration
  if (trustProxyConfig) {
    app.set('trust proxy', trustProxyConfig.trust);
  }

  // Security middleware
  app.use(helmet(helmetConfig));

  // CORS middleware
  app.use(cors(corsOptions));

  // Compression middleware
  app.use(compression(compressionOptions));

  // Body parsing middleware
  app.use(bodyParser);
  app.use(urlencodedParser);

  // Static file serving for uploads
  app.use('/uploads', express.static(config.fileUpload.uploadPath));

  // Request ID and timing middleware
  app.use((req, res, next) => {
    req.id =
      req.headers['x-request-id'] ||
      req.get('x-request-id') ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.startTime = Date.now();
    res.setHeader('x-request-id', req.id);
    next();
  });

  // Request logging middleware (basic)
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
  });
};

export {
  corsOptions,
  helmetConfig,
  bodyParser,
  urlencodedParser,
  compressionOptions,
  trustProxyConfig,
  // Rate limiting middleware
  apiRateLimit,
  authRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  userRateLimit,
  enhancedAuthRateLimit,
  distributedRateLimit,

};
