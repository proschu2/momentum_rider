/**
 * Cache route handler
 * Provides endpoints for cache management and warming
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

/**
 * Clear cache endpoint
 * DELETE /api/cache
 */
router.delete('/', async (req, res) => {
  try {
    logger.logInfo('Cache clearance requested');
    const result = await cacheService.clearCache();
    logger.logInfo('Cache cleared successfully');
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get cache statistics
 * GET /api/cache/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    res.json(stats);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Warm up cache with frequently accessed data
 * POST /api/cache/warm
 * Body: { keys?: string[] } - Optional: specific keys to warm. Defaults to all keys.
 */
router.post('/warm', async (req, res) => {
  try {
    const { keys } = req.body;

    if (keys && !Array.isArray(keys)) {
      return res.status(400).json({
        success: false,
        error: 'keys must be an array of strings',
      });
    }

    logger.logInfo('Cache warming requested', { keys: keys || 'all' });
    const result = await cacheService.warmCache();
    logger.logInfo('Cache warming completed', {
      success: result.success,
      summary: result.summary
    });

    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all cached keys
 * GET /api/cache/keys?pattern=*
 * Query parameter:
 *   - pattern: Redis key pattern (default: '*')
 */
router.get('/keys', async (req, res) => {
  try {
    const pattern = req.query.pattern || '*';
    const keys = await cacheService.getCachedKeys(pattern);
    logger.logInfo('Cache keys retrieved', { pattern, count: keys.length });
    res.json({
      success: true,
      pattern,
      count: keys.length,
      keys,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete specific cached data
 * DELETE /api/cache/:key
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    logger.logInfo('Cache deletion requested', { key });
    const result = await cacheService.deleteCachedData(key);
    logger.logInfo('Cache deletion completed', { key, success: result.success });
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Invalidate cache by pattern
 * POST /api/cache/invalidate
 * Body: { pattern: string } - Pattern to match keys for deletion
 */
router.post('/invalidate', async (req, res) => {
  try {
    const { pattern } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'pattern is required',
      });
    }

    logger.logInfo('Cache invalidation requested', { pattern });
    const result = await cacheService.invalidateCachePattern(pattern);
    logger.logInfo('Cache invalidation completed', { pattern, success: result.success });
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get cached data for a specific key
 * GET /api/cache/:key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const data = await cacheService.getCachedData(key);

    if (data === null) {
      logger.logInfo('Cache key not found', { key });
      return res.status(404).json({
        success: false,
        error: 'Key not found in cache',
        key,
      });
    }

    logger.logInfo('Cache data retrieved', { key });
    res.json({
      success: true,
      key,
      data,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Set cached data
 * POST /api/cache/:key
 * Body: { data: any, ttlSeconds?: number }
 */
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data, ttlSeconds } = req.body;

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        error: 'data is required',
      });
    }

    logger.logInfo('Cache data set requested', { key, ttlSeconds });
    const result = await cacheService.setCachedData(key, data, ttlSeconds);
    logger.logInfo('Cache data set completed', { key, success: result });
    res.json({
      success: result,
      key,
      ttlSeconds: ttlSeconds || null,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get market status
 * GET /api/cache/market-status
 */
router.get('/market-status', async (req, res) => {
  try {
    const status = await cacheService.getMarketStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get popular ETFs data
 * GET /api/cache/popular-etfs
 */
router.get('/popular-etfs', async (req, res) => {
  try {
    const etfs = await cacheService.getPopularETFs();
    res.json({
      success: true,
      data: etfs,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get system configuration
 * GET /api/cache/system-config
 */
router.get('/system-config', async (req, res) => {
  try {
    const config = cacheService.getSystemConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
