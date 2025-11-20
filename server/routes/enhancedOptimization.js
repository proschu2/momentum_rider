/**
 * Enhanced Portfolio Optimization API Routes
 * Provides endpoints for new budget optimization features
 */

const express = require('express');
const router = express.Router();
const enhancedPortfolioService = require('../services/enhancedPortfolioService');
const logger = require('../config/logger');

/**
 * POST /api/enhanced/portfolio/analyze
 * Enhanced portfolio analysis with new optimization features
 */
router.post('/portfolio/analyze', async (req, res) => {
  try {
    console.log('=== ENHANCED ANALYSIS API REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings = [],
      optimizationOptions = {}
    } = req.body;

    // Validate required fields
    if (!strategy || !selectedETFs || !Array.isArray(selectedETFs)) {
      return res.status(400).json({
        error: 'Missing required fields: strategy, selectedETFs',
        requiredFields: ['strategy', 'selectedETFs', 'additionalCapital']
      });
    }

    // Enhanced analysis with new features
    const analysisResult = await enhancedPortfolioService.analyzeStrategyEnhanced({
      strategy,
      selectedETFs,
      additionalCapital: additionalCapital || 0,
      currentHoldings,
      optimizationOptions
    });

    console.log('Enhanced analysis result:', {
      optimizationMode: analysisResult.optimizationMode,
      enhancedOptimization: analysisResult.enhancedOptimization,
      totalInvestment: analysisResult.totalInvestment
    });

    res.json({
      success: true,
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Enhanced portfolio analysis API failed');
    console.error('Enhanced analysis error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/enhanced/portfolio/optimize
 * Enhanced portfolio optimization with all new features
 */
router.post('/portfolio/optimize', async (req, res) => {
  try {
    console.log('=== ENHANCED OPTIMIZATION API REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings = [],
      constraints = {},
      objectives = {},
      optimizationOptions = {}
    } = req.body;

    // Validate required fields
    if (!strategy || !selectedETFs || !Array.isArray(selectedETFs)) {
      return res.status(400).json({
        error: 'Missing required fields: strategy, selectedETFs',
        requiredFields: ['strategy', 'selectedETFs', 'additionalCapital']
      });
    }

    // Enhanced optimization with all new features
    const optimizationResult = await enhancedPortfolioService.optimizePortfolioEnhanced({
      strategy,
      selectedETFs,
      additionalCapital: additionalCapital || 0,
      currentHoldings,
      constraints,
      objectives,
      optimizationOptions
    });

    console.log('Enhanced optimization result:', {
      optimizationMode: optimizationResult.optimizationMode,
      utilizationRate: 100 - (optimizationResult.optimizationMetrics?.unusedPercentage || 0),
      enhancedFeatures: optimizationResult.enhancedFeatures,
      qualityScore: optimizationResult.optimizationReport?.qualityScore
    });

    res.json({
      success: true,
      optimization: optimizationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Enhanced portfolio optimization API failed');
    console.error('Enhanced optimization error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/enhanced/portfolio/optimize-compare
 * Compare baseline vs enhanced optimization
 */
router.post('/portfolio/optimize-compare', async (req, res) => {
  try {
    console.log('=== OPTIMIZATION COMPARISON API REQUEST ===');

    const {
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings = [],
      constraints = {},
      objectives = {}
    } = req.body;

    // Run baseline optimization
    console.log('Running baseline optimization...');
    const baselineResult = await enhancedPortfolioService.optimizePortfolioEnhanced({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings,
      constraints,
      objectives,
      optimizationOptions: { useEnhanced: false }
    });

    // Run enhanced optimization
    console.log('Running enhanced optimization...');
    const enhancedResult = await enhancedPortfolioService.optimizePortfolioEnhanced({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings,
      constraints,
      objectives,
      optimizationOptions: { useEnhanced: true }
    });

    // Calculate comparison metrics
    const baselineUtilization = 100 - (baselineResult.optimizationMetrics?.unusedPercentage || 0);
    const enhancedUtilization = 100 - (enhancedResult.optimizationMetrics?.unusedPercentage || 0);
    const improvement = enhancedUtilization - baselineUtilization;

    const comparison = {
      baseline: {
        utilizationRate: baselineUtilization,
        budgetUsed: baselineResult.optimizationMetrics?.totalBudgetUsed || 0,
        unusedBudget: baselineResult.optimizationMetrics?.unusedBudget || 0,
        solverStatus: baselineResult.solverStatus,
        optimizationTime: baselineResult.optimizationMetrics?.optimizationTime || 0
      },
      enhanced: {
        utilizationRate: enhancedUtilization,
        budgetUsed: enhancedResult.optimizationMetrics?.totalBudgetUsed || 0,
        unusedBudget: enhancedResult.optimizationMetrics?.unusedBudget || 0,
        solverStatus: enhancedResult.solverStatus,
        optimizationTime: enhancedResult.totalOptimizationTime || 0,
        qualityScore: enhancedResult.optimizationReport?.qualityScore || 0
      },
      improvement: {
        utilizationRateImprovement: improvement,
        additionalBudgetUtilized: (enhancedResult.optimizationMetrics?.totalBudgetUsed || 0) - (baselineResult.optimizationMetrics?.totalBudgetUsed || 0),
        qualityImprovement: (enhancedResult.optimizationReport?.qualityScore || 0) - 50 // Baseline quality assumed 50
      }
    };

    console.log('Comparison results:', {
      baselineUtilization: baselineUtilization.toFixed(2) + '%',
      enhancedUtilization: enhancedUtilization.toFixed(2) + '%',
      improvement: improvement.toFixed(2) + '%'
    });

    res.json({
      success: true,
      comparison,
      baseline: baselineResult,
      enhanced: enhancedResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Optimization comparison API failed');
    console.error('Comparison error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/enhanced/optimization/test
 * Run optimization testing framework
 */
router.post('/optimization/test', async (req, res) => {
  try {
    console.log('=== OPTIMIZATION TESTING API REQUEST ===');

    const { testType = 'comprehensive' } = req.body;

    console.log(`Running optimization test type: ${testType}`);

    const testResults = await enhancedPortfolioService.runOptimizationTesting(testType);

    console.log('Test results:', {
      testType,
      success: true,
      timestamp: testResults.timestamp
    });

    res.json({
      success: true,
      testResults,
      testType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Optimization testing API failed');
    console.error('Testing error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/enhanced/features
 * Get current feature flag configuration
 */
router.get('/features', async (req, res) => {
  try {
    const featureFlags = enhancedPortfolioService.getFeatureFlags();

    res.json({
      success: true,
      featureFlags,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Get features API failed');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/enhanced/features/:feature
 * Toggle feature flag
 */
router.put('/features/:feature', async (req, res) => {
  try {
    const { feature } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'enabled field must be a boolean',
        requiredField: 'enabled (boolean)'
      });
    }

    const success = enhancedPortfolioService.setFeatureFlag(feature, enabled);

    if (!success) {
      return res.status(400).json({
        error: `Unknown feature flag: ${feature}`,
        availableFlags: Object.keys(enhancedPortfolioService.getFeatureFlags())
      });
    }

    console.log(`Feature flag '${feature}' set to: ${enabled}`);

    res.json({
      success: true,
      message: `Feature '${feature}' set to ${enabled}`,
      feature,
      enabled,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Set feature flag API failed');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/enhanced/features/reset
 * Reset all feature flags to defaults
 */
router.post('/features/reset', async (req, res) => {
  try {
    enhancedPortfolioService.resetFeatureFlags();

    console.log('All feature flags reset to defaults');

    res.json({
      success: true,
      message: 'All feature flags reset to defaults',
      featureFlags: enhancedPortfolioService.getFeatureFlags(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Reset feature flags API failed');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/enhanced/optimization/validate
 * Validate optimization configuration
 */
router.post('/optimization/validate', async (req, res) => {
  try {
    console.log('=== OPTIMIZATION VALIDATION REQUEST ===');

    const {
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings = [],
      constraints = {},
      objectives = {}
    } = req.body;

    // Validation checks
    const validationResults = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Validate strategy
    if (!strategy || !strategy.type) {
      validationResults.errors.push('Strategy configuration is required');
      validationResults.isValid = false;
    }

    // Validate ETFs
    if (!selectedETFs || !Array.isArray(selectedETFs) || selectedETFs.length === 0) {
      validationResults.errors.push('At least one ETF must be selected');
      validationResults.isValid = false;
    }

    // Validate capital
    const additionalCapitalNum = parseFloat(additionalCapital || 0);
    if (isNaN(additionalCapitalNum) || additionalCapitalNum < 0) {
      validationResults.errors.push('Additional capital must be a non-negative number');
      validationResults.isValid = false;
    }

    // Check for optimization opportunities
    if (additionalCapitalNum > 0 && additionalCapitalNum < 100) {
      validationResults.warnings.push('Very small additional capital may result in limited optimization opportunities');
    }

    if (selectedETFs && selectedETFs.length > 15) {
      validationResults.warnings.push('Large number of ETFs may reduce optimization effectiveness');
    }

    // Check constraints
    if (constraints.allowedDeviation && constraints.allowedDeviation > 50) {
      validationResults.warnings.push('High deviation bands may result in allocations far from targets');
    }

    // Check objectives
    if (objectives.useAllBudget && constraints.allowedDeviation < 10) {
      validationResults.recommendations.push('Consider increasing deviation bands when maximizing budget utilization');
    }

    // Quick optimization test if basic validation passes
    if (validationResults.isValid) {
      try {
        const quickTest = await enhancedPortfolioService.runQuickOptimizationTest();
        validationResults.quickTest = quickTest;

        if (quickTest.success && quickTest.utilizationRate < 80) {
          validationResults.warnings.push('Quick test shows low utilization rate - consider adjusting constraints or objectives');
        }
      } catch (testError) {
        validationResults.warnings.push(`Quick optimization test failed: ${testError.message}`);
      }
    }

    console.log('Validation results:', {
      isValid: validationResults.isValid,
      errorsCount: validationResults.errors.length,
      warningsCount: validationResults.warnings.length,
      recommendationsCount: validationResults.recommendations.length
    });

    res.json({
      success: true,
      validation: validationResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, 'Optimization validation API failed');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/enhanced/optimization/health
 * Health check for enhanced optimization services
 */
router.get('/optimization/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        enhancedPortfolioService: 'operational',
        enhancedBudgetOptimizer: 'operational',
        smartRebalancingService: 'operational',
        optimizationTestFramework: 'operational'
      },
      featureFlags: enhancedPortfolioService.getFeatureFlags(),
      version: '1.0.0'
    };

    // Quick service health test
    try {
      const quickTest = await enhancedPortfolioService.runQuickOptimizationTest();
      healthCheck.quickTestResult = {
        success: quickTest.success,
        utilizationRate: quickTest.utilizationRate || 0,
        qualityScore: quickTest.qualityScore || 0
      };
    } catch (testError) {
      healthCheck.services.quickTest = 'degraded';
      healthCheck.quickTestError = testError.message;
    }

    res.json({
      success: true,
      health: healthCheck
    });

  } catch (error) {
    logger.logError(error, 'Health check API failed');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;