import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import logger from '../utils/logger.js';

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Input string to sanitize
 * @param {boolean} escapeHtml - Whether to escape HTML entities
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, escapeHtml = true) => {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove XSS with DOMPurify
  let sanitized = DOMPurify.sanitize(input);

  // Trim whitespace
  sanitized = validator.trim(sanitized);

  // Optionally escape HTML entities
  if (escapeHtml) {
    sanitized = validator.escape(sanitized);
  }

  return sanitized;
};

/**
 * Recursively sanitize object properties
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} excludeFields - Fields to exclude from sanitization
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, excludeFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, excludeFields));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip fields that shouldn't be sanitized
    if (excludeFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      // Don't escape HTML for certain fields that might need formatting
      const shouldEscapeHtml = !['bio', 'description', 'content'].includes(key);
      sanitized[key] = sanitizeString(value, shouldEscapeHtml);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, excludeFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware to sanitize request inputs
 * Protects against XSS attacks by cleaning user input
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Fields that should not be sanitized (e.g., passwords, tokens)
    const excludeFields = [
      'password',
      'currentPassword',
      'newPassword',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'twoFactorToken',
      'twoFactorSecret',
      'emailVerificationToken',
      'passwordResetToken',
      'encryptedContent',
      'publicKey',
      'privateKey',
      'signature',
      'signal', // WebRTC signaling data
      'metadata' // File metadata (contains mimeType with slashes)
    ];

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, excludeFields);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, excludeFields);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, excludeFields);
    }

    next();
  } catch (error) {
    logger.error('Error in sanitization middleware:', error);
    // Don't block request on sanitization errors
    next();
  }
};

/**
 * Sanitize HTML content while preserving safe tags
 * Useful for rich text content like bios, descriptions
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
  if (typeof html !== 'string') {
    return html;
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
};

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate and sanitize
 * @returns {string|null} Sanitized email or null if invalid
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return null;
  }

  const trimmed = validator.trim(email.toLowerCase());

  if (!validator.isEmail(trimmed)) {
    return null;
  }

  return validator.normalizeEmail(trimmed);
};

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate and sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
const sanitizeUrl = (url) => {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = validator.trim(url);

  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    return null;
  }

  return trimmed;
};

export default sanitizeInput;

export {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  sanitizeHtml,
  sanitizeEmail,
  sanitizeUrl
};
