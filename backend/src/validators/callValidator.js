import Joi from 'joi';

/**
 * Call validation schemas
 */

const initiateCallSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required(),
  callType: Joi.string().valid('audio', 'video').required()
});

const callSignalSchema = Joi.object({
  callId: Joi.number().integer().positive().required(),
  signal: Joi.object().required()
});

const callHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  callType: Joi.string().valid('audio', 'video').optional(),
  status: Joi.string().valid('calling', 'connected', 'ended', 'rejected', 'missed').optional()
});

/**
 * Validate call initiation data
 * @param {Object} data - Call data to validate
 * @returns {Object} Validation result
 */
export const validateInitiateCall = (data) => {
  return initiateCallSchema.validate(data, { abortEarly: false });
};

/**
 * Validate call signal data
 * @param {Object} data - Signal data to validate
 * @returns {Object} Validation result
 */
export const validateCallSignal = (data) => {
  return callSignalSchema.validate(data, { abortEarly: false });
};

/**
 * Validate call history query
 * @param {Object} data - Query parameters to validate
 * @returns {Object} Validation result
 */
export const validateCallHistory = (data) => {
  return callHistorySchema.validate(data, { abortEarly: false });
};

export default {
  validateInitiateCall,
  validateCallSignal,
  validateCallHistory
};
