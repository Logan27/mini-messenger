# Code Guidelines

Production-ready patterns for the messenger application. These guidelines are mandatory for all code written in this project.

## Project Structure

```
messenger/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── validators/      # Input validation schemas
│   │   ├── socket/          # Socket.io handlers
│   │   └── jobs/            # Background jobs
│   ├── tests/
│   └── app.js
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── store/           # State management
│   │   ├── api/             # API client
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Helper functions
│   │   └── constants/       # Constants and enums
│   └── public/
└── docker-compose.yml
```

## Backend Patterns

### 1. Controller Pattern

**DO:** Thin controllers, delegate to services
```javascript
// controllers/messageController.js
const messageService = require('../services/messageService');
const { validateMessage } = require('../validators/messageValidator');

const sendMessage = async (req, res, next) => {
  try {
    const { error } = validateMessage(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const message = await messageService.sendMessage({
      senderId: req.user.id,
      recipientId: req.body.recipientId,
      content: req.body.content,
      encrypted: req.body.encrypted
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage };
```

**DON'T:** Business logic in controllers
```javascript
// ❌ BAD
const sendMessage = async (req, res) => {
  const message = await Message.create(req.body); // Direct DB access
  // ... complex business logic here
  res.json(message);
};
```

### 2. Service Pattern

**DO:** Centralize business logic, use transactions
```javascript
// services/messageService.js
const db = require('../config/database');
const { encryptMessage } = require('../utils/encryption');
const notificationService = require('./notificationService');

const sendMessage = async ({ senderId, recipientId, content, encrypted }) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Encrypt if needed
    const encryptedContent = encrypted
      ? await encryptMessage(content, recipientId)
      : null;

    // Create message
    const message = await db.Message.create({
      sender_id: senderId,
      recipient_id: recipientId,
      content: encrypted ? null : content,
      encrypted_content: encryptedContent,
      is_delivered: false,
      is_read: false
    }, { transaction });

    // Send notification
    await notificationService.sendMessageNotification(recipientId, message, { transaction });

    await transaction.commit();
    return message;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { sendMessage };
```

### 3. Middleware Pattern

**DO:** Composable, reusable middleware
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.userId);

    if (!req.user || req.user.status !== 'active') {
      throw new UnauthorizedError('Invalid or inactive user');
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new UnauthorizedError('Admin access required'));
  }
  next();
};

module.exports = { authenticate, requireAdmin };
```

### 4. Error Handling

**DO:** Centralized error handling with custom error classes
```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

module.exports = { AppError, UnauthorizedError, ValidationError, NotFoundError };
```

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Don't leak error details in production
  const response = {
    error: err.isOperational ? err.message : 'Internal server error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

module.exports = errorHandler;
```

### 5. Input Validation

**DO:** Validate all inputs with Joi
```javascript
// validators/messageValidator.js
const Joi = require('joi');

const messageSchema = Joi.object({
  recipientId: Joi.number().integer().required(),
  groupId: Joi.number().integer().optional(),
  content: Joi.string().max(10000).required(),
  messageType: Joi.string().valid('text', 'file', 'image', 'video').default('text'),
  fileId: Joi.number().integer().optional(),
  encrypted: Joi.boolean().default(false)
}).xor('recipientId', 'groupId'); // One of these must be present

const validateMessage = (data) => messageSchema.validate(data, { abortEarly: false });

module.exports = { validateMessage };
```

## Database Patterns

### 1. Model Definition (Sequelize)

**DO:** Define models with proper constraints and indexes
```javascript
// models/Message.js
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    encrypted_content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_delivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'messages',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['sender_id', 'created_at'] },
      { fields: ['recipient_id', 'created_at'] },
      { fields: ['created_at'] }
    ]
  });

  Message.associate = (models) => {
    Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
    Message.belongsTo(models.User, { foreignKey: 'recipient_id', as: 'recipient' });
  };

  return Message;
};
```

### 2. Query Optimization

