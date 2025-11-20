/**
 * Enhanced Portfolio Service Integration
 * Integrates new budget optimization enhancements with existing portfolio service
 */

const portfolioService = require('./portfolioService');
const enhancedBudgetOptimizer = require('./enhancedBudgetOptimizer');
const smartRebalancingService = require('./smartRebalancingService');
const optimizationTestFramework = require('./optimizationTestFramework');
const logger = require('../config/logger');

class EnhancedPortfolioService {
  constructor() {
    this.featureFlags = {
      enhancedOptimization: true,
      smartRebalancing: true,
      toleranceManagement: true,
      priceRatioOptimization: true,
      iterativeUtilization: true
    };
  }

  /**
   * Enhanced portfolio analysis with new optimization features
   */
  async analyzeStrategyEnhanced({ strategy, selectedETFs, additionalCapital, currentHoldings, optimizationOptions = {} }) {
    try {
      console.log('=== ENHANCED PORTFOLIO ANALYSIS START ===');
      console.log('Optimization options:', optimizationOptions);

      // Get baseline analysis
      const baselineAnalysis = await portfolioService.analyzeStrategy({
        strategy,
        selectedETFs,
        additionalCapital,
        currentHoldings
      });

      // Apply enhanced optimization if enabled
      if (this.featureFlags.enhancedOptimization && optimizationOptions.useEnhanced !== false) {
        const enhancedOptimization = await this.performEnhancedOptimization({
          strategy,
          selectedETFs,
          additionalCapital,
          currentHoldings,
          baselineAnalysis,
          optimizationOptions
        });

        return {
          ...baselineAnalysis,
          enhancedOptimization,
          optimizationMode: 'enhanced'
        };
      }

      return {
        ...baselineAnalysis,
        optimizationMode: 'baseline'
      };

    } catch (error) {
      logger.logError(error, 'Enhanced portfolio analysis failed');
      throw new Error(`Enhanced analysis failed: ${error.message}`);
    }
  }

  /**
   * Enhanced portfolio optimization with all new features
   */
  async optimizePortfolioEnhanced({
    strategy,
    selectedETFs,
    additionalCapital,
    currentHoldings,
    constraints = {},
    objectives = {},
    optimizationOptions = {}
  }) {
    try {
      console.log('=== ENHANCED PORTFOLIO OPTIMIZATION START ===');
      console.log('Feature flags:', this.featureFlags);
      console.log('Optimization options:', optimizationOptions);

      // Prepare optimization input
      const optimizationInput = await this.prepareOptimizationInput({
        strategy,
        selectedETFs,
        additionalCapital,
        currentHoldings,
        constraints,
        objectives
      });

      let optimizationResult;

      // Use enhanced optimization if enabled
      if (this.featureFlags.enhancedOptimization && optimizationOptions.useEnhanced !== false) {
        console.log('Using enhanced budget optimization...');
        optimizationResult = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(optimizationInput);

        // Apply smart rebalancing if enabled and beneficial
        if (this.featureFlags.smartRebalancing &&
            optimizationResult.optimizationMetrics?.unusedPercentage > 5) {
          console.log('Applying smart rebalancing...');

          const totalAvailableBudget = (currentHoldings || []).reduce(
            (sum, holding) => sum + (holding.shares * holding.price), 0
          ) + additionalCapital;

          optimizationResult = await smartRebalancingService.performSmartRebalancing(
            optimizationInput,
            optimizationResult,
            totalAvailableBudget
          );
        }
      } else {
        console.log('Using baseline optimization...');
        const portfolioOptimizationService = require('./portfolioOptimizationService');
        optimizationResult = await portfolioOptimizationService.optimizePortfolio(optimizationInput);
      }

      // Apply tolerance management if enabled
      if (this.featureFlags.toleranceManagement) {
        optimizationResult = await this.applyToleranceManagement(
          optimizationResult,
          objectives.toleranceBand || 0.05
        );
      }

      // Generate comprehensive report
      const optimizationReport = this.generateOptimizationReport(optimizationResult, optimizationInput);

      console.log('=== ENHANCED PORTFOLIO OPTIMIZATION COMPLETE ===');
      console.log('Final utilization rate:', (100 - (optimizationResult.optimizationMetrics?.unusedPercentage || 0)).toFixed(2) + '%');

      return {
        ...optimizationResult,
        optimizationReport,
        enhancedFeatures: this.featureFlags,
        optimizationMode: this.featureFlags.enhancedOptimization ? 'enhanced' : 'baseline'
      };

    } catch (error) {
      logger.logError(error, 'Enhanced portfolio optimization failed');
      throw new Error(`Enhanced optimization failed: ${error.message}`);
    }
  }

