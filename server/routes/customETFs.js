/**
 * Custom ETF management routes
 */

const express = require('express');
const router = express.Router();
const customETFService = require('../services/customETFService');
const logger = require('../config/logger');
const Joi = require('joi');
const { validateBody, validateParams } = require('../middleware/validation');

// Validation schemas
const tickerParamSchema = Joi.object({
  ticker: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9.\-]+$/)
    .min(1)
    .max(10)
    .required()
    .messages({
      'string.pattern.base': 'Ticker must contain only letters, numbers, dots, and hyphens',
      'string.max': 'Ticker must be at most 10 characters',
      'any.required': 'Ticker parameter is required',
    })
});

const addETFSchema = Joi.object({
  ticker: Joi.string()
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
    }),
  category: Joi.string()
    .trim()
    .uppercase()
    .valid('STOCKS', 'BONDS', 'COMMODITIES', 'ALTERNATIVES', 'CUSTOM')
    .optional()
    .messages({
      'any.only': 'Category must be one of: STOCKS, BONDS, COMMODITIES, ALTERNATIVES, CUSTOM',
    }),
  expenseRatio: Joi.number()
    .min(0)
    .max(1)
    .precision(4)
    .optional()
    .messages({
      'number.min': 'Expense ratio cannot be negative',
      'number.max': 'Expense ratio cannot exceed 1 (100%)',
      'number.base': 'Expense ratio must be a number',
    }),
  inceptionDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Inception date cannot be in the future',
      'date.format': 'Inception date must be a valid date (YYYY-MM-DD)',
    }),
  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
  bypassValidation: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'bypassValidation must be a boolean',
    }),
});

const updateETFSchema = Joi.object({
  category: Joi.string()
    .trim()
    .uppercase()
    .valid('STOCKS', 'BONDS', 'COMMODITIES', 'ALTERNATIVES', 'CUSTOM')
    .optional()
    .messages({
      'any.only': 'Category must be one of: STOCKS, BONDS, COMMODITIES, ALTERNATIVES, CUSTOM',
    }),
  expenseRatio: Joi.number()
    .min(0)
    .max(1)
    .precision(4)
    .optional()
    .messages({
      'number.min': 'Expense ratio cannot be negative',
      'number.max': 'Expense ratio cannot exceed 1 (100%)',
      'number.base': 'Expense ratio must be a number',
    }),
  inceptionDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Inception date cannot be in the future',
      'date.format': 'Inception date must be a valid date (YYYY-MM-DD)',
    }),
  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Add a custom ETF
 * POST /api/etfs/custom
 * Body: { ticker: string, category?: string, expenseRatio?: number, inceptionDate?: string, notes?: string }
 */
router.post('/custom', validateBody(addETFSchema), async (req, res) => {
  try {
    const { ticker, category, expenseRatio, inceptionDate, notes, bypassValidation } = req.body;

    const metadata = {
      category,
      expenseRatio,
      inceptionDate: inceptionDate ? (inceptionDate instanceof Date ? inceptionDate.toISOString().split('T')[0] : inceptionDate.split('T')[0]) : undefined, // Convert to YYYY-MM-DD
      notes,
      bypassValidation
    };

    const newETF = await customETFService.addCustomETF(ticker, metadata);

    res.status(201).json({
      message: 'Custom ETF added successfully',
      etf: newETF
    });
  } catch (error) {
    logger.logError(error, 'Failed to add custom ETF');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Get all custom ETFs
 * GET /api/etfs/custom
 */
router.get('/custom', async (req, res) => {
  try {
    const customETFs = await customETFService.getCustomETFs();
    res.json({
      etfs: customETFs,
      count: customETFs.length
    });
  } catch (error) {
    logger.logError(error, 'Failed to get custom ETFs');
    res.status(500).json({
      error: 'Failed to retrieve custom ETFs'
    });
  }
});

/**
 * Remove a custom ETF
 * DELETE /api/etfs/custom/:ticker
 */
router.delete('/custom/:ticker', validateParams(tickerParamSchema), async (req, res) => {
  try {
    const { ticker } = req.params;

    await customETFService.removeCustomETF(ticker);

    res.json({
      message: `ETF ${ticker} removed successfully`
    });
  } catch (error) {
    logger.logError(error, 'Failed to remove custom ETF');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Update a custom ETF
 * PUT /api/etfs/custom/:ticker
 * Body: { category?: string, expenseRatio?: number, inceptionDate?: string, notes?: string }
 */
router.put('/custom/:ticker', validateParams(tickerParamSchema), validateBody(updateETFSchema), async (req, res) => {
  try {
    const { ticker } = req.params;
    const updates = req.body;

    const updatedETF = await customETFService.updateCustomETF(ticker, updates);

    res.json({
      message: `ETF ${ticker} updated successfully`,
      etf: updatedETF
    });
  } catch (error) {
    logger.logError(error, 'Failed to update custom ETF');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Validate an ETF ticker
 * GET /api/etfs/validate/:ticker
 */
router.get('/validate/:ticker', validateParams(tickerParamSchema), async (req, res) => {
  try {
    const { ticker } = req.params;

    const validation = await customETFService.validateETF(ticker);

    res.json({
      ticker,
      ...validation
    });
  } catch (error) {
    logger.logError(error, 'Failed to validate ETF');
    res.status(500).json({
      error: 'Failed to validate ETF'
    });
  }
});

/**
 * Get combined ETF universe (default + custom)
 * GET /api/etfs/universe
 */
router.get('/universe', async (req, res) => {
  try {
    const universe = await customETFService.getCombinedETFUniverse();
    res.json({
      universe,
      categories: Object.keys(universe)
    });
  } catch (error) {
    logger.logError(error, 'Failed to get ETF universe');
    res.status(500).json({
      error: 'Failed to retrieve ETF universe'
    });
  }
});

/**
 * Validate all custom ETFs (admin endpoint)
 * POST /api/etfs/validate-all
 */
router.post('/validate-all', async (req, res) => {
  try {
    const result = await customETFService.validateAllCustomETFs();

    res.json({
      message: 'Custom ETF validation completed',
      ...result
    });
  } catch (error) {
    logger.logError(error, 'Failed to validate all custom ETFs');
    res.status(500).json({
      error: 'Failed to validate custom ETFs'
    });
  }
});

module.exports = router;