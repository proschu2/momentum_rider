/**
 * Quote Schema
 * Defines validation rules for quote requests
 */

const Joi = require('joi');
const { tickerSchema } = require('../middleware/validation');

/**
 * Quote ticker parameter schema
 */
const quoteParamsSchema = Joi.object({
  ticker: tickerSchema.messages({
    'string.pattern.base': 'Ticker must be a valid ticker symbol',
    'string.max': 'Ticker must be at most 10 characters',
  }),
}).messages({
  'object.unknown': 'Unknown parameter',
});

/**
 * Quote query parameters schema (for future expansion)
 */
const quoteQuerySchema = Joi.object({
  includeHistory: Joi.boolean().default(false).messages({
    'boolean.base': 'includeHistory must be a boolean value',
  }),
  period: Joi.string()
    .valid('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
    .default('1mo')
    .messages({
      'any.only': 'Period must be one of: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max',
    }),
}).messages({
  'object.unknown': 'Unknown query parameter',
});

module.exports = {
  quoteParamsSchema,
  quoteQuerySchema,
};
