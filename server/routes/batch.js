/**
 * Batch route handler for batch momentum calculations
 */

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { validateBody, sanitizeOutput } = require('../middleware/validation');
const { batchMomentumRequestSchema } = require('../schemas/batchSchema');
const momentumService = require('../services/momentumService');

/**
 * Batch momentum calculation for multiple tickers
 */
router.post(
  '/momentum',
  validateBody(batchMomentumRequestSchema),
  async (req, res) => {
    try {
      const { tickers } = req.body;

      const results = [];

      for (const ticker of tickers) {
        try {
          const result = await momentumService.calculateMomentum(ticker, false);
          results.push(result);
        } catch (error) {
          logger.logError(error, req);
          results.push({
            ticker,
            periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
            average: 0,
            absoluteMomentum: false,
            error: `Failed to calculate momentum for ${ticker}`,
          });
        }
      }

      res.json(results);
    } catch (error) {
      logger.logError(error, req);
      res.status(500).json({ error: 'Failed to calculate batch momentum' });
    }
  }
);

module.exports = router;
