/**
 * Optimization API Routes
 * Provides endpoints for portfolio optimization using linear programming
 */

const express = require('express');
const router = express.Router();
const portfolioOptimizationService = require('../services/portfolioOptimizationService');

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
router.post('/rebalance', async (req, res) => {
  try {
    const {
      currentHoldings = [],
      targetETFs,
      extraCash,
      optimizationStrategy = 'minimize-leftover'
    } = req.body;

    // Validate required fields
    if (!targetETFs || !Array.isArray(targetETFs) || targetETFs.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'targetETFs array is required and cannot be empty'
      });
    }

    if (typeof extraCash !== 'number' || extraCash < 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'extraCash must be a non-negative number'
      });
    }

    // Validate target ETFs
    for (const etf of targetETFs) {
      if (!etf.name || typeof etf.name !== 'string') {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Each target ETF must have a valid name'
        });
      }
      if (typeof etf.targetPercentage !== 'number' || etf.targetPercentage < 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: `Target ETF ${etf.name} must have a valid target percentage`
        });
      }
      if (typeof etf.pricePerShare !== 'number' || etf.pricePerShare <= 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: `Target ETF ${etf.name} must have a valid positive price`
        });
      }
    }

    // Validate current holdings if provided
    if (currentHoldings && Array.isArray(currentHoldings)) {
      for (const holding of currentHoldings) {
        if (!holding.name || typeof holding.name !== 'string') {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Each current holding must have a valid name'
          });
        }
        if (typeof holding.shares !== 'number' || holding.shares < 0) {
          return res.status(400).json({
            error: 'Invalid input',
            message: `Current holding ${holding.name} must have valid shares`
          });
        }
        if (typeof holding.price !== 'number' || holding.price <= 0) {
          return res.status(400).json({
            error: 'Invalid input',
            message: `Current holding ${holding.name} must have a valid positive price`
          });
        }
      }
    }

    const optimizationInput = {
      currentHoldings,
      targetETFs,
      extraCash,
      optimizationStrategy
    };

    console.log('Optimization request received:', {
      targetETFs: targetETFs.map(etf => etf.name),
      extraCash,
      strategy: optimizationStrategy
    });

    const result = await portfolioOptimizationService.optimizePortfolio(optimizationInput);

    res.json(result);

  } catch (error) {
    console.error('Optimization API error:', error);
    res.status(500).json({
      error: 'Optimization failed',
      message: error.message || 'Internal server error during optimization'
    });
  }
});

/**
 * GET /api/optimization/cache/:key
 * Retrieve cached optimization result
 */
router.get('/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Cache key is required'
      });
    }

    const cacheService = require('../services/cacheService');
    const cachedResult = await cacheService.get(key);

    if (!cachedResult) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cached result not found or expired'
      });
    }

    res.json({
      ...cachedResult,
      cached: true
    });

  } catch (error) {
    console.error('Cache retrieval error:', error);
    res.status(500).json({
      error: 'Cache retrieval failed',
      message: error.message || 'Internal server error'
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
    console.error('Cache clearance error:', error);
    res.status(500).json({
      error: 'Cache clearance failed',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/optimization/health
 * Health check for optimization service
 */
router.get('/health', async (req, res) => {
  try {
    // Test the optimization service with a simple example
    const testInput = {
      currentHoldings: [
        { name: 'VTI', shares: 10, price: 250 },
        { name: 'VXUS', shares: 20, price: 60 }
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 60, pricePerShare: 250 },
        { name: 'VXUS', targetPercentage: 30, pricePerShare: 60 },
        { name: 'BND', targetPercentage: 10, pricePerShare: 80 }
      ],
      extraCash: 5000,
      optimizationStrategy: 'minimize-leftover'
    };

    const result = await portfolioOptimizationService.optimizePortfolio(testInput);
    
    res.json({
      status: 'healthy',
      service: 'portfolio-optimization',
      testResult: {
        solverStatus: result.solverStatus,
        budgetUtilization: 100 - result.optimizationMetrics.unusedPercentage,
        optimizationTime: result.optimizationMetrics.optimizationTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Optimization health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'portfolio-optimization',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/optimization/test
 * Test endpoint for optimization service (development only)
 */
router.post('/test', async (req, res) => {
  try {
    const testInput = req.body || {
      currentHoldings: [
        { name: 'VTI', shares: 10, price: 250 },
        { name: 'VXUS', shares: 20, price: 60 }
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 60, pricePerShare: 250 },
        { name: 'VXUS', targetPercentage: 30, pricePerShare: 60 },
        { name: 'BND', targetPercentage: 10, pricePerShare: 80 }
      ],
      extraCash: 5000,
      optimizationStrategy: 'minimize-leftover'
    };

    const result = await portfolioOptimizationService.optimizePortfolio(testInput);
    
    res.json({
      testInput,
      result
    });

  } catch (error) {
    console.error('Optimization test failed:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      testInput: req.body
    });
  }
});

module.exports = router;