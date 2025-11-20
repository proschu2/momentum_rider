/**
 * Quote route handler
 */

const express = require('express');
const router = express.Router();
const financeService = require('../services/financeService');
const logger = require('../config/logger');
const { validateParams, validateQuery, sanitizeOutput } = require('../middleware/validation');
const { quoteParamsSchema, quoteQuerySchema } = require('../schemas/quoteSchema');

/**
 * Get current quote
 */
router.get(
  '/:ticker',
  validateParams(quoteParamsSchema),
  validateQuery(quoteQuerySchema),
  async (req, res) => {
    try {
      const { ticker } = req.params;
      const quoteData = await financeService.getCurrentPrice(ticker);
      res.json(quoteData);
    } catch (error) {
      logger.logError(error, req);
      res.status(500).json({ error: `Failed to fetch quote for ${req.params.ticker}` });
    }
  }
);

module.exports = router;