**DO:** Use indexes, limit results, avoid N+1 queries
```javascript
// services/messageService.js
const getConversation = async (userId, otherUserId, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  const messages = await db.Message.findAll({
    where: {
      [Op.or]: [
        { sender_id: userId, recipient_id: otherUserId },
        { sender_id: otherUserId, recipient_id: userId }
      ],
      deleted_at: null
    },
    include: [
      { model: db.User, as: 'sender', attributes: ['id', 'username', 'avatar_url'] },
      { model: db.File, as: 'file', attributes: ['id', 'filename', 'file_path', 'mime_type'] }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return messages;
};
```

**DON'T:** Load unnecessary data or trigger N+1 queries
```javascript
// ❌ BAD - N+1 query problem
const messages = await db.Message.findAll({ where: { sender_id: userId } });
for (const msg of messages) {
  msg.sender = await db.User.findByPk(msg.sender_id); // N+1 query!
}
```

### 3. Redis Caching

**DO:** Cache frequently accessed data with TTL
```javascript
// utils/cache.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

const cache = {
  async get(key) {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key, value, ttlSeconds = 300) {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key) {
    await client.del(key);
  },

  async delPattern(pattern) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
};

module.exports = cache;
```

```javascript
// services/userService.js
const cache = require('../utils/cache');

const getUserProfile = async (userId) => {
  const cacheKey = `user:${userId}`;

  // Try cache first
  let user = await cache.get(cacheKey);

  if (!user) {
    user = await db.User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'avatar_url', 'bio', 'online_status']
    });

    if (user) {
      await cache.set(cacheKey, user, 600); // 10 min TTL
    }
  }

  return user;
};

const updateUserProfile = async (userId, updates) => {
  const user = await db.User.update(updates, { where: { id: userId } });

  // Invalidate cache
  await cache.del(`user:${userId}`);

  return user;
};
```

## Real-time Communication

### 1. Socket.io Event Handling

**DO:** Structured event handlers with validation
```javascript
// socket/messageHandler.js
const messageService = require('../services/messageService');
const { validateMessage } = require('../validators/messageValidator');

module.exports = (io, socket) => {
  // Send message
  socket.on('message.send', async (data, callback) => {
    try {
      const { error } = validateMessage(data);
      if (error) {
        return callback({ error: error.details[0].message });
      }

      const message = await messageService.sendMessage({
        senderId: socket.user.id,
        ...data
      });

      // Emit to recipient
      const recipientSocketId = await getSocketId(data.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message.new', message);
      }

      // Confirm to sender
      callback({ success: true, message });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Typing indicator
  socket.on('message.typing', async ({ recipientId, isTyping }) => {
    const recipientSocketId = await getSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('message.typing', {
        userId: socket.user.id,
        isTyping
      });
    }
  });

  // Mark as read
  socket.on('message.read', async ({ messageId }, callback) => {
    try {
      await messageService.markAsRead(messageId, socket.user.id);

      const message = await db.Message.findByPk(messageId);
      const senderSocketId = await getSocketId(message.sender_id);

      if (senderSocketId) {
        io.to(senderSocketId).emit('message.read', { messageId });
      }

      callback({ success: true });
    } catch (err) {
      callback({ error: err.message });
    }
  });
};
```

### 2. WebRTC Signaling

**DO:** Secure signaling with proper error handling
```javascript
// socket/callHandler.js
const callService = require('../services/callService');

module.exports = (io, socket) => {
  // Initiate call
  socket.on('call.initiate', async ({ recipientId, callType }, callback) => {
    try {
      // Validate call type
      if (!['audio', 'video'].includes(callType)) {
        return callback({ error: 'Invalid call type' });
      }

      // Create call record
      const call = await callService.initiateCall({
        callerId: socket.user.id,
        recipientId,
        callType
      });

      // Notify recipient
      const recipientSocketId = await getSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call.incoming', {
          callId: call.id,
          caller: {
            id: socket.user.id,
            username: socket.user.username,
            avatar_url: socket.user.avatar_url
          },
          callType
        });
      } else {
        // Recipient offline
        await callService.updateCallStatus(call.id, 'missed');
        return callback({ error: 'Recipient is offline' });
      }

      callback({ success: true, callId: call.id });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // WebRTC signaling
  socket.on('call.signal', async ({ callId, recipientId, signal }, callback) => {
    try {
      const recipientSocketId = await getSocketId(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call.signal', {
          callId,
          signal,
          from: socket.user.id
        });
        callback({ success: true });
      } else {
        callback({ error: 'Recipient disconnected' });
      }
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // End call
  socket.on('call.end', async ({ callId, recipientId }, callback) => {
    try {
      await callService.endCall(callId);

      const recipientSocketId = await getSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call.ended', { callId });
      }

      callback({ success: true });
    } catch (err) {
      callback({ error: err.message });
    }
  });
};
```

