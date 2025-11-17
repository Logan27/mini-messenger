import csrf from 'csurf';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

/**
 * CSRF protection using double-submit cookie pattern
 * More suitable for APIs than session-based CSRF
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.isProduction, // Only use secure cookies in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Ignore CSRF for certain routes
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * Error handler for CSRF validation failures
 */
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // CSRF token validation failed
  logger.warn('CSRF token validation failed', {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  res.status(403).json({
    success: false,
    error: {
      type: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token. Please refresh the page and try again.',
      code: 'CSRF_VALIDATION_FAILED',
    },
  });
};

/**
 * Middleware to attach CSRF token to response
 * This allows clients to retrieve the token
 */
const attachCsrfToken = (req, res, next) => {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
};

/**
 * Routes that should be excluded from CSRF protection
 * Add webhook endpoints or third-party integrations here
 */
const csrfExemptRoutes = [
  '/api/webhooks',
  '/api/health',
  '/api/auth/login', // Login doesn't need CSRF on first request
  '/api/auth/register', // Registration doesn't need CSRF on first request
  '/api/csrf-token', // Token endpoint itself
];

/**
 * Conditional CSRF middleware
 * Skips CSRF for exempt routes
 */
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF for exempt routes
  const isExempt = csrfExemptRoutes.some(route => req.path.startsWith(route));

  if (isExempt) {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, next);
};

export {
  csrfProtection,
  csrfErrorHandler,
  attachCsrfToken,
  conditionalCsrfProtection,
  csrfExemptRoutes
};

export default conditionalCsrfProtection;
