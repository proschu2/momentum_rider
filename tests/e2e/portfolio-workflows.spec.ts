/**
 * End-to-End Portfolio Management Tests
 * Tests complete user workflows from ETF selection to portfolio execution
 */

import { test, expect, type Page } from '@playwright/test'

// Test data constants
const TEST_PORTFOLIO = {
  name: 'E2E Test Portfolio',
  strategy: 'momentum',
  selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ'],
  additionalCapital: 50000,
  currentHoldings: {
    'VTI': { shares: 100, avgCost: 250 },
    'VXUS': { shares: 50, avgCost: 60 }
  }
}

const ALL_WEATHER_PORTFOLIO = {
  name: 'E2E All Weather Portfolio',
  strategy: 'allweather',
  selectedETFs: ['VTI', 'VXUS', 'BND', 'TLT', 'GLDM'],
  additionalCapital: 100000,
  currentHoldings: {}
}

const CUSTOM_PORTFOLIO = {
  name: 'E2E Custom Portfolio',
  strategy: 'custom',
  selectedETFs: ['VTI', 'VXUS', 'BND'],
  additionalCapital: 75000,
  customAllocations: {
    'VTI': 0.5,
    'VXUS': 0.3,
    'BND': 0.2
  },
  currentHoldings: {}
}

class PortfolioPage {
  constructor(private page: Page) {}

  // Navigation and Initial Setup
  async navigateToStrategyHub() {
    await this.page.goto('/')
    await expect(this.page.getByRole('heading', { name: 'Strategy Hub' })).toBeVisible()
    await this.page.waitForLoadState('networkidle')
  }

  async waitForDataLoad() {
    // Wait for ETF universe to load
    await this.page.waitForSelector('[data-testid="etf-universe"]', { timeout: 10000 })

    // Wait for real-time data indicators
    await expect(this.page.locator('[data-testid="data-status"]')).toBeVisible()
  }

  // Portfolio Strategy Configuration
  async selectStrategy(strategy: string) {
    const strategySelector = this.page.locator('[data-testid="strategy-selector"]')
    await strategySelector.click()
    await this.page.getByRole('option', { name: strategy, exact: true }).click()

    // Verify strategy selection
    const selectedStrategy = await strategySelector.inputValue()
    expect(selectedStrategy).toBe(strategy)
  }

  async selectETFs(tickers: string[]) {
    for (const ticker of tickers) {
      const etfCheckbox = this.page.locator(`[data-testid="etf-${ticker}"]`)
      await etfCheckbox.check()
      await expect(etfCheckbox).toBeChecked()
    }
  }

  async setCurrentHoldings(holdings: Record<string, { shares: number; avgCost: number }>) {
    for (const [ticker, holding] of Object.entries(holdings)) {
      // Enable current holdings toggle
      await this.page.locator('[data-testid="enable-current-holdings"]').click()

      // Set shares
      const sharesInput = this.page.locator(`[data-testid="holding-${ticker}-shares"]`)
      await sharesInput.fill(holding.shares.toString())

      // Set average cost
      const avgCostInput = this.page.locator(`[data-testid="holding-${ticker}-cost"]`)
      await avgCostInput.fill(holding.avgCost.toString())
    }
  }

  async setAdditionalCapital(amount: number) {
    const capitalInput = this.page.locator('[data-testid="additional-capital"]')
    await capitalInput.fill(amount.toString())
  }

  async setCustomAllocations(allocations: Record<string, number>) {
    for (const [ticker, allocation] of Object.entries(allocations)) {
      const allocationInput = this.page.locator(`[data-testid="allocation-${ticker}"]`)
      await allocationInput.fill((allocation * 100).toString()) // Convert to percentage
    }
  }

  // Portfolio Analysis and Execution
  async analyzePortfolio() {
    const analyzeButton = this.page.locator('[data-testid="analyze-portfolio"]')
    await analyzeButton.click()

    // Wait for analysis to complete
    await this.page.waitForSelector('[data-testid="analysis-results"]', { timeout: 15000 })
    await expect(this.page.locator('[data-testid="analysis-loading"]')).not.toBeVisible()
  }

