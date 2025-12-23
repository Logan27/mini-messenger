import Joi from 'joi';

/**
 * Authentication validation schemas
 */
export const authValidation = {
  // User registration schema
  register: Joi.object({
    username: Joi.string()
      .pattern(/^[a-zA-Z0-9_]+$/)
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters',
        'any.required': 'Username is required',
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': 'Email must be less than 255 characters',
        'any.required': 'Email is required',
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
        'any.required': 'Password is required',
      }),

    firstName: Joi.string().trim().max(100).allow('').optional().messages({
      'string.max': 'First name cannot exceed 100 characters',
    }),

    lastName: Joi.string().trim().max(100).allow('').optional().messages({
      'string.max': 'Last name cannot exceed 100 characters',
    }),

    avatar: Joi.string().uri().max(500).allow('').optional().messages({
      'string.uri': 'Avatar must be a valid URL',
      'string.max': 'Avatar URL cannot exceed 500 characters',
    }),
  }),

  // User login schema
  login: Joi.object({
    identifier: Joi.string().required().messages({
      'any.required': 'Username or email is required',
    }),

    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // Email verification schema
  verifyEmail: Joi.object({
    token: Joi.string().length(32).pattern(new RegExp('^[a-f0-9]+$')).required().messages({
      'string.length': 'Verification token must be 32 characters long',
      'string.pattern.base': 'Verification token contains invalid characters',
      'any.required': 'Verification token is required',
    }),
  }),

  // Password reset request schema
  forgotPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  // Password reset confirmation schema
  resetPassword: Joi.object({
    token: Joi.string().length(64).pattern(new RegExp('^[a-f0-9]+$')).required().messages({
      'string.length': 'Reset token must be 64 characters long',
      'string.pattern.base': 'Reset token contains invalid characters',
      'any.required': 'Reset token is required',
    }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
        'any.required': 'Password is required',
      }),

    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  }),

  // Refresh token schema
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),

  // Change password schema (for authenticated users)
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),

    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
        'any.required': 'New password is required',
      }),

    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  }),
};

/**
 * Group validation schemas
 */
export const groupValidation = {
  // Group creation schema
  createGroup: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Group name must be at least 1 character long',
      'string.max': 'Group name cannot exceed 100 characters',
      'any.required': 'Group name is required',
    }),

    description: Joi.string().trim().max(1000).allow('').optional().messages({
      'string.max': 'Group description cannot exceed 1000 characters',
    }),

    groupType: Joi.string().valid('private', 'public').default('private').optional().messages({
      'any.only': 'Group type must be either private or public',
    }),

    avatar: Joi.string().uri().max(500).allow('').optional().messages({
      'string.uri': 'Avatar must be a valid URL',
      'string.max': 'Avatar URL cannot exceed 500 characters',
    }),

    initialMembers: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(19) // Max 20 total including creator
      .unique()
      .optional()
      .messages({
        'array.min': 'Group must have at least 1 initial member',
        'array.max': 'Cannot add more than 19 initial members (20 total including creator)',
        'array.unique': 'Duplicate members are not allowed',
      }),
  }),

  // Group update schema
  updateGroup: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      'string.min': 'Group name must be at least 1 character long',
      'string.max': 'Group name cannot exceed 100 characters',
    }),

    description: Joi.string().trim().max(1000).allow('').optional().messages({
      'string.max': 'Group description cannot exceed 1000 characters',
    }),

    groupType: Joi.string().valid('private', 'public').optional().messages({
      'any.only': 'Group type must be either private or public',
    }),

    avatar: Joi.string().uri().max(500).allow('').optional().messages({
      'string.uri': 'Avatar must be a valid URL',
      'string.max': 'Avatar URL cannot exceed 500 characters',
    }),
  }),

  // Add member schema
  addMember: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required',
    }),

    role: Joi.string().valid('admin', 'moderator', 'user').default('user').optional().messages({
      'any.only': 'Role must be admin, moderator, or user',
    }),
  }),

  // Update member role schema
  updateMemberRole: Joi.object({
    role: Joi.string().valid('admin', 'moderator', 'user').required().messages({
      'any.only': 'Role must be admin, moderator, or user',
      'any.required': 'Role is required',
    }),
  }),

  // Group ID parameter schema
  groupId: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Group ID must be a valid UUID',
      'any.required': 'Group ID is required',
    }),
  }),

  // User ID parameter schema
  userId: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required',
    }),
  }),
};

/**
 * General validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query'). Defaults to 'body'
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: `Request ${source} validation failed`,
          details: errors,
        },
      });
    }

    // Replace the source with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate request parameters
 */
export const validateParams = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Request parameters validation failed',
          details: errors,
        },
      });
    }

    req.params = value;
    next();
  };
};

/**
 * Validate UUID format
 */
export function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default { authValidation, groupValidation, validate, validateParams, validateUUID };
