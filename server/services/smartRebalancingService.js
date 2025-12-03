/**
 * Smart Rebalancing Service
 * Implements advanced price ratio optimization and iterative budget utilization
 */

const logger = require('../config/logger');

class SmartRebalancingService {
  constructor() {
    this.rebalancingStrategies = [
      'price_ratio_optimization',
      'iterative_residual_utilization',
      'tolerance_band_adjustment',
      'constraint_relaxation'
    ];
    this.maxRebalancingIterations = 5;
    this.minImprovementThreshold = 0.5; // 0.5% minimum improvement
  }

  /**
   * Perform smart rebalancing with multiple strategies
   * @param {Object} optimizationInput - Original optimization input
   * @param {Object} currentResult - Current optimization result
   * @param {number} totalAvailableBudget - Total available budget
   * @returns {Object} Improved optimization result
   */
  async performSmartRebalancing(optimizationInput, currentResult, totalAvailableBudget) {
    try {
      console.log('=== SMART REBALANCING START ===');
      console.log('Current utilization:', (100 - (currentResult.optimizationMetrics?.unusedPercentage || 0)).toFixed(2) + '%');

      let bestResult = currentResult;
      let bestUtilizationRate = 100 - (currentResult.optimizationMetrics?.unusedPercentage || 0);

      // Try each rebalancing strategy
      for (const strategy of this.rebalancingStrategies) {
        console.log(`\n--- Trying strategy: ${strategy} ---`);

        const improvedResult = await this.applyRebalancingStrategy(
          strategy,
          optimizationInput,
          bestResult,
          totalAvailableBudget
        );

        const newUtilizationRate = 100 - (improvedResult.optimizationMetrics?.unusedPercentage || 0);
        const improvement = newUtilizationRate - bestUtilizationRate;

        console.log(`Strategy ${strategy} result:`, {
          utilizationRate: newUtilizationRate.toFixed(2) + '%',
          improvement: improvement.toFixed(2) + '%',
          isBetter: improvement > this.minImprovementThreshold
        });

        // Keep the result if it shows meaningful improvement
        if (improvement > this.minImprovementThreshold) {
          bestResult = improvedResult;
          bestUtilizationRate = newUtilizationRate;
        }
      }

      // Final iterative refinement
      const finalResult = await this.performIterativeRefinement(
        optimizationInput,
        bestResult,
        totalAvailableBudget
      );

      console.log('=== SMART REBALANCING COMPLETE ===');
      console.log('Final utilization rate:', (100 - (finalResult.optimizationMetrics?.unusedPercentage || 0)).toFixed(2) + '%');

      return {
        ...finalResult,
        rebalancingApplied: true,
        originalUtilization: 100 - (currentResult.optimizationMetrics?.unusedPercentage || 0),
        finalUtilization: 100 - (finalResult.optimizationMetrics?.unusedPercentage || 0),
        improvement: (100 - (finalResult.optimizationMetrics?.unusedPercentage || 0)) - (100 - (currentResult.optimizationMetrics?.unusedPercentage || 0))
      };

    } catch (error) {
      logger.logError(error, 'Smart rebalancing failed');
      throw new Error(`Smart rebalancing failed: ${error.message}`);
    }
  }

  /**
   * Apply specific rebalancing strategy
   */
  async applyRebalancingStrategy(strategy, optimizationInput, currentResult, totalAvailableBudget) {
    switch (strategy) {
      case 'price_ratio_optimization':
        return await this.applyPriceRatioOptimization(optimizationInput, currentResult, totalAvailableBudget);

      case 'iterative_residual_utilization':
        return await this.applyIterativeResidualUtilization(optimizationInput, currentResult, totalAvailableBudget);

      case 'tolerance_band_adjustment':
        return await this.applyToleranceBandAdjustment(optimizationInput, currentResult, totalAvailableBudget);

      case 'constraint_relaxation':
        return await this.applyConstraintRelaxation(optimizationInput, currentResult, totalAvailableBudget);

      default:
        return currentResult;
    }
  }

