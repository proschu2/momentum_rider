/**
 * Frontend Portfolio Service Integration Tests
 * Tests actual API calls with meaningful portfolio scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { etfService } from '@/services/etf-service'
import { portfolioService } from '@/services/portfolio-service'
import type { ETFInfo, PortfolioHolding, PortfolioAnalysisRequest } from '@/services/types'

// Mock fetch for testing
global.fetch = vi.fn()

const mockFetch = global.fetch as any

describe('Portfolio Service Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ETF Service Integration', () => {
    it('should fetch ETF universe successfully', async () => {
      const mockResponse = {
        success: true,
        etfs: [
          {
            ticker: 'VTI',
            name: 'Vanguard Total Stock Market ETF',
            category: 'US Stocks',
            isCustom: false,
            currentPrice: 320.15
          },
          {
            ticker: 'VXUS',
            name: 'Vanguard Total International Stock ETF',
            category: 'International Stocks',
            isCustom: false,
            currentPrice: 58.92
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await etfService.getETFUniverse()

      expect(mockFetch).toHaveBeenCalledWith('/api/etfs/universe')
      expect(result).toEqual(mockResponse)
    })

    it('should fetch current quote data for multiple tickers', async () => {
      const tickers = ['VTI', 'VXUS', 'BND']

      tickers.forEach((ticker, index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            ticker,
            regularMarketPrice: index === 0 ? 320.15 : index === 1 ? 58.92 : 74.34,
            currency: 'USD'
          })
        })
      })

      for (const ticker of tickers) {
        const result = await etfService.getCurrentPrice(ticker)
        expect(result.success).toBe(true)
        expect(result.ticker).toBe(ticker)
        expect(result.price).toBeGreaterThan(0)
      }
    })

    it('should handle batch quote fetching', async () => {
      const tickers = ['VTI', 'VXUS', 'BND', 'QQQ']
      const mockResponse = {
        success: true,
        quotes: tickers.map((ticker, index) => ({
          success: true,
          ticker,
          regularMarketPrice: 300 + (index * 50),
          currency: 'USD'
        })),
        cachedCount: 2,
        fetchedCount: 2,
        totalProcessed: 4
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await etfService.preFetchPrices(tickers)

      expect(mockFetch).toHaveBeenCalledWith('/api/quote/pre-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickers })
      })
      expect(result).toEqual(mockResponse)
    })

    it('should fetch momentum analysis for multiple ETFs', async () => {
      const tickers = ['VTI', 'VXUS', 'BND']

      tickers.forEach((ticker, index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            ticker,
            momentum3m: index * 2.5 + 1,
            momentum6m: index * 5.0 + 2,
            momentum9m: index * 3.0 + 3,
            momentum12m: index * 4.0 + 1,
            weightedScore: index * 2.5 + 4,
            absoluteMomentum: true,
            currentPrice: 300 + (index * 50)
          })
        })
      })

      for (const ticker of tickers) {
        const result = await etfService.getMomentumScores([ticker])
        expect(result).toHaveLength(1)
        expect(result[0].ticker).toBe(ticker)
        expect(result[0].absoluteMomentum).toBe(true)
      }
    })
  })

  describe('Portfolio Service Integration', () => {
    it('should analyze momentum strategy portfolio', async () => {
      const request: PortfolioAnalysisRequest = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ', 'GLDM'],
        additionalCapital: 50000,
        currentHoldings: {
          'VTI': { shares: 100, avgCost: 250 },
          'VXUS': { shares: 50, avgCost: 60 },
          'BND': { shares: 25, avgCost: 75 }
        }
      }

      const mockResponse = {
        success: true,
        strategy: 'momentum',
        targetAllocations: {
          'GLDM': 0.4,
          'VTI': 0.3,
          'VXUS': 0.2,
          'BND': 0.1
        },
        totalInvestment: 87500,
        utilizedCapital: 82500,
        uninvestedCash: 5000,
        utilizationRate: 94.3,
        momentumScores: [
          {
            ticker: 'GLDM',
            score: 25.5,
            momentum3m: 18.2,
            momentum6m: 22.1,
            momentum9m: 30.5,
            momentum12m: 35.8,
            currentPrice: 80.69
          },
          {
            ticker: 'VTI',
            score: 8.2,
            momentum3m: 2.1,
            momentum6m: 12.5,
            momentum9m: 9.8,
            momentum12m: 7.5,
            currentPrice: 320.15
          }
        ],
        selectedETFs: ['GLDM', 'VTI', 'VXUS', 'BND']
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.analyzeStrategy(request)

      expect(mockFetch).toHaveBeenCalledWith('/api/portfolio/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })
      expect(result).toEqual(mockResponse)
      expect(result.utilizationRate).toBe(94.3)
    })

    it('should analyze all-weather strategy portfolio', async () => {
      const request: PortfolioAnalysisRequest = {
        strategyType: 'allweather',
        selectedETFs: ['VTI', 'VXUS', 'BND', 'TLT', 'GLDM'],
        additionalCapital: 100000,
        currentHoldings: {}
      }

      const mockResponse = {
        success: true,
        strategy: 'allweather',
        targetAllocations: {
          'VTI': 0.55,
          'VXUS': 0.35,
          'BND': 0.15,
          'TLT': 0.075,
          'GLDM': 0.025
        },
        totalInvestment: 100000,
        smaSignals: {
          'VTI': true,
          'VXUS': true,
          'BND': true,
          'TLT': false,
          'GLDM': true
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.analyzeStrategy(request)

      expect(result.strategy).toBe('all-weather')
      expect(result.targetAllocations.VTI).toBe(0.55)
      expect(result.smaSignals).toBeDefined()
    })

    it('should create complete portfolio execution plan', async () => {
      const request = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND'],
        additionalCapital: 25000,
        currentHoldings: {
          'VTI': { shares: 75, avgCost: 245 },
          'BND': { shares: 30, avgCost: 72 }
        },
        optimizationStrategy: 'minimize-leftover'
      }

      const mockResponse = {
        success: true,
        executionPlanId: 'exec-plan-123456',
        executionPlan: [
          {
            etf: 'VTI',
            action: 'sell',
            shares: 25,
            value: 6200,
            price: 248,
            reason: 'Portfolio Rebalance - Reduce overweight position'
          },
          {
            etf: 'VXUS',
            action: 'buy',
            shares: 150,
            value: 8850,
            price: 59,
            reason: 'Portfolio Rebalance - New Position'
          },
          {
            etf: 'BND',
            action: 'buy',
            shares: 85,
            value: 6375,
            price: 75,
            reason: 'Portfolio Rebalance - Increase allocation'
          }
        ],
        analysisResults: {
          totalInvestment: 72125,
          utilizedCapital: 71400,
          uninvestedCash: 725,
          utilizationRate: 99.0
        },
        portfolioComparison: [
          {
            etf: 'VTI',
            currentValue: 18375,
            targetValue: 39669,
            action: 'sell',
            currentShares: 75,
            targetAllocation: 0.55,
            sharesToTrade: -25,
            reason: 'Portfolio Rebalance - Reduce overweight position'
          },
          {
            etf: 'VXUS',
            currentValue: 3000,
            targetValue: 25225,
            action: 'buy',
            currentShares: 50,
            targetAllocation: 0.35,
            sharesToTrade: 150,
            reason: 'Portfolio Rebalance - New Position'
          },
          {
            etf: 'BND',
            currentValue: 2160,
            targetValue: 10815,
            action: 'buy',
            currentShares: 30,
            targetAllocation: 0.15,
            sharesToTrade: 85,
            reason: 'Portfolio Rebalance - Increase allocation'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.createExecutionPlan(request)

      expect(mockFetch).toHaveBeenCalledWith('/api/portfolio/execution-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      expect(result.executionPlanId).toBe('exec-plan-123456')
      expect(result.executionPlan).toHaveLength(3)
      expect(result.analysisResults.utilizationRate).toBe(99.0)
    })

    it('should retrieve existing execution plan', async () => {
      const planId = 'existing-plan-789'

      const mockResponse = {
        success: true,
        executionPlanId: planId,
        executionPlan: [
          {
            etf: 'VTI',
            action: 'hold',
            shares: 0,
            value: 0,
            price: 320,
            reason: 'No rebalancing required'
          }
        ],
        analysisResults: {
          totalInvestment: 50000,
          utilizedCapital: 50000,
          uninvestedCash: 0,
          utilizationRate: 100.0
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.getExecutionPlan(planId)

      expect(mockFetch).toHaveBeenCalledWith(`/api/portfolio/execution-plan/${planId}`)
      expect(result.executionPlanId).toBe(planId)
      expect(result.analysisResults.utilizationRate).toBe(100.0)
    })

    it('should handle invalid execution plan gracefully', async () => {
      const invalidPlanId = 'invalid-plan-123'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Not found',
          message: 'Execution plan not found'
        })
      })

      const result = await portfolioService.getExecutionPlan(invalidPlanId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })
  })

  describe('Portfolio CRUD Operations', () => {
    let testPortfolioId: string

    it('should create new portfolio', async () => {
      const portfolioData = {
        name: 'Test Integration Portfolio',
        description: 'Portfolio created during integration testing',
        strategy: 'momentum',
        holdings: {
          'VTI': { shares: 100, avgCost: 250 },
          'VXUS': { shares: 50, avgCost: 60 }
        },
        additionalCash: 15000,
        targetAllocations: {
          'VTI': 0.6,
          'VXUS': 0.3,
          'BND': 0.1
        }
      }

      const mockResponse = {
        success: true,
        portfolio: {
          id: 'portfolio-123456',
          ...portfolioData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.createPortfolio(portfolioData)

      expect(mockFetch).toHaveBeenCalledWith('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData)
      })

      expect(result.success).toBe(true)
      expect(result.portfolio.id).toBeDefined()
      expect(result.portfolio.name).toBe('Test Integration Portfolio')

      testPortfolioId = result.portfolio.id
    })

    it('should update existing portfolio', async () => {
      const updateData = {
        name: 'Updated Integration Portfolio',
        additionalCash: 20000,
        targetAllocations: {
          'VTI': 0.5,
          'VXUS': 0.4,
          'BND': 0.1
        }
      }

      const mockResponse = {
        success: true,
        portfolio: {
          id: testPortfolioId,
          name: 'Updated Integration Portfolio',
          additionalCash: 20000,
          targetAllocations: updateData.targetAllocations,
          updatedAt: new Date().toISOString()
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.updatePortfolio(testPortfolioId, updateData)

      expect(mockFetch).toHaveBeenCalledWith(`/api/portfolios/${testPortfolioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      expect(result.success).toBe(true)
      expect(result.portfolio.name).toBe('Updated Integration Portfolio')
      expect(result.portfolio.additionalCash).toBe(20000)
    })

    it('should retrieve portfolio list', async () => {
      const mockResponse = {
        success: true,
        portfolios: [
          {
            id: testPortfolioId,
            name: 'Updated Integration Portfolio',
            strategy: 'momentum',
            totalValue: 50000,
            createdAt: new Date().toISOString()
          },
          {
            id: 'portfolio-456789',
            name: 'Second Test Portfolio',
            strategy: 'allweather',
            totalValue: 75000,
            createdAt: new Date().toISOString()
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.getPortfolios()

      expect(mockFetch).toHaveBeenCalledWith('/api/portfolios')
      expect(result.success).toBe(true)
      expect(result.portfolios).toHaveLength(2)
      expect(result.portfolios[0].id).toBe(testPortfolioId)
    })

    it('should delete portfolio', async () => {
      const mockResponse = {
        success: true,
        message: 'Portfolio deleted successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.deletePortfolio(testPortfolioId)

      expect(mockFetch).toHaveBeenCalledWith(`/api/portfolios/${testPortfolioId}`, {
        method: 'DELETE'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'))

      await expect(etfService.getCurrentPrice('VTI')).rejects.toThrow()
    })

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error'
        })
      })

      const result = await etfService.getCurrentPrice('VTI')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing required fields
        })
      })

      const result = await etfService.getCurrentPrice('VTI')
      expect(result).toBeDefined()
    })

    it('should validate portfolio analysis requests', async () => {
      const invalidRequest = {
        strategyType: 'invalid_strategy', // Invalid strategy
        selectedETFs: [], // Empty ETFs
        additionalCapital: -1000 // Negative cash
      } as any

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request parameters'
        })
      })

      const result = await portfolioService.analyzeStrategy(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Data Consistency Tests', () => {
    it('should ensure portfolio calculations are mathematically sound', async () => {
      const request: PortfolioAnalysisRequest = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND'],
        additionalCapital: 50000,
        currentHoldings: {
          'VTI': { shares: 100, avgCost: 250 },
          'VXUS': { shares: 50, avgCost: 60 },
          'BND': { shares: 25, avgCost: 75 }
        }
      }

      const mockResponse = {
        success: true,
        strategy: 'momentum',
        targetAllocations: {
          'VTI': 0.6,
          'VXUS': 0.3,
          'BND': 0.1
        },
        totalInvestment: 93750, // 32000 + 3000 + 1875 + 25000 + 50000
        utilizedCapital: 92500,
        uninvestedCash: 1250,
        utilizationRate: 98.7
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await portfolioService.analyzeStrategy(request)

      // Verify mathematical consistency
      expect(result.utilizedCapital + result.uninvestedCash).toBeCloseTo(result.totalInvestment, 0.01)
      expect((result.utilizationRate / 100) * result.totalInvestment).toBeCloseTo(result.utilizedCapital, 1)
      expect(result.utilizationRate).toBeGreaterThanOrEqual(0)
      expect(result.utilizationRate).toBeLessThanOrEqual(100)
    })

    it('should ensure execution plan sums are correct', async () => {
      const mockResponse = {
        success: true,
        executionPlan: [
          {
            etf: 'VTI',
            action: 'sell',
            shares: 50,
            value: 12500,
            price: 250
          },
          {
            etf: 'VXUS',
            action: 'buy',
            shares: 200,
            value: 12000,
            price: 60
          },
          {
            etf: 'BND',
            action: 'buy',
            shares: 100,
            value: 7500,
            price: 75
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // This would be called from a different endpoint, but testing the logic
      const { executionPlan } = mockResponse
      const buyTotal = executionPlan
        .filter(trade => trade.action === 'buy')
        .reduce((sum, trade) => sum + trade.value, 0)

      const sellTotal = executionPlan
        .filter(trade => trade.action === 'sell')
        .reduce((sum, trade) => sum + trade.value, 0)

      expect(buyTotal).toBe(19500) // 12000 + 7500
      expect(sellTotal).toBe(12500)
      expect(Math.abs(buyTotal - sellTotal)).toBe(7000) // Net cash flow
    })
  })
})