  async verifyPortfolioAnalysis(expectedStrategy: string) {
    // Verify strategy display
    await expect(this.page.locator(`[data-testid="strategy-${expectedStrategy}"]`)).toBeVisible()

    // Verify portfolio metrics
    await expect(this.page.locator('[data-testid="total-investment"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="utilization-rate"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="target-allocations"]')).toBeVisible()
  }

  async createExecutionPlan() {
    const executeButton = this.page.locator('[data-testid="create-execution-plan"]')
    await executeButton.click()

    // Wait for execution plan generation
    await this.page.waitForSelector('[data-testid="execution-plan"]', { timeout: 20000 })
    await expect(this.page.locator('[data-testid="execution-loading"]')).not.toBeVisible()
  }

  async verifyExecutionPlan() {
    // Verify execution plan interface
    await expect(this.page.locator('[data-testid="portfolio-execution"]')).toBeVisible()

    // Verify ETF cards are displayed (mobile) or table rows (desktop)
    const etfCards = this.page.locator('[data-testid="etf-card"]')
    const etfTableRows = this.page.locator('[data-testid="etf-table-row"]')

    await expect(etfCards.or(etfTableRows)).toHaveCount.greaterThan(0)

    // Verify trade actions are displayed
    await expect(this.page.locator('[data-testid="trade-actions"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="trade-summary"]')).toBeVisible()
  }

  // Portfolio CRUD Operations
  async savePortfolio(name: string) {
    const saveButton = this.page.locator('[data-testid="save-portfolio"]')
    await saveButton.click()

    // Fill portfolio name
    const nameInput = this.page.locator('[data-testid="portfolio-name"]')
    await nameInput.fill(name)

    // Confirm save
    const confirmButton = this.page.locator('[data-testid="confirm-save"]')
    await confirmButton.click()

    // Verify success message
    await expect(this.page.locator('[data-testid="save-success"]')).toBeVisible()
  }

  async loadPortfolio(name: string) {
    // Navigate to portfolio management
    await this.page.locator('[data-testid="portfolio-management"]').click()

    // Search and load portfolio
    const portfolioItem = this.page.locator(`[data-testid="portfolio-${name}"]`)
    await portfolioItem.click()

    // Verify portfolio loaded
    await expect(this.page.locator('[data-testid="portfolio-loaded"]')).toBeVisible()
  }

  async deletePortfolio(name: string) {
    // Navigate to portfolio management
    await this.page.locator('[data-testid="portfolio-management"]').click()

    // Find and delete portfolio
    const portfolioItem = this.page.locator(`[data-testid="portfolio-${name}"]`)
    await portfolioItem.hover()
    await this.page.locator(`[data-testid="delete-${name}"]`).click()

    // Confirm deletion
    const confirmButton = this.page.locator('[data-testid="confirm-delete"]')
    await confirmButton.click()

    // Verify deletion success
    await expect(this.page.locator('[data-testid="delete-success"]')).toBeVisible()
  }

  // Data Verification Helpers
  async verifyETFPrices(tickers: string[]) {
    for (const ticker of tickers) {
      const priceElement = this.page.locator(`[data-testid="price-${ticker}"]`)
      await expect(priceElement).toBeVisible()

      const priceText = await priceElement.textContent()
      const price = parseFloat(priceText?.replace(/[$,]/g, '') || '0')
      expect(price).toBeGreaterThan(0)
    }
  }

  async verifyMomentumScores(tickers: string[]) {
    for (const ticker of tickers) {
      const momentumElement = this.page.locator(`[data-testid="momentum-${ticker}"]`)
      await expect(momentumElement).toBeVisible()

      const scoreText = await momentumElement.textContent()
      const score = parseFloat(scoreText?.replace(/[%]/g, '') || '0')
      expect(score).toBeGreaterThanOrEqual(0)
    }
  }

