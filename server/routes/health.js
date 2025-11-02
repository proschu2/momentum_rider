/**
 * Health route handler
 */

const express = require('express');
const router = express.Router();
const { checkRedisHealth, getRedisClient } = require('../config/redis');
const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

/**
 * Health check endpoint with comprehensive system status
 */
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();

    // Basic status
    const health = {
      status: 'OK',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {},
    };

    // Check Redis connectivity
    try {
      const redisHealth = await checkRedisHealth();
      health.checks.redis = redisHealth;
    } catch (error) {
      health.checks.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Check cache service
    try {
      const cacheStats = cacheService.getCacheStats();
      health.checks.cache = {
        status: 'healthy',
        backend: cacheStats.backend,
        size: cacheStats.size,
        keys: cacheStats.keys?.length || 0,
      };
    } catch (error) {
      health.checks.cache = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.checks.memory = {
      status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    };

    // Check CPU usage
    health.checks.cpu = {
      status: 'healthy',
      loadAverage: process.platform !== 'win32' ? process.loadavg : [0, 0, 0],
    };

    // Determine overall health status
    const allHealthy = Object.values(health.checks).every((check) => check.status === 'healthy');

    if (!allHealthy) {
      health.status = 'DEGRADED';
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.logError(error, req);
    res.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * Readiness probe - checks if service is ready to receive traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check Redis
    const redisHealth = await checkRedisHealth();
    if (redisHealth.status !== 'healthy') {
      return res.status(503).json({
        status: 'NOT_READY',
        reason: 'Redis unavailable',
      });
    }

    res.json({ status: 'READY' });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      reason: error.message,
    });
  }
});

/**
 * Liveness probe - checks if service is alive
 */
router.get('/live', (req, res) => {
  res.json({ status: 'ALIVE', timestamp: new Date().toISOString() });
});

module.exports = router;
