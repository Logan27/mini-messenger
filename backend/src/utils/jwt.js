import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';

import logger from './logger.js';

/**
 * JWT utility functions
 */

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'user',
  };

  const jwtConfig = {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  };

  // Generate access token (shorter lived)
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    ...jwtConfig,
    expiresIn: config.jwt.expiresIn || '24h',
    subject: user.id,
  });

  // Generate refresh token (longer lived)
  const refreshToken = jwt.sign(
    {
      ...payload,
      type: 'refresh',
    },
    config.jwt.refreshSecret,
    {
      ...jwtConfig,
      expiresIn: config.jwt.refreshExpiresIn || '7d',
      subject: user.id,
    }
  );

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    return {
      valid: true,
      decoded,
    };
  } catch (error) {
    logger.error('Access token verification failed:', error.message);

    return {
      valid: false,
      error: error.message,
      expired: error.name === 'TokenExpiredError',
    };
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      valid: true,
      decoded,
    };
  } catch (error) {
    logger.error('Refresh token verification failed:', error.message);

    return {
      valid: false,
      error: error.message,
      expired: error.name === 'TokenExpiredError',
    };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Generate a secure random token for email verification or password reset
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

export default {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateSecureToken,
  hashPassword,
  comparePassword,
};
