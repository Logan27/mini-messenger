import rateLimit from 'express-rate-limit';

import { getRedisClient } from '../config/redis.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'TOKEN_MISSING',
          message: 'Access token is required',
        },
      });
    }

    // Verify token
    const tokenResult = verifyAccessToken(token);

    if (!tokenResult.valid) {
      if (tokenResult.expired) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'TOKEN_EXPIRED',
            message: 'Access token has expired',
          },
        });
      } else {
        return res.status(401).json({
          success: false,
          error: {
            type: 'INVALID_TOKEN',
            message: 'Invalid access token',
          },
        });
      }
    }

    const decoded = tokenResult.decoded;

    // Check if session exists in database (additional security)
    const session = await Session.findByToken(token);

    if (!session || session.isExpired()) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'SESSION_EXPIRED',
          message: 'Session has expired or is invalid',
        },
      });
    }

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Check if user is active (you can add more status checks here)
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        error: {
          type: 'USER_INACTIVE',
          message: 'User account is inactive',
        },
      });
    }

    // Update session last accessed time
    await session.updateLastAccessed();

    // Attach user and session to request object
    req.user = user;
    req.session = session || null;
    req.token = token;

    // Debug logging
    logger.info(`Authentication successful for user: ${user.username} (${user.id})`);

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Authentication failed. Please try again.',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token is provided, just doesn't attach user
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return next();
    }

    // Verify token
    const tokenResult = verifyAccessToken(token);

    if (!tokenResult.valid) {
      return next();
    }

    const decoded = tokenResult.decoded;

    // Check if session exists in database
    const session = await Session.findByToken(token);

    if (!session || session.isExpired()) {
      return next();
    }

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return next();
    }

    // Attach user and session to request object if valid
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    // Don't fail the request if optional auth fails
    logger.error('Optional authentication middleware error:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
      });
    }

    const userRole = req.user.role || 'user';

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
        },
      });
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize('admin');

/**
 * Moderator and admin authorization middleware
 */
export const requireModerator = authorize('admin', 'moderator');

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
      });
    }

    const userRole = req.user.role || 'user';
    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];

    if (userRole !== 'admin' && req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'ACCESS_DENIED',
          message: 'Access denied. You can only access your own resources.',
        },
      });
    }

    next();
  };
};

/**
 * Rate limiting for authentication endpoints
 * Implemented using express-rate-limit with Redis store
 */

// Redis-based rate limit store
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    try {
      const redis = getRedisClient();
      const fullKey = this.prefix + key;
      const current = await redis.incr(fullKey);

      if (current === 1) {
        // First request - set expiry
        await redis.expire(fullKey, 900); // 15 minutes
      }

      const ttl = await redis.ttl(fullKey);

      return {
        totalHits: current,
        resetTime: new Date(Date.now() + ttl * 1000),
      };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      // Fallback to allowing request if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + 900000),
      };
    }
  }

  async decrement(key) {
    try {
      const redis = getRedisClient();
      await redis.decr(this.prefix + key);
    } catch (error) {
      logger.error('Redis rate limit decrement error:', error);
    }
  }

  async resetKey(key) {
    try {
      const redis = getRedisClient();
      await redis.del(this.prefix + key);
    } catch (error) {
      logger.error('Redis rate limit reset error:', error);
    }
  }
}

// Login rate limiting - 50 attempts per 15 minutes (increased for testing)
// Production: reduce to 5 attempts
export const loginRateLimit = rateLimit({
  store: new RedisStore({ prefix: 'rl:login:' }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Register rate limiting - 30 attempts per hour (increased for testing)
// Production: reduce to 3 attempts
export const registerRateLimit = rateLimit({
  store: new RedisStore({ prefix: 'rl:register:' }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 30,
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again in an hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting - 30 attempts per hour (increased for testing)
// Production: reduce to 3 attempts
export const passwordResetRateLimit = rateLimit({
  store: new RedisStore({ prefix: 'rl:reset:' }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 30,
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts. Please try again in an hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting - 1000 requests per 15 minutes (increased for testing)
// Production: reduce to 100 requests
export const apiRateLimit = rateLimit({
  store: new RedisStore({ prefix: 'rl:api:' }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Backward compatibility
export const authRateLimit = loginRateLimit;

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireModerator,
  requireOwnershipOrAdmin,
  authRateLimit,
  loginRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
};
