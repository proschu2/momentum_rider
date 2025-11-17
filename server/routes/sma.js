/**
 * SMA calculation routes
 */

const express = require('express');
const router = express.Router();
const smaService = require('../services/smaService');
const logger = require('../config/logger');

/**
 * Calculate SMA for a ticker
 * GET /api/strategies/sma/:ticker
 * Query: period? (default: 200)
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 200;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker parameter is required'
      });
    }

    if (period < 10 || period > 500) {
      return res.status(400).json({
        error: 'Period must be between 10 and 500 days'
      });
    }

    const smaData = await smaService.calculateSMA(ticker, period);

    res.json({
      ticker,
      period,
      ...smaData
    });
  } catch (error) {
    logger.logError(error, 'Failed to calculate SMA');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Get SMA trend signal for a ticker
 * GET /api/strategies/sma/signal/:ticker
 * Query: period? (default: 200)
 */
router.get('/signal/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 200;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker parameter is required'
      });
    }

    const trendSignal = await smaService.getTrendSignal(ticker, period);

    res.json({
      ticker,
      period,
      ...trendSignal
    });
  } catch (error) {
    logger.logError(error, 'Failed to get SMA trend signal');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Get SMA crossovers for a ticker
 * GET /api/strategies/sma/crossovers/:ticker
 * Query: period? (default: 200)
 */
router.get('/crossovers/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 200;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker parameter is required'
      });
    }

    const crossovers = await smaService.getSMACrossovers(ticker, period);

    res.json({
      ticker,
      period,
      ...crossovers
    });
  } catch (error) {
    logger.logError(error, 'Failed to get SMA crossovers');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Batch calculate SMA for multiple tickers
 * POST /api/strategies/sma/batch
 * Body: { tickers: string[], period?: number }
 */
router.post('/batch', async (req, res) => {
  try {
    const { tickers, period = 200 } = req.body;

    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({
        error: 'tickers array is required'
      });
    }

    if (tickers.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 tickers allowed per batch request'
      });
    }

    const batchResults = await smaService.batchCalculateSMA(tickers, period);

    res.json({
      ...batchResults
    });
  } catch (error) {
    logger.logError(error, 'Failed to batch calculate SMA');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Calculate SMA-based allocation
 * POST /api/strategies/sma/calculate-allocation
 * Body: { etfUniverse: string[], parameters?: { smaPeriod?: number, trendThreshold?: number } }
 */
router.post('/calculate-allocation', async (req, res) => {
  try {
    const { etfUniverse, parameters = {} } = req.body;

    if (!etfUniverse || !Array.isArray(etfUniverse)) {
      return res.status(400).json({
        error: 'etfUniverse array is required'
      });
    }

    const allocation = await smaService.calculateSMAAllocation(etfUniverse, parameters);

    res.json({
      strategy: 'sma',
      allocation,
      parameters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logError(error, 'Failed to calculate SMA allocation');
    res.status(400).json({
      error: error.message
    });
  }
});

module.exports = router;