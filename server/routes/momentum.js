/**
 * Momentum route handler
 */

const express = require('express');
const router = express.Router();
const momentumService = require('../services/momentumService');

/**
 * Calculate momentum for a ticker
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const includeName = req.query.includeName === 'true';
    
    const result = await momentumService.calculateMomentum(ticker, includeName);
    res.json(result);

  } catch (error) {
    console.error(`Error calculating momentum for ${req.params.ticker}:`, error);
    const errorResult = {
      ticker: req.params.ticker,
      periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
      average: 0,
      absoluteMomentum: false,
      error: error instanceof Error ? error.message : 'Failed to calculate momentum',
    };
    res.status(500).json(errorResult);
  }
});

module.exports = router;