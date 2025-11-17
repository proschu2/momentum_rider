/**
 * Custom ETF management routes
 */

const express = require('express');
const router = express.Router();
const customETFService = require('../services/customETFService');
const logger = require('../config/logger');

/**
 * Add a custom ETF
 * POST /api/etfs/custom
 * Body: { ticker: string, category?: string, expenseRatio?: number, inceptionDate?: string, notes?: string }
 */
router.post('/custom', async (req, res) => {
  try {
    const { ticker, category, expenseRatio, inceptionDate, notes } = req.body;

    // Validate required fields
    if (!ticker) {
      return res.status(400).json({
        error: 'Missing required field: ticker is required'
      });
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['STOCKS', 'BONDS', 'COMMODITIES', 'ALTERNATIVES', 'CUSTOM'];
      if (!validCategories.includes(category.toUpperCase())) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }
    }

    const metadata = {
      category: category ? category.toUpperCase() : undefined,
      expenseRatio: expenseRatio || 0,
      inceptionDate,
      notes
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
router.delete('/custom/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker parameter is required'
      });
    }

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
 * Validate an ETF ticker
 * GET /api/etfs/validate/:ticker
 */
router.get('/validate/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker parameter is required'
      });
    }

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