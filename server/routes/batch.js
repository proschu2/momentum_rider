/**
 * Batch route handler for batch momentum calculations
 */

const express = require('express');
const router = express.Router();

/**
 * Batch momentum calculation for multiple tickers
 */
router.post('/momentum', async (req, res) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }

    const results = [];

    for (const ticker of tickers) {
      try {
        // Use individual momentum endpoint with caching
        // Note: This assumes the server is running on the same port
        // In production, we might want to call the service directly instead of HTTP
        const response = await fetch(`http://localhost:${process.env.PORT || 3001}/api/momentum/${ticker}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        results.push(result);

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
        results.push({
          ticker,
          periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
          average: 0,
          absoluteMomentum: false,
          error: `Failed to calculate momentum for ${ticker}`
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error in batch momentum calculation:', error);
    res.status(500).json({ error: 'Failed to calculate batch momentum' });
  }
});

module.exports = router;