## Security Patterns

### 1. Authentication

**DO:** Secure JWT implementation with refresh tokens
```javascript
// utils/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = { generateTokens, hashPassword, comparePassword };
```

### 2. End-to-End Encryption

**DO:** Use libsodium for E2E encryption
```javascript
// utils/encryption.js
const sodium = require('libsodium-wrappers');

const encryptMessage = async (message, recipientPublicKey) => {
  await sodium.ready;

  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const encrypted = sodium.crypto_box_easy(
    message,
    nonce,
    Buffer.from(recipientPublicKey, 'base64'),
    Buffer.from(process.env.SERVER_PRIVATE_KEY, 'base64')
  );

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64')
  };
};

const decryptMessage = async (encryptedData, nonce, senderPublicKey) => {
  await sodium.ready;

  const decrypted = sodium.crypto_box_open_easy(
    Buffer.from(encryptedData, 'base64'),
    Buffer.from(nonce, 'base64'),
    Buffer.from(senderPublicKey, 'base64'),
    Buffer.from(process.env.SERVER_PRIVATE_KEY, 'base64')
  );

  return Buffer.from(decrypted).toString('utf8');
};

module.exports = { encryptMessage, decryptMessage };
```

### 3. Rate Limiting

**DO:** Multi-level rate limiting
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      client: redis,
      prefix: 'rl:'
    })
  });
};

const loginLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5,
  'Too many login attempts, try again in 1 minute'
);

const apiLimiter = createRateLimiter(
  60 * 1000,
  100,
  'Too many requests, try again in 1 minute'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10,
  'Too many uploads, try again in 1 hour'
);

module.exports = { loginLimiter, apiLimiter, uploadLimiter };
```

### 4. Input Sanitization

**DO:** Sanitize all user inputs
```javascript
// middleware/sanitize.js
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove XSS
        req.body[key] = DOMPurify.sanitize(req.body[key]);
        // Trim whitespace
        req.body[key] = validator.trim(req.body[key]);
        // Escape HTML if needed
        if (key !== 'password') {
          req.body[key] = validator.escape(req.body[key]);
        }
      }
    });
  }
  next();
};

module.exports = sanitizeInput;
```

## File Handling

### 1. File Upload with Validation

**DO:** Validate file type, size, and scan for malware
```javascript
// middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const NodeClam = require('clamscan');

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'video/mp4'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADS_DIR + '/temp');
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${hash}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('File type not allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const scanFile = async (filePath) => {
  const clam = await new NodeClam().init({
    clamdscan: { path: '/usr/bin/clamdscan' }
  });

  const { isInfected, viruses } = await clam.scanFile(filePath);

  if (isInfected) {
    throw new Error(`File infected: ${viruses.join(', ')}`);
  }
};

module.exports = { upload, scanFile };
```

### 2. Image Processing

**DO:** Generate thumbnails, optimize images
```javascript
// utils/imageProcessor.js
const sharp = require('sharp');
const path = require('path');

const generateThumbnail = async (inputPath, outputPath, width = 200, height = 200) => {
  await sharp(inputPath)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return outputPath;
};

