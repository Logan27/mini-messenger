import Joi from 'joi';

/**
 * Authentication validation schemas
 */

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  profilePicture: Joi.string().uri().optional(),
  bio: Joi.string().max(500).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorToken: Joi.string().length(6).optional()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

/**
 * Validate user registration data
 * @param {Object} data - Registration data to validate
 * @returns {Object} Validation result
 */
export const validateRegister = (data) => {
  return registerSchema.validate(data, { abortEarly: false });
};

/**
 * Validate login data
 * @param {Object} data - Login data to validate
 * @returns {Object} Validation result
 */
export const validateLogin = (data) => {
  return loginSchema.validate(data, { abortEarly: false });
};

/**
 * Validate forgot password data
 * @param {Object} data - Forgot password data to validate
 * @returns {Object} Validation result
 */
export const validateForgotPassword = (data) => {
  return forgotPasswordSchema.validate(data, { abortEarly: false });
};

/**
 * Validate reset password data
 * @param {Object} data - Reset password data to validate
 * @returns {Object} Validation result
 */
export const validateResetPassword = (data) => {
  return resetPasswordSchema.validate(data, { abortEarly: false });
};

/**
 * Validate email verification data
 * @param {Object} data - Email verification data to validate
 * @returns {Object} Validation result
 */
export const validateVerifyEmail = (data) => {
  return verifyEmailSchema.validate(data, { abortEarly: false });
};

/**
 * Validate password change data
 * @param {Object} data - Password change data to validate
 * @returns {Object} Validation result
 */
export const validateChangePassword = (data) => {
  return changePasswordSchema.validate(data, { abortEarly: false });
};

export default {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateChangePassword
};
