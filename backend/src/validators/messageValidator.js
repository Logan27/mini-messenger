import Joi from 'joi';

/**
 * Message validation schemas
 */

const messageSchema = Joi.object({
  recipientId: Joi.number().integer().positive().optional(),
  groupId: Joi.number().integer().positive().optional(),
  content: Joi.string().max(10000).required(),
  messageType: Joi.string().valid('text', 'file', 'image', 'video').default('text'),
  fileId: Joi.number().integer().positive().optional(),
  encrypted: Joi.boolean().default(false),
  replyToId: Joi.number().integer().positive().optional(),
}).xor('recipientId', 'groupId'); // One of these must be present

const messageUpdateSchema = Joi.object({
  content: Joi.string().max(10000).required(),
});

const messageReactionSchema = Joi.object({
  emoji: Joi.string().max(10).required(),
});

/**
 * Validate message creation data
 * @param {Object} data - Message data to validate
 * @returns {Object} Validation result
 */
export const validateMessage = data => {
  return messageSchema.validate(data, { abortEarly: false });
};

/**
 * Validate message update data
 * @param {Object} data - Message update data to validate
 * @returns {Object} Validation result
 */
export const validateMessageUpdate = data => {
  return messageUpdateSchema.validate(data, { abortEarly: false });
};

/**
 * Validate message reaction data
 * @param {Object} data - Reaction data to validate
 * @returns {Object} Validation result
 */
export const validateMessageReaction = data => {
  return messageReactionSchema.validate(data, { abortEarly: false });
};

export default {
  validateMessage,
  validateMessageUpdate,
  validateMessageReaction,
};
