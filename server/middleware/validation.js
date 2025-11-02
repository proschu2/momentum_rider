/**
 * Validation Middleware Factory
 * Provides reusable validation and sanitization utilities
 */

const Joi = require('joi');

/**
 * Create validation middleware for request body
 * @param {Object} schema - Joi schema for validation
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateBody = (schema, options = {}) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');

      return res.status(400).json({
        error: 'Validation failed',
        message: errorMessage,
        status: 400,
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Create validation middleware for request params
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');

      return res.status(400).json({
        error: 'Parameter validation failed',
        message: errorMessage,
        status: 400,
      });
    }

    req.params = value;
    next();
  };
};

/**
 * Create validation middleware for query parameters
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');

      return res.status(400).json({
        error: 'Query validation failed',
        message: errorMessage,
        status: 400,
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Sanitize string input to prevent XSS
 * @param {*} input - Input to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? sanitizeString(item) : sanitizeObject(item)
        );
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

/**
 * Output sanitization middleware to prevent XSS in responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeOutput = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const sanitizedData = sanitizeObject(data);
    return originalJson(sanitizedData);
  };

  const originalSend = res.send.bind(res);

  res.send = function (data) {
    if (typeof data === 'string') {
      data = sanitizeString(data);
    } else if (typeof data === 'object') {
      data = sanitizeObject(data);
    }
    return originalSend(data);
  };

  next();
};

/**
 * Validate ticker symbol format
 */
const tickerSchema = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z0-9.\-]+$/)
  .min(1)
  .max(10)
  .required()
  .messages({
    'string.pattern.base': 'Ticker must contain only letters, numbers, dots, and hyphens',
    'string.max': 'Ticker must be at most 10 characters',
    'any.required': 'Ticker is required',
  });

/**
 * Common validation schemas
 */
const commonSchemas = {
  ticker: tickerSchema,
  positiveNumber: Joi.number().positive().precision(2).messages({
    'number.positive': 'Value must be a positive number',
    'number.base': 'Value must be a number',
  }),
  nonNegativeNumber: Joi.number().min(0).precision(2).messages({
    'number.min': 'Value must be a non-negative number',
    'number.base': 'Value must be a number',
  }),
  dateString: Joi.string().isoDate().messages({
    'string.isoDate': 'Date must be in ISO format (YYYY-MM-DD or full ISO 8601)',
  }),
  paginationSchema: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  }),
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  sanitizeString,
  sanitizeObject,
  sanitizeOutput,
  tickerSchema,
  commonSchemas,
};
