// FIX BUG-C002: Input validation schemas for calls module

import Joi from 'joi';

export const initiateCallSchema = Joi.object({
  recipientId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'recipientId must be a valid UUID',
      'any.required': 'recipientId is required',
    }),
  callType: Joi.string()
    .valid('audio', 'video')
    .required()
    .messages({
      'any.only': 'callType must be either "audio" or "video"',
      'any.required': 'callType is required',
    }),
});

export const respondToCallSchema = Joi.object({
  callId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'callId must be a valid UUID',
      'any.required': 'callId is required',
    }),
  response: Joi.string()
    .valid('accept', 'reject')
    .required()
    .messages({
      'any.only': 'response must be either "accept" or "reject"',
      'any.required': 'response is required',
    }),
});

export const callIdParamSchema = Joi.object({
  callId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'callId must be a valid UUID',
      'any.required': 'callId is required',
    }),
});
