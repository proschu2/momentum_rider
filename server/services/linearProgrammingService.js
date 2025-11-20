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

      // Extract objective parameters
      const {
        useAllBudget = false,
        budgetWeight = 0.7,
        fairnessWeight = 0.3,
        maximizeUtilization = false,
        utilizationDeviation = 5
      } = input.objectives || {};

      // Build LP model with multi-objective support
      const model = this.buildModel(input, {
        useAllBudget,
        budgetWeight,
        fairnessWeight,
        maximizeUtilization,
        utilizationDeviation
      });

      // DEBUG: Log model structure for debugging
      console.log('=== LP MODEL STRUCTURE DEBUG ===');
      console.log('Model objective:', model.optimize);
      console.log('Model operation type:', model.opType);
      console.log('Number of variables:', Object.keys(model.variables).length);
      console.log('Number of constraints:', Object.keys(model.constraints).length);
      console.log('Integer variables:', Object.keys(model.ints).length);
      
      // Log key constraint details
      Object.entries(model.constraints).forEach(([name, constraint]) => {
        console.log(`Constraint ${name}:`, constraint);
      });

      // Solve the model using javascript-lp-solver
      console.log('=== CALLING LP SOLVER ===');
      const solution = solver.Solve(model);
      console.log('=== LP SOLVER RESULT ===');
      console.log('Solution feasible:', solution.feasible);
      console.log('Solution result:', solution.result);
      console.log('Solution bounded:', solution.bounded);

      // DEBUG: Check for infeasibility indicators
      if (solution.feasible !== true) {
        console.error('=== LP INFEASIBILITY DETECTED ===');
        console.error('Solution details:', JSON.stringify(solution, null, 2));
        
        // Analyze potential constraint conflicts
        this.analyzeInfeasibleConstraints(model, input);
      }

      // Process solution
      const result = this.processSolution(solution, input, startTime);

      return result;
    } catch (error) {
      console.error('=== LP SOLVER EXCEPTION ===');
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      logger.logError(error, null);
      throw new Error(`Optimization failed: ${error.message}`);
    }
  }

  /**
   * Analyze potential constraint conflicts when LP is infeasible
   */
  analyzeInfeasibleConstraints(model, input) {
    console.log('=== CONSTRAINT CONFLICT ANALYSIS ===');
    const { currentHoldings = [], targetETFs, extraCash } = input;
    
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;
    
    console.log('Budget analysis:');
    console.log('- Current holdings value:', currentHoldingsValue);
    console.log('- Extra cash:', extraCash);
    console.log('- Total available budget:', totalAvailableBudget);
    
    // Check if minimum allocations exceed budget
    let minRequiredBudget = 0;
    targetETFs.forEach((etf) => {
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      const flexibleMinValue = Math.max(0, targetValue * 0.5); // Current minimum
      minRequiredBudget += flexibleMinValue;
      
      console.log(`ETF ${etf.name}:`);
      console.log(`- Target %: ${etf.targetPercentage}%`);
      console.log(`- Target value: $${targetValue.toFixed(2)}`);
      console.log(`- Minimum required: $${flexibleMinValue.toFixed(2)}`);
    });
    
    console.log('Total minimum required budget:', minRequiredBudget);
    console.log('Available budget:', totalAvailableBudget);
    console.log('Budget surplus/deficit:', totalAvailableBudget - minRequiredBudget);
    
    if (minRequiredBudget > totalAvailableBudget) {
      console.error('BUDGET CONSTRAINT VIOLATION: Minimum allocations exceed available budget!');
      console.error('This is likely the cause of LP infeasibility.');
    }
    
    // Check for other potential issues
    targetETFs.forEach((etf) => {
      if (etf.targetPercentage === 0 && etf.pricePerShare <= 0) {
        console.error(`INVALID PRICE: ETF ${etf.name} has 0% target but invalid price: ${etf.pricePerShare}`);
      }
    });
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
  buildModel(input, objectives = {}) {
    const { currentHoldings = [], targetETFs, extraCash } = input;
    const { useAllBudget = false, budgetWeight = 0.7, fairnessWeight = 0.3 } = objectives;

    // Calculate total available budget (current holdings value + additional cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalAvailableBudget = currentHoldingsValue + extraCash;

    console.log('=== LP MODEL BUDGET ANALYSIS ===');
    console.log('Current holdings value:', currentHoldingsValue);
    console.log('Extra cash:', extraCash);
    console.log('Total available budget:', totalAvailableBudget);
    console.log('Target ETFs count:', targetETFs.length);
    console.log('Target ETFs:', targetETFs.map(t => ({
      name: t.name,
      targetPercentage: t.targetPercentage,
      targetValue: (totalAvailableBudget * t.targetPercentage) / 100,
      pricePerShare: t.pricePerShare
    })));

    // Determine objective function based on user preferences
    let objectiveType, objectiveName;
    
    if (useAllBudget) {
      // Multi-objective: combine budget utilization and allocation fairness
      objectiveType = 'min'; // We want to minimize the weighted negative objective
      objectiveName = 'combinedObjective';
    } else {
      // Single objective: minimize allocation deviations (current behavior)
      objectiveType = 'min';
      objectiveName = 'allocationFairness';
    }

    const model = {
      optimize: objectiveName,
      opType: objectiveType,
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
      const allowedDeviation = etf.allowedDeviation || 20; // FIX: Increase to 20% to allow better cash utilization
      const minValue = Math.max(0, targetValue - (totalAvailableBudget * allowedDeviation) / 100);
      const maxValue = targetValue + (totalAvailableBudget * allowedDeviation) / 100;


      // Create variable for shares to buy (allow negative for selling)
      model.variables[varName] = {
        allocationFairness: 0, // Will be set in deviation variables
        [`min_${etf.name}`]: etf.pricePerShare,
        [`max_${etf.name}`]: etf.pricePerShare,
        budget: etf.pricePerShare,
      };

      // Integer constraint for shares (can be negative for selling)
      model.ints[varName] = 1;

      console.log(`=== ETF ${etf.name} VARIABLE SETUP ===`);
      console.log(`Current shares: ${currentShares}, Current value: $${currentValue.toFixed(2)}`);
      console.log(`Target %: ${etf.targetPercentage}%, Target value: $${targetValue.toFixed(2)}`);
      console.log(`Min value: $${minValue.toFixed(2)}, Max value: $${maxValue.toFixed(2)}`);
      console.log(`Allowed deviation: ${allowedDeviation}%`);

      // For ETFs with 0% target, we want to sell all current shares
      if (etf.targetPercentage === 0) {
        // Force selling all current shares (negative buy = sell)
        model.constraints[`sell_${etf.name}`] = { equal: -currentShares };
        
        // Allow negative values for selling
        delete model.constraints[varName]; // Remove non-negativity constraint
        
        console.log(`ETF ${etf.name}: SELL ALL ${currentShares} shares (0% target)`);
        console.log(`Constraint: buy_${etf.name} = -${currentShares} (negative means sell)`);
      } else {
        // Minimum value constraint (current + new >= minValue)
        model.constraints[`min_${etf.name}`] = { min: minValue - currentValue };

        // Maximum value constraint (current + new <= maxValue)
        model.constraints[`max_${etf.name}`] = { max: maxValue - currentValue };

        // Non-negativity constraint for buying
        model.constraints[varName] = { min: 0 };
        
        console.log(`ETF ${etf.name}: BUY constraint (min: ${minValue - currentValue}, max: ${maxValue - currentValue})`);
        console.log(`Final shares range: [${Math.max(0, Math.ceil(minValue/etf.pricePerShare))}, ${Math.floor(maxValue/etf.pricePerShare)}]`);
      }
    });

    // Add deviation variables for allocation fairness
    targetETFs.forEach((etf) => {
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const currentValue = currentShares * etf.pricePerShare;
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      
      // Skip deviation constraints for zero-target ETFs (we want to sell them completely)
      if (etf.targetPercentage === 0) {
        return;
      }
      
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
    // FIX: Use slightly higher budget to allow full utilization (account for rounding)
    model.constraints.budget = { max: totalAvailableBudget * 1.01 }; // Allow 1% buffer for rounding
    
    // CRITICAL FIX: Remove minimum value constraints that prevent full budget utilization
    // Instead of strict min/max, use looser constraints to allow better cash usage
    targetETFs.forEach((etf) => {
      const varName = `buy_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      const currentValue = currentShares * etf.pricePerShare;
      const targetValue = (totalAvailableBudget * etf.targetPercentage) / 100;
      
      // Only apply minimum constraint for ETFs with 0% target (force sell)
      if (etf.targetPercentage === 0) {
        model.constraints[`sell_${etf.name}`] = { equal: -currentShares };
      } else {
        // Remove restrictive minimum value constraints to allow better cash utilization
        // Keep maximum constraint but make minimum very flexible
        const flexibleMinValue = Math.max(0, targetValue * 0.5); // Allow as low as 50% of target
        model.constraints[`min_${etf.name}`] = { min: flexibleMinValue - currentValue };
      }
    });

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
      let sharesChange = Math.round(solution[varName] || 0);

      const currentHolding = currentHoldings.find((h) => h.name === etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;
      
      // Handle negative sharesChange (selling)
      const sharesToBuy = Math.max(0, sharesChange);
      const sharesToSell = Math.max(0, -sharesChange);
      const finalShares = currentShares + sharesChange;
      const costOfPurchase = sharesToBuy * etf.pricePerShare;
      const finalValue = finalShares * etf.pricePerShare;
      const targetPercentage = etf.targetPercentage;
      const actualPercentage = (finalValue / totalAvailableBudget) * 100;
      const deviation = actualPercentage - targetPercentage;

      console.log(`=== ETF ${etf.name} SOLUTION PROCESSING ===`);
      console.log(`Solver variable ${varName}: ${solution[varName] || 0} (raw) -> ${sharesChange} (rounded)`);
      console.log(`Current shares: ${currentShares}, Final shares: ${finalShares}`);
      console.log(`Shares to buy: ${sharesToBuy}, Shares to sell: ${sharesToSell}`);
      console.log(`Cost of purchase: $${costOfPurchase.toFixed(2)}`);
      console.log(`Target %: ${targetPercentage}%, Actual %: ${actualPercentage.toFixed(2)}%, Deviation: ${deviation.toFixed(2)}%`);
      
      if (sharesChange > 0) {
        console.log(`DECISION: BUY ${sharesChange} shares of ${etf.name} (underweight)`);
      } else if (sharesChange < 0) {
        console.log(`DECISION: SELL ${Math.abs(sharesChange)} shares of ${etf.name} (overweight)`);
      } else {
        console.log(`DECISION: NO ACTION for ${etf.name} (already at target)`);
      }

      totalBudgetUsed += costOfPurchase;


      allocations.push({
        etfName: etf.name,
        currentShares,
        sharesToBuy,
        sharesToSell,
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

    console.log('=== LP SOLUTION CASH UTILIZATION ANALYSIS ===');
    console.log('Total available budget:', totalAvailableBudget);
    console.log('Total budget used:', totalBudgetUsed);
    console.log('Unused budget:', unusedBudget);
    console.log('Unused percentage:', unusedPercentage.toFixed(2) + '%');
    console.log('Cash utilization rate:', (100 - unusedPercentage).toFixed(2) + '%');
    console.log('Allocations processed:', allocations.length);
    
    if (unusedPercentage > 10) {
      console.warn('=== LP CASH UTILIZATION PROBLEM DETECTED ===');
      console.warn('High unused cash percentage in LP solution:', unusedPercentage.toFixed(2) + '%');
      
      // Analyze individual allocations for issues
      allocations.forEach(allocation => {
        if (allocation.finalShares === 0 && allocation.targetPercentage > 0) {
          console.warn(`LP: ETF ${allocation.etfName} has 0 shares but ${allocation.targetPercentage}% target`);
        }
        if (allocation.costOfPurchase === 0 && allocation.sharesToBuy > 0) {
          console.warn(`LP: ETF ${allocation.etfName} has sharesToBuy > 0 but costOfPurchase = 0`);
        }
      });
    }

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
