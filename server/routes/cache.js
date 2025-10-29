/**
 * Cache route handler
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

/**
 * Clear cache endpoint
 */
router.delete('/', (req, res) => {
  cacheService.clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

/**
 * Get cache statistics
 */
router.get('/stats', (req, res) => {
  const stats = cacheService.getCacheStats();
  res.json(stats);
});

module.exports = router;