  /**
   * Price Ratio Optimization Strategy
   * Optimizes for scenarios like 1x ETF1 vs 6x ETF2
   */
  async applyPriceRatioOptimization(optimizationInput, currentResult, totalAvailableBudget) {
    console.log('Applying price ratio optimization...');

    const { targetETFs } = optimizationInput;
    const { allocations } = currentResult;
    const unusedBudget = currentResult.optimizationMetrics?.unusedBudget || 0;

    // Analyze price ratios between all ETFs
    const priceRatios = this.calculatePriceRatios(targetETFs);

    // Find optimal ETF combinations for residual budget
    const optimalCombinations = this.findOptimalETFCombinations(targetETFs, unusedBudget, priceRatios);

    if (optimalCombinations.length > 0) {
      console.log('Found optimal ETF combinations for residual budget:', optimalCombinations);

      // Adjust allocations to use optimal combinations
      const adjustedAllocations = this.adjustAllocationsForOptimalCombos(
        allocations,
        optimalCombinations,
        unusedBudget
      );

      return {
        ...currentResult,
        allocations: adjustedAllocations,
        optimizationMetrics: this.recalculateMetrics(adjustedAllocations, totalAvailableBudget)
      };
    }

    return currentResult;
  }

  /**
   * Calculate price ratios between ETFs
   */
  calculatePriceRatios(targetETFs) {
    const priceRatios = {};

    for (let i = 0; i < targetETFs.length; i++) {
      for (let j = i + 1; j < targetETFs.length; j++) {
        const etf1 = targetETFs[i];
        const etf2 = targetETFs[j];
        const ratio = etf1.pricePerShare / etf2.pricePerShare;
        const inverseRatio = etf2.pricePerShare / etf1.pricePerShare;

        // Check for near-integer ratios (e.g., 1:6, 2:5, 3:4)
        const integerRatio = Math.round(ratio);
        const inverseIntegerRatio = Math.round(inverseRatio);

        priceRatios[`${etf1.name}-${etf2.name}`] = {
          ratio,
          inverseRatio,
          integerRatio,
          inverseIntegerRatio,
          isNearInteger: Math.abs(ratio - integerRatio) < 0.1,
          isNearInverseInteger: Math.abs(inverseRatio - inverseIntegerRatio) < 0.1,
          efficiency: this.calculateRatioEfficiency(ratio, etf1.pricePerShare, etf2.pricePerShare)
        };
      }
    }

    return priceRatios;
  }

