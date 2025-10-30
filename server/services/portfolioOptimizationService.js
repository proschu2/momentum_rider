/**
 * Portfolio Optimization Service
 * Business logic wrapper for linear programming optimization with fallback strategies
 */

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
        console.log('Using cached optimization result');
        return { ...cachedResult, cached: true };
      }
      
      const startTime = Date.now();
      
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
        console.warn('Linear programming failed, falling back to heuristics:', lpError.message);
      }
      
      // Fallback to heuristic strategies
      result = await this.fallbackToHeuristics(input);
      result.fallbackUsed = true;
      result.fallbackReason = 'Linear programming optimization failed or was infeasible';
      
      // Cache fallback result with shorter TTL
      await cacheService.setCachedData(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Portfolio optimization failed:', error);
      throw new Error(`Portfolio optimization failed: ${error.message}`);
    }
  }

  /**
   * Attempt linear programming optimization
   */
  async attemptLinearProgramming(input) {
    // Add timeout for LP solver
    const timeoutMs = 5000; // 5 second timeout
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Linear programming timeout')), timeoutMs);
    });
    
    const lpPromise = new Promise((resolve, reject) => {
      try {
        const result = linearProgrammingService.solve(input);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    return Promise.race([lpPromise, timeoutPromise]);
  }

  /**
   * Fallback to heuristic optimization strategies
   */
  async fallbackToHeuristics(input) {
    const { currentHoldings = [], targetETFs, extraCash, optimizationStrategy = 'minimize-leftover' } = input;
    
    // Calculate total available budget (current holdings value + additional cash)
    const currentHoldingsValue = currentHoldings.reduce((sum, holding) =>
      sum + (holding.shares * holding.price), 0);
    const totalAvailableBudget = currentHoldingsValue + extraCash;
    
    // Convert to buy order format compatible with frontend logic
    const buyOrders = this.convertToBuyOrders(targetETFs, currentHoldings, totalAvailableBudget);
    
    // Apply different heuristic strategies based on optimization strategy
    let allocations;
    switch (optimizationStrategy) {
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
   * Convert target ETFs to buy order format
   */
  convertToBuyOrders(targetETFs, currentHoldings, totalAvailableBudget) {
    return targetETFs.map(etf => {
      const currentHolding = currentHoldings.find(h => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const currentValue = currentShares * etf.pricePerShare;
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      const difference = Math.max(0, targetValue - currentValue);
      
      const exactShares = difference / etf.pricePerShare;
      const floorShares = Math.floor(exactShares);
      const remainder = exactShares - floorShares;
      
      return {
        ticker: etf.name,
        exactShares,
        floorShares,
        remainder,
        price: etf.pricePerShare,
        targetValue,
        currentValue,
        difference,
        currentHolding
      };
    });
  }

  /**
   * Multi-share promotion strategy (current frontend default)
   */
  maximizeSharesStrategy(buyOrders, availableBudget) {
    const finalShares = new Map();
    buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares));
    
    let remainingBudget = availableBudget - buyOrders.reduce((sum, order) => 
      sum + (order.floorShares * order.price), 0);
    
    const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price);
    
    while (remainingBudget > 0) {
      let promoted = false;
      
      for (const order of sortedByPrice) {
        if (order.price <= remainingBudget) {
          const currentShares = finalShares.get(order.ticker) || 0;
          finalShares.set(order.ticker, currentShares + 1);
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
    buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares));
    
    let remainingBudget = availableBudget - buyOrders.reduce((sum, order) => 
      sum + (order.floorShares * order.price), 0);
    
    // Calculate momentum efficiency (momentum / price)
    const efficiencyScores = buyOrders.map(order => {
      // In a real implementation, we would use actual momentum data
      // For now, use a placeholder based on target percentage
      const momentumScore = order.targetValue / availableBudget; // Proxy for momentum
      const efficiency = momentumScore / order.price;
      
      return {
        ...order,
        efficiency
      };
    });
    
    // Sort by efficiency descending
    const sortedByEfficiency = [...efficiencyScores].sort((a, b) => b.efficiency - a.efficiency);
    
    while (remainingBudget > 0) {
      let promoted = false;
      
      for (const order of sortedByEfficiency) {
        if (order.price <= remainingBudget) {
          const currentShares = finalShares.get(order.ticker) || 0;
          finalShares.set(order.ticker, currentShares + 1);
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
   * Minimize leftover budget strategy
   */
  minimizeLeftoverStrategy(buyOrders, availableBudget) {
    const finalShares = new Map();
    buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares));
    
    let remainingBudget = availableBudget - buyOrders.reduce((sum, order) => 
      sum + (order.floorShares * order.price), 0);
    
    // Sort by remainder (closest to next share)
    const sortedByRemainder = [...buyOrders].sort((a, b) => b.remainder - a.remainder);
    
    for (const order of sortedByRemainder) {
      if (remainingBudget >= order.price) {
        finalShares.set(order.ticker, order.floorShares + 1);
        remainingBudget -= order.price;
      }
    }
    
    return finalShares;
  }

  /**
   * Format heuristic result to match LP result format
   */
  formatHeuristicResult(finalShares, input, totalAvailableBudget) {
    const { currentHoldings = [], targetETFs } = input;
    
    const allocations = [];
    let totalBudgetUsed = 0;

    targetETFs.forEach(etf => {
      const shares = finalShares.get(etf.name) || 0;
      const currentHolding = currentHoldings.find(h => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const sharesToBuy = Math.max(0, shares - currentShares);
      const costOfPurchase = sharesToBuy * etf.pricePerShare;
      const finalValue = shares * etf.pricePerShare;
      const targetPercentage = etf.targetPercentage;
      const actualPercentage = (finalValue / totalAvailableBudget) * 100;
      const deviation = actualPercentage - targetPercentage;

      totalBudgetUsed += costOfPurchase;

      allocations.push({
        etfName: etf.name,
        currentShares,
        sharesToBuy,
        finalShares: shares,
        costOfPurchase,
        finalValue,
        targetPercentage,
        actualPercentage,
        deviation
      });
    });

    const unusedBudget = totalAvailableBudget - totalBudgetUsed;
    const unusedPercentage = (unusedBudget / totalAvailableBudget) * 100;

    return {
      solverStatus: 'heuristic',
      allocations,
      holdingsToSell: this.identifyHoldingsToSell(currentHoldings, targetETFs),
      optimizationMetrics: {
        totalBudgetUsed,
        unusedBudget,
        unusedPercentage,
        optimizationTime: 0 // Heuristics are typically very fast
      },
      fallbackUsed: true
    };
  }

  /**
   * Identify holdings to sell (non-target holdings)
   */
  identifyHoldingsToSell(currentHoldings, targetETFs) {
    const targetNames = new Set(targetETFs.map(etf => etf.name));
    
    return currentHoldings
      .filter(holding => !targetNames.has(holding.name))
      .map(holding => ({
        name: holding.name,
        shares: holding.shares,
        pricePerShare: holding.price,
        totalValue: holding.shares * holding.price
      }));
  }

  /**
   * Generate cache key for optimization input
   */
  generateCacheKey(input) {
    const keyData = {
      holdings: input.currentHoldings?.map(h => ({ name: h.name, shares: h.shares, price: h.price })),
      targets: input.targetETFs?.map(t => ({ name: t.name, percentage: t.targetPercentage, price: t.pricePerShare })),
      cash: input.extraCash,
      strategy: input.optimizationStrategy
    };
    
    return `optimization_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Clear optimization cache
   */
  async clearCache() {
    try {
      // In a real implementation, we would clear all optimization-related cache entries
      // For now, we'll rely on the cache service's TTL mechanism
      console.log('Optimization cache clearance requested');
      return { success: true, message: 'Cache will expire automatically based on TTL' };
    } catch (error) {
      console.error('Failed to clear optimization cache:', error);
      throw error;
    }
  }

  /**
   * Test the optimization service
   */
  async testOptimization() {
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

    try {
      const result = await this.optimizePortfolio(testInput);
      console.log('Optimization test result:', result);
      return result;
    } catch (error) {
      console.error('Optimization test failed:', error);
      throw error;
    }
  }
}

module.exports = new PortfolioOptimizationService();