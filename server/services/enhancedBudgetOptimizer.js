/**
 * Enhanced Budget Optimization Service
 * Implements advanced budget allocation with 5% tolerance management,
 * smart rebalancing, and dynamic constraint adjustment
 */

const logger = require('../config/logger');
const portfolioOptimizationService = require('./portfolioOptimizationService');

class EnhancedBudgetOptimizer {
  constructor() {
    this.toleranceBand = 0.05; // 5% tolerance band
    this.maxIterations = 10;
    this.convergenceThreshold = 0.01; // 1% improvement threshold
  }

  /**
   * Optimize budget allocation with enhanced tolerance management
   * @param {Object} input - Optimization input parameters
   * @returns {Object} Enhanced optimization result
   */
  async optimizeBudgetWithTolerance(input) {
    try {
      console.log('=== ENHANCED BUDGET OPTIMIZATION START ===');
      console.log('Input parameters:', JSON.stringify(input, null, 2));

      const startTime = Date.now();
      const { currentHoldings = [], targetETFs, extraCash, objectives = {} } = input;

      // Calculate total available budget
      const currentHoldingsValue = currentHoldings.reduce(
        (sum, holding) => sum + holding.shares * holding.price,
        0
      );
      const totalAvailableBudget = currentHoldingsValue + extraCash;

      // Phase 1: Initial optimization with relaxed constraints
      const initialResult = await this.performInitialOptimization(input, totalAvailableBudget);

      // Phase 2: Analyze price ratios and identify optimization opportunities
      const priceRatioAnalysis = this.analyzePriceRatios(targetETFs, initialResult);

      // Phase 3: Dynamic constraint adjustment based on remaining budget
      const adjustedResult = await this.performDynamicAdjustment(
        input,
        initialResult,
        priceRatioAnalysis,
        totalAvailableBudget
      );

      // Phase 4: Iterative rebalancing for residual budget utilization
      const finalResult = await this.performIterativeRebalancing(
        input,
        adjustedResult,
        totalAvailableBudget
      );

      // Phase 5: Tolerance band validation and final adjustment
      const validatedResult = this.validateToleranceBands(finalResult, totalAvailableBudget);

      const optimizationTime = Date.now() - startTime;

      console.log('=== ENHANCED BUDGET OPTIMIZATION COMPLETE ===');
      console.log('Total optimization time:', optimizationTime, 'ms');
      console.log('Final utilization rate:', (100 - validatedResult.optimizationMetrics.unusedPercentage).toFixed(2) + '%');

      return {
        ...validatedResult,
        optimizationPhases: {
          initial: initialResult.optimizationMetrics,
          adjusted: adjustedResult.optimizationMetrics,
          final: finalResult.optimizationMetrics,
          priceRatioAnalysis
        },
        totalOptimizationTime: optimizationTime,
        enhancedOptimization: true
      };

    } catch (error) {
      logger.logError(error, 'Enhanced budget optimization failed');
      throw new Error(`Enhanced optimization failed: ${error.message}`);
    }
  }

  /**
   * Perform initial optimization with relaxed constraints
   */
  async performInitialOptimization(input, totalAvailableBudget) {
    console.log('=== PHASE 1: INITIAL OPTIMIZATION ===');

    // Create relaxed constraints for better cash utilization
    const relaxedInput = {
      ...input,
      targetETFs: input.targetETFs.map(etf => ({
        ...etf,
        allowedDeviation: 30 // Start with 30% deviation band
      })),
      objectives: {
        ...input.objectives,
        useAllBudget: true,
        budgetWeight: 0.8, // Prioritize budget utilization
        fairnessWeight: 0.2,
        maximizeUtilization: true
      }
    };

    const result = await portfolioOptimizationService.optimizePortfolio(relaxedInput);

    console.log('Initial optimization result:', {
      solverStatus: result.solverStatus,
      unusedPercentage: result.optimizationMetrics?.unusedPercentage,
      utilizationRate: 100 - (result.optimizationMetrics?.unusedPercentage || 0)
    });

    return result;
  }

  /**
   * Analyze price ratios to identify optimization opportunities
   */
  analyzePriceRatios(targetETFs, optimizationResult) {
    console.log('=== PHASE 2: PRICE RATIO ANALYSIS ===');

    const priceRatios = {};
    const optimizationOpportunities = [];

    // Calculate price ratios between all ETF pairs
    for (let i = 0; i < targetETFs.length; i++) {
      for (let j = i + 1; j < targetETFs.length; j++) {
        const etf1 = targetETFs[i];
        const etf2 = targetETFs[j];
        const ratio = etf1.pricePerShare / etf2.pricePerShare;

        priceRatios[`${etf1.name}/${etf2.name}`] = {
          ratio: ratio,
          inverseRatio: 1 / ratio,
          price1: etf1.pricePerShare,
          price2: etf2.pricePerShare,
          integerMultiple: Math.round(ratio),
          closeness: Math.abs(ratio - Math.round(ratio))
        };

        // Identify optimization opportunities
        if (ratio > 2 && Math.abs(ratio - Math.round(ratio)) < 0.1) {
          optimizationOpportunities.push({
            type: 'integer_multiple',
            etf1: etf1.name,
            etf2: etf2.name,
            ratio: Math.round(ratio),
            description: `${Math.round(ratio)}x ${etf1.name} ≈ 1x ${etf2.name}`
          });
        }
      }
    }

    console.log('Price ratio analysis:', priceRatios);
    console.log('Optimization opportunities:', optimizationOpportunities);

    return {
      priceRatios,
      optimizationOpportunities,
      cheapestETF: targetETFs.reduce((min, etf) =>
        etf.pricePerShare < min.pricePerShare ? etf : min
      ),
      mostExpensiveETF: targetETFs.reduce((max, etf) =>
        etf.pricePerShare > max.pricePerShare ? etf : max
      )
    };
  }