  async verifyTradeActions(expectedActions: Array<{ ticker: string; action: string; shares: number }>) {
    for (const expectedAction of expectedActions) {
      const actionElement = this.page.locator(`[data-testid="action-${expectedAction.ticker}"]`)
      await expect(actionElement).toContainText(expectedAction.action)

      const sharesElement = this.page.locator(`[data-testid="shares-${expectedAction.ticker}"]`)
      const sharesText = await sharesElement.textContent()
      const shares = parseFloat(sharesText?.replace(/[,]/g, '') || '0')
      expect(Math.abs(shares - expectedAction.shares)).toBeLessThan(1) // Allow small rounding differences
    }
  }

  // Responsive Design Testing
  async testMobileView() {
    await this.page.setViewportSize({ width: 375, height: 812 })
    await this.page.reload()

    // Verify mobile card layout
    await expect(this.page.locator('[data-testid="etf-card"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="etf-table-row"]')).not.toBeVisible()

    // Verify no horizontal scrolling
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = this.page.viewportSize()?.width || 0
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  }

  async testTabletView() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
    await this.page.reload()

    // Verify responsive layout
    await expect(this.page.locator('[data-testid="portfolio-execution"]')).toBeVisible()
  }

  async testDesktopView() {
    await this.page.setViewportSize({ width: 1200, height: 800 })
    await this.page.reload()

    // Verify desktop table layout
    await expect(this.page.locator('[data-testid="etf-table-row"]')).toBeVisible()
  }
}

