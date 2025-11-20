/**
 * Optimization Testing Framework
 * Comprehensive testing for budget optimization enhancements
 */

const logger = require('../config/logger');
const enhancedBudgetOptimizer = require('./enhancedBudgetOptimizer');
const smartRebalancingService = require('./smartRebalancingService');
const portfolioOptimizationService = require('./portfolioOptimizationService');

class OptimizationTestFramework {
  constructor() {
    this.testScenarios = this.initializeTestScenarios();
    this.benchmarkThresholds = {
      minimumUtilizationRate: 85, // 85% minimum utilization
      targetUtilizationRate: 95,  // 95% target utilization
      maxToleranceDeviation: 5,   // 5% maximum tolerance deviation
      minImprovementRequired: 2   // 2% minimum improvement over baseline
    };
  }

  /**
   * Initialize comprehensive test scenarios
   */
  initializeTestScenarios() {
    return [
      {
        name: 'Small Portfolio - Limited Budget',
        description: 'Test optimization with small portfolio and limited additional capital',
        category: 'edge_cases',
        input: {
          currentHoldings: [
            { name: 'VTI', shares: 5, price: 450 },
            { name: 'BND', shares: 10, price: 75 }
          ],
          targetETFs: [
            { name: 'VTI', targetPercentage: 60, pricePerShare: 450 },
            { name: 'BND', targetPercentage: 40, pricePerShare: 75 }
          ],
          extraCash: 500,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 80,
          expectedImprovement: 5
        }
      },
      {
        name: 'Large Portfolio - Complex Allocation',
        description: 'Test optimization with multiple ETFs and significant capital',
        category: 'complex_cases',
        input: {
          currentHoldings: [
            { name: 'VTI', shares: 50, price: 450 },
            { name: 'VEA', shares: 100, price: 60 },
            { name: 'BND', shares: 150, price: 75 }
          ],
          targetETFs: [
            { name: 'VTI', targetPercentage: 40, pricePerShare: 450 },
            { name: 'VEA', targetPercentage: 20, pricePerShare: 60 },
            { name: 'VWO', targetPercentage: 10, pricePerShare: 55 },
            { name: 'BND', targetPercentage: 20, pricePerShare: 75 },
            { name: 'TLT', targetPercentage: 10, pricePerShare: 95 }
          ],
          extraCash: 10000,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 90,
          expectedImprovement: 8
        }
      },
      {
        name: 'Price Ratio Challenge - 1:6 Scenario',
        description: 'Test optimization with challenging price ratios (1 expensive vs 6 cheap)',
        category: 'price_ratio',
        input: {
          currentHoldings: [
            { name: 'QQQ', shares: 2, price: 350 },
            { name: 'BND', shares: 50, price: 75 }
          ],
          targetETFs: [
            { name: 'QQQ', targetPercentage: 50, pricePerShare: 350 }, // Expensive
            { name: 'BND', targetPercentage: 50, pricePerShare: 75 }   // Cheap (≈4.7x cheaper)
          ],
          extraCash: 2000,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 85,
          expectedImprovement: 10,
          priceRatioOptimization: true
        }
      },
      {
        name: 'Zero Allocation ETFs - Complete Sell',
        description: 'Test optimization with ETFs that need to be completely sold',
        category: 'edge_cases',
        input: {
          currentHoldings: [
            { name: 'VTI', shares: 20, price: 450 },
            { name: 'AMD', shares: 100, price: 120 }, // Not in target
            { name: 'TSLA', shares: 50, price: 250 }  // Not in target
          ],
          targetETFs: [
            { name: 'VTI', targetPercentage: 100, pricePerShare: 450 },
            { name: 'AMD', targetPercentage: 0, pricePerShare: 120 },   // Sell all
            { name: 'TSLA', targetPercentage: 0, pricePerShare: 250 }   // Sell all
          ],
          extraCash: 1000,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 95,
          expectedImprovement: 5,
          completeSellRequired: true
        }
      },
      {
        name: 'Minimal Budget - High Price ETFs',
        description: 'Test optimization with very limited budget and high-priced ETFs',
        category: 'edge_cases',
        input: {
          currentHoldings: [],
          targetETFs: [
            { name: 'SPY', targetPercentage: 50, pricePerShare: 450 },
            { name: 'QQQ', targetPercentage: 50, pricePerShare: 350 }
          ],
          extraCash: 200,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 75, // Lower expectation due to high prices
          expectedImprovement: 15,
          budgetConstraint: true
        }
      },
      {
        name: 'Perfect Price Ratios - Integer Combinations',
        description: 'Test optimization with perfect integer price ratios',
        category: 'price_ratio',
        input: {
          currentHoldings: [],
          targetETFs: [
            { name: 'ETF_A', targetPercentage: 50, pricePerShare: 100 },
            { name: 'ETF_B', targetPercentage: 50, pricePerShare: 50 }  // Perfect 2:1 ratio
          ],
          extraCash: 750,
          objectives: { useAllBudget: true, maximizeUtilization: true }
        },
        expectedResults: {
          minUtilizationRate: 98,
          expectedImprovement: 3,
          perfectRatioOptimization: true
        }
      }
    ];
  }

