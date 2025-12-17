import Joi from 'joi';

/**
 * Group validation schemas
 */

const createGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  avatarUrl: Joi.string().uri().optional(),
  maxMembers: Joi.number().integer().min(2).max(20).default(20),
  memberIds: Joi.array().items(Joi.number().integer().positive()).min(1).optional(),
});

const updateGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  avatarUrl: Joi.string().uri().optional(),
  maxMembers: Joi.number().integer().min(2).max(20).optional(),
});

const addMemberSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  role: Joi.string().valid('member', 'admin').default('member'),
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('member', 'admin').required(),
});

/**
 * Validate group creation data
 * @param {Object} data - Group data to validate
 * @returns {Object} Validation result
 */
export const validateCreateGroup = data => {
  return createGroupSchema.validate(data, { abortEarly: false });
};

/**
 * Validate group update data
 * @param {Object} data - Group update data to validate
 * @returns {Object} Validation result
 */
export const validateUpdateGroup = data => {
  return updateGroupSchema.validate(data, { abortEarly: false });
};

/**
 * Validate add member data
 * @param {Object} data - Member data to validate
 * @returns {Object} Validation result
 */
export const validateAddMember = data => {
  return addMemberSchema.validate(data, { abortEarly: false });
};

/**
 * Validate member role update data
 * @param {Object} data - Role update data to validate
 * @returns {Object} Validation result
 */
export const validateUpdateMemberRole = data => {
  return updateMemberRoleSchema.validate(data, { abortEarly: false });
};

export default {
  validateCreateGroup,
  validateUpdateGroup,
  validateAddMember,
  validateUpdateMemberRole,
};