// Main Test Suite
test.describe('Portfolio Management E2E Tests', () => {
  let portfolioPage: PortfolioPage

  test.beforeEach(async ({ page }) => {
    portfolioPage = new PortfolioPage(page)

    // Mock API responses for consistent testing
    await page.route('/api/etfs/universe', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          etfs: [
            { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'US Stocks', isCustom: false, currentPrice: 320.15 },
            { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF', category: 'International Stocks', isCustom: false, currentPrice: 58.92 },
            { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'Bonds', isCustom: false, currentPrice: 74.34 },
            { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'Technology', isCustom: false, currentPrice: 342.50 },
            { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'Bonds', isCustom: false, currentPrice: 98.75 },
            { ticker: 'GLDM', name: 'SPDR Gold Shares', category: 'Commodities', isCustom: false, currentPrice: 80.69 }
          ]
        })
      })
    })

    await page.route('/api/portfolio/analyze', route => {
      const request = route.request().postDataJSON()
      let response

      if (request.strategyType === 'momentum') {
        response = {
          success: true,
          strategy: 'momentum',
          selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ'],
          targetAllocations: { 'VTI': 0.4, 'VXUS': 0.3, 'BND': 0.2, 'QQQ': 0.1 },
          totalInvestment: 95000,
          utilizedCapital: 92500,
          uninvestedCash: 2500,
          utilizationRate: 97.4,
          momentumScores: [
            { ticker: 'VTI', score: 8.2, absoluteMomentum: true, currentPrice: 320.15 },
            { ticker: 'VXUS', score: 6.5, absoluteMomentum: true, currentPrice: 58.92 },
            { ticker: 'BND', score: 2.1, absoluteMomentum: false, currentPrice: 74.34 },
            { ticker: 'QQQ', score: 12.8, absoluteMomentum: true, currentPrice: 342.50 }
          ]
        }
      } else if (request.strategyType === 'allweather') {
        response = {
          success: true,
          strategy: 'allweather',
          targetAllocations: { 'VTI': 0.55, 'VXUS': 0.35, 'BND': 0.075, 'TLT': 0.025, 'GLDM': 0.0 },
          totalInvestment: 100000,
          utilizedCapital: 97500,
          uninvestedCash: 2500,
          utilizationRate: 97.5,
          smaSignals: { 'VTI': true, 'VXUS': true, 'BND': true, 'TLT': false, 'GLDM': true }
        }
      } else {
        response = {
          success: true,
          strategy: 'custom',
          targetAllocations: request.customAllocations,
          totalInvestment: 75000,
          utilizedCapital: 73500,
          uninvestedCash: 1500,
          utilizationRate: 98.0
        }
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })

    await page.route('/api/portfolio/execution-plan', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          executionPlanId: 'exec-plan-test-123',
          executionPlan: [
            { etf: 'VTI', action: 'sell', shares: 25, value: 8004, price: 320.15, reason: 'Portfolio Rebalance' },
            { etf: 'VXUS', action: 'buy', shares: 425, value: 25037, price: 58.92, reason: 'Portfolio Rebalance' },
            { etf: 'BND', action: 'buy', shares: 185, value: 13753, price: 74.34, reason: 'New Position' },
            { etf: 'QQQ', action: 'hold', shares: 0, value: 0, price: 342.50, reason: 'No Action Required' }
          ],
          analysisResults: {
            totalInvestment: 95000,
            utilizedCapital: 92500,
            uninvestedCash: 2500,
            utilizationRate: 97.4
          },
          portfolioComparison: [
            { etf: 'VTI', currentValue: 32015, targetValue: 37000, action: 'sell', currentShares: 100, targetAllocation: 0.4, sharesToTrade: -25 },
            { etf: 'VXUS', currentValue: 2946, targetValue: 27750, action: 'buy', currentShares: 50, targetAllocation: 0.3, sharesToTrade: 425 },
            { etf: 'BND', currentValue: 0, targetValue: 18500, action: 'buy', currentShares: 0, targetAllocation: 0.2, sharesToTrade: 185 },
            { etf: 'QQQ', currentValue: 0, targetValue: 9250, action: 'hold', currentShares: 0, targetAllocation: 0.1, sharesToTrade: 0 }
          ]
        })
      })
    })
  })

  test.describe('Momentum Strategy Workflow', () => {
    test('should complete full momentum portfolio workflow', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      // Configure momentum strategy
      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(TEST_PORTFOLIO.selectedETFs)
      await portfolioPage.setCurrentHoldings(TEST_PORTFOLIO.currentHoldings)
      await portfolioPage.setAdditionalCapital(TEST_PORTFOLIO.additionalCapital)

      // Analyze portfolio
      await portfolioPage.analyzePortfolio()
      await portfolioPage.verifyPortfolioAnalysis('momentum')
      await portfolioPage.verifyMomentumScores(TEST_PORTFOLIO.selectedETFs)

      // Create execution plan
      await portfolioPage.createExecutionPlan()
      await portfolioPage.verifyExecutionPlan()

      // Verify specific trade actions
      await portfolioPage.verifyTradeActions([
        { ticker: 'VTI', action: 'SELL', shares: 25 },
        { ticker: 'VXUS', action: 'BUY', shares: 425 },
        { ticker: 'BND', action: 'BUY', shares: 185 },
        { ticker: 'QQQ', action: 'HOLD', shares: 0 }
      ])

      // Save portfolio
      await portfolioPage.savePortfolio(TEST_PORTFOLIO.name)
    })

    test('should handle momentum strategy with no current holdings', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND'])
      await portfolioPage.setAdditionalCapital(25000)

      await portfolioPage.analyzePortfolio()
      await portfolioPage.verifyPortfolioAnalysis('momentum')
      await portfolioPage.createExecutionPlan()
      await portfolioPage.verifyExecutionPlan()
    })
  })

  test.describe('All Weather Strategy Workflow', () => {
    test('should complete all-weather portfolio workflow', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      // Configure all-weather strategy
      await portfolioPage.selectStrategy('allweather')
      await portfolioPage.selectETFs(ALL_WEATHER_PORTFOLIO.selectedETFs)
      await portfolioPage.setAdditionalCapital(ALL_WEATHER_PORTFOLIO.additionalCapital)

      // Analyze portfolio
      await portfolioPage.analyzePortfolio()
      await portfolioPage.verifyPortfolioAnalysis('allweather')

      // Create execution plan
      await portfolioPage.createExecutionPlan()
      await portfolioPage.verifyExecutionPlan()
    })
  })

  test.describe('Custom Strategy Workflow', () => {
    test('should complete custom portfolio workflow', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      // Configure custom strategy
      await portfolioPage.selectStrategy('custom')
      await portfolioPage.selectETFs(CUSTOM_PORTFOLIO.selectedETFs)
      await portfolioPage.setCustomAllocations(CUSTOM_PORTFOLIO.customAllocations!)
      await portfolioPage.setAdditionalCapital(CUSTOM_PORTFOLIO.additionalCapital)

      // Analyze portfolio
      await portfolioPage.analyzePortfolio()
      await portfolioPage.verifyPortfolioAnalysis('custom')

      // Create execution plan
      await portfolioPage.createExecutionPlan()
      await portfolioPage.verifyExecutionPlan()
    })
  })

  test.describe('Portfolio CRUD Operations', () => {
    test('should save and load portfolio successfully', async () => {
      const portfolioName = 'Test Save Load Portfolio'

      // Create and save portfolio
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(['VTI', 'VXUS'])
      await portfolioPage.setAdditionalCapital(10000)
      await portfolioPage.analyzePortfolio()
      await portfolioPage.savePortfolio(portfolioName)

      // Load portfolio
      await portfolioPage.loadPortfolio(portfolioName)
      await portfolioPage.verifyPortfolioAnalysis('momentum')

      // Clean up
      await portfolioPage.deletePortfolio(portfolioName)
    })
  })

  test.describe('Responsive Design Tests', () => {
    test('should work correctly on mobile devices', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND'])
      await portfolioPage.setAdditionalCapital(25000)
      await portfolioPage.analyzePortfolio()
      await portfolioPage.createExecutionPlan()

      await portfolioPage.testMobileView()
      await portfolioPage.verifyExecutionPlan()
    })

    test('should work correctly on tablet devices', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.selectStrategy('allweather')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND', 'TLT'])
      await portfolioPage.setAdditionalCapital(50000)
      await portfolioPage.analyzePortfolio()
      await portfolioPage.createExecutionPlan()

      await portfolioPage.testTabletView()
      await portfolioPage.verifyExecutionPlan()
    })

    test('should work correctly on desktop devices', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.selectStrategy('custom')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND'])
      await portfolioPage.setCustomAllocations({ 'VTI': 0.5, 'VXUS': 0.3, 'BND': 0.2 })
      await portfolioPage.setAdditionalCapital(75000)
      await portfolioPage.analyzePortfolio()
      await portfolioPage.createExecutionPlan()

      await portfolioPage.testDesktopView()
      await portfolioPage.verifyExecutionPlan()
    })
  })

  test.describe('Data Consistency Tests', () => {
    test('should maintain data consistency across workflow', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      // Verify ETF prices are loaded correctly
      await portfolioPage.verifyETFPrices(['VTI', 'VXUS', 'BND'])

      // Configure portfolio
      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND'])
      await portfolioPage.setAdditionalCapital(50000)

      // Analyze and verify consistency
      await portfolioPage.analyzePortfolio()
      await portfolioPage.verifyPortfolioAnalysis('momentum')

      // Create execution plan and verify trade calculations
      await portfolioPage.createExecutionPlan()
      await portfolioPage.verifyExecutionPlan()

      // Verify that calculated trade values are mathematically sound
      const utilizationRate = await portfolioPage.page.locator('[data-testid="utilization-rate"]').textContent()
      const rate = parseFloat(utilizationRate?.replace(/[%]/g, '') || '0')
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })
  })

  test.describe('Performance Tests', () => {
    test('should complete portfolio analysis within acceptable time', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      const startTime = Date.now()

      await portfolioPage.selectStrategy('momentum')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND', 'QQQ'])
      await portfolioPage.setAdditionalCapital(50000)
      await portfolioPage.analyzePortfolio()

      const analysisTime = Date.now() - startTime
      expect(analysisTime).toBeLessThan(10000) // Should complete within 10 seconds

      await portfolioPage.verifyPortfolioAnalysis('momentum')
    })

    test('should handle large portfolio efficiently', async () => {
      await portfolioPage.navigateToStrategyHub()
      await portfolioPage.waitForDataLoad()

      const startTime = Date.now()

      // Test with maximum number of ETFs
      await portfolioPage.selectStrategy('custom')
      await portfolioPage.selectETFs(['VTI', 'VXUS', 'BND', 'QQQ', 'TLT', 'GLDM'])
      await portfolioPage.setAdditionalCapital(100000)
      await portfolioPage.analyzePortfolio()
      await portfolioPage.createExecutionPlan()

      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(15000) // Should complete within 15 seconds

      await portfolioPage.verifyExecutionPlan()
    })
  })
})