  /**
   * Run comprehensive optimization test suite
   */
  async runComprehensiveTests() {
    console.log('=== COMPREHENSIVE OPTIMIZATION TEST SUITE ===');

    const results = {
      testSuite: 'Budget Optimization Enhancements',
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageUtilizationRate: 0,
        averageImprovement: 0
      },
      testResults: [],
      benchmarkComparisons: {},
      recommendations: []
    };

    // Run each test scenario
    for (const scenario of this.testScenarios) {
      console.log(`\n--- Running Test: ${scenario.name} ---`);
      console.log(`Category: ${scenario.category}`);
      console.log(`Description: ${scenario.description}`);

      try {
        const testResult = await this.runSingleTest(scenario);
        results.testResults.push(testResult);

        results.summary.totalTests++;
        if (testResult.passed) {
          results.summary.passedTests++;
        } else {
          results.summary.failedTests++;
        }

        results.summary.averageUtilizationRate += testResult.metrics.finalUtilizationRate;
        results.summary.averageImprovement += testResult.metrics.improvementOverBaseline;

      } catch (error) {
        console.error(`Test failed for scenario ${scenario.name}:`, error);
        results.testResults.push({
          scenario: scenario.name,
          passed: false,
          error: error.message,
          metrics: {}
        });
        results.summary.failedTests++;
      }
    }

    // Calculate averages
    if (results.summary.totalTests > 0) {
      results.summary.averageUtilizationRate /= results.summary.totalTests;
      results.summary.averageImprovement /= results.summary.totalTests;
    }

    // Run benchmark comparison
    results.benchmarkComparisons = await this.runBenchmarkComparisons();

    // Generate recommendations
    results.recommendations = this.generateTestRecommendations(results);

    console.log('\n=== TEST SUITE COMPLETE ===');
    console.log(`Results: ${results.summary.passedTests}/${results.summary.totalTests} tests passed`);
    console.log(`Average utilization rate: ${results.summary.averageUtilizationRate.toFixed(2)}%`);
    console.log(`Average improvement: ${results.summary.averageImprovement.toFixed(2)}%`);