  /**
   * Find optimal ETF combinations for residual budget
   */
  findOptimalETFCombinations(targetETFs, unusedBudget, priceRatios) {
    const combinations = [];
    const sortedETFs = targetETFs.sort((a, b) => a.pricePerShare - b.pricePerShare);

    // Strategy 1: Direct ETF purchase if budget allows
    for (const etf of sortedETFs) {
      if (unusedBudget >= etf.pricePerShare) {
        const sharesPossible = Math.floor(Math.round((unusedBudget / etf.pricePerShare) * 100) / 100);
        if (sharesPossible > 0) {
          combinations.push({
            type: 'direct_purchase',
            etf: etf.name,
            shares: sharesPossible,
            cost: sharesPossible * etf.pricePerShare,
            remainingBudget: unusedBudget - (sharesPossible * etf.pricePerShare),
            efficiency: 1.0
          });
        }
      }
    }

    // Strategy 2: Integer ratio combinations (e.g., 1x expensive ETF vs 6x cheap ETF)
    Object.entries(priceRatios).forEach(([pairKey, ratioData]) => {
      const [etf1Name, etf2Name] = pairKey.split('-');
      const etf1 = targetETFs.find(e => e.name === etf1Name);
      const etf2 = targetETFs.find(e => e.name === etf2Name);

      if (ratioData.isNearInteger && etf1 && etf2) {
        const multiplier = ratioData.integerRatio;

        // Try both directions of the ratio
        for (const [direction, etfA, etfB, mult] of [
          ['forward', etf1, etf2, multiplier],
          ['inverse', etf2, etf1, 1/multiplier]
        ]) {
          const combinedCost = etfA.pricePerShare + (etfB.pricePerShare * mult);

          if (unusedBudget >= combinedCost && mult <= 10) { // Limit to reasonable combinations
            const maxCombinations = Math.floor(Math.round((unusedBudget / combinedCost) * 100) / 100);

            if (maxCombinations > 0) {
              combinations.push({
                type: 'ratio_combination',
                direction,
                etf1: etfA.name,
                etf2: etfB.name,
                ratio: mult,
                cost: combinedCost,
                maxCombinations,
                remainingBudget: unusedBudget - (combinedCost * maxCombinations),
                efficiency: ratioData.efficiency
              });
            }
          }
        }
      }
    });

    // Sort by efficiency (highest remaining budget utilization)
    return combinations.sort((a, b) => {
      const utilizationA = (unusedBudget - a.remainingBudget) / unusedBudget;
      const utilizationB = (unusedBudget - b.remainingBudget) / unusedBudget;
      return utilizationB - utilizationA;
    });
  }

  /**
   * Calculate ratio efficiency score
   */
  calculateRatioEfficiency(ratio, price1, price2) {
    // Higher efficiency for ratios closer to integers
    const integerProximity = 1 - Math.abs(ratio - Math.round(ratio));
    // Higher efficiency for balanced price ratios (not too extreme)
    const priceBalance = 1 - Math.abs(Math.log10(price1 / price2)) / 3;

    return (integerProximity * 0.7) + (priceBalance * 0.3);
  }

  /**
   * Adjust allocations to incorporate optimal combinations
   */
  adjustAllocationsForOptimalCombos(allocations, optimalCombinations, unusedBudget) {
    if (optimalCombinations.length === 0) {
      return allocations;
    }

    const adjustedAllocations = [...allocations];
    let remainingBudget = unusedBudget;

    // Apply the best combination
    const bestCombination = optimalCombinations[0];

    if (bestCombination.type === 'direct_purchase') {
      const allocation = adjustedAllocations.find(a => a.etfName === bestCombination.etf);
      if (allocation) {
        allocation.finalShares += bestCombination.shares;
        allocation.sharesToBuy += bestCombination.shares;
        allocation.costOfPurchase += bestCombination.cost;
        allocation.finalValue = allocation.finalShares * allocation.pricePerShare;
        allocation.actualPercentage = (allocation.finalValue / (allocation.finalValue + remainingBudget)) * 100;
      }
    } else if (bestCombination.type === 'ratio_combination') {
      // Adjust both ETFs in the ratio combination
      const maxCombos = Math.min(bestCombination.maxCombinations, 1); // Limit to 1 combination for simplicity

      const allocation1 = adjustedAllocations.find(a => a.etfName === bestCombination.etf1);
      const allocation2 = adjustedAllocations.find(a => a.etfName === bestCombination.etf2);

      if (allocation1 && allocation2) {
        const shares1 = maxCombos;
        const shares2 = maxCombos * bestCombination.ratio;
        const cost1 = shares1 * allocation1.pricePerShare;
        const cost2 = shares2 * allocation2.pricePerShare;

        allocation1.finalShares += shares1;
        allocation1.sharesToBuy += shares1;
        allocation1.costOfPurchase += cost1;
        allocation1.finalValue = allocation1.finalShares * allocation1.pricePerShare;

        allocation2.finalShares += shares2;
        allocation2.sharesToBuy += shares2;
        allocation2.costOfPurchase += cost2;
        allocation2.finalValue = allocation2.finalShares * allocation2.pricePerShare;

        // Recalculate percentages
        const totalValue = allocation1.finalValue + allocation2.finalValue + remainingBudget;
        allocation1.actualPercentage = (allocation1.finalValue / totalValue) * 100;
        allocation2.actualPercentage = (allocation2.finalValue / totalValue) * 100;

        remainingBudget -= (cost1 + cost2);
      }
    }

    return adjustedAllocations;
  }

