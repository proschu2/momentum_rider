/**
 * Momentum route handler
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const momentumService = require('../services/momentumService');
const logger = require('../config/logger');
const { validateParams, validateQuery, validateBody, sanitizeOutput, tickerSchema } = require('../middleware/validation');
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

/**
 * Batch momentum calculation for multiple tickers
 * POST /api/momentum/batch
 * Body: { tickers: string[], includeName?: boolean }
 */
router.post(
  '/batch',
  validateBody(Joi.object({
    tickers: Joi.array().items(tickerSchema).min(1).max(100).required(),
    includeName: Joi.boolean().default(false)
  })),
  async (req, res) => {
    try {
      const { tickers, includeName = false } = req.body;

      if (!Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'tickers must be a non-empty array',
        });
      }

      logger.logInfo('Batch momentum request received', {
        tickers: tickers.join(', '),
        count: tickers.length,
      });

      const results = await momentumService.calculateBatchMomentum(tickers, includeName);

      res.json({
        success: true,
        count: results.length,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.logError(error, req);
      res.status(500).json({
        error: 'Batch momentum calculation failed',
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

module.exports = router;
