/**
 * Linear Programming Service for Budget Allocation Optimization
 * Uses javascript-lp-solver for Mixed Integer Linear Programming (MILP)
 */

const logger = require('../config/logger');
const solver = require('javascript-lp-solver');

class LinearProgrammingService {
  /**
   * Solve budget allocation using linear programming
   * @param {Object} input - Optimization input parameters
   * @returns {Object} Optimization result
   */
  solve(input) {
    try {
      const startTime = Date.now();

      // Validate input
      this.validateInput(input);

      // Build LP model
      const model = this.buildModel(input);

      // Solve the model using javascript-lp-solver
      const solution = solver.Solve(model);

      console.log('LP Model:', JSON.stringify(model, null, 2));
      console.log('LP Solution:', JSON.stringify(solution, null, 2));

      // Process solution
      const result = this.processSolution(solution, input, startTime);

      return result;
    } catch (error) {
      logger.logError(error, null);
      throw new Error(`Optimization failed: ${error.message}`);
    }
  }

  /**
   * Validate input parameters
   */
  validateInput(input) {
    const { currentHoldings, targetETFs, extraCash } = input;

    if (!Array.isArray(targetETFs) || targetETFs.length === 0) {
      throw new Error('Target ETFs array is required and cannot be empty');
    }

    if (typeof extraCash !== 'number' || extraCash < 0) {
      throw new Error('Extra cash must be a non-negative number');
    }

    // Validate target ETFs
    targetETFs.forEach((etf, index) => {
      if (!etf.name || typeof etf.name !== 'string') {
        throw new Error(`Target ETF at index ${index} must have a valid name`);
      }
      if (typeof etf.targetPercentage !== 'number' || etf.targetPercentage < 0) {
        throw new Error(`Target ETF ${etf.name} must have a valid target percentage`);
      }
      if (typeof etf.pricePerShare !== 'number' || etf.pricePerShare <= 0) {
        throw new Error(`Target ETF ${etf.name} must have a valid positive price`);
      }
    });

    // Validate current holdings if provided
    if (currentHoldings) {
      if (!Array.isArray(currentHoldings)) {
        throw new Error('Current holdings must be an array');
      }
      currentHoldings.forEach((holding, index) => {
        if (!holding.name || typeof holding.name !== 'string') {
          throw new Error(`Current holding at index ${index} must have a valid name`);
        }
        if (typeof holding.shares !== 'number' || holding.shares < 0) {
          throw new Error(`Current holding ${holding.name} must have valid shares`);
        }
        if (typeof holding.price !== 'number' || holding.price <= 0) {
          throw new Error(`Current holding ${holding.name} must have a valid positive price`);
        }
      });
    }
  }

  /**
   * Build LP model for budget allocation using yalps format
   */
  buildModel(input) {
    const { currentHoldings = [], targetETFs, extraCash } = input;

    // Calculate total available budget (current holdings value + additional cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;

    const model = {
      optimize: 'allocationFairness',
      opType: 'min',
      constraints: {},
      variables: {},
      ints: {},
    };

    // Create variables for each target ETF (shares to buy)
    targetETFs.forEach((etf) => {
      const varName = `buy_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Get current shares for this ETF
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const currentValue = currentShares * etf.pricePerShare;

      // Calculate target value bounds
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      const allowedDeviation = etf.allowedDeviation || 5; // Default 5% deviation
      const minValue = Math.max(0, targetValue - (totalAvailableBudget * allowedDeviation) / 100);
      const maxValue = targetValue + (totalAvailableBudget * allowedDeviation) / 100;

      // Create variable for shares to buy
      model.variables[varName] = {
        allocationFairness: 0, // Will be set in deviation variables
        [`min_${etf.name}`]: etf.pricePerShare,
        [`max_${etf.name}`]: etf.pricePerShare,
        budget: etf.pricePerShare,
      };

      // Integer constraint for shares
      model.ints[varName] = 1;

      // Minimum value constraint (current + new >= minValue)
      model.constraints[`min_${etf.name}`] = { min: minValue - currentValue };

      // Maximum value constraint (current + new <= maxValue)
      model.constraints[`max_${etf.name}`] = { max: maxValue - currentValue };

      // Non-negativity constraint
      model.constraints[varName] = { min: 0 };
    });

    // Add deviation variables for allocation fairness
    targetETFs.forEach((etf) => {
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const currentValue = currentShares * etf.pricePerShare;
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      
      // Positive deviation variable (over-allocation)
      const posDevVar = `pos_dev_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      model.variables[posDevVar] = {
        allocationFairness: 1, // Minimize positive deviations
        [`dev_${etf.name}`]: 1,
      };
      model.constraints[posDevVar] = { min: 0 };
      
      // Negative deviation variable (under-allocation)
      const negDevVar = `neg_dev_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      model.variables[negDevVar] = {
        allocationFairness: 1, // Minimize negative deviations
        [`dev_${etf.name}`]: -1,
      };
      model.constraints[negDevVar] = { min: 0 };
      
      // Deviation constraint: (current + new) - target = pos_dev - neg_dev
      const buyVarName = `buy_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      model.constraints[`dev_${etf.name}`] = {
        equal: targetValue - currentValue
      };
      model.variables[buyVarName][`dev_${etf.name}`] = etf.pricePerShare;
    });

    // Budget constraint: total cost <= total available budget
    model.constraints.budget = { max: totalAvailableBudget };

    // Allocation fairness variable (sum of all deviations)
    model.variables.allocationFairness = {
      allocationFairness: 1,
      budget: 0, // Doesn't affect budget constraint
    };
    model.constraints.allocationFairness = { min: 0 };

    return model;
  }

