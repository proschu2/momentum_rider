/**
 * Comprehensive Budget Utilization Test Runner
 * Tests portfolio optimization across different budget sizes and market conditions
 */

const portfolioService = require('../server/services/portfolioService');
const financeService = require('../server/services/financeService');
const fs = require('fs').promises;
const path = require('path');

class BudgetUtilizationTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  /**
   * Run comprehensive budget utilization tests
   */
  async runAllTests() {
    console.log('=== STARTING COMPREHENSIVE BUDGET UTILIZATION TESTS ===');

    try {
      // Test different portfolio sizes
      await this.testSmallPortfolios();
      await this.testMediumPortfolios();
      await this.testLargePortfolios();

      // Test different ETF price scenarios
      await this.testHighPriceETFs();
      await this.testLowPriceETFs();
      await this.testMixedPriceETFs();

      // Test different optimization strategies
      await this.testOptimizationStrategies();

      // Test different momentum timeframes
      await this.testMomentumTimeframes();

      // Test edge cases
      await this.testEdgeCases();

      // Generate comprehensive report
      await this.generateTestReport();

      console.log('=== ALL BUDGET UTILIZATION TESTS COMPLETED ===');

    } catch (error) {
      console.error('Test runner failed:', error);
      throw error;
    }
  }

  /**
   * Test small portfolios ($1K-$10K)
   */
  async testSmallPortfolios() {
    console.log('\n=== TESTING SMALL PORTFOLIOS ($1K-$10K) ===');

    const smallBudgets = [1000, 2500, 5000, 7500, 10000];
    const etfSets = [
      // Low price ETFs for small budgets
      ['BND', 'SGOV', 'BIL', 'VUBS'],
      ['BND', 'VEA', 'VWO', 'SGOV'],
      ['VTI', 'BND', 'VEA', 'SGOV'],
      // Higher price ETFs (potential issues)
      ['SPY', 'QQQ', 'VTI', 'VGT']
    ];

    for (const budget of smallBudgets) {
      for (const etfSet of etfSets) {
        await this.runTestScenario(`Small Portfolio - $${budget}`, {
          strategy: { type: 'momentum', parameters: { topN: 3, includeIBIT: false } },
          selectedETFs: etfSet,
          additionalCapital: budget,
          currentHoldings: [],
          constraints: { optimizationStrategy: 'minimize-leftover' }
        });
      }
    }
  }

  /**
   * Test medium portfolios ($10K-$100K)
   */
  async testMediumPortfolios() {
    console.log('\n=== TESTING MEDIUM PORTFOLIOS ($10K-$100K) ===');

    const mediumBudgets = [15000, 25000, 50000, 75000, 100000];
    const etfSets = [
      // Diverse ETF sets
      ['VTI', 'VEA', 'VWO', 'BND', 'TLT', 'GLDM'],
      ['SPY', 'QQQ', 'IWM', 'AGG', 'SGOV', 'PDBC'],
      ['VTI', 'VXUS', 'BND', 'IBIT', 'GLDM'],
      // More concentrated portfolios
      ['VTI', 'BND', 'VEA'],
      ['SPY', 'QQQ', 'TLT']
    ];

    for (const budget of mediumBudgets) {
      for (const etfSet of etfSets) {
        // Test with some existing holdings
        const currentHoldings = budget > 50000 ? [
          { etf: 'VTI', shares: 10 },
          { etf: 'BND', shares: 20 }
        ] : [];

        await this.runTestScenario(`Medium Portfolio - $${budget}`, {
          strategy: { type: 'momentum', parameters: { topN: 3, includeIBIT: true } },
          selectedETFs: etfSet,
          additionalCapital: budget,
          currentHoldings,
          constraints: { optimizationStrategy: 'minimize-leftover' }
        });
      }
    }
  }

  /**
   * Test large portfolios ($100K+)
   */
  async testLargePortfolios() {
    console.log('\n=== TESTING LARGE PORTFOLIOS ($100K+) ===');

    const largeBudgets = [150000, 250000, 500000, 1000000];
    const etfSets = [
      // Comprehensive ETF sets
      ['VTI', 'VEA', 'VWO', 'BND', 'TLT', 'GLDM', 'IBIT', 'PDBC'],
      ['SPY', 'QQQ', 'IWM', 'AGG', 'TLT', 'GLD', 'IBIT', 'VNQ'],
      ['VTI', 'VXUS', 'BND', 'IBIT', 'GLDM', 'PDBC'],
      // Sector-focused
      ['VGT', 'VHT', 'VFH', 'VDC', 'VDE', 'VPU']
    ];

    for (const budget of largeBudgets) {
      for (const etfSet of etfSets) {
        // Test with significant existing holdings
        const currentHoldings = [
          { etf: 'VTI', shares: 50 },
          { etf: 'BND', shares: 100 },
          { etf: 'VEA', shares: 30 }
        ];

        await this.runTestScenario(`Large Portfolio - $${budget}`, {
          strategy: { type: 'momentum', parameters: { topN: 4, includeIBIT: true } },
          selectedETFs: etfSet,
          additionalCapital: budget,
          currentHoldings,
          constraints: { optimizationStrategy: 'minimize-leftover' }
        });
      }
    }
  }

  /**
   * Test high price ETFs
   */
  async testHighPriceETFs() {
    console.log('\n=== TESTING HIGH PRICE ETFs ===');

    const highPriceETFs = ['SPY', 'QQQ', 'VGT', 'VHT', 'SPY', 'IWV'];
    const budgets = [5000, 15000, 50000];

    for (const budget of budgets) {
      await this.runTestScenario(`High Price ETFs - $${budget}`, {
        strategy: { type: 'momentum', parameters: { topN: 3 } },
        selectedETFs: highPriceETFs.slice(0, 4),
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      });
    }
  }

  /**
   * Test low price ETFs
   */
  async testLowPriceETFs() {
    console.log('\n=== TESTING LOW PRICE ETFs ===');

    const lowPriceETFs = ['BIL', 'SGOV', 'BWX', 'VUBS', 'PDBC'];
    const budgets = [2500, 10000, 25000];

    for (const budget of budgets) {
      await this.runTestScenario(`Low Price ETFs - $${budget}`, {
        strategy: { type: 'momentum', parameters: { topN: 3 } },
        selectedETFs: lowPriceETFs.slice(0, 4),
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      });
    }
  }

  /**
   * Test mixed price ETFs
   */
  async testMixedPriceETFs() {
    console.log('\n=== TESTING MIXED PRICE ETFs ===');

    const mixedPriceETFs = ['SPY', 'BND', 'SGOV', 'QQQ', 'BIL', 'VGT'];
    const budgets = [10000, 50000, 100000];

    for (const budget of budgets) {
      await this.runTestScenario(`Mixed Price ETFs - $${budget}`, {
        strategy: { type: 'momentum', parameters: { topN: 4 } },
        selectedETFs: mixedPriceETFs,
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      });
    }
  }

  /**
   * Test different optimization strategies
   */
  async testOptimizationStrategies() {
    console.log('\n=== TESTING OPTIMIZATION STRATEGIES ===');

    const budget = 50000;
    const etfs = ['VTI', 'VEA', 'VWO', 'BND', 'TLT'];
    const strategies = ['minimize-leftover', 'maximize-shares', 'momentum-weighted'];

    for (const strategy of strategies) {
      await this.runTestScenario(`Strategy: ${strategy}`, {
        strategy: { type: 'momentum', parameters: { topN: 3 } },
        selectedETFs: etfs,
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: strategy }
      });
    }
  }

  /**
   * Test different momentum timeframes
   */
  async testMomentumTimeframes() {
    console.log('\n=== TESTING MOMENTUM TIMEFRAMES ===');

    const budget = 25000;
    const etfs = ['VTI', 'VEA', 'VWO', 'BND', 'IBIT'];

    // Test with different topN values (affects portfolio concentration)
    for (const topN of [2, 3, 4, 5]) {
      await this.runTestScenario(`Momentum Top-${topN}`, {
        strategy: { type: 'momentum', parameters: { topN, includeIBIT: true } },
        selectedETFs: etfs,
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      });
    }
  }

  /**
   * Test edge cases
   */
  async testEdgeCases() {
    console.log('\n=== TESTING EDGE CASES ===');

    // Very small budget
    await this.runTestScenario('Very Small Budget', {
      strategy: { type: 'custom', parameters: { allocations: { 'SPY': 100 } } },
      selectedETFs: ['SPY'],
      additionalCapital: 500,
      currentHoldings: [],
      constraints: { optimizationStrategy: 'minimize-leftover' }
    });

    // All high price ETFs with small budget
    await this.runTestScenario('High Price + Small Budget', {
      strategy: { type: 'momentum', parameters: { topN: 2 } },
      selectedETFs: ['SPY', 'QQQ'],
      additionalCapital: 2000,
      currentHoldings: [],
      constraints: { optimizationStrategy: 'minimize-leftover' }
    });

    // Large existing holdings, small additional cash
    await this.runTestScenario('Large Holdings + Small Cash', {
      strategy: { type: 'momentum', parameters: { topN: 3 } },
      selectedETFs: ['VTI', 'VEA', 'BND'],
      additionalCapital: 1000,
      currentHoldings: [
        { etf: 'VTI', shares: 100 },
        { etf: 'VEA', shares: 50 }
      ],
      constraints: { optimizationStrategy: 'minimize-leftover' }
    });

    // Single ETF concentration
    await this.runTestScenario('Single ETF', {
      strategy: { type: 'custom', parameters: { allocations: { 'VTI': 100 } } },
      selectedETFs: ['VTI'],
      additionalCapital: 10000,
      currentHoldings: [],
      constraints: { optimizationStrategy: 'minimize-leftover' }
    });
  }

  /**
   * Run a single test scenario
   */
  async runTestScenario(testName, input) {
    console.log(`\n--- Running: ${testName} ---`);

    try {
      const startTime = Date.now();

      // Run portfolio optimization
      const result = await portfolioService.optimizePortfolio(input);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Extract key metrics
      const utilizationRate = result.utilizationRate || 0;
      const uninvestedCash = result.uninvestedCash || 0;
      const totalBudget = input.additionalCapital +
        (input.currentHoldings?.reduce((sum, h) => sum + (h.shares * 100), 0) || 0); // Rough estimate

      // Calculate detailed metrics
      const uninvestedPercentage = totalBudget > 0 ? (uninvestedCash / totalBudget) * 100 : 0;
      const utilizationIssue = utilizationRate < 90; // Less than 90% utilization is an issue

      const testResult = {
        testName,
        input: {
          budget: input.additionalCapital,
          etfCount: input.selectedETFs?.length || 0,
          holdingsCount: input.currentHoldings?.length || 0,
          strategy: input.constraints?.optimizationStrategy || 'default',
          strategyType: input.strategy?.type || 'unknown'
        },
        result: {
          utilizationRate,
          uninvestedCash,
          uninvestedPercentage,
          totalUtilized: result.utilizedCapital || 0,
          solverStatus: result.solverStatus || 'unknown',
          fallbackUsed: result.fallbackUsed || false,
          allocationCount: result.allocations?.length || 0,
          executionTime
        },
        issues: [],
        severity: 'none'
      };

      // Identify issues
      if (utilizationIssue) {
        testResult.issues.push(`Low utilization: ${utilizationRate.toFixed(1)}%`);
        testResult.severity = utilizationRate < 75 ? 'high' :
                            utilizationRate < 85 ? 'medium' : 'low';
      }

      if (result.fallbackUsed) {
        testResult.issues.push('Fallback optimization used');
        if (testResult.severity === 'none') testResult.severity = 'low';
      }

      if (testResult.uninvestedPercentage > 20) {
        testResult.issues.push(`High uninvested cash: ${testResult.uninvestedPercentage.toFixed(1)}%`);
        if (testResult.severity === 'none') testResult.severity = 'medium';
      }

      console.log(`Result: ${utilizationRate.toFixed(1)}% utilization, ${testResult.uninvestedPercentage.toFixed(1)}% uninvested`);

      if (testResult.issues.length > 0) {
        console.warn(`Issues detected: ${testResult.issues.join(', ')}`);
      }

      this.testResults.push(testResult);

    } catch (error) {
      console.error(`Test failed: ${testName}`, error);

      this.testResults.push({
        testName,
        input: {
          budget: input.additionalCapital,
          etfCount: input.selectedETFs?.length || 0,
          holdingsCount: input.currentHoldings?.length || 0
        },
        error: error.message,
        issues: [`Test execution failed: ${error.message}`],
        severity: 'high'
      });
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    console.log('\n=== GENERATING TEST REPORT ===');

    const endTime = Date.now();
    const totalTestTime = endTime - this.startTime;

    // Calculate statistics
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => !r.error).length;
    const failedTests = totalTests - successfulTests;

    const utilizationRates = this.testResults
      .filter(r => r.result?.utilizationRate)
      .map(r => r.result.utilizationRate);

    const avgUtilization = utilizationRates.length > 0 ?
      utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length : 0;

    const issuesBySeverity = {
      high: this.testResults.filter(r => r.severity === 'high').length,
      medium: this.testResults.filter(r => r.severity === 'medium').length,
      low: this.testResults.filter(r => r.severity === 'low').length
    };

    const lowUtilizationTests = this.testResults
      .filter(r => r.result?.utilizationRate && r.result.utilizationRate < 90)
      .sort((a, b) => a.result.utilizationRate - b.result.utilizationRate)
      .slice(0, 10); // Top 10 worst performers

    const report = {
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        totalTestTime,
        avgUtilization,
        issuesBySeverity
      },
      worstPerformers: lowUtilizationTests,
      allResults: this.testResults,
      analysis: this.analyzePatterns()
    };

    // Write report to file
    const reportPath = path.join(__dirname, 'budget-utilization-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateTextSummary(report);

    console.log(`\nTest report saved to: ${reportPath}`);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Average utilization: ${avgUtilization.toFixed(1)}%`);
    console.log(`High severity issues: ${issuesBySeverity.high}`);
    console.log(`Medium severity issues: ${issuesBySeverity.medium}`);
    console.log(`Low severity issues: ${issuesBySeverity.low}`);

    if (lowUtilizationTests.length > 0) {
      console.log(`\n=== WORST PERFORMERS ===`);
      lowUtilizationTests.forEach(test => {
        console.log(`${test.testName}: ${test.result.utilizationRate.toFixed(1)}% utilization`);
      });
    }
  }

  /**
   * Analyze patterns in test results
   */
  analyzePatterns() {
    const patterns = {
      smallBudgetIssues: [],
      largeBudgetIssues: [],
      strategyIssues: {},
      etfCountIssues: {},
      fallbackUsage: 0
    };

    this.testResults.forEach(result => {
      if (!result.result) return;

      const budget = result.input.budget;
      const utilizationRate = result.result.utilizationRate;

      // Small budget analysis (< $10K)
      if (budget < 10000 && utilizationRate < 85) {
        patterns.smallBudgetIssues.push({
          testName: result.testName,
          budget,
          utilizationRate,
          issues: result.issues
        });
      }

      // Large budget analysis (> $100K)
      if (budget > 100000 && utilizationRate < 90) {
        patterns.largeBudgetIssues.push({
          testName: result.testName,
          budget,
          utilizationRate,
          issues: result.issues
        });
      }

      // Strategy analysis
      const strategy = result.input.strategy;
      if (!patterns.strategyIssues[strategy]) {
        patterns.strategyIssues[strategy] = [];
      }
      if (utilizationRate < 90) {
        patterns.strategyIssues[strategy].push({
          testName: result.testName,
          utilizationRate
        });
      }

      // ETF count analysis
      const etfCount = result.input.etfCount;
      if (!patterns.etfCountIssues[etfCount]) {
        patterns.etfCountIssues[etfCount] = [];
      }
      if (utilizationRate < 90) {
        patterns.etfCountIssues[etfCount].push({
          testName: result.testName,
          utilizationRate
        });
      }

      // Fallback usage
      if (result.result.fallbackUsed) {
        patterns.fallbackUsage++;
      }
    });

    return patterns;
  }

  /**
   * Generate human-readable text summary
   */
  async generateTextSummary(report) {
    const textSummary = `
# Budget Utilization Test Report

## Executive Summary
- **Total Tests Run**: ${report.summary.totalTests}
- **Success Rate**: ${((report.summary.successfulTests / report.summary.totalTests) * 100).toFixed(1)}%
- **Average Budget Utilization**: ${report.summary.avgUtilization.toFixed(1)}%
- **Tests with Issues**: ${report.summary.issuesBySeverity.high + report.summary.issuesBySeverity.medium + report.summary.issuesBySeverity.low}

## Key Findings

### Critical Issues (High Severity)
${report.summary.issuesBySeverity.high} tests failed with critical budget utilization problems.

### Performance Patterns
- **Small Budgets (<$10K)**: ${report.analysis.smallBudgetIssues.length} tests with poor utilization
- **Large Budgets (>$100K)**: ${report.analysis.largeBudgetIssues.length} tests with poor utilization
- **Fallback Optimization Used**: ${report.analysis.fallbackUsage} times

## Worst Performing Tests
${report.worstPerformers.map(test =>
  `- ${test.testName}: ${test.result.utilizationRate.toFixed(1)}% utilization`
).join('\n')}

## Recommendations
1. Investigate optimization algorithms for low utilization scenarios
2. Review fallback strategies and improve their efficiency
3. Optimize for small budget allocations (< $5K)
4. Enhance mixed ETF price scenarios

## Detailed Analysis
See the accompanying JSON file for complete test results and individual test metrics.
    `;

    const summaryPath = path.join(__dirname, 'budget-utilization-test-summary.md');
    await fs.writeFile(summaryPath, textSummary);

    console.log(`Text summary saved to: ${summaryPath}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testRunner = new BudgetUtilizationTestRunner();
  testRunner.runAllTests()
    .then(() => {
      console.log('All tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = BudgetUtilizationTestRunner;