  /**
   * Prepare optimization input with enhanced features
   */
  async prepareOptimizationInput({ strategy, selectedETFs, additionalCapital, currentHoldings, constraints, objectives }) {
    // Get baseline analysis to extract target allocations and prices
    const analysis = await portfolioService.analyzeStrategy({
      strategy,
      selectedETFs,
      additionalCapital,
      currentHoldings
    });

    // Prepare target ETFs with enhanced data
    const targetETFs = selectedETFs
      .filter(etf => analysis.targetAllocations[etf] && analysis.targetAllocations[etf] > 0)
      .map(etf => ({
        name: etf,
        targetPercentage: analysis.targetAllocations[etf],
        pricePerShare: this.extractPriceFromAnalysis(analysis, etf),
        allowedDeviation: constraints.allowedDeviation || 20,
        momentumScore: analysis.momentumScores?.[etf]?.score || 0,
        absoluteMomentum: analysis.momentumScores?.[etf]?.absoluteMomentum || false
      }));

    // Prepare current holdings with current prices
    const holdingsWithPrices = await Promise.all(
      (currentHoldings || []).map(async holding => {
        const priceData = await this.getCurrentPriceForHolding(holding);
        return {
          name: holding.etf,
          shares: holding.shares,
          price: priceData
        };
      })
    );

    return {
      currentHoldings: holdingsWithPrices,
      targetETFs,
      extraCash: additionalCapital,
      objectives: {
        useAllBudget: objectives.useAllBudget !== false,
        budgetWeight: objectives.budgetWeight || 0.8,
        fairnessWeight: objectives.fairnessWeight || 0.2,
        maximizeUtilization: objectives.maximizeUtilization !== false,
        utilizationDeviation: objectives.utilizationDeviation || 5,
        toleranceBand: objectives.toleranceBand || 0.05,
        ...objectives
      },
      constraints,
      strategy
    };
  }

  /**
   * Extract price from momentum analysis
   */
  extractPriceFromAnalysis(analysis, etf) {
    const momentumData = analysis.momentumScores?.[etf];

    if (momentumData && momentumData.price && momentumData.price > 0) {
      return momentumData.price;
    }

    // Fallback to target value calculation
    if (analysis.targetValues && analysis.targetValues[etf]) {
      const targetPercentage = analysis.targetAllocations[etf];
      const totalInvestment = analysis.totalInvestment;
      const targetValue = analysis.targetValues[etf];

      // Estimate price based on target allocation and reasonable share count
      const estimatedShares = targetValue / 100; // Assume ~$100 per share as baseline
      return targetValue / estimatedShares;
    }

    // Ultimate fallback
    return this.getFallbackPrice(etf);
  }

  /**
   * Get current price for holding with fallback handling
   */
  async getCurrentPriceForHolding(holding) {
    try {
      const financeService = require('./financeService');
      const priceData = await financeService.getCurrentPrice(holding.etf);

      // Handle both object and number return types
      const price = typeof priceData === 'object' ? priceData.price : priceData;

      if (price && price > 0 && price < 100000) {
        return price;
      }
    } catch (error) {
      console.warn(`Failed to get current price for ${holding.etf}, using fallback:`, error.message);
    }

    // Use fallback price
    return this.getFallbackPrice(holding.etf);
  }

  /**
   * Get intelligent fallback price for ETF
   */
  getFallbackPrice(etf) {
    // Use the existing fallback price logic from portfolioService
    return portfolioService.getFallbackPriceForETF ?
      portfolioService.getFallbackPriceForETF(etf) : 100;
  }

