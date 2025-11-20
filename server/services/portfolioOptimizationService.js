/**
 * Portfolio Optimization Service
 * Business logic wrapper for linear programming optimization with fallback strategies
 */

const logger = require('../config/logger');
const linearProgrammingService = require('./linearProgrammingService');
const cacheService = require('./cacheService');

class PortfolioOptimizationService {
  /**
   * Optimize portfolio allocation with fallback strategies
   * @param {Object} input - Optimization input
   * @returns {Object} Optimization result
   */
  async optimizePortfolio(input) {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(input);

      // Check cache first
      const cachedResult = await cacheService.getCachedData(cacheKey);
      if (cachedResult) {
        logger.logInfo('Using cached optimization result');
        return { ...cachedResult, cached: true };
      }

      const startTime = Date.now();

      // Extract objective parameters
      const {
        useAllBudget = false,
        budgetWeight = 0.7,
        fairnessWeight = 0.3,
        maximizeUtilization = false,
        utilizationDeviation = 5
      } = input.objectives || {};

      console.log('=== MULTI-OBJECTIVE OPTIMIZATION DEBUG ===');
      console.log('Objectives:', { useAllBudget, budgetWeight, fairnessWeight, maximizeUtilization, utilizationDeviation });

      // Attempt linear programming optimization
      let result;
      try {
        result = await this.attemptLinearProgramming(input);

        if (result.solverStatus === 'optimal') {
          // Cache successful LP result
          await cacheService.setCachedData(cacheKey, result);
          return result;
        }
      } catch (lpError) {
        logger.logWarn('Linear programming failed, falling back to heuristics', {
          error: lpError.message,
        });
      }

      // Fallback to heuristic strategies with objective awareness
      result = await this.fallbackToHeuristics(input, {
        useAllBudget,
        budgetWeight,
        fairnessWeight,
        maximizeUtilization,
        utilizationDeviation
      });
      result.fallbackUsed = true;
      result.fallbackReason = 'Linear programming optimization failed or was infeasible';
      
      // CRITICAL FIX: Force heuristic fallback if LP has poor cash utilization OR high unused budget percentage
      if (result.solverStatus === 'optimal' && result.optimizationMetrics &&
          result.optimizationMetrics.unusedPercentage > 8) { // Lowered threshold from 10% to 8%
        console.log('=== FORCING HEURISTIC FALLBACK DUE TO POOR LP CASH UTILIZATION ===');
        console.log('LP unused percentage:', result.optimizationMetrics.unusedPercentage);
        console.log('Switching to heuristic for better cash utilization');
        
        // Force heuristic fallback with enhanced budget utilization strategy
        const heuristicStrategy = maximizeUtilization ? 'enhanced-budget' :
                               (useAllBudget ? 'enhanced-budget' : 'minimize-leftover');
        const heuristicResult = await this.fallbackToHeuristics({
          ...input,
          optimizationStrategy: heuristicStrategy
        }, { useAllBudget, budgetWeight, fairnessWeight, maximizeUtilization, utilizationDeviation });
        
        // Merge heuristic result with LP result for holdings to sell
        result.allocations = heuristicResult.allocations;
        result.optimizationMetrics = heuristicResult.optimizationMetrics;
        result.solverStatus = 'heuristic-forced';
        result.fallbackReason = `LP had ${result.optimizationMetrics.unusedPercentage.toFixed(1)}% unused cash, forced heuristic fallback`;
      }

      // Cache fallback result with shorter TTL
      await cacheService.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      logger.logError(error, null);
      throw new Error(`Portfolio optimization failed: ${error.message}`);
    }
  }

  /**
   * Attempt linear programming optimization
   */
  async attemptLinearProgramming(input) {
    // Add timeout for LP solver
    const timeoutMs = 30000; // Increased to 30 seconds for debugging

    console.log('=== CASH UTILIZATION DEBUG: LP START ===');
    console.log('LP timeout:', timeoutMs, 'ms');
    
    // Calculate total available budget for debugging
    const { currentHoldings = [], extraCash } = input;
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;
    
    console.log('=== CLEAN-SLATE BUDGET ANALYSIS ===');
    console.log('Current holdings to liquidate:', currentHoldingsValue);
    console.log('Extra cash:', extraCash);
    console.log('Total liquidated value:', totalAvailableBudget);
    console.log('LP Input:', JSON.stringify(input, null, 2));

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Linear programming timeout')), timeoutMs);
    });

    const lpPromise = new Promise((resolve, reject) => {
      try {
        console.log('=== CALLING LP SOLVER ===');
        const result = linearProgrammingService.solve(input);
        console.log('=== LP RESULT ANALYSIS ===');
        console.log('LP Result:', JSON.stringify(result, null, 2));
        
        // Analyze cash utilization in LP result
        if (result.optimizationMetrics) {
          const { totalBudgetUsed, unusedBudget, unusedPercentage } = result.optimizationMetrics;
          console.log('=== CASH UTILIZATION ANALYSIS ===');
          console.log('Total budget used:', totalBudgetUsed);
          console.log('Unused budget:', unusedBudget);
          console.log('Unused percentage:', unusedPercentage);
          console.log('Cash utilization rate:', (100 - unusedPercentage).toFixed(1) + '%');
          
          if (unusedPercentage > 10) {
            console.warn('HIGH CASH UTILIZATION ISSUE DETECTED!');
            console.warn('Unused budget percentage:', unusedPercentage);
            console.warn('This indicates a problem with the optimization logic');
          }
        }
        
        resolve(result);
      } catch (error) {
        console.error('=== LP SOLVER ERROR ===');
        console.error('LP Error:', error);
        reject(error);
      }
    });

    return Promise.race([lpPromise, timeoutPromise]);
  }

  /**
   * Fallback to heuristic optimization strategies
   */
  async fallbackToHeuristics(input) {
    const {
      currentHoldings = [],
      targetETFs,
      extraCash,
      optimizationStrategy = 'minimize-leftover',
    } = input;

    console.log('=== HEURISTIC FALLBACK DEBUG ===');
    console.log('Target ETFs received:', targetETFs.map(t => ({
      name: t.name,
      targetPercentage: t.targetPercentage,
      pricePerShare: t.pricePerShare
    })));
    console.log('Current holdings:', currentHoldings);
    console.log('Extra cash:', extraCash);
    console.log('Optimization strategy:', optimizationStrategy);

    // Calculate total available budget (current holdings value + additional cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => {
        // Ensure price is valid, use fallback if needed
        const price = holding.price || this.getFallbackPriceForETF(holding.name);
        const holdingValue = holding.shares * price;
        console.log(`Holding value for ${holding.name}:`, {
          shares: holding.shares,
          price: holding.price,
          effectivePrice: price,
          value: holdingValue,
          priceValid: holding.price != null && holding.price > 0,
          usedFallback: holding.price !== price
        });
        return sum + holdingValue;
      },
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;
    
    console.log('Budget calculation:', {
      currentHoldingsValue,
      extraCash,
      totalAvailableBudget
    });
    

    // Convert to buy order format compatible with frontend logic
    const buyOrders = this.convertToBuyOrders(targetETFs, currentHoldings, totalAvailableBudget);

    // Apply different heuristic strategies based on optimization strategy with enhanced budget focus
    let allocations;
    switch (optimizationStrategy) {
    case 'enhanced-budget':
      allocations = this.enhancedBudgetStrategy(buyOrders, totalAvailableBudget, input);
      break;
    case 'maximize-shares':
      allocations = this.maximizeSharesStrategy(buyOrders, totalAvailableBudget);
      break;
    case 'momentum-weighted':
      allocations = this.momentumWeightedStrategy(buyOrders, totalAvailableBudget, input);
      break;
    case 'minimize-leftover':
    default:
      allocations = this.minimizeLeftoverStrategy(buyOrders, totalAvailableBudget);
      break;
    }

    return this.formatHeuristicResult(allocations, input, totalAvailableBudget);
  }

  /**
   * Convert target ETFs to clean-slate final shares format
   */
  convertToBuyOrders(targetETFs, currentHoldings, totalAvailableBudget) {
    console.log('=== CONVERT TO CLEAN-SLATE FINAL SHARES DEBUG ===');
    const finalSharesOrders = targetETFs.map((etf) => {
      // CLEAN-SLATE: Calculate target final shares directly from total liquidated value
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      const targetFinalShares = targetValue / etf.pricePerShare;

      const floorTargetShares = Math.floor(targetFinalShares);
      const remainder = targetFinalShares - floorTargetShares;

      // Get current holdings for buy/sell calculation later
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;

      const order = {
        ticker: etf.name,
        targetFinalShares, // CLEAN-SLATE: Target final shares to hold
        floorTargetShares,
        remainder,
        price: etf.pricePerShare,
        targetValue,
        currentShares,
        currentValue: currentShares * etf.pricePerShare,
      };

      console.log(`Clean-slate target for ${etf.name}:`, {
        targetPercentage: etf.targetPercentage,
        targetValue,
        targetFinalShares,
        floorTargetShares,
        remainder,
        currentShares,
        currentValue: currentShares * etf.pricePerShare,
        price: etf.pricePerShare
      });

      return order;
    });

    const totalTargetValue = finalSharesOrders.reduce((sum, order) => sum + order.targetValue, 0);
    console.log('Total target value across all ETFs:', totalTargetValue);
    console.log('Total available budget:', totalAvailableBudget);
    console.log('Budget utilization target:', (totalTargetValue / totalAvailableBudget) * 100, '%');

    return finalSharesOrders;
  }

  /**
   * Enhanced budget utilization strategy - clean-slate approach for maximum cash deployment
   */
  enhancedBudgetStrategy(buyOrders, availableBudget, input) {
    console.log('=== ENHANCED CLEAN-SLATE BUDGET UTILIZATION STRATEGY ===');
    console.log('Target: >95% budget utilization');

    const finalShares = new Map();
    buyOrders.forEach((order) => finalShares.set(order.ticker, order.floorTargetShares));

    let remainingBudget =
      availableBudget - buyOrders.reduce((sum, order) => sum + order.floorTargetShares * order.price, 0);

    console.log('Initial remaining budget after target floor shares:', remainingBudget);

    // CLEAN-SLATE PHASE 1: Optimize for target allocation (high remainder ETFs first)
    const sortedByRemainder = [...buyOrders].sort((a, b) => b.remainder - a.remainder);

    for (const order of sortedByRemainder) {
      if (remainingBudget >= order.price) {
        finalShares.set(order.ticker, order.floorTargetShares + 1);
        remainingBudget -= order.price;
        console.log(`Phase 1: Added 1 share to ${order.ticker} (remainder: ${order.remainder.toFixed(3)}), remaining: ${remainingBudget.toFixed(2)}`);
      }
    }

    // CLEAN-SLATE PHASE 2: Allocate remaining budget while maintaining allocation balance
    const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price);
    let iterations = 0;
    const maxIterations = 100;

    while (remainingBudget > sortedByPrice[0]?.price && iterations < maxIterations) {
      let boughtThisIteration = false;

      for (const order of sortedByPrice) {
        if (remainingBudget >= order.price) {
          const currentFinalShares = finalShares.get(order.ticker) || order.floorTargetShares;
          const newValue = (currentFinalShares + 1) * order.price;
          const actualPercentage = (newValue / availableBudget) * 100;

          // Check if still within reasonable allocation bounds (±10% for final optimization)
          const minTargetPercent = Math.max(0, order.targetPercentage - 10);
          const maxTargetPercent = order.targetPercentage + 10;

          if (actualPercentage <= maxTargetPercent) {
            finalShares.set(order.ticker, currentFinalShares + 1);
            remainingBudget -= order.price;
            boughtThisIteration = true;
            console.log(`Phase 2: Allocated to ${order.ticker} (${actualPercentage.toFixed(2)}% vs target ${order.targetPercentage}%), remaining: ${remainingBudget.toFixed(2)}`);
            break;
          } else {
            console.log(`Phase 2: Skipping ${order.ticker} - would exceed ${maxTargetPercent}% (${actualPercentage.toFixed(2)}%)`);
          }
        }
      }

      if (!boughtThisIteration) break;
      iterations++;
    }

    // CLEAN-SLATE PHASE 3: Final cash deployment to any ETF that can afford it
    if (remainingBudget > sortedByPrice[0]?.price * 0.5) {
      console.log(`Phase 3: Final cash deployment with remaining ${remainingBudget.toFixed(2)}`);

      for (const order of sortedByPrice) {
        if (remainingBudget >= order.price) {
          const currentFinalShares = finalShares.get(order.ticker) || order.floorTargetShares;
          finalShares.set(order.ticker, currentFinalShares + 1);
          remainingBudget -= order.price;
          console.log(`Phase 3: Final allocation to ${order.ticker}, remaining: ${remainingBudget.toFixed(2)}`);
        }
      }
    }

    const utilizationRate = ((availableBudget - remainingBudget) / availableBudget) * 100;
    console.log(`=== CLEAN-SLATE ENHANCED BUDGET STRATEGY COMPLETE ===`);
    console.log(`Final utilization rate: ${utilizationRate.toFixed(2)}%`);
    console.log(`Remaining unused budget: ${remainingBudget.toFixed(2)} (${((remainingBudget/availableBudget)*100).toFixed(2)}%)`);
    console.log(`Total iterations: ${iterations}`);

    return finalShares;
  }
  maximizeSharesStrategy(buyOrders, availableBudget) {
    const finalShares = new Map();
    buyOrders.forEach((order) => finalShares.set(order.ticker, order.floorTargetShares));

    let remainingBudget =
      availableBudget - buyOrders.reduce((sum, order) => sum + order.floorTargetShares * order.price, 0);

    const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price);

    while (remainingBudget > 0) {
      let promoted = false;

      for (const order of sortedByPrice) {
        if (order.price <= remainingBudget) {
          const currentFinalShares = finalShares.get(order.ticker) || order.floorTargetShares;
          finalShares.set(order.ticker, currentFinalShares + 1);
          remainingBudget -= order.price;
          promoted = true;
          break;
        }
      }

      if (!promoted) break;
    }

    return finalShares;
  }

  /**
   * Momentum-weighted strategy
   */
  momentumWeightedStrategy(buyOrders, availableBudget, input) {
    const finalShares = new Map();
    buyOrders.forEach((order) => finalShares.set(order.ticker, order.floorTargetShares));

    let remainingBudget =
      availableBudget - buyOrders.reduce((sum, order) => sum + order.floorTargetShares * order.price, 0);

    // Calculate momentum efficiency (momentum / price)
    const efficiencyScores = buyOrders.map((order) => {
      // In a real implementation, we would use actual momentum data
      // For now, use a placeholder based on target percentage
      const momentumScore = order.targetValue / availableBudget; // Proxy for momentum
      const efficiency = momentumScore / order.price;

      return {
        ...order,
        efficiency,
      };
    });

    // Sort by efficiency descending
    const sortedByEfficiency = [...efficiencyScores].sort((a, b) => b.efficiency - a.efficiency);

    while (remainingBudget > 0) {
      let promoted = false;

      for (const order of sortedByEfficiency) {
        if (order.price <= remainingBudget) {
          const currentFinalShares = finalShares.get(order.ticker) || order.floorTargetShares;
          finalShares.set(order.ticker, currentFinalShares + 1);
          remainingBudget -= order.price;
          promoted = true;
          break;
        }
      }

      if (!promoted) break;
    }

    return finalShares;
  }

  /**
   * Minimize leftover budget strategy - clean-slate approach
   */
  minimizeLeftoverStrategy(buyOrders, availableBudget) {
    const finalShares = new Map();
    buyOrders.forEach((order) => finalShares.set(order.ticker, order.floorTargetShares));

    let remainingBudget =
      availableBudget - buyOrders.reduce((sum, order) => sum + order.floorTargetShares * order.price, 0);

    console.log('=== CLEAN-SLATE MINIMIZE LEFTOVER STRATEGY DEBUG ===');
    console.log('Initial remaining budget:', remainingBudget);
    console.log('Buy orders:', buyOrders.map(o => ({
      ticker: o.ticker,
      price: o.price,
      floorTargetShares: o.floorTargetShares,
      targetPercentage: o.targetPercentage,
      remainder: o.remainder
    })));

    // Sort by remainder (closest to next share) for target allocation optimization
    const sortedByRemainder = [...buyOrders].sort((a, b) => b.remainder - a.remainder);

    // First pass: Add shares for highest remainder ETFs (closest to target)
    for (const order of sortedByRemainder) {
      if (remainingBudget >= order.price) {
        finalShares.set(order.ticker, order.floorTargetShares + 1);
        remainingBudget -= order.price;
        console.log(`Added 1 share to ${order.ticker} (remainder: ${order.remainder.toFixed(3)}), remaining: ${remainingBudget}`);
      }
    }

    // Second pass: Buy cheapest ETFs to minimize leftover budget
    const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price);
    let iterations = 0;
    const maxIterations = 100;

    while (remainingBudget > sortedByPrice[0]?.price && iterations < maxIterations) {
      let boughtThisIteration = false;

      for (const order of sortedByPrice) {
        if (remainingBudget >= order.price) {
          const currentFinalShares = finalShares.get(order.ticker) || order.floorTargetShares;
          finalShares.set(order.ticker, currentFinalShares + 1);
          remainingBudget -= order.price;
          boughtThisIteration = true;
          console.log(`Bought additional share of ${order.ticker} (price: ${order.price}), remaining: ${remainingBudget}`);
          break;
        }
      }

      if (!boughtThisIteration) break;
      iterations++;
    }

    console.log('Final remaining budget after optimization:', remainingBudget);
    console.log('Total iterations:', iterations);
    console.log('Final shares distribution:', Object.fromEntries(finalShares));

    return finalShares;
  }

  /**
   * Format heuristic result to match LP result format
   */
  formatHeuristicResult(finalShares, input, totalAvailableBudget) {
    const { currentHoldings = [], targetETFs } = input;

    console.log('=== FORMAT CLEAN-SLATE HEURISTIC RESULT DEBUG ===');
    console.log('Final shares allocated:', Object.fromEntries(finalShares));
    console.log('Target ETFs for result formatting:', targetETFs.map(t => ({ name: t.name, targetPercentage: t.targetPercentage })));

    const allocations = [];
    let totalFinalPortfolioValue = 0;

    targetETFs.forEach((etf) => {
      const finalSharesCount = finalShares.get(etf.name) || 0;
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;

      // CLEAN-SLATE: Calculate buy/sell from final vs current comparison
      const sharesToBuy = Math.max(0, finalSharesCount - currentShares);
      const sharesToSell = Math.max(0, currentShares - finalSharesCount);

      const costOfPurchase = sharesToBuy * etf.pricePerShare;
      const proceedsFromSale = sharesToSell * etf.pricePerShare;
      const finalValue = finalSharesCount * etf.pricePerShare;

      const targetPercentage = etf.targetPercentage;
      const actualPercentage = (finalValue / totalAvailableBudget) * 100;
      const deviation = actualPercentage - targetPercentage;

      totalFinalPortfolioValue += finalValue;

      const allocation = {
        etfName: etf.name,
        currentShares,
        finalShares: finalSharesCount, // CLEAN-SLATE: Final shares to hold
        sharesToBuy,
        sharesToSell,
        finalValue,
        targetPercentage,
        actualPercentage,
        deviation,
      };

      console.log(`Clean-slate allocation for ${etf.name}:`, {
        targetPercentage,
        actualPercentage,
        deviation,
        finalValue,
        currentShares,
        finalSharesCount,
        sharesToBuy,
        sharesToSell
      });

      allocations.push(allocation);
    });

    // CLEAN-SLATE: Budget utilization is final portfolio value vs total liquidated value
    const unusedBudget = totalAvailableBudget - totalFinalPortfolioValue;
    const unusedPercentage = (unusedBudget / totalAvailableBudget) * 100;

    console.log('=== CLEAN-SLATE HEURISTIC CASH UTILIZATION ANALYSIS ===');
    console.log('Total liquidated value (budget):', totalAvailableBudget);
    console.log('Final portfolio value:', totalFinalPortfolioValue);
    console.log('Unused budget (cash remaining):', unusedBudget);
    console.log('Unused percentage:', unusedPercentage.toFixed(2) + '%');
    console.log('Budget utilization rate:', (100 - unusedPercentage).toFixed(2) + '%');
    console.log('Final optimization summary:', {
      totalFinalPortfolioValue,
      unusedBudget,
      unusedPercentage,
      totalAllocations: allocations.length,
      etfsWithAllocation: allocations.filter(a => a.finalShares > 0).length
    });

    if (unusedPercentage > 10) {
      console.warn('=== CLEAN-SLATE CASH UTILIZATION WARNING ===');
      console.warn('Unused cash percentage:', unusedPercentage.toFixed(2) + '%');
      console.warn('This could indicate suboptimal budget utilization');

      // Analyze individual allocations for issues
      allocations.forEach(allocation => {
        if (allocation.finalShares === 0 && allocation.targetPercentage > 0) {
          console.warn(`ETF ${allocation.etfName} has 0 final shares but ${allocation.targetPercentage}% target`);
        }
        const deviationMagnitude = Math.abs(allocation.deviation);
        if (deviationMagnitude > 5) {
          console.warn(`ETF ${allocation.etfName} has high deviation: ${deviationMagnitude.toFixed(2)}%`);
        }
      });
    }

    return {
      solverStatus: 'heuristic',
      allocations,
      holdingsToSell: this.identifyHoldingsToSell(currentHoldings, targetETFs),
      optimizationMetrics: {
        totalBudgetUsed: totalFinalPortfolioValue, // CLEAN-SLATE: Final portfolio value
        unusedBudget,
        unusedPercentage,
        optimizationTime: 0, // Heuristics are typically very fast
      },
      fallbackUsed: true,
    };
  }

  /**
   * Identify holdings to sell (non-target holdings)
   */
  identifyHoldingsToSell(currentHoldings, targetETFs) {
    console.log('=== DEBUG IDENTIFY HOLDINGS TO SELL START ===');
    console.log('Holdings to analyze:', currentHoldings);
    console.log('Target ETFs:', targetETFs);
    
    const targetNames = new Set(targetETFs.map((etf) => etf.name));
    console.log('Target names for filtering:', targetNames);

    const holdingsToSell = currentHoldings
      .filter((holding) => {
        const shouldSell = !targetNames.has(holding.name);
        console.log(`Holding ${holding.name}:`, {
          inTargets: targetNames.has(holding.name),
          shouldSell
        });
        return shouldSell;
      })
      .map((holding) => {
        // Ensure price is valid, use fallback if needed
        const price = holding.price || this.getFallbackPriceForETF(holding.name);
        const totalValue = holding.shares * price;
        const result = {
          name: holding.name,
          shares: holding.shares,
          pricePerShare: price,
          totalValue,
        };
        console.log(`Processed holding to sell ${holding.name}:`, {
          ...result,
          originalPrice: holding.price,
          priceValid: holding.price != null && holding.price > 0,
          totalValueValid: totalValue != null && totalValue >= 0,
          usedFallback: holding.price !== price
        });
        return result;
      });

    console.log('Final holdings to sell:', holdingsToSell);
    console.log('=== DEBUG IDENTIFY HOLDINGS TO SELL END ===');
    
    return holdingsToSell;
  }

  /**
   * Generate cache key for optimization input
   */
  generateCacheKey(input) {
    const keyData = {
      holdings: input.currentHoldings?.map((h) => ({
        name: h.name,
        shares: h.shares,
        price: h.price,
      })),
      targets: input.targetETFs?.map((t) => ({
        name: t.name,
        percentage: t.targetPercentage,
        price: t.pricePerShare,
      })),
      cash: input.extraCash,
      strategy: input.optimizationStrategy,
    };

    return `optimization_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Clear optimization cache
   */
  async clearCache() {
    try {
      // Clear all optimization-related cache entries
      const keys = await cacheService.getAllKeys();
      const optimizationKeys = keys.filter(key => key.startsWith('optimization_'));
      
      for (const key of optimizationKeys) {
        await cacheService.delete(key);
      }
      
      logger.logInfo('Optimization cache cleared', {
        clearedKeys: optimizationKeys.length
      });
      return { success: true, message: `Cleared ${optimizationKeys.length} optimization cache entries` };
    } catch (error) {
      logger.logError(error, null);
      throw error;
    }
  }

  /**
   * Get intelligent fallback price for an ETF based on its type
   */
  getFallbackPriceForETF(etf) {
    // Intelligent fallback prices based on ETF categories
    const fallbackPrices = {
      // Stock ETFs - generally higher prices
      'VTI': 320, 'SPY': 450, 'QQQ': 350, 'IWM': 200, 'IWV': 300,
      'VEA': 60, 'VWO': 55, 'VXUS': 65, 'VT': 110, 'EWU': 35,

      // Bond ETFs - generally moderate prices
      'BND': 75, 'AGG': 100, 'TLT': 95, 'BWX': 50, 'SHY': 85,
      'IEF': 90, 'GOVT': 70, 'SPLB': 55, 'VUBS': 50, 'BIL': 92,
      'SGOV': 100,

      // Commodity and alternative ETFs
      'GLDM': 85, 'GLD': 180, 'IAU': 40, 'SLV': 20, 'PDBC': 20,

      // Crypto ETFs
      'IBIT': 50, 'FBTC': 65, 'BITO': 35,

      // Sector ETFs
      'VGT': 450, 'VHT': 250, 'VFH': 85, 'VDC': 180, 'VDE': 160,
      'VPU': 150, 'VCR': 210, 'VIS': 120, 'VOX': 95, 'VNQ': 100,

      // International
      'EWJ': 65, 'EWG': 35, 'EWQ': 30, 'EWC': 28, 'EWA': 25,
      'EWH': 28, 'EWS': 32, 'EWY': 70, 'EWT': 35, 'EWZ': 25,

      // Default fallback for unknown ETFs
      'default': 100
    };

    const upperETF = etf.toUpperCase();

    // Look for exact match first
    if (fallbackPrices[upperETF]) {
      return fallbackPrices[upperETF];
    }

    // Try to match by pattern (starts with)
    for (const [key, price] of Object.entries(fallbackPrices)) {
      if (key !== 'default' && upperETF.startsWith(key.substring(0, 3))) {
        return price;
      }
    }

    // Use default fallback
    return fallbackPrices.default;
  }

  /**
   * Test the optimization service
   */
  async testOptimization() {
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

    try {
      const result = await this.optimizePortfolio(testInput);
      logger.logDebug('Optimization test result', { result });
      return result;
    } catch (error) {
      logger.logError(error, null);
      throw error;
    }
  }
}

module.exports = new PortfolioOptimizationService();