  /**
   * Process solver solution into structured result
   */
  processSolution(solution, input, startTime) {
    const { currentHoldings = [], targetETFs, extraCash } = input;

    if (solution.feasible !== true) {
      return {
        solverStatus: 'infeasible',
        error: 'No feasible solution found for the given constraints',
        allocations: [],
        holdingsToSell: this.identifyHoldingsToSell(currentHoldings, targetETFs),
        optimizationMetrics: {
          totalBudgetUsed: 0,
          unusedBudget: extraCash,
          unusedPercentage: 100,
          optimizationTime: Date.now() - startTime,
        },
      };
    }

    // Calculate total available budget (current holdings value + additional cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;

    // Extract allocations from solution
    const allocations = [];
    let totalBudgetUsed = 0;

    targetETFs.forEach((etf) => {
      const varName = `buy_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const sharesToBuy = Math.round(solution[varName] || 0);

      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const finalShares = currentShares + sharesToBuy;
      const costOfPurchase = sharesToBuy * etf.pricePerShare;
      const finalValue = finalShares * etf.pricePerShare;
      const targetPercentage = etf.targetPercentage;
      const actualPercentage = (finalValue / totalAvailableBudget) * 100;
      const deviation = actualPercentage - targetPercentage;

      totalBudgetUsed += costOfPurchase;

      allocations.push({
        etfName: etf.name,
        currentShares,
        sharesToBuy,
        finalShares,
        costOfPurchase,
        finalValue,
        targetPercentage,
        actualPercentage,
        deviation,
      });
    });

    const unusedBudget = totalAvailableBudget - totalBudgetUsed;
    const unusedPercentage = (unusedBudget / totalAvailableBudget) * 100;

    return {
      solverStatus: 'optimal',
      allocations,
      holdingsToSell: this.identifyHoldingsToSell(currentHoldings, targetETFs),
      optimizationMetrics: {
        totalBudgetUsed,
        unusedBudget,
        unusedPercentage,
        optimizationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Identify holdings that should be sold (non-target holdings)
   */
  identifyHoldingsToSell(currentHoldings, targetETFs) {
    const targetNames = new Set(targetETFs.map((etf) => etf.name));

    return currentHoldings
      .filter((holding) => !targetNames.has(holding.name))
      .map((holding) => ({
        name: holding.name,
        shares: holding.shares,
        pricePerShare: holding.price,
        totalValue: holding.shares * holding.price,
      }));
  }

  /**
   * Test the solver with a simple example
   */
  testSolver() {
    const testInput = {
      currentHoldings: [
        { name: 'ETF1', shares: 10, price: 100 },
        { name: 'ETF2', shares: 5, price: 50 },
      ],
      targetETFs: [
        { name: 'ETF1', targetPercentage: 60, pricePerShare: 100 },
        { name: 'ETF2', targetPercentage: 40, pricePerShare: 50 },
      ],
      extraCash: 1000,
    };

    try {
      const result = this.solve(testInput);
      logger.logDebug('Solver test result', { result });
      return result;
    } catch (error) {
      logger.logError(error, null);
      throw error;
    }
  }
}

module.exports = new LinearProgrammingService();
