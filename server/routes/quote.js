/**
 * Quote route handler
 */

const express = require('express');
const router = express.Router();
const financeService = require('../services/financeService');

/**
 * Get current quote
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const quoteData = await financeService.getQuote(ticker);
    res.json(quoteData);
  } catch (error) {
    console.error(`Error fetching quote for ${req.params.ticker}:`, error);
    res.status(500).json({ error: `Failed to fetch quote for ${req.params.ticker}` });
  }
});

module.exports = router;