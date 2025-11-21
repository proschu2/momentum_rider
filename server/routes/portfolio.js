/**
 * Portfolio analysis and optimization routes
 */

const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const logger = require('../config/logger');
const Joi = require('joi');
const { validateBody } = require('../middleware/validation');

// Validation schemas
const analyzeStrategySchema = Joi.object({
  strategy: Joi.object({
    type: Joi.string().valid('momentum', 'allweather', 'custom').required(),
    parameters: Joi.object().required()
  }).required(),
  selectedETFs: Joi.array().items(Joi.string()).min(1).required(),
  additionalCapital: Joi.number().min(0).default(0),
  currentHoldings: Joi.array().items(
    Joi.object({
      etf: Joi.string().required(),
      shares: Joi.number().min(0).required()
    })
  ).default([])
});

const optimizePortfolioSchema = Joi.object({
  strategy: Joi.object().required(),
  selectedETFs: Joi.array().items(Joi.string()).min(1).required(),
  additionalCapital: Joi.number().min(0).default(0),
  currentHoldings: Joi.array().items(
    Joi.object({
      etf: Joi.string().required(),
      shares: Joi.number().min(0).required()
    })
  ).default([]),
  constraints: Joi.object({
    minimumTradeSize: Joi.number().min(0).default(0),
    maximumPositions: Joi.number().min(1).default(20),
    allowPartialShares: Joi.boolean().default(true)
  }).default({})
});

/**
 * Analyze strategy performance and generate target allocation
 * POST /api/portfolio/analyze
 */
router.post('/analyze', validateBody(analyzeStrategySchema), async (req, res) => {
  try {
    const { strategy, selectedETFs, additionalCapital, currentHoldings } = req.body;

    logger.logInfo('Starting strategy analysis', {
      strategyType: strategy.type,
      selectedETFs: selectedETFs.length,
      additionalCapital,
      currentHoldings: currentHoldings.length
    });

    const analysis = await portfolioService.analyzeStrategy({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings
    });

    // Debug: Check if momentum scores have price field
    console.log('Debug: API route analysis GLDM has price:', 'GLDM' in analysis.momentumScores ? 'price' in analysis.momentumScores['GLDM'] : 'GLDM not found');
    if ('GLDM' in analysis.momentumScores && 'price' in analysis.momentumScores['GLDM']) {
      console.log('Debug: API route price value:', analysis.momentumScores['GLDM']['price']);
    }

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Strategy analysis failed');
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Optimize portfolio allocation using linear programming
 * POST /api/portfolio/optimize
 */
router.post('/optimize', validateBody(optimizePortfolioSchema), async (req, res) => {
  try {
    const { strategy, selectedETFs, additionalCapital, currentHoldings, constraints } = req.body;

    logger.logInfo('Starting portfolio optimization', {
      strategyType: strategy.type,
      selectedETFs: selectedETFs.length,
      additionalCapital,
      constraints
    });

    const optimization = await portfolioService.optimizePortfolio({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings,
      constraints
    });

    res.json({
      success: true,
      optimization,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Portfolio optimization failed');
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate execution plan for trades
 * POST /api/portfolio/execution-plan
 */
router.post('/execution-plan', validateBody(optimizePortfolioSchema), async (req, res) => {
  try {
    const { strategy, selectedETFs, additionalCapital, currentHoldings, constraints } = req.body;

    logger.logInfo('Generating execution plan', {
      strategyType: strategy.type,
      selectedETFs: selectedETFs.length,
      additionalCapital
    });

    const executionPlan = await portfolioService.generateExecutionPlan({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings,
      constraints
    });

    res.json({
      success: true,
      executionPlan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Execution plan generation failed');
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get current portfolio status
 * GET /api/portfolio/status
 */
router.get('/status', async (req, res) => {
  try {
    const holdings = await portfolioService.getCurrentHoldings();
    const portfolioValue = await portfolioService.calculatePortfolioValue(holdings);

    res.json({
      success: true,
      status: {
        holdings,
        totalValue: portfolioValue,
        count: holdings.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.logError(error, 'Portfolio status check failed');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio status'
    });
  }
});

/**
 * Execute trades (simulation only)
 * POST /api/portfolio/execute
 */
router.post('/execute', validateBody(Joi.object({
  trades: Joi.array().items(
    Joi.object({
      etf: Joi.string().required(),
      action: Joi.string().valid('buy', 'sell').required(),
      shares: Joi.number().min(0).required(),
      price: Joi.number().min(0).optional()
    })
  ).min(1).required(),
  dryRun: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const { trades, dryRun } = req.body;

    logger.logInfo('Executing trades', {
      tradeCount: trades.length,
      dryRun
    });

    const executionResult = await portfolioService.executeTrades(trades, dryRun);

    res.json({
      success: true,
      execution: executionResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Trade execution failed');
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get strategy performance history
 * GET /api/portfolio/performance/:strategyType
 */
router.get('/performance/:strategyType', async (req, res) => {
  try {
    const { strategyType } = req.params;
    const { period } = req.query;

    logger.logInfo('Fetching strategy performance', {
      strategyType,
      period: period || '1M'
    });

    const performance = await portfolioService.getStrategyPerformance(strategyType, period);

    res.json({
      success: true,
      performance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Performance data retrieval failed');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance data'
    });
  }
});

/**
 * Pre-fetch prices for multiple tickers and cache them
 * POST /api/portfolio/pre-prices
 * Body: { tickers: string[] }
 */
router.post('/pre-prices', validateBody(Joi.object({
  tickers: Joi.array().items(Joi.string()).min(1).max(50).required()
})), async (req, res) => {
  try {
    const { tickers } = req.body;

    logger.logInfo('Pre-fetching prices for tickers', {
      tickers: tickers.join(', '),
      count: tickers.length
    });

    const preFetchService = require('../services/preFetchService');
    const result = await preFetchService.preFetchPrices(tickers);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Price pre-fetch failed');
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;