/**
 * Portfolio analysis and optimization service
 */

export interface StrategyConfiguration {
  type: 'momentum' | 'allweather' | 'custom'
  parameters: {
    momentum?: {
      topN: number
      includeIBIT: boolean
      fallbackETF: string
    }
    allweather?: {
      smaPeriod: number
      bondFallbackPercent: number
    }
    custom?: {
      allocations: Record<string, number>
    }
  }
}

export interface PortfolioHolding {
  etf: string
  shares: number
}

export interface AnalysisRequest {
  strategy: StrategyConfiguration
  selectedETFs: string[]
  additionalCapital: number
  currentHoldings: PortfolioHolding[]
}

export interface OptimizationRequest extends AnalysisRequest {
  constraints?: {
    minimumTradeSize?: number
    maximumPositions?: number
    allowPartialShares?: boolean
  }
}

export interface StrategyAnalysis {
  totalInvestment: number
  currentPortfolioValue: number
  targetAllocations: Record<string, number>
  targetValues: Record<string, number>
  currentValues: Record<string, number>
  strategy: string
  selectedETFs: string[]
  analysisTimestamp: string
}

export interface PortfolioOptimization {
  optimizedAllocations: Record<string, number>
  targetValues: Record<string, number>
  utilizedCapital: number
  uninvestedCash: number
  utilizationRate: number
  objectiveValue: number
  isOptimal: boolean
  solverStatus?: string
  fallbackUsed?: boolean
  allocations?: Array<{
    etf: string
    etfName?: string
    targetPercentage: number
    targetValue: number
    finalValue: number
    finalShares: number
    shares: number
    sharesToBuy?: number
    pricePerShare: number
    costOfPurchase?: number
    deviation: number
    holdingsToSell?: Array<{
      shares: number
      value: number
    }>
  }>
}

export interface Trade {
  etf: string
  action: 'buy' | 'sell'
  shares: number
  value: number
  price: number
  reason: string
}

export interface ExecutionPlan {
  trades: Trade[]
  totalTradeValue: number
  tradeCount: number
  utilizationRate: number
  expectedReturn: number
  estimatedTime: number
  optimization: PortfolioOptimization
}

export interface PortfolioStatus {
  holdings: PortfolioHolding[]
  totalValue: number
  count: number
  lastUpdated: string
}

export interface ExecutionResult {
  trades: Array<{
    etf: string
    action: 'buy' | 'sell'
    shares: number
    executedPrice: number
    executedValue: number
    status: string
    timestamp: string
    error?: string
  }>
  totalValue: number
  successCount: number
  failureCount: number
  dryRun: boolean
}

export interface StrategyPerformance {
  strategyType: string
  period: string
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  dataPoints: number
}