  /**
   * Apply tolerance management to optimization result
   */
  async applyToleranceManagement(result, toleranceBand) {
    if (!result.allocations) {
      return result;
    }

    const adjustedAllocations = result.allocations.map(allocation => {
      const { targetPercentage, actualPercentage } = allocation;
      const deviation = Math.abs(actualPercentage - targetPercentage);
      const withinTolerance = deviation <= (toleranceBand * 100);

      return {
        ...allocation,
        toleranceCompliant: withinTolerance,
        toleranceDeviation: deviation,
        toleranceBand: toleranceBand * 100
      };
    });

    const compliantAllocations = adjustedAllocations.filter(a => a.toleranceCompliant);
    const complianceRate = (compliantAllocations.length / adjustedAllocations.length) * 100;

    return {
      ...result,
      allocations: adjustedAllocations,
      toleranceMetrics: {
        toleranceBand: toleranceBand * 100,
        complianceRate,
        compliantAllocations: compliantAllocations.length,
        totalAllocations: adjustedAllocations.length
      }
    };
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport(result, input) {
    const {
      optimizationMetrics,
      toleranceMetrics,
      totalOptimizationTime,
      enhancedOptimization,
      rebalancingApplied,
      originalUtilization,
      finalUtilization,
      improvement
    } = result;

    return {
      executiveSummary: {
        totalBudget: input.currentHoldings.reduce((sum, h) => sum + (h.shares * h.price), 0) + input.extraCash,
        utilizedBudget: optimizationMetrics?.totalBudgetUsed || 0,
        utilizationRate: 100 - (optimizationMetrics?.unusedPercentage || 0),
        unusedBudget: optimizationMetrics?.unusedBudget || 0,
        optimizationTime: totalOptimizationTime || 0,
        improvement: improvement || 0
      },
      performanceMetrics: {
        solverStatus: result.solverStatus,
        fallbackUsed: result.fallbackUsed || false,
        enhancedOptimization: enhancedOptimization || false,
        rebalancingApplied: rebalancingApplied || false,
        toleranceCompliance: toleranceMetrics?.complianceRate || 0
      },
      allocationAnalysis: {
        totalAllocations: result.allocations?.length || 0,
        activeAllocations: result.allocations?.filter(a => a.sharesToBuy > 0).length || 0,
        sellAllocations: result.allocations?.filter(a => a.sharesToSell > 0).length || 0,
        holdingsToSell: result.holdingsToSell?.length || 0
      },
      optimizationPhases: result.optimizationPhases || {},
      recommendations: this.generateOptimizationRecommendations(result),
      qualityScore: this.calculateOptimizationQualityScore(result)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(result) {
    const recommendations = [];
    const unusedPercentage = result.optimizationMetrics?.unusedPercentage || 0;
    const utilizationRate = 100 - unusedPercentage;
    const complianceRate = result.toleranceMetrics?.complianceRate || 0;

    // Budget utilization recommendations
    if (utilizationRate < 85) {
      recommendations.push({
        category: 'budget_utilization',
        priority: 'high',
        message: `Low budget utilization (${utilizationRate.toFixed(1)}%). Consider increasing deviation bands or adding more target ETFs.`,
        actionItems: [
          'Increase allowedDeviation to 30-50%',
          'Add more ETF options to target selection',
          'Review minimum investment constraints'
        ]
      });
    } else if (utilizationRate < 95) {
      recommendations.push({
        category: 'budget_utilization',
        priority: 'medium',
        message: `Moderate budget utilization (${utilizationRate.toFixed(1)}%). Minor optimizations possible.`,
        actionItems: [
          'Consider smart rebalancing for residual budget',
          'Review price ratio optimization opportunities'
        ]
      });
    }

    // Tolerance compliance recommendations
    if (complianceRate < 80) {
      recommendations.push({
        category: 'tolerance_compliance',
        priority: 'medium',
        message: `Low tolerance compliance (${complianceRate.toFixed(1)}%). Allocations deviate significantly from targets.`,
        actionItems: [
          'Review target allocation percentages',
          'Consider adjusting tolerance bands',
          'Evaluate if current market conditions support targets'
        ]
      });
    }

    // Optimization quality recommendations
    if (result.fallbackUsed) {
      recommendations.push({
        category: 'optimization_quality',
        priority: 'low',
        message: 'Optimization used heuristic fallback. Consider reviewing constraints.',
        actionItems: [
          'Check constraint feasibility',
          'Review ETF price data accuracy',
          'Consider simplifying allocation targets'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Calculate optimization quality score (0-100)
   */
  calculateOptimizationQualityScore(result) {
    let score = 0;
    const weights = {
      utilizationRate: 0.4,
      toleranceCompliance: 0.3,
      solverQuality: 0.2,
      rebalancingEffectiveness: 0.1
    };

    // Utilization rate score (0-100)
    const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);
    score += (utilizationRate / 100) * weights.utilizationRate * 100;

    // Tolerance compliance score (0-100)
    const complianceRate = result.toleranceMetrics?.complianceRate || 0;
    score += (complianceRate / 100) * weights.toleranceCompliance * 100;

    // Solver quality score (0-100)
    let solverScore = 50; // Base score
    if (result.solverStatus === 'optimal') {
      solverScore = 100;
    } else if (result.solverStatus === 'heuristic') {
      solverScore = 75;
    } else if (result.fallbackUsed) {
      solverScore = 50;
    }
    score += (solverScore / 100) * weights.solverQuality * 100;

    // Rebalancing effectiveness score (0-100)
    const improvement = result.improvement || 0;
    const rebalancingScore = Math.min(100, improvement * 10); // Scale improvement to score
    score += (rebalancingScore / 100) * weights.rebalancingEffectiveness * 100;

    return Math.round(score);
  }

  /**
   * Run comprehensive optimization testing
   */
  async runOptimizationTesting(testType = 'comprehensive') {
    try {
      console.log(`=== RUNNING OPTIMIZATION TESTING: ${testType} ===`);

      switch (testType) {
        case 'comprehensive':
          return await optimizationTestFramework.runComprehensiveTests();

        case 'validation':
          return await optimizationTestFramework.runValidationScenarios();

        case 'benchmark':
          return {
            benchmarkResults: await optimizationTestFramework.runBenchmarkComparisons(),
            timestamp: new Date().toISOString()
          };

        case 'quick':
          return await this.runQuickOptimizationTest();

        default:
          throw new Error(`Unknown test type: ${testType}`);
      }
    } catch (error) {
      logger.logError(error, `Optimization testing failed (${testType})`);
      throw new Error(`Testing failed: ${error.message}`);
    }
  }

  /**
   * Run quick optimization test for development/validation
   */
  async runQuickOptimizationTest() {
    const testInput = {
      strategy: { type: 'custom', parameters: { allocations: { VTI: 60, BND: 40 } } },
      selectedETFs: ['VTI', 'BND'],
      additionalCapital: 5000,
      currentHoldings: [
        { etf: 'VTI', shares: 10, price: 450 },
        { etf: 'BND', shares: 50, price: 75 }
      ],
      optimizationOptions: { useEnhanced: true }
    };

    try {
      const startTime = Date.now();
      const result = await this.optimizePortfolioEnhanced(testInput);
      const endTime = Date.now();

      return {
        testType: 'quick_optimization',
        success: true,
        duration: endTime - startTime,
        utilizationRate: 100 - (result.optimizationMetrics?.unusedPercentage || 0),
        solverStatus: result.solverStatus,
        enhancedFeatures: result.enhancedFeatures,
        qualityScore: result.optimizationReport?.qualityScore || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testType: 'quick_optimization',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Toggle enhanced optimization features
   */
  setFeatureFlag(feature, enabled) {
    if (this.featureFlags.hasOwnProperty(feature)) {
      this.featureFlags[feature] = enabled;
      console.log(`Feature flag '${feature}' set to: ${enabled}`);
      return true;
    } else {
      console.warn(`Unknown feature flag: ${feature}`);
      return false;
    }
  }

  /**
   * Get current feature flag configuration
   */
  getFeatureFlags() {
    return { ...this.featureFlags };
  }

  /**
   * Reset feature flags to defaults
   */
  resetFeatureFlags() {
    this.featureFlags = {
      enhancedOptimization: true,
      smartRebalancing: true,
      toleranceManagement: true,
      priceRatioOptimization: true,
      iterativeUtilization: true
    };
    console.log('Feature flags reset to defaults');
  }
}

module.exports = new EnhancedPortfolioService();