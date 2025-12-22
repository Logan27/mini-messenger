import { doubleCsrf } from 'csrf-csrf';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks using the Double Submit Cookie Pattern
 */

/**
 * CSRF secret for HMAC token generation
 * In production, this should come from environment variables
 */
const csrfSecret = config.security.csrfSecret;

/**
 * Configure CSRF protection using csrf-csrf (modern replacement for deprecated csurf)
 * Uses the Double Submit Cookie Pattern for stateless CSRF protection
 */
const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    secure: config.isProduction, // Only use secure cookies in production
    sameSite: config.isProduction ? 'strict' : 'lax', // Use 'lax' in development for localhost cross-port requests
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  },
  size: 64, // Size of the generated token
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods that don't require CSRF protection
  getSessionIdentifier: req => {
    // Use session ID if available, otherwise use a static identifier for stateless mode
    return req.session?.id || req.user?.id || '';
  },
  getTokenFromRequest: req => {
    // Try to get token from common locations
    return (
      req.headers['x-csrf-token'] ||
      req.headers['csrf-token'] ||
      req.body?._csrf ||
      req.body?.csrfToken
    );
  },
});

/**
 * Routes that should be excluded from CSRF protection
 * Add webhook endpoints or third-party integrations here
 */
const csrfExemptRoutes = [
  '/api/webhooks',
  '/api/health',
  '/api/auth/login', // Login doesn't need CSRF on first request
  '/api/auth/register', // Registration doesn't need CSRF on first request
  '/api/auth/refresh', // Token refresh for mobile apps
  '/api/auth/logout', // Logout endpoint for mobile apps
  '/api/csrf-token', // Token endpoint itself
  '/api/auth/2fa/setup', // Exempt 2FA setup to resolve local dev cross-port issues
];

/**
 * Conditional CSRF middleware
 * Skips CSRF for exempt routes and authenticated mobile apps
 */
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Skip CSRF for exempt routes
  const isExempt = csrfExemptRoutes.some(route => req.path.startsWith(route));

  if (isExempt) {
    return next();
  }

  // Verify mobile app with secret header
  const mobileAppHeader = req.get('X-Mobile-App');
  const mobileAppSecret = req.get('X-Mobile-App-Secret');
  const expectedSecret = config.security.mobileAppSecret;

  if (mobileAppHeader === 'true' && mobileAppSecret === expectedSecret) {
    logger.debug('Skipping CSRF for authenticated mobile app', {
      path: req.path,
      method: req.method,
      hasValidSecret: true,
    });
    return next();
  }

  // If mobile header present but invalid secret, log warning and apply CSRF
  if (mobileAppHeader === 'true' && mobileAppSecret !== expectedSecret) {
    logger.warn('Mobile app header present but invalid secret', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Debug CSRF for 2FA setup
  if (req.path.includes('2fa/setup')) {
    const token = req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf;
    const cookie = req.cookies && req.cookies['_csrf'];
    logger.info('CSRF Debug for 2FA Setup:', {
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 5) : 'none',
      hasCookie: !!cookie,
      cookiePrefix: cookie ? cookie.substring(0, 5) : 'none',
      headers: Object.keys(req.headers)
    });
  }

  // Apply CSRF protection for web clients and invalid mobile requests
  doubleCsrfProtection(req, res, next);
};

/**
 * Error handler for CSRF validation failures
 */
const csrfErrorHandler = (err, req, res, next) => {
  // Check if this is a CSRF error
  if (err === invalidCsrfTokenError) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });

    return res.status(403).json({
      success: false,
      error: {
        type: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
        code: 'CSRF_VALIDATION_FAILED',
      },
    });
  }

  // Not a CSRF error, pass to next error handler
  next(err);
};

/**
 * Middleware to generate and attach CSRF token to response
 * This allows clients to retrieve the token for subsequent requests
 */
const attachCsrfToken = (req, res, next) => {
  try {
    const token = generateCsrfToken(req, res);
    res.locals.csrfToken = token;
  } catch (error) {
    logger.error('Error generating CSRF token', { error: error.message });
  }
  next();
};

/**
 * Generate CSRF token for a request
 * This is a wrapper to expose the token generation function
 */
const generateToken = (req, res) => {
  return generateCsrfToken(req, res);
};

export {
  doubleCsrfProtection as csrfProtection,
  csrfErrorHandler,
  attachCsrfToken,
  conditionalCsrfProtection,
  csrfExemptRoutes,
  generateToken,
};

export default conditionalCsrfProtection;