class PortfolioService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  }

  /**
   * Analyze strategy and generate target allocation
   */
  async analyzeStrategy(request: AnalysisRequest): Promise<StrategyAnalysis> {
    console.log('=== Portfolio Service analyzeStrategy Debug ===')
    console.log('Request payload:', JSON.stringify(request, null, 2))
    console.log('Additional capital type:', typeof request.additionalCapital)
    console.log('Additional capital value:', request.additionalCapital)

    const response = await fetch(`${this.baseUrl}/portfolio/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('API Error Response:', error)
      throw new Error(error.error || 'Strategy analysis failed')
    }

    const result = await response.json()
    console.log('API Success Response - Analysis keys:', Object.keys(result))
    console.log('API Success Response - Analysis totalInvestment:', result.analysis?.totalInvestment)
    console.log('API Success Response - Analysis additionalCapital usage:', result.analysis?.totalInvestment - (result.analysis?.currentPortfolioValue || 0))

    return result.analysis
  }

  /**
   * Optimize portfolio allocation using existing linear programming service
   */
  async optimizePortfolio(request: OptimizationRequest): Promise<PortfolioOptimization> {
    console.log('=== Portfolio Service optimizePortfolio Debug ===')
    console.log('Request payload:', JSON.stringify(request, null, 2))

    const response = await fetch(`${this.baseUrl}/portfolio/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Optimization API Error Response:', error)
      throw new Error(error.error || 'Portfolio optimization failed')
    }

    const result = await response.json()
    console.log('Optimization API Success Response - Optimization keys:', Object.keys(result.optimization || {}))
    console.log('Optimization API Success Response - isOptimal:', result.optimization?.isOptimal)
    console.log('Optimization API Success Response - utilizedCapital:', result.optimization?.utilizedCapital)

    return result.optimization
  }

  /**
   * Generate execution plan with specific trades
   */
  async generateExecutionPlan(request: OptimizationRequest): Promise<ExecutionPlan> {
    const response = await fetch(`${this.baseUrl}/portfolio/execution-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Execution plan generation failed')
    }

    const result = await response.json()
    return result.executionPlan
  }

  /**
   * Direct optimization using existing optimization endpoint
   */
  async optimizeDirect(request: {
    currentHoldings: PortfolioHolding[]
    targetETFs: Array<{
      name: string
      targetPercentage: number
      pricePerShare: number
      allowedDeviation?: number
    }>
    extraCash: number
    optimizationStrategy?: string
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/optimization/rebalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Direct optimization failed')
    }

    return response.json()
  }

  /**
   * Get current portfolio status
   */
  async getPortfolioStatus(): Promise<PortfolioStatus> {
    const response = await fetch(`${this.baseUrl}/portfolio/status`)

    if (!response.ok) {
      throw new Error('Failed to retrieve portfolio status')
    }

    const result = await response.json()
    return result.status
  }

  /**
   * Execute trades (simulation only)
   */
  async executeTrades(trades: Trade[], dryRun: boolean = true): Promise<ExecutionResult> {
    const response = await fetch(`${this.baseUrl}/portfolio/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trades,
        dryRun
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Trade execution failed')
    }

    const result = await response.json()
    return result.execution
  }

  /**
   * Get strategy performance history
   */
  async getStrategyPerformance(strategyType: string, period: string = '1M'): Promise<StrategyPerformance> {
    const response = await fetch(`${this.baseUrl}/portfolio/performance/${strategyType}?period=${period}`)

    if (!response.ok) {
      throw new Error('Failed to retrieve performance data')
    }

    const result = await response.json()
    return result.performance
  }

  /**
   * Quick analyze method that combines analysis and execution planning
   */
  async quickAnalyze(request: AnalysisRequest): Promise<{
    analysis: StrategyAnalysis
    executionPlan: ExecutionPlan
  }> {
    try {
      const [analysis, executionPlan] = await Promise.all([
        this.analyzeStrategy(request),
        this.generateExecutionPlan(request)
      ])

      return { analysis, executionPlan }
    } catch (error) {
      console.error('Quick analysis failed:', error)
      throw error
    }
  }

  /**
   * Validate strategy configuration
   */
  validateStrategy(strategy: StrategyConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!strategy.type || !['momentum', 'allweather', 'custom'].includes(strategy.type)) {
      errors.push('Invalid strategy type')
    }

    if (strategy.type === 'momentum') {
      const params = strategy.parameters.momentum
      if (!params) {
        errors.push('Momentum parameters are required')
      } else {
        if (params.topN < 1 || params.topN > 10) {
          errors.push('Top N must be between 1 and 10')
        }
        if (!params.fallbackETF) {
          errors.push('Fallback ETF is required')
        }
      }
    }

    if (strategy.type === 'allweather') {
      const params = strategy.parameters.allweather
      if (!params) {
        errors.push('All-weather parameters are required')
      } else {
        if (params.smaPeriod < 50 || params.smaPeriod > 300) {
          errors.push('SMA period must be between 50 and 300')
        }
        if (params.bondFallbackPercent < 0 || params.bondFallbackPercent > 100) {
          errors.push('Bond fallback percent must be between 0 and 100')
        }
      }
    }

    if (strategy.type === 'custom') {
      const params = strategy.parameters.custom
      if (!params || !params.allocations) {
        errors.push('Custom allocations are required')
      } else {
        const total = Object.values(params.allocations).reduce((sum, val) => sum + val, 0)
        if (Math.abs(total - 100) > 0.1) {
          errors.push(`Custom allocations must sum to 100% (current: ${total.toFixed(1)}%)`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate expected portfolio metrics
   */
  calculatePortfolioMetrics(analysis: StrategyAnalysis): {
    expectedReturn: number
    expectedVolatility: number
    sharpeRatio: number
    diversificationScore: number
  } {
    // Mock calculations - in real implementation, this would use historical data
    const baseReturns = {
      momentum: 0.12,
      allweather: 0.08,
      custom: 0.10
    }

    const baseVolatilities = {
      momentum: 0.15,
      allweather: 0.08,
      custom: 0.12
    }

    const expectedReturn = (baseReturns[analysis.strategy as keyof typeof baseReturns] || 0.10) * 100
    const expectedVolatility = (baseVolatilities[analysis.strategy as keyof typeof baseVolatilities] || 0.12) * 100
    const sharpeRatio = expectedReturn / expectedVolatility

    // Diversification score based on number of ETFs and allocation distribution
    const etfCount = Object.keys(analysis.targetAllocations).length
    const allocationEntropy = this.calculateAllocationEntropy(analysis.targetAllocations)
    const diversificationScore = Math.min(100, (etfCount * 10 + allocationEntropy * 50))

    return {
      expectedReturn,
      expectedVolatility,
      sharpeRatio,
      diversificationScore
    }
  }

  /**
   * Calculate allocation entropy for diversification scoring
   */
  private calculateAllocationEntropy(allocations: Record<string, number>): number {
    const total = Object.values(allocations).reduce((sum, val) => sum + val, 0)
    let entropy = 0

    Object.values(allocations).forEach(allocation => {
      if (allocation > 0) {
        const probability = allocation / total
        entropy -= probability * Math.log2(probability)
      }
    })

    // Normalize to 0-1 range
    const maxEntropy = Math.log2(Object.keys(allocations).length)
    return maxEntropy > 0 ? entropy / maxEntropy : 0
  }
}

export const portfolioService = new PortfolioService()