  /**
   * Perform dynamic constraint adjustment based on remaining budget
   */
  async performDynamicAdjustment(input, initialResult, priceRatioAnalysis, totalAvailableBudget) {
    console.log('=== PHASE 3: DYNAMIC CONSTRAINT ADJUSTMENT ===');

    const unusedPercentage = initialResult.optimizationMetrics?.unusedPercentage || 0;
    const unusedBudget = (unusedPercentage / 100) * totalAvailableBudget;

    console.log('Unused budget analysis:', {
      unusedPercentage,
      unusedBudget,
      threshold: unusedBudget > totalAvailableBudget * 0.05 // More than 5% unused
    });

    // If unused budget is significant, dynamically adjust constraints
    if (unusedBudget > totalAvailableBudget * 0.05) {

      // Calculate optimized deviation bands based on remaining budget
      const dynamicDeviations = this.calculateDynamicDeviations(
        input.targetETFs,
        unusedBudget,
        priceRatioAnalysis
      );

      const adjustedInput = {
        ...input,
        targetETFs: input.targetETFs.map((etf, index) => ({
          ...etf,
          allowedDeviation: dynamicDeviations[index]
        })),
        objectives: {
          ...input.objectives,
          useAllBudget: true,
          budgetWeight: 0.9, // Even stronger focus on budget utilization
          fairnessWeight: 0.1
        }
      };

      console.log('Dynamic deviation bands:', dynamicDeviations);

      const adjustedResult = await portfolioOptimizationService.optimizePortfolio(adjustedInput);

      console.log('Adjusted optimization result:', {
        solverStatus: adjustedResult.solverStatus,
        unusedPercentage: adjustedResult.optimizationMetrics?.unusedPercentage,
        improvement: unusedPercentage - (adjustedResult.optimizationMetrics?.unusedPercentage || 0)
      });

      return adjustedResult;
    }

    return initialResult;
  }

  /**
   * Calculate dynamic deviation bands for each ETF
   */
  calculateDynamicDeviations(targetETFs, unusedBudget, priceRatioAnalysis) {
    const deviations = [];

    // Base deviation calculation
    const baseDeviation = Math.min(50, 20 + (unusedBudget / 1000)); // Scale with unused budget

    targetETFs.forEach((etf, index) => {
      let deviation = baseDeviation;

      // Adjust based on ETF characteristics
      if (etf.targetPercentage === 0) {
        deviation = 0; // Force sell for 0% targets
      } else if (etf.pricePerShare <= priceRatioAnalysis.cheapestETF.pricePerShare * 1.2) {
        deviation += 10; // Allow more deviation for cheap ETFs (better for residual budget)
      } else if (etf.pricePerShare >= priceRatioAnalysis.mostExpensiveETF.pricePerShare * 0.8) {
        deviation -= 5; // Tighter deviation for expensive ETFs
      }

      // Adjust based on target percentage
      if (etf.targetPercentage < 5) {
        deviation += 15; // More flexibility for small allocations
      } else if (etf.targetPercentage > 30) {
        deviation -= 5; // Tighter control for large allocations
      }

      deviations.push(Math.max(5, Math.min(60, deviation))); // Clamp between 5% and 60%
    });

    return deviations;
  }

  /**
   * Perform iterative rebalancing for residual budget utilization
   */
  async performIterativeRebalancing(input, adjustedResult, totalAvailableBudget) {
    console.log('=== PHASE 4: ITERATIVE REBALANCING ===');

    let currentResult = adjustedResult;
    let iteration = 0;
    let lastUnusedPercentage = currentResult.optimizationMetrics?.unusedPercentage || 100;

    while (iteration < this.maxIterations) {
      iteration++;
      const currentUnusedPercentage = currentResult.optimizationMetrics?.unusedPercentage || 0;

      console.log(`Iteration ${iteration}: Current unused percentage: ${currentUnusedPercentage.toFixed(2)}%`);

      // Check convergence
      if (Math.abs(lastUnusedPercentage - currentUnusedPercentage) < this.convergenceThreshold) {
        console.log('Convergence reached, stopping iterative rebalancing');
        break;
      }

      // If improvement is minimal, apply smart rebalancing strategies
      if (currentUnusedPercentage > 3) {
        currentResult = await this.applySmartRebalancing(
          input,
          currentResult,
          totalAvailableBudget,
          currentUnusedPercentage
        );
      } else {
        console.log('Low unused budget, applying fine-tuning');
        break;
      }

      lastUnusedPercentage = currentUnusedPercentage;
    }

    console.log(`Iterative rebalancing completed after ${iteration} iterations`);

    return currentResult;
  }

