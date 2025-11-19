/**
 * Optimization API Routes
 * Provides endpoints for portfolio optimization using linear programming
 */

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const portfolioOptimizationService = require('../services/portfolioOptimizationService');
const { validateBody, validateParams, sanitizeOutput } = require('../middleware/validation');
const {
  rebalanceRequestSchema,
  cacheKeySchema,
  testRequestSchema,
} = require('../schemas/optimizationSchema');

/**
 * POST /api/optimization/rebalance
 * Optimize portfolio allocation using linear programming with fallback strategies
 *
 * Request Body:
 * {
 *   currentHoldings: [
 *     { name: string, shares: number, price: number }
 *   ],
 *   targetETFs: [
 *     { name: string, targetPercentage: number, allowedDeviation?: number, pricePerShare: number }
 *   ],
 *   extraCash: number,
 *   optimizationStrategy?: 'minimize-leftover' | 'maximize-shares' | 'momentum-weighted'
 * }
 *
 * Response:
 * {
 *   solverStatus: 'optimal' | 'infeasible' | 'heuristic' | 'error',
 *   allocations: [
 *     {
 *       etfName: string,
 *       currentShares: number,
 *       sharesToBuy: number,
 *       finalShares: number,
 *       costOfPurchase: number,
 *       finalValue: number,
 *       targetPercentage: number,
 *       actualPercentage: number,
 *       deviation: number
 *     }
 *   ],
 *   holdingsToSell: [
 *     { name: string, shares: number, pricePerShare: number, totalValue: number }
 *   ],
 *   optimizationMetrics: {
 *     totalBudgetUsed: number,
 *     unusedBudget: number,
 *     unusedPercentage: number,
 *     optimizationTime: number
 *   },
 *   fallbackUsed?: boolean,
 *   cached?: boolean
 * }
 */
router.post(
  '/rebalance',
  validateBody(rebalanceRequestSchema),
  async (req, res) => {
    try {
      const { currentHoldings, targetETFs, extraCash, optimizationStrategy } = req.body;

      const optimizationInput = {
        currentHoldings,
        targetETFs,
        extraCash,
        optimizationStrategy,
      };

      logger.logInfo('Optimization request received', {
        targetETFs: targetETFs.map((etf) => etf.name),
        extraCash,
        strategy: optimizationStrategy,
      });

      const result = await portfolioOptimizationService.optimizePortfolio(optimizationInput);

      res.json(result);
    } catch (error) {
      logger.logError(error, req);
      res.status(500).json({
        error: 'Optimization failed',
        message: error.message || 'Internal server error during optimization',
      });
    }
  }
);

/**
 * GET /api/optimization/cache/:key
 * Retrieve cached optimization result
 */
router.get('/cache/:key', validateParams(cacheKeySchema), async (req, res) => {
  try {
    const { key } = req.params;

    const cacheService = require('../services/cacheService');
    const cachedResult = await cacheService.get(key);

    if (!cachedResult) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cached result not found or expired',
      });
    }

    res.json({
      ...cachedResult,
      cached: true,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Cache retrieval failed',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /api/optimization/cache
 * Clear optimization cache
 */
router.delete('/cache', async (req, res) => {
  try {
    const result = await portfolioOptimizationService.clearCache();
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Cache clearance failed',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/optimization/health
 * Health check for optimization service
 */
router.get('/health',  async (req, res) => {
  try {
    const testInput = {
      currentHoldings: [
        { name: 'VTI', shares: 10, price: 250 },
        { name: 'VXUS', shares: 20, price: 60 },
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 60, pricePerShare: 250 },
        { name: 'VXUS', targetPercentage: 30, pricePerShare: 60 },
        { name: 'BND', targetPercentage: 10, pricePerShare: 80 },
      ],
      extraCash: 5000,
      optimizationStrategy: 'minimize-leftover',
    };

    const result = await portfolioOptimizationService.optimizePortfolio(testInput);

    // Safely extract optimization metrics with fallbacks
    const optimizationMetrics = result.optimizationMetrics || {};
    const unusedPercentage = optimizationMetrics.unusedPercentage || 0;
    const optimizationTime = optimizationMetrics.optimizationTime || 0;

    res.json({
      status: 'healthy',
      service: 'portfolio-optimization',
      testResult: {
        solverStatus: result.solverStatus,
        budgetUtilization: 100 - unusedPercentage,
        optimizationTime: optimizationTime,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(503).json({
      status: 'unhealthy',
      service: 'portfolio-optimization',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/optimization/test
 * Test endpoint for optimization service (development only)
 */
router.post('/test', validateBody(testRequestSchema), async (req, res) => {
  try {
    const testInput = req.body;

    const result = await portfolioOptimizationService.optimizePortfolio(testInput);

    res.json({
      testInput,
      result,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      testInput: req.body,
    });
  }
});

module.exports = router;
