/**
 * Batch Request Schema
 * Defines validation rules for batch processing requests
 */

const Joi = require('joi');
const { tickerSchema } = require('../middleware/validation');

/**
 * Batch momentum request schema
 */
const batchMomentumRequestSchema = Joi.object({
  tickers: Joi.array()
    .items(
      tickerSchema.messages({
        'string.pattern.base': 'Each ticker must be a valid ticker symbol',
        'string.max': 'Each ticker must be at most 10 characters',
      })
    )
    .min(1)
    .max(50) // Reasonable limit to prevent abuse
    .required()
    .unique()
    .messages({
      'array.min': 'At least one ticker is required',
      'array.max': 'Cannot process more than 50 tickers at once',
      'array.base': 'Tickers must be an array',
      'array.unique': 'Duplicate tickers are not allowed',
      'any.required': 'Tickers array is required',
    }),
}).messages({
  'object.unknown': 'Unknown field in batch request',
});

/**
 * Batch quote request schema (for future expansion)
 */
const batchQuoteRequestSchema = Joi.object({
  tickers: Joi.array().items(tickerSchema).min(1).max(50).required().unique().messages({
    'array.min': 'At least one ticker is required',
    'array.max': 'Cannot process more than 50 tickers at once',
    'array.unique': 'Duplicate tickers are not allowed',
    'any.required': 'Tickers array is required',
  }),
  includeHistory: Joi.boolean().default(false),
  period: Joi.string().valid('1d', '5d', '1mo', '3mo', '6mo', '1y').default('1mo'),
}).messages({
  'object.unknown': 'Unknown field in batch quote request',
});

/**
 * Batch optimization request schema (for future expansion)
 */
const batchOptimizationRequestSchema = Joi.object({
  requests: Joi.array()
    .items(
      Joi.object({
        id: Joi.string()
          .trim()
          .min(1)
          .max(50)
          .pattern(/^[a-zA-Z0-9\-_]+$/)
          .optional(),
        currentHoldings: Joi.array().items(Joi.object()).default([]),
        targetETFs: Joi.array().items(Joi.object()).min(1).required(),
        extraCash: Joi.number().min(0).required(),
        optimizationStrategy: Joi.string()
          .valid('minimize-leftover', 'maximize-shares', 'momentum-weighted')
          .default('minimize-leftover'),
      })
    )
    .min(1)
    .max(10) // Limit batch size for optimization
    .required()
    .messages({
      'array.min': 'At least one optimization request is required',
      'array.max': 'Cannot process more than 10 optimization requests at once',
      'array.base': 'Requests must be an array',
      'any.required': 'Requests array is required',
    }),
}).messages({
  'object.unknown': 'Unknown field in batch optimization request',
});

module.exports = {
  batchMomentumRequestSchema,
  batchQuoteRequestSchema,
  batchOptimizationRequestSchema,
};
