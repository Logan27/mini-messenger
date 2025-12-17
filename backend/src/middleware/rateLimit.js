import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * General API rate limiting
 * Applies to most API endpoints
 * Increased limits for testing/development
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP (increased for testing)
  message: {
    success: false,
    error: {
      type: 'API_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting in test environment
    return config.nodeEnv === 'test';
  },
  handler: (req, res) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        type: 'API_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again in 15 minutes.',
      },
    });
  },
});

/**
 * Strict authentication rate limiting for login attempts
 * More restrictive for login endpoints to prevent brute force
 * Increased limits for testing/development
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per window per IP (increased for testing)
  message: {
    success: false,
    error: {
      type: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: req => {
    // Skip rate limiting in test environment
    return config.nodeEnv === 'test';
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      identifier: req.body?.identifier || req.body?.email,
    });

    res.status(429).json({
      success: false,
      error: {
        type: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      },
    });
  },
});

/**
 * Registration rate limiting
 * Prevents mass registration abuse
 * Increased limits for testing/development
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 registration attempts per hour per IP (increased for testing)
  message: {
    success: false,
    error: {
      type: 'REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again in 1 hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting in test environment
    return config.nodeEnv === 'test';
  },
  handler: (req, res) => {
    logger.warn(`Registration rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      email: req.body?.email,
    });

    res.status(429).json({
      success: false,
      error: {
        type: 'REGISTER_RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please try again in 1 hour.',
      },
    });
  },
});

/**
 * Password reset rate limiting
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 password reset requests per hour per IP (increased for testing)
  message: {
    success: false,
    error: {
      type: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again in 1 hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        type: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset requests. Please try again in 1 hour.',
      },
    });
  },
});

/**
 * Progressive delay for failed login attempts
 * This slows down responses after failed attempts to prevent brute force
 */
export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per 15 minutes without delay
  delayMs: 500, // Add 500ms of delay per request above the limit
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
});

/**
 * Email verification rate limiting
 */
export const emailVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 email verification attempts per hour per IP
  message: {
    success: false,
    error: {
      type: 'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many email verification attempts. Please try again in 1 hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global rate limiting for sensitive operations
 */
export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 sensitive operations per hour per IP
  message: {
    success: false,
    error: {
      type: 'SENSITIVE_OPERATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations. Please try again in 1 hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Redis-based rate limiting for distributed systems
 * This is a more advanced implementation for production use
 */
export class RedisRateLimit {
  constructor() {
    this.redis = null;
  }

  async initialize() {
    try {
      const redis = await import('redis');
      this.redis = redis.createClient({
        url: process.env.REDIS_URL,
      });

      await this.redis.connect();
      logger.info('Redis rate limiter initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis rate limiter:', error);
      throw error;
    }
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(key, maxRequests, windowMs) {
    if (!this.redis) {
      await this.initialize();
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await this.redis.zRemRangeByScore(key, '-inf', windowStart);

      // Count current entries
      const count = await this.redis.zCard(key);

      if (count >= maxRequests) {
        return {
          allowed: false,
          count,
          resetTime: await this.getResetTime(key, windowMs),
        };
      }

      // Add current request
      await this.redis.zAdd(key, {
        score: now,
        value: now.toString(),
      });

      // Set expiry for the key
      await this.redis.expire(key, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        count: count + 1,
        resetTime: now + windowMs,
      };
    } catch (error) {
      logger.error('Redis rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        count: 0,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Get reset time for a rate limit key
   */
  async getResetTime(key, windowMs) {
    try {
      const oldestEntry = await this.redis.zRange(key, 0, 0, { WITHSCORES: true });

      if (oldestEntry.length > 0) {
        return parseInt(oldestEntry[1]) + windowMs;
      }

      return Date.now() + windowMs;
    } catch (error) {
      logger.error('Failed to get reset time:', error);
      return Date.now() + windowMs;
    }
  }

  /**
   * Clean up old entries for a key
   */
  async cleanup(key, windowMs) {
    if (!this.redis) {
      return;
    }

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      await this.redis.zRemRangeByScore(key, '-inf', windowStart);
    } catch (error) {
      logger.error('Failed to cleanup rate limit entries:', error);
    }
  }
}

// Create singleton instance
const redisRateLimit = new RedisRateLimit();

/**
 * User-based rate limiting middleware
 * Limits requests per authenticated user
 */
export const userRateLimit = (req, res, next) => {
  // DISABLED FOR TESTING - Skip rate limiting
  next();
};

/**
 * Enhanced login rate limiting with progressive delays
 */
export const enhancedAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: req => {
    // Progressive limits based on IP history
    const key = `login_attempts:${req.ip}`;
    // This would be enhanced with Redis to track historical attempts
    return 5; // 5 attempts per 15 minutes
  },
  message: {
    success: false,
    error: {
      type: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip,
  handler: (req, res) => {
    logger.warn(`Enhanced auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        type: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
      },
    });
  },
});

/**
 * Redis-based distributed rate limiting
 */
export class DistributedRateLimit {
  constructor() {
    this.redis = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const redis = await import('redis');
      this.redis = redis.createClient({
        url: process.env.REDIS_URL,
      });

      await this.redis.connect();
      this.initialized = true;
      logger.info('Distributed rate limiter initialized');
    } catch (error) {
      logger.error('Failed to initialize distributed rate limiter:', error);
      throw error;
    }
  }

  middleware(options = {}) {
    const {
      windowMs = 60 * 1000,
      maxRequests = 100,
      keyGenerator = req => req.ip,
      message = 'Too many requests',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
    } = options;

    return async (req, res, next) => {
      try {
        await this.initialize();

        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        await this.redis.zRemRangeByScore(key, '-inf', windowStart);

        // Count current requests
        const requestCount = await this.redis.zCard(key);

        if (requestCount >= maxRequests) {
          logger.warn(`Distributed rate limit exceeded for key: ${key}`, {
            key,
            requestCount,
            maxRequests,
            windowMs,
          });

          return res.status(429).json({
            success: false,
            error: {
              type: 'DISTRIBUTED_RATE_LIMIT_EXCEEDED',
              message,
            },
          });
        }

        // Add current request
        await this.redis.zAdd(key, {
          score: now,
          value: now.toString(),
        });

        // Set expiry for the key
        await this.redis.expire(key, Math.ceil(windowMs / 1000));

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': Math.max(0, maxRequests - requestCount - 1),
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
        });

        next();
      } catch (error) {
        logger.error('Distributed rate limit error:', error);
        // Fail open - allow request if Redis is down
        next();
      }
    };
  }

  async cleanup() {
    if (this.redis && this.initialized) {
      await this.redis.quit();
    }
  }
}

// Create singleton instance
const distributedRateLimit = new DistributedRateLimit();

export { redisRateLimit, distributedRateLimit };

export default {
  apiRateLimit,
  authRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  loginSlowDown,
  emailVerificationRateLimit,
  sensitiveOperationRateLimit,
  RedisRateLimit,
  redisRateLimit,
};
