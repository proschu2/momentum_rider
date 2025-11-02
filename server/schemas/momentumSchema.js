/**
 * Momentum Schema
 * Defines validation rules for momentum calculation requests
 */

const Joi = require('joi');
const { tickerSchema } = require('../middleware/validation');

/**
 * Momentum ticker parameter schema
 */
const momentumParamsSchema = Joi.object({
  ticker: tickerSchema,
}).messages({
  'object.unknown': 'Unknown parameter',
});

/**
 * Momentum query parameters schema
 */
const momentumQuerySchema = Joi.object({
  includeName: Joi.boolean().default(false).messages({
    'boolean.base': 'includeName must be a boolean value',
  }),
}).messages({
  'object.unknown': 'Unknown query parameter',
});

/**
 * Optional ticker override for POST requests
 */
const momentumTickerBodySchema = Joi.object({
  ticker: tickerSchema.optional(),
}).messages({
  'object.unknown': 'Unknown field in request body',
});

module.exports = {
  momentumParamsSchema,
  momentumQuerySchema,
  momentumTickerBodySchema,
};
