/**
 * Momentum route handler
 */

const express = require('express');
const router = express.Router();
const momentumService = require('../services/momentumService');
const logger = require('../config/logger');
const { validateParams, validateQuery, sanitizeOutput } = require('../middleware/validation');
const { momentumParamsSchema, momentumQuerySchema } = require('../schemas/momentumSchema');

/**
 * Calculate momentum for a ticker
 * Validates ticker parameter and query parameters before processing
 */
router.get(
  '/:ticker',
  validateParams(momentumParamsSchema),
  validateQuery(momentumQuerySchema),
  async (req, res) => {
    try {
      const { ticker } = req.params;
      const { includeName } = req.query;

      const result = await momentumService.calculateMomentum(ticker, includeName);
      res.json(result);
    } catch (error) {
      logger.logError(error, req);
      const errorResult = {
        ticker: req.params.ticker,
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false,
        error: error instanceof Error ? error.message : 'Failed to calculate momentum',
      };
      res.status(500).json(errorResult);
    }
  }
);

module.exports = router;
