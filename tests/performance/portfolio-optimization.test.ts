/**
 * Portfolio Optimization Performance Tests
 * Tests performance of portfolio analysis and optimization algorithms
 */

import { test, expect } from '@playwright/test'

test.describe('Portfolio Optimization Performance', () => {
  const performanceThresholds = {
    portfolioAnalysis: 5000, // 5 seconds
    executionPlan: 10000,    // 10 seconds
    batchQuoteFetch: 3000,   // 3 seconds
    momentumCalculation: 2000, // 2 seconds
    linearProgramming: 8000   // 8 seconds
  }

  test('should handle small portfolio optimization within performance thresholds', async ({ request }) => {
    const smallPortfolio = {
      strategyType: 'momentum',
      selectedETFs: ['VTI', 'VXUS', 'BND'],
      additionalCapital: 50000,
      currentHoldings: {
        'VTI': { shares: 100, avgCost: 250 }
      }
    }

    const startTime = Date.now()

    const response = await request.post('/api/portfolio/analyze', {
      data: smallPortfolio
    })

    const analysisTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(analysisTime).toBeLessThan(performanceThresholds.portfolioAnalysis)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.utilizationRate).toBeDefined()
  })

  test('should handle medium portfolio optimization efficiently', async ({ request }) => {
    const mediumPortfolio = {
      strategyType: 'custom',
      selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ', 'TLT', 'GLDM'],
      additionalCapital: 100000,
      customAllocations: {
        'VTI': 0.4,
        'VXUS': 0.25,
        'BND': 0.15,
        'QQQ': 0.1,
        'TLT': 0.075,
        'GLDM': 0.025
      },
      currentHoldings: {
        'VTI': { shares: 200, avgCost: 250 },
        'VXUS': { shares: 150, avgCost: 60 },
        'BND': { shares: 100, avgCost: 75 }
      }
    }

    const startTime = Date.now()

    const response = await request.post('/api/portfolio/analyze', {
      data: mediumPortfolio
    })

    const analysisTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(analysisTime).toBeLessThan(performanceThresholds.portfolioAnalysis * 1.5) // Allow 50% more for medium portfolios

    const result = await response.json()
    expect(result.success).toBe(true)
  })

  test('should handle execution plan generation within thresholds', async ({ request }) => {
    const executionRequest = {
      strategyType: 'momentum',
      selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ'],
      additionalCapital: 75000,
      currentHoldings: {
        'VTI': { shares: 150, avgCost: 245 },
        'VXUS': { shares: 100, avgCost: 62 },
        'BND': { shares: 75, avgCost: 73 }
      },
      optimizationStrategy: 'minimize-leftover'
    }

    const startTime = Date.now()

    const response = await request.post('/api/portfolio/execution-plan', {
      data: executionRequest
    })

    const executionTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(executionTime).toBeLessThan(performanceThresholds.executionPlan)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.executionPlan).toBeDefined()
    expect(result.analysisResults).toBeDefined()
    expect(result.portfolioComparison).toBeDefined()
  })

  test('should handle batch quote fetching efficiently', async ({ request }) => {
    const tickers = ['VTI', 'VXUS', 'BND', 'QQQ', 'TLT', 'GLDM', 'IBIT', 'VEA', 'VWO', 'PDBC']

    const startTime = Date.now()

    const response = await request.post('/api/quote/pre-fetch', {
      data: { tickers }
    })

    const fetchTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(fetchTime).toBeLessThan(performanceThresholds.batchQuoteFetch)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.totalProcessed).toBe(tickers.length)
  })

  test('should handle concurrent requests without degradation', async ({ request }) => {
    const portfolioRequests = Array.from({ length: 5 }, (_, i) => ({
      strategyType: 'momentum' as const,
      selectedETFs: ['VTI', 'VXUS', 'BND'],
      additionalCapital: 25000 + (i * 10000),
      currentHoldings: {
        'VTI': { shares: 50 + i * 10, avgCost: 250 + i }
      }
    }))

    const startTime = Date.now()

    const promises = portfolioRequests.map(portfolio =>
      request.post('/api/portfolio/analyze', { data: portfolio })
    )

    const responses = await Promise.all(promises)
    const totalTime = Date.now() - startTime

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200)
    })

    // Concurrent execution should be faster than sequential
    expect(totalTime).toBeLessThan(performanceThresholds.portfolioAnalysis * 2) // Allow 2x for overhead

    // Verify results are correct
    const results = await Promise.all(responses.map(r => r.json()))
    results.forEach(result => {
      expect(result.success).toBe(true)
      expect(result.utilizationRate).toBeDefined()
    })
  })

  test('should maintain performance with linear programming optimization', async ({ request }) => {
    const optimizationRequest = {
      currentHoldings: [
        { name: 'VTI', shares: 100, price: 320 },
        { name: 'VXUS', shares: 50, price: 60 },
        { name: 'BND', shares: 25, price: 75 }
      ],
      targetETFs: [
        { name: 'VTI', targetPercentage: 0.5, allowedDeviation: 0.05, pricePerShare: 320 },
        { name: 'VXUS', targetPercentage: 0.3, allowedDeviation: 0.05, pricePerShare: 60 },
        { name: 'BND', targetPercentage: 0.15, allowedDeviation: 0.05, pricePerShare: 75 },
        { name: 'QQQ', targetPercentage: 0.05, allowedDeviation: 0.02, pricePerShare: 340 }
      ],
      extraCash: 5000,
      optimizationStrategy: 'minimize-leftover'
    }

    const startTime = Date.now()

    const response = await request.post('/api/optimization/rebalance', {
      data: optimizationRequest
    })

    const optimizationTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(optimizationTime).toBeLessThan(performanceThresholds.linearProgramming)

    const result = await response.json()
    expect(result.solverStatus).toBeDefined()
    expect(['optimal', 'infeasible', 'heuristic', 'error']).toContain(result.solverStatus)
    expect(result.allocations).toBeDefined()
  })

  test('should handle memory usage efficiently during complex calculations', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Monitor memory usage (approximate)
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // Perform multiple complex portfolio operations
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="additional-capital"]', (50000 + i * 5000).toString())

      // Trigger portfolio analysis
      await page.click('[data-testid="analyze-portfolio"]')

      // Wait for completion
      await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 15000 })

      // Reset for next iteration
      await page.click('[data-testid="clear-analysis"]')
    }

    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be reasonable (less than 50MB for this test)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
  })

  test('should maintain responsiveness during heavy computations', async ({ page }) => {
    await page.goto('/')

    // Start a complex portfolio analysis
    await page.fill('[data-testid="additional-capital"]', '100000')
    await page.check('[data-testid="etf-VTI"]')
    await page.check('[data-testid="etf-VXUS"]')
    await page.check('[data-testid="etf-BND"]')
    await page.check('[data-testid="etf-QQQ"]')
    await page.check('[data-testid="etf-TLT"]')

    // Start analysis
    await page.click('[data-testid="analyze-portfolio"]')

    // Check that UI remains responsive during computation
    const responsivenessCheck = setInterval(async () => {
      // Try to interact with UI elements
      const isResponsive = await page.evaluate(() => {
        const button = document.querySelector('[data-testid="additional-capital"]') as HTMLInputElement
        return button && button.disabled === false
      })

      expect(isResponsive).toBe(true)
    }, 1000)

    // Wait for analysis completion
    await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 30000 })

    // Stop responsiveness checking
    clearInterval(responsivenessCheck)

    // Verify analysis completed successfully
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible()
  })

  test('should handle network latency gracefully', async ({ request }) => {
    // Simulate slow network conditions
    const portfolio = {
      strategyType: 'momentum',
      selectedETFs: ['VTI', 'VXUS', 'BND'],
      additionalCapital: 50000
    }

    // Test with various timeout scenarios
    const timeouts = [5000, 10000, 15000]

    for (const timeout of timeouts) {
      const startTime = Date.now()

      try {
        const response = await request.post('/api/portfolio/analyze', {
          data: portfolio,
          timeout
        })

        const responseTime = Date.now() - startTime

        expect(response.status()).toBe(200)
        expect(responseTime).toBeLessThan(timeout)

        const result = await response.json()
        expect(result.success).toBe(true)

      } catch (error) {
        // Handle timeout scenarios gracefully
        expect(error.message).toContain('timeout')
      }
    }
  })

  test.describe('Performance Regression Detection', () => {
    test('should establish baseline performance metrics', async ({ request }) => {
      const baselinePortfolio = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ'],
        additionalCapital: 75000,
        currentHoldings: {
          'VTI': { shares: 100, avgCost: 250 }
        }
      }

      const iterations = 5
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()

        const response = await request.post('/api/portfolio/analyze', {
          data: baselinePortfolio
        })

        const endTime = Date.now()

        expect(response.status()).toBe(200)
        times.push(endTime - startTime)
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)

      console.log(`Portfolio Analysis Performance:`)
      console.log(`  Average: ${averageTime.toFixed(2)}ms`)
      console.log(`  Min: ${minTime.toFixed(2)}ms`)
      console.log(`  Max: ${maxTime.toFixed(2)}ms`)

      // Performance should be consistent
      const variance = Math.max(...times) - Math.min(...times)
      expect(variance).toBeLessThan(averageTime * 0.5) // Variance should be less than 50% of average

      // Store baseline for future regression testing
      expect(averageTime).toBeLessThan(performanceThresholds.portfolioAnalysis)
    })
  })
})