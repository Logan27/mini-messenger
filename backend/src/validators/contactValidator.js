import Joi from 'joi';

/**
 * Contact validation schemas
 */

const contactRequestSchema = Joi.object({
  contactUserId: Joi.number().integer().positive().required()
});

/**
 * Validate contact request data
 * @param {Object} data - Contact request data to validate
 * @returns {Object} Validation result
 */
export const validateContactRequest = (data) => {
  return contactRequestSchema.validate(data, { abortEarly: false });
};

export default {
  validateContactRequest
};
