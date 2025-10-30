import { config } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with request correlation ID
  const requestId = req.id || 'unknown';
  console.error(`[${requestId}] ❌ Error:`, {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    name: err.name,
    code: err.code,
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors?.map(e => e.message).join(', ') || 'Validation error';
    error = { message, statusCode: 400 };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    const message = `${field} already exists`;
    error = { message, statusCode: 409 };
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Referenced resource does not exist';
    error = { message, statusCode: 400 };
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection failed';
    error = { message, statusCode: 503 };
  }

  // Sequelize timeout error
  if (err.name === 'SequelizeTimeoutError') {
    const message = 'Database operation timed out';
    error = { message, statusCode: 504 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid or malformed token';
    error = {
      message,
      statusCode: 401,
      type: 'INVALID_TOKEN',
      code: 'JWT_MALFORMED',
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired';
    error = {
      message,
      statusCode: 401,
      type: 'TOKEN_EXPIRED',
      code: 'JWT_EXPIRED',
    };
  }

  // Authentication-specific errors
  if (err.type === 'INVALID_CREDENTIALS') {
    error = {
      message: 'Invalid username/email or password',
      statusCode: 401,
      type: 'INVALID_CREDENTIALS',
      code: 'AUTH_INVALID_CREDENTIALS',
    };
  }

  if (err.type === 'ACCOUNT_LOCKED') {
    error = {
      message: err.message || 'Account is temporarily locked',
      statusCode: 423,
      type: 'ACCOUNT_LOCKED',
      code: 'AUTH_ACCOUNT_LOCKED',
    };
  }

  if (err.type === 'EMAIL_NOT_VERIFIED') {
    error = {
      message: 'Email address not verified',
      statusCode: 403,
      type: 'EMAIL_NOT_VERIFIED',
      code: 'AUTH_EMAIL_NOT_VERIFIED',
    };
  }

  if (err.type === 'USER_NOT_FOUND') {
    error = {
      message: 'User not found',
      statusCode: 404,
      type: 'USER_NOT_FOUND',
      code: 'AUTH_USER_NOT_FOUND',
    };
  }

  if (err.type === 'SESSION_EXPIRED') {
    error = {
      message: 'Session has expired',
      statusCode: 401,
      type: 'SESSION_EXPIRED',
      code: 'AUTH_SESSION_EXPIRED',
    };
  }

  if (err.type === 'INSUFFICIENT_PERMISSIONS') {
    error = {
      message: 'Insufficient permissions for this operation',
      statusCode: 403,
      type: 'INSUFFICIENT_PERMISSIONS',
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
    };
  }

  if (err.type === 'ACCESS_DENIED') {
    error = {
      message: 'Access denied',
      statusCode: 403,
      type: 'ACCESS_DENIED',
      code: 'AUTH_ACCESS_DENIED',
    };
  }

  if (err.type === 'USER_INACTIVE') {
    error = {
      message: 'User account is inactive',
      statusCode: 403,
      type: 'USER_INACTIVE',
      code: 'AUTH_USER_INACTIVE',
    };
  }

  // Joi validation errors
  if (err.isJoi) {
    const message = err.details?.map(detail => detail.message).join(', ') || 'Validation error';
    error = { message, statusCode: 400 };
  }

  // Rate limiting errors
  if (err.name === 'RateLimitError') {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 413 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
  }

  // Multer file errors
  if (err.code === 'MULTER_LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 413 };
  }

  if (err.code === 'MULTER_LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'MULTER_LIMIT_FIELD_KEY') {
    const message = 'Field name too long';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'MULTER_LIMIT_FIELD_VALUE') {
    const message = 'Field value too long';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'MULTER_LIMIT_FIELD_COUNT') {
    const message = 'Too many fields';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'MULTER_LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    const message = 'Cross-origin request blocked';
    error = { message, statusCode: 403 };
  }

  // Default server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Create consistent error response structure
  const errorResponse = {
    success: false,
    error: {
      type: error.type || 'INTERNAL_ERROR',
      message: message,
      ...(error.code && { code: error.code }),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Add detailed error information in development only
  if (config.isDevelopment) {
    errorResponse.error.details = {
      stack: err.stack,
      originalError: {
        name: err.name,
        message: err.message,
        code: err.code,
      },
    };
  }

  // Don't leak sensitive information in production
  if (config.isProduction && statusCode === 500) {
    errorResponse.error.message = 'An unexpected error occurred';
    errorResponse.error.type = 'INTERNAL_ERROR';
  }

  res.status(statusCode).json(errorResponse);
};