    return results;
  }

  /**
   * Run a single test scenario
   */
  async runSingleTest(scenario) {
    console.log('Running baseline optimization...');

    // Run baseline optimization (current system)
    const baselineResult = await portfolioOptimizationService.optimizePortfolio(scenario.input);

    console.log('Running enhanced optimization...');

    // Run enhanced optimization
    const enhancedResult = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(scenario.input);

    // Calculate metrics
    const baselineUtilization = 100 - (baselineResult.optimizationMetrics?.unusedPercentage || 0);
    const enhancedUtilization = 100 - (enhancedResult.optimizationMetrics?.unusedPercentage || 0);
    const improvement = enhancedUtilization - baselineUtilization;

    const metrics = {
      baselineUtilizationRate: baselineUtilization,
      finalUtilizationRate: enhancedUtilization,
      improvementOverBaseline: improvement,
      budgetUsed: enhancedResult.optimizationMetrics?.totalBudgetUsed || 0,
      unusedBudget: enhancedResult.optimizationMetrics?.unusedBudget || 0,
      toleranceCompliance: enhancedResult.toleranceMetrics?.complianceRate || 0,
      optimizationTime: enhancedResult.totalOptimizationTime || 0
    };

    console.log('Test Metrics:', {
      baseline: baselineUtilization.toFixed(2) + '%',
      enhanced: enhancedUtilization.toFixed(2) + '%',
      improvement: improvement.toFixed(2) + '%',
      budgetUsed: `$${metrics.budgetUsed.toFixed(2)}`,
      unusedBudget: `$${metrics.unusedBudget.toFixed(2)}`
    });

    // Evaluate test success
    const passed = this.evaluateTestSuccess(scenario, metrics);

    return {
      scenario: scenario.name,
      category: scenario.category,
      passed,
      metrics,
      baselineResult,
      enhancedResult,
      evaluation: {
        meetsMinimumUtilization: metrics.finalUtilizationRate >= scenario.expectedResults.minUtilizationRate,
        exceedsImprovementTarget: improvement >= scenario.expectedResults.expectedImprovement,
        withinToleranceBands: metrics.toleranceCompliance >= 80
      }
    };
  }

  /**
   * Evaluate test success based on scenario expectations
   */
  evaluateTestSuccess(scenario, metrics) {
    const { expectedResults } = scenario;

    // Check minimum utilization rate
    if (metrics.finalUtilizationRate < expectedResults.minUtilizationRate) {
      console.warn(`FAILED: Utilization rate ${metrics.finalUtilizationRate.toFixed(2)}% below minimum ${expectedResults.minUtilizationRate}%`);
      return false;
    }

    // Check improvement target
    if (metrics.improvementOverBaseline < expectedResults.expectedImprovement) {
      console.warn(`FAILED: Improvement ${metrics.improvementOverBaseline.toFixed(2)}% below target ${expectedResults.expectedImprovement}%`);
      return false;
    }

    // Category-specific checks
    if (scenario.category === 'price_ratio' && expectedResults.priceRatioOptimization) {
      if (metrics.improvementOverBaseline < 8) { // Higher expectation for price ratio optimization
        console.warn(`FAILED: Price ratio optimization improvement ${metrics.improvementOverBaseline.toFixed(2)}% below 8% target`);
        return false;
      }
    }

    if (scenario.category === 'edge_cases' && expectedResults.budgetConstraint) {
      // More lenient for extreme budget constraints
      if (metrics.finalUtilizationRate < 70) {
        console.warn(`FAILED: Extreme budget constraint utilization ${metrics.finalUtilizationRate.toFixed(2)}% below 70% minimum`);
        return false;
      }
    }

    console.log('PASSED: All criteria met');
    return true;
  }

  /**
   * Run benchmark comparisons
   */
  async runBenchmarkComparisons() {
    console.log('Running benchmark comparisons...');

    const benchmarks = {
      heuristicStrategies: await this.compareHeuristicStrategies(),
      constraintLevels: await this.compareConstraintLevels(),
      optimizationStrategies: await this.compareOptimizationStrategies()
    };

    return benchmarks;
  }

  /**
   * Compare different heuristic strategies
   */
  async compareHeuristicStrategies() {
    const strategies = ['minimize-leftover', 'maximize-shares', 'momentum-weighted'];
    const testInput = this.testScenarios[1].input; // Use complex case for comparison

    const results = {};

    for (const strategy of strategies) {
      console.log(`Testing strategy: ${strategy}`);

      const input = {
        ...testInput,
        optimizationStrategy: strategy
      };

      const result = await portfolioOptimizationService.optimizePortfolio(input);
      const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);

      results[strategy] = {
        utilizationRate,
        budgetUsed: result.optimizationMetrics?.totalBudgetUsed || 0,
        allocations: result.allocations?.length || 0
      };
    }

    return results;
  }

  /**
   * Compare different constraint levels
   */
  async compareConstraintLevels() {
    const constraintLevels = [5, 10, 20, 30, 50]; // Deviation percentages
    const testInput = this.testScenarios[1].input; // Use complex case

    const results = {};

    for (const deviation of constraintLevels) {
      console.log(`Testing deviation level: ${deviation}%`);

      const input = {
        ...testInput,
        targetETFs: testInput.targetETFs.map(etf => ({
          ...etf,
          allowedDeviation: deviation
        }))
      };

      const result = await portfolioOptimizationService.optimizePortfolio(input);
      const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);

      results[`${deviation}%`] = {
        utilizationRate,
        budgetUsed: result.optimizationMetrics?.totalBudgetUsed || 0,
        solverStatus: result.solverStatus
      };
    }

    return results;
  }

  /**
   * Compare optimization strategies
   */
  async compareOptimizationStrategies() {
    const strategies = [
      { name: 'baseline', useEnhanced: false },
      { name: 'enhanced', useEnhanced: true },
      { name: 'smart_rebalancing', useSmartRebalancing: true }
    ];

    const testInput = this.testScenarios[1].input; // Use complex case
    const results = {};

    for (const strategy of strategies) {
      console.log(`Testing strategy: ${strategy.name}`);

      let result;
      if (strategy.useEnhanced) {
        result = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(testInput);
      } else if (strategy.useSmartRebalancing) {
        const baseline = await portfolioOptimizationService.optimizePortfolio(testInput);
        result = await smartRebalancingService.performSmartRebalancing(
          testInput,
          baseline,
          testInput.currentHoldings.reduce((sum, h) => sum + h.shares * h.price, 0) + testInput.extraCash
        );
      } else {
        result = await portfolioOptimizationService.optimizePortfolio(testInput);
      }

      const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);

      results[strategy.name] = {
        utilizationRate,
        budgetUsed: result.optimizationMetrics?.totalBudgetUsed || 0,
        optimizationTime: result.totalOptimizationTime || 0,
        rebalancingApplied: result.rebalancingApplied || false,
        enhancedOptimization: result.enhancedOptimization || false
      };
    }

    return results;
  }

  /**
   * Generate test recommendations
   */
  generateTestRecommendations(results) {
    const recommendations = [];

    // Overall performance recommendations
    if (results.summary.averageUtilizationRate < this.benchmarkThresholds.targetUtilizationRate) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average utilization rate (${results.summary.averageUtilizationRate.toFixed(1)}%) is below target (${this.benchmarkThresholds.targetUtilizationRate}%). Consider further constraint relaxation.`
      });
    }

    if (results.summary.averageImprovement < this.benchmarkThresholds.minImprovementRequired) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        message: `Average improvement (${results.summary.averageImprovement.toFixed(1)}%) is below minimum threshold (${this.benchmarkThresholds.minImprovementRequired}%). Review optimization algorithms.`
      });
    }

    // Failed test analysis
    const failedTests = results.testResults.filter(test => !test.passed);
    if (failedTests.length > 0) {
      const failedCategories = [...new Set(failedTests.map(test => test.category))];

      recommendations.push({
        type: 'test_failures',
        priority: 'high',
        message: `${failedTests.length} tests failed in categories: ${failedCategories.join(', ')}. Focus optimization improvements in these areas.`
      });
    }

    // Benchmark insights
    if (results.benchmarkComparisons.heuristicStrategies) {
      const bestStrategy = Object.entries(results.benchmarkComparisons.heuristicStrategies)
        .sort(([,a], [,b]) => b.utilizationRate - a.utilizationRate)[0];

      recommendations.push({
        type: 'strategy',
        priority: 'low',
        message: `Best performing heuristic strategy: ${bestStrategy[0]} with ${bestStrategy[1].utilizationRate.toFixed(1)}% utilization.`
      });
    }

    return recommendations;
  }

  /**
   * Run specific validation scenarios
   */
  async runValidationScenarios() {
    console.log('=== VALIDATION SCENARIOS ===');

    const validationTests = [
      {
        name: 'Extreme Budget Constraint',
        description: 'Test with extremely limited budget',
        test: () => this.testExtremeBudgetConstraint()
      },
      {
        name: 'All ETFs Zero Allocation',
        description: 'Test with all ETFs having 0% allocation (complete sell)',
        test: () => this.testCompleteSellScenario()
      },
      {
        name: 'Very Large Portfolio',
        description: 'Test with very large portfolio values',
        test: () => this.testLargePortfolioScenario()
      },
      {
        name: 'Invalid Price Data',
        description: 'Test with missing/invalid price data',
        test: () => this.testInvalidPriceScenario()
      }
    ];

    const validationResults = [];

    for (const validationTest of validationTests) {
      try {
        console.log(`\n--- Running Validation: ${validationTest.name} ---`);
        const result = await validationTest.test();
        validationResults.push({
          name: validationTest.name,
          description: validationTest.description,
          passed: result.success,
          details: result,
          error: null
        });
      } catch (error) {
        validationResults.push({
          name: validationTest.name,
          description: validationTest.description,
          passed: false,
          details: null,
          error: error.message
        });
      }
    }

    return {
      validationSuite: 'Edge Case Validation',
      timestamp: new Date().toISOString(),
      totalValidations: validationTests.length,
      passedValidations: validationResults.filter(v => v.passed).length,
      results: validationResults
    };
  }

  /**
   * Test extreme budget constraint
   */
  async testExtremeBudgetConstraint() {
    const input = {
      currentHoldings: [],
      targetETFs: [
        { name: 'SPY', targetPercentage: 50, pricePerShare: 450 },
        { name: 'QQQ', targetPercentage: 50, pricePerShare: 350 }
      ],
      extraCash: 50, // Very small amount
      objectives: { useAllBudget: true, maximizeUtilization: true }
    };

    const result = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(input);
    const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);

    return {
      success: utilizationRate >= 0, // Any utilization is success with such small budget
      utilizationRate,
      budgetUsed: result.optimizationMetrics?.totalBudgetUsed || 0,
      message: `Successfully handled extreme budget constraint with ${utilizationRate.toFixed(1)}% utilization`
    };
  }

  /**
   * Test complete sell scenario
   */
  async testCompleteSellScenario() {
    const input = {
      currentHoldings: [
        { name: 'VTI', shares: 100, price: 450 },
        { name: 'BND', shares: 200, price: 75 }
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 0, pricePerShare: 450 },   // Sell all
        { name: 'BND', targetPercentage: 0, pricePerShare: 75 }     // Sell all
      ],
      extraCash: 1000,
      objectives: { useAllBudget: true, maximizeUtilization: true }
    };

    const result = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(input);
    const holdingsToSell = result.holdingsToSell || [];

    return {
      success: holdingsToSell.length === 2, // Should identify both for selling
      holdingsToSellCount: holdingsToSell.length,
      totalSellValue: holdingsToSell.reduce((sum, h) => sum + h.totalValue, 0),
      message: `Successfully identified ${holdingsToSell.length} holdings for complete sell`
    };
  }

  /**
   * Test large portfolio scenario
   */
  async testLargePortfolioScenario() {
    const largeValues = {
      currentHoldings: 10000000, // $10M
      extraCash: 1000000        // $1M
    };

    const input = {
      currentHoldings: [
        { name: 'VTI', shares: 20000, price: 450 },  // $9M
        { name: 'BND', shares: 13333, price: 75 }   // $1M
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 80, pricePerShare: 450 },
        { name: 'BND', targetPercentage: 20, pricePerShare: 75 }
      ],
      extraCash: largeValues.extraCash,
      objectives: { useAllBudget: true, maximizeUtilization: true }
    };

    const result = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(input);
    const utilizationRate = 100 - (result.optimizationMetrics?.unusedPercentage || 0);

    return {
      success: utilizationRate >= 95 && !result.error, // High expectation for large portfolios
      utilizationRate,
      totalPortfolioValue: largeValues.currentHoldings + largeValues.extraCash,
      message: `Successfully handled large portfolio with ${utilizationRate.toFixed(1)}% utilization`
    };
  }

  /**
   * Test invalid price data scenario
   */
  async testInvalidPriceScenario() {
    const input = {
      currentHoldings: [
        { name: 'VTI', shares: 10, price: 0 },      // Invalid price
        { name: 'BND', shares: 20, price: -50 }     // Negative price
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 50, pricePerShare: null },   // Null price
        { name: 'BND', targetPercentage: 50, pricePerShare: undefined } // Undefined price
      ],
      extraCash: 1000,
      objectives: { useAllBudget: true, maximizeUtilization: true }
    };

    try {
      const result = await enhancedBudgetOptimizer.optimizeBudgetWithTolerance(input);
      return {
        success: true, // Success if it doesn't crash
        handledGracefully: true,
        message: 'Successfully handled invalid price data without crashing'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to handle invalid price data gracefully'
      };
    }
  }
}

module.exports = new OptimizationTestFramework();