import Joi from 'joi';

/**
 * File validation schemas
 */

const fileUploadSchema = Joi.object({
  messageId: Joi.number().integer().positive().optional(),
  recipientId: Joi.number().integer().positive().optional(),
  groupId: Joi.number().integer().positive().optional()
}).or('messageId', 'recipientId', 'groupId');

/**
 * Validate file upload metadata
 * @param {Object} data - File metadata to validate
 * @returns {Object} Validation result
 */
export const validateFileUpload = (data) => {
  return fileUploadSchema.validate(data, { abortEarly: false });
};

export default {
  validateFileUpload
};
