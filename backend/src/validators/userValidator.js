import Joi from 'joi';

/**
 * User validation schemas
 */

const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  profilePicture: Joi.string().uri().optional(),
  bio: Joi.string().max(500).allow('').optional(),
  onlineStatus: Joi.string().valid('online', 'offline', 'away').optional()
});

const updateStatusSchema = Joi.object({
  onlineStatus: Joi.string().valid('online', 'offline', 'away').required()
});

const searchUsersSchema = Joi.object({
  query: Joi.string().min(1).max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

/**
 * Validate profile update data
 * @param {Object} data - Profile data to validate
 * @returns {Object} Validation result
 */
export const validateUpdateProfile = (data) => {
  return updateProfileSchema.validate(data, { abortEarly: false });
};

/**
 * Validate status update data
 * @param {Object} data - Status data to validate
 * @returns {Object} Validation result
 */
export const validateUpdateStatus = (data) => {
  return updateStatusSchema.validate(data, { abortEarly: false });
};

/**
 * Validate search users query
 * @param {Object} data - Search query to validate
 * @returns {Object} Validation result
 */
export const validateSearchUsers = (data) => {
  return searchUsersSchema.validate(data, { abortEarly: false });
};

export default {
  validateUpdateProfile,
  validateUpdateStatus,
  validateSearchUsers
};
