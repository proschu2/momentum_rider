/**
 * Prices route handler
 */

const express = require('express');
const router = express.Router();
const momentumService = require('../services/momentumService');

/**
 * Get detailed price data including 4 relevant historical prices + latest quote
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const includeName = req.query.includeName === 'true';
    
    const result = await momentumService.getDetailedPrices(ticker, includeName);
    res.json(result);

  } catch (error) {
    console.error(`Error fetching prices for ${req.params.ticker}:`, error);
    res.status(500).json({
      error: `Failed to fetch price data for ${req.params.ticker}`,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

module.exports = router;