const optimizeImage = async (inputPath, outputPath) => {
  const metadata = await sharp(inputPath).metadata();

  let pipeline = sharp(inputPath);

  // Resize if too large
  if (metadata.width > 1920 || metadata.height > 1920) {
    pipeline = pipeline.resize(1920, 1920, { fit: 'inside' });
  }

  // Optimize based on format
  if (metadata.format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  } else if (metadata.format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
};

module.exports = { generateThumbnail, optimizeImage };
```

## Background Jobs

### 1. Job Queue (Bull)

**DO:** Process jobs asynchronously with retry logic
```javascript
// jobs/messageCleanupJob.js
const Queue = require('bull');
const db = require('../config/database');

const messageCleanupQueue = new Queue('message-cleanup', {
  redis: process.env.REDIS_URL
});

messageCleanupQueue.process(async (job) => {
  const { days = 30 } = job.data;

  const deletedCount = await db.Message.destroy({
    where: {
      created_at: {
        [Op.lt]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    }
  });

  return { deletedCount };
});

const scheduleCleanup = async (days = 30) => {
  await messageCleanupQueue.add(
    { days },
    {
      repeat: { cron: '0 3 * * *' }, // Daily at 3 AM
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    }
  );
};

module.exports = { scheduleCleanup };
```

### 2. Scheduled Tasks (node-cron)

**DO:** Use cron for recurring tasks
```javascript
// jobs/scheduler.js
const cron = require('node-cron');
const backupService = require('../services/backupService');
const messageService = require('../services/messageService');

const initScheduler = () => {
  // Daily backup at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await backupService.createBackup();
      console.log('Backup completed successfully');
    } catch (err) {
      console.error('Backup failed:', err);
    }
  });

  // Cleanup old messages daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await messageService.cleanupOldMessages(30);
      console.log('Message cleanup completed');
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  });

  // Session cleanup every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await sessionService.cleanupExpiredSessions();
    } catch (err) {
      console.error('Session cleanup failed:', err);
    }
  });
};

module.exports = { initScheduler };
```

## Frontend Patterns

### 1. Component Structure (React)

**DO:** Functional components with hooks
```javascript
// components/MessageList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { messageAPI } from '../api/messageAPI';

const MessageList = ({ conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messageAPI.getConversation(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('message.new', handleNewMessage);

    return () => {
      socket.off('message.new', handleNewMessage);
    };
  }, [socket, conversationId]);

  if (loading) return <Spinner />;

  return (
    <div className="message-list">
      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
};

export default MessageList;
```

### 2. State Management (Zustand)

**DO:** Organize state by domain
```javascript
// store/authStore.js
import create from 'zustand';
import { authAPI } from '../api/authAPI';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,

  login: async (credentials) => {
    const { user, accessToken } = await authAPI.login(credentials);
    localStorage.setItem('token', accessToken);
    set({ user, token: accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const { accessToken } = await authAPI.refresh();
    localStorage.setItem('token', accessToken);
    set({ token: accessToken });
  },

  updateProfile: async (updates) => {
    const user = await authAPI.updateProfile(updates);
    set({ user });
  }
}));

export default useAuthStore;
```

### 3. API Client

**DO:** Centralized API client with interceptors
```javascript
// api/client.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Token expired, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshToken();
        return client(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
```

### 4. Custom Hooks

**DO:** Reusable logic in custom hooks
```javascript
// hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return socket;
};

export default useSocket;
```

## Testing Patterns

### 1. Unit Tests

**DO:** Test business logic in isolation
```javascript
// tests/services/messageService.test.js
const messageService = require('../../src/services/messageService');
const db = require('../../src/config/database');