  /**
   * Iterative Residual Utilization Strategy
   */
  async applyIterativeResidualUtilization(optimizationInput, currentResult, totalAvailableBudget) {
    console.log('Applying iterative residual utilization...');

    let result = currentResult;
    let iteration = 0;
    const maxIterations = 10;

    while (iteration < maxIterations) {
      const unusedBudget = result.optimizationMetrics?.unusedBudget || 0;

      if (unusedBudget < 100) { // Stop if less than $100 remaining
        break;
      }

      const improvedResult = await this.utilizeResidualBudget(
        optimizationInput,
        result,
        unusedBudget
      );

      const improvement = (result.optimizationMetrics?.unusedBudget || 0) - (improvedResult.optimizationMetrics?.unusedBudget || 0);

      if (improvement < 1) { // Stop if improvement is less than $1
        break;
      }

      result = improvedResult;
      iteration++;
    }

    console.log(`Iterative residual utilization completed after ${iteration} iterations`);
    return result;
  }

  /**
   * Utilize residual budget with cheapest ETF prioritization
   */
  async utilizeResidualBudget(optimizationInput, currentResult, residualBudget) {
    const { allocations } = currentResult;
    const { targetETFs } = optimizationInput;

    // Find cheapest ETF with positive allocation
    const cheapestETF = allocations
      .filter(a => a.targetPercentage > 0)
      .sort((a, b) => a.pricePerShare - b.pricePerShare)[0];

    if (!cheapestETF || residualBudget < cheapestETF.pricePerShare) {
      return currentResult;
    }

    // Calculate maximum additional shares
    const additionalShares = Math.floor(Math.round((residualBudget / cheapestETF.pricePerShare) * 100) / 100);

    if (additionalShares > 0) {
      const updatedAllocations = allocations.map(allocation => {
        if (allocation.etfName === cheapestETF.etfName) {
          const additionalCost = additionalShares * allocation.pricePerShare;

          return {
            ...allocation,
            finalShares: allocation.finalShares + additionalShares,
            sharesToBuy: allocation.sharesToBuy + additionalShares,
            costOfPurchase: allocation.costOfPurchase + additionalCost,
            finalValue: (allocation.finalShares + additionalShares) * allocation.pricePerShare
          };
        }
        return allocation;
      });

      return {
        ...currentResult,
        allocations: updatedAllocations,
        optimizationMetrics: this.recalculateMetrics(updatedAllocations, totalAvailableBudget)
      };
    }

    return currentResult;
  }

  /**
   * Tolerance Band Adjustment Strategy
   */
  async applyToleranceBandAdjustment(optimizationInput, currentResult, totalAvailableBudget) {
    console.log('Applying tolerance band adjustment...');

    const unusedPercentage = currentResult.optimizationMetrics?.unusedPercentage || 0;

    if (unusedPercentage > 5) {
      // Relax tolerance bands to allow better budget utilization
      const adjustedInput = {
        ...optimizationInput,
        targetETFs: optimizationInput.targetETFs.map(etf => ({
          ...etf,
          allowedDeviation: Math.min(50, (etf.allowedDeviation || 20) + (unusedPercentage * 0.5))
        }))
      };

      // Re-run optimization with relaxed constraints
      const portfolioOptimizationService = require('./portfolioOptimizationService');
      return await portfolioOptimizationService.optimizePortfolio(adjustedInput);
    }

    return currentResult;
  }

