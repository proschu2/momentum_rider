/**
 * Portfolio Optimization Schema
 * Defines validation rules for portfolio optimization requests
 */

const Joi = require('joi');
const { tickerSchema } = require('../middleware/validation');

/**
 * ETF holding definition
 */
const etfHoldingSchema = Joi.object({
  name: tickerSchema.messages({
    'string.pattern.base': 'ETF name must be a valid ticker symbol',
    'string.max': 'ETF name must be at most 10 characters',
  }),
  targetPercentage: Joi.number().min(0).max(100).precision(2).required().messages({
    'number.min': 'Target percentage cannot be negative',
    'number.max': 'Target percentage cannot exceed 100',
    'number.base': 'Target percentage must be a number',
    'any.required': 'Target percentage is required',
  }),
  allowedDeviation: Joi.number().min(0).max(100).precision(2).default(5).messages({
    'number.min': 'Allowed deviation cannot be negative',
    'number.max': 'Allowed deviation cannot exceed 100',
    'number.base': 'Allowed deviation must be a number',
  }),
  pricePerShare: Joi.number().positive().precision(4).required().messages({
    'number.positive': 'Price per share must be positive',
    'number.base': 'Price per share must be a number',
    'any.required': 'Price per share is required',
  }),
}).messages({
  'object.unknown': 'Unknown field in ETF holding definition',
});

/**
 * Current holding definition
 */
const currentHoldingSchema = Joi.object({
  name: tickerSchema.messages({
    'string.pattern.base': 'Holding name must be a valid ticker symbol',
  }),
  shares: Joi.number().min(0).precision(4).required().messages({
    'number.min': 'Shares cannot be negative',
    'number.base': 'Shares must be a number',
    'any.required': 'Shares is required',
  }),
  price: Joi.number().positive().precision(4).required().messages({
    'number.positive': 'Price must be positive',
    'number.base': 'Price must be a number',
    'any.required': 'Price is required',
  }),
}).messages({
  'object.unknown': 'Unknown field in current holding definition',
});

/**
 * Portfolio rebalance request schema
 */
const rebalanceRequestSchema = Joi.object({
  currentHoldings: Joi.array().items(currentHoldingSchema).default([]).messages({
    'array.base': 'Current holdings must be an array',
    'object.base': 'Each holding must be an object',
  }),
  targetETFs: Joi.array().items(etfHoldingSchema).min(1).required().messages({
    'array.min': 'At least one target ETF is required',
    'any.required': 'Target ETFs array is required',
    'array.base': 'Target ETFs must be an array',
    'object.base': 'Each ETF must be an object',
  }),
  extraCash: Joi.number().min(0).precision(2).required().messages({
    'number.min': 'Extra cash cannot be negative',
    'number.base': 'Extra cash must be a number',
    'any.required': 'Extra cash is required',
  }),
  optimizationStrategy: Joi.string()
    .valid('minimize-leftover', 'maximize-shares', 'momentum-weighted')
    .default('minimize-leftover')
    .messages({
      'any.only':
        'Optimization strategy must be one of: minimize-leftover, maximize-shares, momentum-weighted',
    }),
}).messages({
  'object.unknown': 'Unknown field in rebalance request',
});

/**
 * Cache key validation schema
 */
const cacheKeySchema = Joi.object({
  key: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Cache key can only contain alphanumeric characters, hyphens, and underscores',
      'string.min': 'Cache key is required',
      'string.max': 'Cache key cannot exceed 100 characters',
      'any.required': 'Cache key is required',
    }),
}).messages({
  'object.unknown': 'Unknown parameter',
});

/**
 * Test optimization request schema (same as rebalance but optional)
 */
const testRequestSchema = rebalanceRequestSchema.fork(
  ['currentHoldings', 'targetETFs', 'extraCash'],
  (schema) => schema.optional()
);

module.exports = {
  etfHoldingSchema,
  currentHoldingSchema,
  rebalanceRequestSchema,
  cacheKeySchema,
  testRequestSchema,
};