describe('MessageService', () => {
  beforeEach(async () => {
    await db.sequelize.sync({ force: true });
  });

  describe('sendMessage', () => {
    it('creates message with encryption', async () => {
      const sender = await db.User.create({
        username: 'alice',
        email: 'alice@example.com',
        password_hash: 'hash'
      });

      const recipient = await db.User.create({
        username: 'bob',
        email: 'bob@example.com',
        password_hash: 'hash'
      });

      const message = await messageService.sendMessage({
        senderId: sender.id,
        recipientId: recipient.id,
        content: 'Hello',
        encrypted: true
      });

      expect(message.encrypted_content).toBeDefined();
      expect(message.content).toBeNull();
      expect(message.is_delivered).toBe(false);
    });

    it('rolls back on error', async () => {
      await expect(
        messageService.sendMessage({
          senderId: 999, // Non-existent
          recipientId: 1,
          content: 'Test'
        })
      ).rejects.toThrow();

      const count = await db.Message.count();
      expect(count).toBe(0);
    });
  });
});
```

### 2. Integration Tests

**DO:** Test API endpoints end-to-end
```javascript
// tests/api/messages.test.js
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Message API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create test user and get token
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

    token = res.body.accessToken;
    userId = res.body.user.id;
  });

  describe('POST /api/messages', () => {
    it('sends message successfully', async () => {
      const recipient = await db.User.create({
        username: 'recipient',
        email: 'recipient@example.com',
        password_hash: 'hash'
      });

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: recipient.id,
          content: 'Hello'
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Hello');
      expect(res.body.sender_id).toBe(userId);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({ content: 'Test' });

      expect(res.status).toBe(401);
    });
  });
});
```

## Logging

### 1. Structured Logging (Winston)

**DO:** Use structured logging with levels
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'messenger-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

**DO:** Log important events
```javascript
// services/authService.js
const logger = require('../utils/logger');

const login = async (email, password, ip) => {
  logger.info('Login attempt', { email, ip });

  const user = await db.User.findOne({ where: { email } });

  if (!user || !await comparePassword(password, user.password_hash)) {
    logger.warn('Failed login attempt', { email, ip });
    throw new UnauthorizedError('Invalid credentials');
  }

  logger.info('Successful login', { userId: user.id, ip });
  return generateTokens(user);
};
```

## Performance

### 1. Database Connection Pooling

**DO:** Configure optimal pool size
```javascript
// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
```

### 2. Query Optimization

**DO:** Use database indexes and limit queries
```javascript
// services/searchService.js
const searchMessages = async (userId, query, limit = 20) => {
  // Use full-text search with index
  const messages = await db.sequelize.query(`
    SELECT m.*, u.username, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = :userId OR m.recipient_id = :userId)
      AND to_tsvector('english', m.content) @@ plainto_tsquery('english', :query)
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT :limit
  `, {
    replacements: { userId, query, limit },
    type: db.sequelize.QueryTypes.SELECT
  });

  return messages;
};
```

## Common Pitfalls

### ❌ DON'T: Store sensitive data in logs
```javascript
// BAD
logger.info('User login', { email, password }); // Never log passwords!
```

### ❌ DON'T: Trust client input
```javascript
// BAD
const user = await User.findByPk(req.body.userId); // SQL injection risk
```

### ❌ DON'T: Use synchronous operations
```javascript
// BAD
const data = fs.readFileSync('file.txt'); // Blocks event loop
```

### ❌ DON'T: Ignore error cases
```javascript
// BAD
const message = await Message.create(data); // No try/catch
```

### ❌ DON'T: Return stack traces to clients
```javascript
// BAD
res.status(500).json({ error: err.stack }); // Leaks internal info
```

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Redis connection tested
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Error logging enabled
- [ ] Monitoring dashboards setup
- [ ] Backup system tested
- [ ] Security headers configured (helmet.js)
- [ ] CORS properly configured
- [ ] File upload limits enforced
- [ ] WebSocket authentication working
- [ ] Background jobs scheduled
- [ ] Health check endpoint responding

## Code Review Checklist

- [ ] All inputs validated
- [ ] Database queries optimized
- [ ] Error handling implemented
- [ ] Security vulnerabilities checked
- [ ] No sensitive data in logs
- [ ] Tests passing
- [ ] No console.log statements
- [ ] Async/await used correctly
- [ ] No N+1 query problems
- [ ] Cache invalidation logic correct
- [ ] Rate limiting applied
- [ ] Authentication/authorization correct
- [ ] WebSocket events properly handled
- [ ] File uploads validated and scanned
- [ ] Transactions used where needed