  /**
   * Apply smart rebalancing strategies
   */
  async applySmartRebalancing(input, currentResult, totalAvailableBudget, unusedPercentage) {
    console.log('=== APPLYING SMART REBALANCING ===');

    const unusedBudget = (unusedPercentage / 100) * totalAvailableBudget;
    const { allocations } = currentResult;

    // Strategy 1: Target cheapest ETFs for remaining budget
    const cheapestETFs = allocations
      .filter(a => a.targetPercentage > 0)
      .sort((a, b) => a.finalValue / (a.finalShares || 1) - b.finalValue / (b.finalShares || 1));

    if (cheapestETFs.length > 0 && unusedBudget > cheapestETFs[0].costOfPurchase / (a.sharesToBuy || 1)) {
      console.log('Smart rebalancing: Adding shares to cheapest ETFs');

      // Create modified input with emphasis on cheapest ETFs
      const modifiedInput = {
        ...input,
        targetETFs: input.targetETFs.map(etf => {
          const allocation = allocations.find(a => a.etfName === etf.name);
          if (allocation && allocation.etfName === cheapestETFs[0].etfName) {
            // Slightly increase target for cheapest ETF
            return {
              ...etf,
              targetPercentage: Math.min(100, etf.targetPercentage + 2)
            };
          }
          return etf;
        }),
        objectives: {
          ...input.objectives,
          maximizeUtilization: true
        }
      };

      return await portfolioOptimizationService.optimizePortfolio(modifiedInput);
    }

    // Strategy 2: Relax constraints further if smart rebalancing doesn't work
    console.log('Smart rebalancing: Further relaxing constraints');
    const relaxedInput = {
      ...input,
      targetETFs: input.targetETFs.map(etf => ({
        ...etf,
        allowedDeviation: Math.min(70, (etf.allowedDeviation || 20) + 10)
      }))
    };

    return await portfolioOptimizationService.optimizePortfolio(relaxedInput);
  }

  /**
   * Validate tolerance bands and make final adjustments
   */
  validateToleranceBands(result, totalAvailableBudget) {
    console.log('=== PHASE 5: TOLERANCE BAND VALIDATION ===');

    const { allocations } = result;
    const validatedAllocations = allocations.map(allocation => {
      const { targetPercentage, actualPercentage } = allocation;
      const deviation = Math.abs(actualPercentage - targetPercentage);
      const withinTolerance = deviation <= (this.toleranceBand * 100);

      console.log(`Tolerance validation for ${allocation.etfName}:`, {
        target: targetPercentage.toFixed(2) + '%',
        actual: actualPercentage.toFixed(2) + '%',
        deviation: deviation.toFixed(2) + '%',
        tolerance: (this.toleranceBand * 100) + '%',
        withinTolerance
      });

      return {
        ...allocation,
        toleranceCompliant: withinTolerance,
        toleranceDeviation: deviation
      };
    });

    const compliantAllocations = validatedAllocations.filter(a => a.toleranceCompliant);
    const complianceRate = (compliantAllocations.length / validatedAllocations.length) * 100;

    console.log('Overall tolerance compliance rate:', complianceRate.toFixed(1) + '%');

    return {
      ...result,
      allocations: validatedAllocations,
      toleranceMetrics: {
        toleranceBand: this.toleranceBand,
        complianceRate,
        compliantAllocations: compliantAllocations.length,
        totalAllocations: validatedAllocations.length
      }
    };
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport(result) {
    const {
      optimizationMetrics,
      toleranceMetrics,
      optimizationPhases,
      totalOptimizationTime
    } = result;

    return {
      summary: {
        totalBudget: optimizationMetrics.totalAvailableBudget || 0,
        utilizedBudget: optimizationMetrics.totalBudgetUsed || 0,
        unusedBudget: optimizationMetrics.unusedBudget || 0,
        utilizationRate: 100 - (optimizationMetrics.unusedPercentage || 0),
        optimizationTime: totalOptimizationTime
      },
      toleranceAnalysis: toleranceMetrics || {},
      phaseAnalysis: optimizationPhases || {},
      recommendations: this.generateRecommendations(result)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(result) {
    const recommendations = [];
    const unusedPercentage = result.optimizationMetrics?.unusedPercentage || 0;

    if (unusedPercentage > 10) {
      recommendations.push({
        type: 'budget_utilization',
        priority: 'high',
        message: `High unused cash (${unusedPercentage.toFixed(1)}%). Consider increasing deviation bands or adding more target ETFs.`
      });
    }

    if (result.toleranceMetrics?.complianceRate < 80) {
      recommendations.push({
        type: 'tolerance_compliance',
        priority: 'medium',
        message: `Low tolerance compliance (${result.toleranceMetrics.complianceRate.toFixed(1)}%). Review allocation targets.`
      });
    }

    return recommendations;
  }
}

module.exports = new EnhancedBudgetOptimizer();