  /**
   * Constraint Relaxation Strategy
   */
  async applyConstraintRelaxation(optimizationInput, currentResult, totalAvailableBudget) {
    console.log('Applying constraint relaxation...');

    const unusedPercentage = currentResult.optimizationMetrics?.unusedPercentage || 0;

    if (unusedPercentage > 10) {
      // Aggressive constraint relaxation
      const relaxedInput = {
        ...optimizationInput,
        targetETFs: optimizationInput.targetETFs.map(etf => ({
          ...etf,
          allowedDeviation: 60 // Maximum deviation
        })),
        objectives: {
          ...optimizationInput.objectives,
          useAllBudget: true,
          budgetWeight: 0.95, // Maximum budget weight
          fairnessWeight: 0.05,
          maximizeUtilization: true
        }
      };

      const portfolioOptimizationService = require('./portfolioOptimizationService');
      return await portfolioOptimizationService.optimizePortfolio(relaxedInput);
    }

    return currentResult;
  }

  /**
   * Perform iterative refinement
   */
  async performIterativeRefinement(optimizationInput, bestResult, totalAvailableBudget) {
    console.log('Performing iterative refinement...');

    let result = bestResult;
    let lastUnusedPercentage = result.optimizationMetrics?.unusedPercentage || 100;
    let iteration = 0;

    while (iteration < 3) { // Limited refinement iterations
      const currentUnusedPercentage = result.optimizationMetrics?.unusedPercentage || 0;
      const improvement = lastUnusedPercentage - currentUnusedPercentage;

      if (improvement < 0.5) { // Stop if improvement is minimal
        break;
      }

      // Apply fine-tuning
      result = await this.applyFineTuning(optimizationInput, result, totalAvailableBudget);
      lastUnusedPercentage = currentUnusedPercentage;
      iteration++;
    }

    return result;
  }

  /**
   * Apply fine-tuning adjustments
   */
  async applyFineTuning(optimizationInput, result, totalAvailableBudget) {
    const unusedBudget = result.optimizationMetrics?.unusedBudget || 0;

    if (unusedBudget < 50) {
      return result; // Not enough budget for meaningful adjustment
    }

    // Apply a small adjustment to the best performing ETF
    const { allocations } = result;
    const bestETF = allocations
      .filter(a => a.sharesToBuy > 0)
      .sort((a, b) => b.costOfPurchase - a.costOfPurchase)[0];

    if (bestETF && unusedBudget >= bestETF.pricePerShare) {
      const additionalShares = Math.floor(Math.round((unusedBudget / bestETF.pricePerShare) * 100) / 100);

      if (additionalShares > 0) {
        const updatedAllocations = allocations.map(allocation => {
          if (allocation.etfName === bestETF.etfName) {
            const additionalCost = additionalShares * allocation.pricePerShare;

            return {
              ...allocation,
              finalShares: allocation.finalShares + additionalShares,
              sharesToBuy: allocation.sharesToBuy + additionalShares,
              costOfPurchase: allocation.costOfPurchase + additionalCost,
              finalValue: (allocation.finalShares + additionalShares) * allocation.pricePerShare
            };
          }
          return allocation;
        });

        return {
          ...result,
          allocations: updatedAllocations,
          optimizationMetrics: this.recalculateMetrics(updatedAllocations, totalAvailableBudget)
        };
      }
    }

    return result;
  }

  /**
   * Recalculate optimization metrics after adjustments
   */
  recalculateMetrics(allocations, totalAvailableBudget) {
    const totalBudgetUsed = allocations.reduce((sum, allocation) => sum + allocation.costOfPurchase, 0);
    const unusedBudget = totalAvailableBudget - totalBudgetUsed;
    const unusedPercentage = (unusedBudget / totalAvailableBudget) * 100;

    return {
      totalBudgetUsed,
      unusedBudget,
      unusedPercentage,
      utilizationRate: 100 - unusedPercentage
    };
  }
}

module.exports = new SmartRebalancingService();