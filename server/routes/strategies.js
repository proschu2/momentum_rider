/**
 * Strategy management routes
 */

const express = require('express');
const router = express.Router();
const strategyService = require('../services/strategyService');
const logger = require('../config/logger');

/**
 * Create a new strategy
 * POST /api/strategies
 * Body: { name: string, type: string, parameters: Object, description?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, parameters, description } = req.body;

    const strategy = await strategyService.createStrategy({
      name,
      type,
      parameters,
      description
    });

    res.status(201).json({
      message: 'Strategy created successfully',
      strategy
    });
  } catch (error) {
    logger.logError(error, 'Failed to create strategy');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Get all strategies
 * GET /api/strategies
 */
router.get('/', async (req, res) => {
  try {
    const strategies = await strategyService.getStrategies();
    res.json({
      strategies,
      count: strategies.length
    });
  } catch (error) {
    logger.logError(error, 'Failed to get strategies');
    res.status(500).json({
      error: 'Failed to retrieve strategies'
    });
  }
});

/**
 * Get available strategy types
 * GET /api/strategies/types
 */
router.get('/types', async (req, res) => {
  try {
    const strategyTypes = [
      {
        type: 'percentage',
        name: 'Percentage Allocation',
        description: 'Fixed percentage allocation for each ETF',
        parameters: {
          allocations: 'Object mapping tickers to percentage allocations'
        }
      },
      {
        type: 'momentum',
        name: 'Momentum Allocation',
        description: 'Allocate to top N ETFs based on momentum scores',
        parameters: {
          topN: 'Number of top ETFs to select',
          momentumThreshold: 'Minimum momentum score required'
        }
      },
      {
        type: 'sma',
        name: 'SMA Trend Following',
        description: 'Allocate based on 200-day Simple Moving Average trends',
        parameters: {
          smaPeriod: 'SMA period (default: 200)',
          trendThreshold: 'Trend threshold percentage'
        }
      },
      {
        type: 'hybrid',
        name: 'Hybrid Strategy',
        description: 'Combine multiple strategies with weighted allocations',
        parameters: {
          strategyWeights: 'Object mapping strategy types to weights'
        }
      },
      {
        type: 'allweather',
        name: 'All-Weather Portfolio',
        description: 'Dalio-inspired All-Weather strategy with 10-month SMA trend filtering and SGOV cash fallback',
        parameters: {
          smaPeriod: 'SMA period for trend filtering (default: 10 months)',
          rebalanceDate: 'Monthly rebalancing date (default: current date)',
          currentPositions: 'Current ETF positions for optimization',
          totalPortfolioValue: 'Total portfolio value for calculations'
        }
      }
    ];

    res.json({
      strategyTypes
    });
  } catch (error) {
    logger.logError(error, 'Failed to get strategy types');
    res.status(500).json({
      error: 'Failed to retrieve strategy types'
    });
  }
});

/**
 * Get strategy by ID
 * GET /api/strategies/:strategyId
 */
router.get('/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;

    const strategy = await strategyService.getStrategy(strategyId);

    res.json({
      strategy
    });
  } catch (error) {
    logger.logError(error, 'Failed to get strategy');
    res.status(404).json({
      error: error.message
    });
  }
});

/**
 * Update a strategy
 * PUT /api/strategies/:strategyId
 * Body: { name?: string, type?: string, parameters?: Object, description?: string }
 */
router.put('/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const updates = req.body;

    const strategy = await strategyService.updateStrategy(strategyId, updates);

    res.json({
      message: 'Strategy updated successfully',
      strategy
    });
  } catch (error) {
    logger.logError(error, 'Failed to update strategy');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Delete a strategy
 * DELETE /api/strategies/:strategyId
 */
router.delete('/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;

    await strategyService.deleteStrategy(strategyId);

    res.json({
      message: 'Strategy deleted successfully'
    });
  } catch (error) {
    logger.logError(error, 'Failed to delete strategy');
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Calculate allocation using a strategy
 * POST /api/strategies/:strategyId/calculate
 * Body: { etfUniverse: string[], currentHoldings?: Object }
 */
router.post('/:strategyId/calculate', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { etfUniverse, currentHoldings } = req.body;

    // Validate required fields
    if (!etfUniverse || !Array.isArray(etfUniverse)) {
      return res.status(400).json({
        error: 'etfUniverse array is required'
      });
    }

    // Get strategy
    const strategy = await strategyService.getStrategy(strategyId);

    // Calculate allocation
    const allocation = await strategyService.calculateAllocation(
      etfUniverse,
      strategy,
      currentHoldings
    );

    res.json({
      allocation
    });
  } catch (error) {
    logger.logError(error, 'Failed to calculate allocation');
    res.status(400).json({
      error: error.message
    });
  }
});

module.exports = router;