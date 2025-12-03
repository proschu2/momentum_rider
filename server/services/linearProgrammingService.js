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
   * Analyze potential constraint conflicts when clean-slate LP is infeasible
   */
  analyzeInfeasibleConstraints(model, input) {
    console.log('=== CLEAN-SLATE CONSTRAINT CONFLICT ANALYSIS ===');
    const { currentHoldings = [], targetETFs, extraCash } = input;

    // CLEAN-SLATE: Calculate total liquidated value
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalLiquidatedValue = currentHoldingsValue + extraCash;

    console.log('Clean-slate budget analysis:');
    console.log('- Current holdings to liquidate:', currentHoldingsValue);
    console.log('- Extra cash:', extraCash);
    console.log('- Total liquidated value:', totalLiquidatedValue);

    // Check if target allocations are mathematically feasible
    let totalTargetPercentage = 0;
    targetETFs.forEach((etf) => {
      totalTargetPercentage += etf.targetPercentage;

      const targetValue = (totalLiquidatedValue * etf.targetPercentage) / 100;
      const allocationDeviation = etf.allowedDeviation || 5;
      const minValue = Math.max(0, targetValue - (targetValue * allocationDeviation) / 100);
      const maxValue = targetValue + (targetValue * allocationDeviation) / 100;

      console.log(`ETF ${etf.name}:`);
      console.log(`- Target %: ${etf.targetPercentage}%`);
      console.log(`- Target value: $${targetValue.toFixed(2)}`);
      console.log(`- Value range (±${allocationDeviation}%): $${minValue.toFixed(2)} - $${maxValue.toFixed(2)}`);
      console.log(`- Price per share: $${etf.pricePerShare}`);
      console.log(`- Min shares possible: ${Math.floor(Math.round((minValue / etf.pricePerShare) * 100) / 100)}`);
      console.log(`- Max shares possible: ${Math.floor(Math.round((maxValue / etf.pricePerShare) * 100) / 100)}`);

      // Check if at least 1 share is possible for positive targets
      if (etf.targetPercentage > 0 && etf.pricePerShare > maxValue) {
        console.error(`SHARE IMPOSSIBILITY: ETF ${etf.name} minimum value $${minValue.toFixed(2)} < share price $${etf.pricePerShare}`);
        console.error(`Even 1 share would exceed allocation tolerance!`);
      }
    });

    console.log('Total target percentage sum:', totalTargetPercentage + '%');

    // Check for mathematical infeasibility conditions
    if (Math.abs(totalTargetPercentage - 100) > 25) {
      console.error('TARGET ALLOCATION WARNING: Target percentages sum to', totalTargetPercentage + '% (expected ~100%)');
      console.error('Large deviations from 100% can cause infeasibility!');
    }

    // Check if allocation tolerances overlap excessively
    let minPossibleAllocation = 0;
    let maxPossibleAllocation = 0;
    targetETFs.forEach((etf) => {
      if (etf.targetPercentage > 0) {
        const allocationDeviation = etf.allowedDeviation || 5;
        minPossibleAllocation += Math.max(0, etf.targetPercentage - allocationDeviation);
        maxPossibleAllocation += etf.targetPercentage + allocationDeviation;
      }
    });

    console.log('Possible allocation range:', minPossibleAllocation + '% -', maxPossibleAllocation + '%');

    if (minPossibleAllocation > 105) {
      console.error('ALLOCATION CONFLICT: Minimum possible allocations exceed 100%!');
      console.error('This makes the problem mathematically infeasible.');
    }

    if (maxPossibleAllocation < 95) {
      console.warn('ALLOCATION GAP: Maximum possible allocations < 100%!');
      console.warn('This will leave significant unused cash.');
    }

    // Check for other potential issues
    targetETFs.forEach((etf) => {
      if (etf.targetPercentage > 0 && etf.pricePerShare <= 0) {
        console.error(`INVALID PRICE: ETF ${etf.name} has ${etf.targetPercentage}% target but invalid price: ${etf.pricePerShare}`);
      }

      if (etf.pricePerShare > totalLiquidatedValue) {
        console.warn(`EXPENSIVE ETF: ${etf.name} share price $${etf.pricePerShare} exceeds total liquidated value $${totalLiquidatedValue.toFixed(2)}`);
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
   * Build LP model for clean-slate portfolio rebalancing using yalps format
   */
  buildModel(input, objectives = {}) {
    const { currentHoldings = [], targetETFs, extraCash } = input;
    const { useAllBudget = true, budgetWeight = 0.8, fairnessWeight = 0.2 } = objectives;

    // CLEAN-SLATE APPROACH: Calculate total liquidated value (sell all + cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalLiquidatedValue = currentHoldingsValue + extraCash;

    console.log('=== CLEAN-SLATE LP MODEL BUDGET ANALYSIS ===');
    console.log('Current holdings to liquidate:', currentHoldingsValue);
    console.log('Extra cash:', extraCash);
    console.log('Total liquidated value (clean-slate budget):', totalLiquidatedValue);
    console.log('Target ETFs count:', targetETFs.length);

    // SIMPLIFIED MODEL: Primary objective is maximize budget utilization with allocation bounds
    const model = {
      optimize: 'budgetUtilization', // Simple, single objective
      opType: 'max', // Maximize portfolio value (minimize unused cash)
      constraints: {},
      variables: {},
      ints: {},
    };

    // Create final_shares variables for each target ETF with allocation tolerance bounds
    targetETFs.forEach((etf) => {
      const varName = `final_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Calculate target value and allocation tolerance bounds (±5%)
      const targetValue = (totalLiquidatedValue * etf.targetPercentage) / 100;
      const allocationDeviation = etf.allowedDeviation || 5;
      const minValue = (targetValue * Math.max(0, (100 - allocationDeviation))) / 100;
      const maxValue = (targetValue * (100 + allocationDeviation)) / 100;

      // Convert value bounds to share bounds
      const minShares = etf.targetPercentage === 0 ? 0 : Math.floor(minValue / etf.pricePerShare);
      const maxShares = etf.targetPercentage === 0 ? 0 : Math.floor(maxValue / etf.pricePerShare);

      console.log(`=== ETF ${etf.name} ALLOCATION BOUNDS ===`);
      console.log(`Target %: ${etf.targetPercentage}%, Target value: $${targetValue.toFixed(2)}`);
      console.log(`Value range (±${allocationDeviation}%): $${minValue.toFixed(2)} - $${maxValue.toFixed(2)}`);
      console.log(`Share range: ${minShares} - ${maxShares} shares`);
      console.log(`Price per share: $${etf.pricePerShare}`);

      // Create variable for final shares
      model.variables[varName] = {
        budgetUtilization: etf.pricePerShare, // Each share contributes its value to portfolio
      };

      // Integer constraint for shares
      model.ints[varName] = 1;

      // Allocation tolerance bounds as constraints
      if (etf.targetPercentage === 0) {
        // Zero allocation: force exactly 0 shares
        model.constraints[`bounds_${etf.name}`] = { equal: 0 };
        console.log(`ETF ${etf.name}: ZERO allocation forced`);
      } else {
        // Use allocation tolerance bounds
        model.constraints[`bounds_${etf.name}`] = {
          min: minShares,
          max: maxShares
        };
        console.log(`ETF ${etf.name}: Bounded allocation enforced`);
      }
    });

    // BUDGET CONSTRAINT: Total investment cannot exceed total liquidated value
    model.constraints.budget = {
      max: totalLiquidatedValue
    };

    // Add all final_shares variables to budget constraint
    targetETFs.forEach((etf) => {
      const varName = `final_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      model.variables[varName].budget = etf.pricePerShare;
    });

    console.log('=== SIMPLIFIED LP MODEL CREATED ===');
    console.log('Objective: Maximize budget utilization');
    console.log('Variables:', Object.keys(model.variables).length);
    console.log('Constraints:', Object.keys(model.constraints).length);
    console.log('Integer variables:', Object.keys(model.ints).length);

    return model;
  }

  /**
   * Process clean-slate solver solution into structured result
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

    // CLEAN-SLATE: Calculate total liquidated value (current holdings + cash)
    const currentHoldingsValue = currentHoldings.reduce(
      (sum, holding) => sum + holding.shares * holding.price,
      0
    );
    const totalLiquidatedValue = currentHoldingsValue + extraCash;

    console.log('=== CLEAN-SLATE SOLUTION PROCESSING ===');
    console.log('Current holdings to liquidate:', currentHoldingsValue);
    console.log('Extra cash:', extraCash);
    console.log('Total liquidated value:', totalLiquidatedValue);

    // Extract allocations from clean-slate solution - each ETF appears once
    const allocations = [];
    let totalFinalPortfolioValue = 0;

    // Get all current holdings for processing non-target ETFs to sell
    const currentHoldingsMap = new Map();
    currentHoldings.forEach(holding => {
      currentHoldingsMap.set(holding.name, holding);
    });

    // Process target ETFs first
    targetETFs.forEach((etf) => {
      const finalVarName = `final_${etf.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const finalShares = Math.round(solution[finalVarName] || 0);

      // Use provided price for calculation (pre-fetched prices are handled in portfolio service)
      const realPrice = etf.pricePerShare;

      const currentHolding = currentHoldingsMap.get(etf.name);
      const currentShares = currentHolding ? currentHolding.shares : 0;

      // CLEAN-SLATE: Calculate buy/sell needs by comparing final vs current shares
      const sharesToBuy = Math.max(0, finalShares - currentShares);
      const sharesToSell = Math.max(0, currentShares - finalShares);
      const finalValue = finalShares * realPrice;

      const targetPercentage = etf.targetPercentage;
      const actualPercentage = totalLiquidatedValue > 0 ? (finalValue / totalLiquidatedValue) * 100 : 0;
      const deviation = actualPercentage - targetPercentage;

      console.log(`=== ETF ${etf.name} CLEAN-SLATE SOLUTION ===`);
      console.log(`Final shares variable ${finalVarName}: ${solution[finalVarName] || 0} -> ${finalShares}`);
      console.log(`Current shares: ${currentShares}, Final shares: ${finalShares}`);
      console.log(`Shares to buy: ${sharesToBuy}, Shares to sell: ${sharesToSell}`);
      console.log(`Final portfolio value: $${finalValue.toFixed(2)}`);
      console.log(`Target %: ${targetPercentage}%, Actual %: ${actualPercentage.toFixed(2)}%, Deviation: ${deviation.toFixed(2)}%`);

      // Determine action type
      let actionType = 'HOLD';
      if (sharesToBuy > 0 && sharesToSell > 0) {
        actionType = 'REBALANCE';
      } else if (sharesToBuy > 0) {
        actionType = 'BUY';
      } else if (sharesToSell > 0) {
        actionType = 'SELL';
      }

      console.log(`DECISION: ${actionType} ${etf.name} - Current: ${currentShares}, Final: ${finalShares}`);

      totalFinalPortfolioValue += finalValue;

      allocations.push({
        etfName: etf.name,
        action: actionType,
        currentShares,
        finalShares,
        sharesToBuy,
        sharesToSell,
        finalValue,
        targetPercentage,
        actualPercentage,
        deviation,
        pricePerShare: realPrice,
      });
    });

    // Process non-target holdings (sell all)
    const targetNames = new Set(targetETFs.map(etf => etf.name));
    currentHoldings.forEach(holding => {
      if (!targetNames.has(holding.name) && holding.shares > 0) {
        const sellValue = holding.shares * holding.price;
        console.log(`=== SELL NON-TARGET ETF ${holding.name} ===`);
        console.log(`Sell all ${holding.shares} shares at $${holding.price} = $${sellValue.toFixed(2)}`);

        allocations.push({
          etfName: holding.name,
          action: 'SELL_ALL',
          currentShares: holding.shares,
          finalShares: 0,
          sharesToBuy: 0,
          sharesToSell: holding.shares,
          finalValue: 0,
          targetPercentage: 0,
          actualPercentage: 0,
          deviation: 0,
          pricePerShare: holding.price,
        });
      }
    });

    // CLEAN-SLATE: Budget utilization is final portfolio value vs total liquidated value
    const unusedBudget = totalLiquidatedValue - totalFinalPortfolioValue;
    const unusedPercentage = totalLiquidatedValue > 0 ? (unusedBudget / totalLiquidatedValue) * 100 : 0;
    const budgetUtilizationRate = 100 - unusedPercentage;

    console.log('=== CLEAN-SLATE PORTFOLIO ANALYSIS ===');
    console.log('Total liquidated value:', totalLiquidatedValue);
    console.log('Final portfolio value:', totalFinalPortfolioValue);
    console.log('Unused budget (cash remaining):', unusedBudget.toFixed(2));
    console.log('Unused percentage:', unusedPercentage.toFixed(2) + '%');
    console.log('Budget utilization rate:', budgetUtilizationRate.toFixed(2) + '%');
    console.log('Total allocations (unique ETFs):', allocations.length);

    // Validate allocation tolerances
    let violations = 0;
    allocations.forEach(allocation => {
      if (allocation.targetPercentage > 0) {
        const deviationMagnitude = Math.abs(allocation.deviation);
        if (deviationMagnitude > 5) {
          console.warn(`TOLERANCE VIOLATION: ETF ${allocation.etfName} deviation ${deviationMagnitude.toFixed(2)}% > 5%`);
          violations++;
        }
      }
    });

    if (violations > 0) {
      console.warn(`=== ${violations} ALLOCATION TOLERANCE VIOLATIONS DETECTED ===`);
    }

    if (unusedPercentage > 5) {
      console.warn('=== CLEAN-SLATE CASH UTILIZATION WARNING ===');
      console.warn('Unused cash percentage:', unusedPercentage.toFixed(2) + '%');
      console.warn('Budget utilization below 95% threshold');
    }

    return {
      solverStatus: 'optimal',
      allocations, // Each ETF appears exactly once with clear action
      holdingsToSell: this.identifyHoldingsToSell(currentHoldings, targetETFs),
      optimizationMetrics: {
        totalBudgetUsed: totalFinalPortfolioValue,
        unusedBudget,
        unusedPercentage,
        budgetUtilizationRate,
        allocationViolations: violations,
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
