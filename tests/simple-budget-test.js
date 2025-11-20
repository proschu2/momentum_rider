/**
 * Simple Budget Utilization Test
 * Focuses on key scenarios to identify budget utilization issues
 */

const portfolioService = require('../server/services/portfolioService');

class SimpleBudgetTest {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, budget, etfs, strategy = 'momentum') {
    console.log(`\n=== ${testName} ===`);
    console.log(`Budget: $${budget}`);
    console.log(`ETFs: ${etfs.join(', ')}`);

    try {
      const input = {
        strategy: { type: strategy, parameters: { topN: Math.min(3, etfs.length) } },
        selectedETFs: etfs,
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      };

      const result = await portfolioService.optimizePortfolio(input);

      const utilizationRate = result.utilizationRate || 0;
      const uninvestedCash = result.uninvestedCash || 0;
      const solverStatus = result.solverStatus || 'unknown';
      const fallbackUsed = result.fallbackUsed || false;

      console.log(`Utilization: ${utilizationRate.toFixed(1)}%`);
      console.log(`Uninvested: $${uninvestedCash.toFixed(2)}`);
      console.log(`Solver Status: ${solverStatus}`);
      console.log(`Fallback Used: ${fallbackUsed}`);

      const testResult = {
        testName,
        budget,
        etfs,
        utilizationRate,
        uninvestedCash,
        solverStatus,
        fallbackUsed,
        success: true,
        issue: utilizationRate < 90 ? 'LOW_UTILIZATION' : null
      };

      this.testResults.push(testResult);
      return testResult;

    } catch (error) {
      console.error(`Test failed: ${error.message}`);
      const testResult = {
        testName,
        budget,
        etfs,
        success: false,
        error: error.message
      };
      this.testResults.push(testResult);
      return testResult;
    }
  }

  async runAllTests() {
    console.log('=== STARTING BUDGET UTILIZATION TESTS ===');

    // Test 1: Small budget with low-price ETFs
    await this.runTest('Small Budget - Low Price ETFs', 1000, ['BND', 'SGOV', 'BIL']);

    // Test 2: Small budget with high-price ETFs
    await this.runTest('Small Budget - High Price ETFs', 1000, ['SPY', 'QQQ', 'VGT']);

    // Test 3: Small budget with mixed prices
    await this.runTest('Small Budget - Mixed Prices', 2500, ['VTI', 'BND', 'SGOV']);

    // Test 4: Medium budget - good scenario
    await this.runTest('Medium Budget - Standard ETFs', 25000, ['VTI', 'VEA', 'VWO', 'BND', 'TLT']);

    // Test 5: Medium budget with many ETFs
    await this.runTest('Medium Budget - Many ETFs', 50000, ['VTI', 'VEA', 'VWO', 'BND', 'TLT', 'GLDM', 'IBIT']);

    // Test 6: Large budget
    await this.runTest('Large Budget', 250000, ['VTI', 'VEA', 'VWO', 'BND', 'TLT', 'GLDM', 'IBIT', 'PDBC']);

    // Test 7: Very small budget
    await this.runTest('Very Small Budget', 500, ['BND', 'SGOV']);

    // Test 8: Single ETF
    await this.runTest('Single ETF', 10000, ['VTI']);

    // Test 9: Custom strategy (fixed allocation)
    await this.runTestCustom('Custom Strategy', 50000, ['VTI', 'BND'], { VTI: 60, BND: 40 });

    this.generateReport();
  }

  async runTestCustom(testName, budget, etfs, allocations) {
    console.log(`\n=== ${testName} ===`);
    console.log(`Budget: $${budget}`);
    console.log(`ETFs: ${etfs.join(', ')}`);
    console.log(`Allocations: ${JSON.stringify(allocations)}`);

    try {
      const input = {
        strategy: { type: 'custom', parameters: { allocations } },
        selectedETFs: etfs,
        additionalCapital: budget,
        currentHoldings: [],
        constraints: { optimizationStrategy: 'minimize-leftover' }
      };

      const result = await portfolioService.optimizePortfolio(input);

      const utilizationRate = result.utilizationRate || 0;
      const uninvestedCash = result.uninvestedCash || 0;
      const solverStatus = result.solverStatus || 'unknown';
      const fallbackUsed = result.fallbackUsed || false;

      console.log(`Utilization: ${utilizationRate.toFixed(1)}%`);
      console.log(`Uninvested: $${uninvestedCash.toFixed(2)}`);
      console.log(`Solver Status: ${solverStatus}`);
      console.log(`Fallback Used: ${fallbackUsed}`);

      const testResult = {
        testName,
        budget,
        etfs,
        utilizationRate,
        uninvestedCash,
        solverStatus,
        fallbackUsed,
        success: true,
        issue: utilizationRate < 90 ? 'LOW_UTILIZATION' : null
      };

      this.testResults.push(testResult);
      return testResult;

    } catch (error) {
      console.error(`Test failed: ${error.message}`);
      const testResult = {
        testName,
        budget,
        etfs,
        success: false,
        error: error.message
      };
      this.testResults.push(testResult);
      return testResult;
    }
  }

  generateReport() {
    console.log('\n=== TEST REPORT ===');

    const successfulTests = this.testResults.filter(t => t.success);
    const failedTests = this.testResults.filter(t => !t.success);
    const lowUtilizationTests = successfulTests.filter(t => t.utilizationRate < 90);

    console.log(`\nTotal Tests: ${this.testResults.length}`);
    console.log(`Successful: ${successfulTests.length}`);
    console.log(`Failed: ${failedTests.length}`);
    console.log(`Low Utilization (<90%): ${lowUtilizationTests.length}`);

    if (successfulTests.length > 0) {
      const avgUtilization = successfulTests.reduce((sum, t) => sum + t.utilizationRate, 0) / successfulTests.length;
      console.log(`Average Utilization: ${avgUtilization.toFixed(1)}%`);
    }

    console.log('\n=== DETAILED RESULTS ===');

    this.testResults.forEach(test => {
      if (test.success) {
        const status = test.utilizationRate >= 90 ? '✓' : '⚠';
        console.log(`${status} ${test.testName}: ${test.utilizationRate.toFixed(1)}% ($${test.uninvestedCash.toFixed(0)} uninvested)`);
        if (test.issue) {
          console.log(`   ISSUE: ${test.issue}`);
        }
      } else {
        console.log(`✗ ${test.testName}: FAILED - ${test.error}`);
      }
    });

    if (lowUtilizationTests.length > 0) {
      console.log('\n=== LOW UTILIZATION ANALYSIS ===');
      lowUtilizationTests.forEach(test => {
        console.log(`${test.testName}: ${test.utilizationRate.toFixed(1)}% utilization`);
        console.log(`  Budget: $${test.budget}, ETFs: ${test.etfs.join(', ')}`);
        console.log(`  Status: ${test.solverStatus}, Fallback: ${test.fallbackUsed}`);
      });
    }

    // Save detailed report
    const fs = require('fs');
    const report = {
      summary: {
        totalTests: this.testResults.length,
        successfulTests: successfulTests.length,
        failedTests: failedTests.length,
        lowUtilizationTests: lowUtilizationTests.length,
        avgUtilization: successfulTests.length > 0 ?
          successfulTests.reduce((sum, t) => sum + t.utilizationRate, 0) / successfulTests.length : 0
      },
      results: this.testResults,
      lowUtilizationTests: lowUtilizationTests
    };

    fs.writeFileSync('tests/simple-budget-test-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to: tests/simple-budget-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new SimpleBudgetTest();
  tester.runAllTests()
    .then(() => {
      console.log('\nAll tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = SimpleBudgetTest;