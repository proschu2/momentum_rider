/**
 * Portfolio analysis and optimization service
 */

import { httpClient } from './http-client'

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
  objectives?: {
    [key: string]: {
      weight: number
      deviation?: number
    }
  }
  strategyAnalysis?: StrategyAnalysis // Include strategy analysis results
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
  momentumScores?: Record<string, number>
  etfUniverse?: string[]
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
  success: boolean
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
  private apiClient = httpClient

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api'
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
   * Optimize portfolio allocation using enhanced optimization with budget utilization focus
   */
  async optimizePortfolio(request: OptimizationRequest): Promise<PortfolioOptimization> {
    console.log('=== Portfolio Service optimizePortfolio Debug (Enhanced) ===')
    console.log('Request payload:', JSON.stringify(request, null, 2))

    // Ensure we use the correct ETF universe based on strategy
    const correctedETFs = this.getStrategySpecificETFUniverse(request.strategyAnalysis, request.selectedETFs)
    console.log('Corrected ETF universe for optimization:', correctedETFs)

    // Transform request to NOT send prices - backend will handle all pricing
    const enhancedRequest = {
      currentHoldings: (request.currentHoldings || []).map(holding => ({
        name: holding.etf,
        shares: holding.shares
        // Remove price - backend will fetch it
      })),
      targetETFs: this.buildTargetETFsFromStrategyWithoutPrices(request.strategyAnalysis, correctedETFs),
      extraCash: request.additionalCapital || 0,
      // Use enhanced budget strategy by default with proper objectives
      objectives: {
        useAllBudget: true,
        maximizeUtilization: true,
        budgetWeight: 0.8,
        fairnessWeight: 0.2,
        utilizationDeviation: 5
      }
    }

    console.log('Enhanced request for /optimization/rebalance:', JSON.stringify(enhancedRequest, null, 2))

    const response = await fetch(`${this.baseUrl}/optimization/rebalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedRequest),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Enhanced Optimization API Error Response:', error)
      // Fallback to original endpoint if enhanced fails, but with corrected ETF universe
      const correctedRequest = {
        ...request,
        selectedETFs: this.getStrategySpecificETFUniverse(request.strategyAnalysis, request.selectedETFs)
      }
      return this.fallbackToOriginalOptimization(correctedRequest)
    }

    const result = await response.json()
    console.log('Enhanced Optimization API Success Response:', result)

    // Transform enhanced response back to expected format
    return this.transformEnhancedResponse(result, request)
  }

  /**
   * Fallback to original optimization endpoint
   */
  private async fallbackToOriginalOptimization(request: OptimizationRequest): Promise<PortfolioOptimization> {
    console.log('Falling back to original optimization endpoint')

    const response = await fetch(`${this.baseUrl}/portfolio/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Portfolio optimization failed')
    }

    const result = await response.json()
    return result.optimization
  }

  /**
   * Build targetETFs from strategy analysis results WITHOUT prices (backend will handle pricing)
   */
  private getStrategySpecificETFUniverse(strategyAnalysis: StrategyAnalysis | undefined, selectedETFs: string[]): string[] {
    // For All-Weather strategy, use the specific ETF universe regardless of selection
    if (strategyAnalysis && strategyAnalysis.etfUniverse && Array.isArray(strategyAnalysis.etfUniverse)) {
      console.log('Using strategy-specific ETF universe:', strategyAnalysis.etfUniverse)
      return strategyAnalysis.etfUniverse
    }

    // Check if it's All-Weather based on other indicators
    if (strategyAnalysis && strategyAnalysis.targetAllocations &&
        typeof strategyAnalysis.targetAllocations === 'object' &&
        'etfAllocations' in strategyAnalysis.targetAllocations) {
      const allWeatherETFs = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
      console.log('Detected All-Weather strategy, using ETF universe:', allWeatherETFs)
      return allWeatherETFs
    }

    // Fallback to provided selectedETFs
    return selectedETFs
  }

  private buildTargetETFsFromStrategyWithoutPrices(strategyAnalysis: StrategyAnalysis | undefined, selectedETFs: string[]) {
    console.log('=== Building Target ETFs Without Prices (backend will handle pricing) ===')
    console.log('Strategy analysis available:', !!strategyAnalysis)
    console.log('Strategy analysis type:', typeof strategyAnalysis)

    if (strategyAnalysis && strategyAnalysis.targetAllocations) {
      let etfs: [string, number][] = []
      console.log('Strategy targetAllocations type:', typeof strategyAnalysis.targetAllocations)
      console.log('Strategy targetAllocations keys:', Object.keys(strategyAnalysis.targetAllocations))

      // Handle All-Weather strategy nested response format
      if (typeof strategyAnalysis.targetAllocations === 'object' && 'etfAllocations' in strategyAnalysis.targetAllocations) {
        // All-Weather strategy format: { etfAllocations: { "VTI": 22.2, "VEA": 22.2, ... } }
        const allWeatherAllocations = (strategyAnalysis.targetAllocations as any).etfAllocations
        if (typeof allWeatherAllocations === 'object' && allWeatherAllocations !== null) {
          etfs = Object.entries(allWeatherAllocations).filter(([etf, pct]) =>
            typeof etf === 'string' && etf.length > 0 && typeof pct === 'number' && pct > 0
          ) as [string, number][]
          console.log('ETFs from All-Weather strategy analysis:', etfs.map(([etf, pct]) => `${etf}: ${pct}%`))
        }
      } else if (typeof strategyAnalysis.targetAllocations === 'object' && !('etfAllocations' in strategyAnalysis.targetAllocations)) {
        // Standard format: { "VTI": 22.2, "VEA": 22.2, ... }
        etfs = Object.entries(strategyAnalysis.targetAllocations).filter(([etf, pct]) =>
          typeof etf === 'string' && etf.length > 0 && typeof pct === 'number' && pct > 0
        ) as [string, number][]
        console.log('ETFs from standard strategy analysis:', etfs.map(([etf, pct]) => `${etf}: ${pct}%`))
      }

      // Validate we have valid ETFs
      if (etfs.length === 0) {
        console.warn('No valid ETF allocations found in strategy analysis, using fallback')
        return this.createFallbackTargetETFs(selectedETFs)
      }

      // Build target ETFs without prices - backend will fetch them
      const targetETFs = etfs.map(([etf, percentage]) => {
        console.log(`Target ETF ${etf}: ${percentage}% (backend will determine price)`)

        return {
          name: etf,
          targetPercentage: Number(percentage), // Ensure number type
          allowedDeviation: 5 // ±5% allocation tolerance
          // Remove pricePerShare - backend will fetch it
        }
      })

      console.log('Final target ETFs (no prices):', targetETFs.map(t => `${t.name}: ${t.targetPercentage}%`))
      return targetETFs
    } else {
      console.log('No strategy analysis or invalid targetAllocations, using fallback for:', selectedETFs)
      return this.createFallbackTargetETFs(selectedETFs)
    }
  }

  private createFallbackTargetETFs(selectedETFs: string[]) {
    console.log('Creating fallback target ETFs for:', selectedETFs)

    // For All-Weather, ensure we use the correct universe even in fallback
    const fallbackETFs = selectedETFs.length > 0 ? selectedETFs :
      ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']

    const targetETFs = fallbackETFs.map((etf) => {
      const percentage = 100 / fallbackETFs.length
      console.log(`Fallback target ETF ${etf}: ${percentage.toFixed(2)}% (backend will determine price)`)

      return {
        name: etf,
        targetPercentage: percentage,
        allowedDeviation: 5
        // Remove pricePerShare - backend will fetch it
      }
    })

    console.log('Final fallback target ETFs (no prices):', targetETFs.map(t => `${t.name}: ${t.targetPercentage.toFixed(2)}%`))
    return targetETFs
  }

  /**
   * Build targetETFs from strategy analysis results with real prices (DEPRECATED - use pre-fetched version)
   */
  private async buildTargetETFsFromStrategy(strategyAnalysis: StrategyAnalysis | undefined, selectedETFs: string[]) {
    console.log('=== Building Target ETFs with Real Prices ===')

    if (strategyAnalysis && strategyAnalysis.targetAllocations) {
      const etfs = Object.entries(strategyAnalysis.targetAllocations)
      console.log('ETFs from strategy analysis:', etfs.map(([etf, pct]) => `${etf}: ${pct}%`))

      // Fetch real prices for all target ETFs
      const targetETFs = await Promise.all(
        etfs.map(async ([etf, percentage]) => {
          try {
            const priceResponse = await fetch(`${this.baseUrl}/quote/${etf}`)
            if (priceResponse.ok) {
              const priceData = await priceResponse.json()
              const realPrice = priceData.regularMarketPrice || priceData.price
              console.log(`Real price for target ${etf}: $${realPrice.toFixed(2)} (was placeholder: $1)`)

              return {
                name: etf,
                targetPercentage: percentage,
                pricePerShare: realPrice,
                allowedDeviation: 5 // ±5% allocation tolerance
              }
            } else {
              console.warn(`Failed to fetch price for target ${etf}, using estimated price`)
              return {
                name: etf,
                targetPercentage: percentage,
                pricePerShare: this.getEstimatedPriceForETF(etf),
                allowedDeviation: 5
              }
            }
          } catch (error) {
            console.error(`Error fetching price for target ${etf}:`, error)
            return {
              name: etf,
              targetPercentage: percentage,
              pricePerShare: this.getEstimatedPriceForETF(etf),
              allowedDeviation: 5
            }
          }
        })
      )

      console.log('Final target ETFs:', targetETFs.map(t => `${t.name}: ${t.targetPercentage}% @ $${t.pricePerShare.toFixed(2)}`))
      return targetETFs
    } else {
      console.log('No strategy analysis, using equal distribution for:', selectedETFs)

      // Fallback: equal distribution with real prices
      const targetETFs = await Promise.all(
        (selectedETFs || []).map(async (etf) => {
          try {
            const priceResponse = await fetch(`${this.baseUrl}/quote/${etf}`)
            if (priceResponse.ok) {
              const priceData = await priceResponse.json()
              const realPrice = priceData.regularMarketPrice || priceData.price
              console.log(`Real price for fallback target ${etf}: $${realPrice.toFixed(2)} (was placeholder: $1)`)

              return {
                name: etf,
                targetPercentage: 100 / (selectedETFs?.length || 1),
                pricePerShare: realPrice,
                allowedDeviation: 5
              }
            } else {
              console.warn(`Failed to fetch price for fallback target ${etf}, using estimated price`)
              return {
                name: etf,
                targetPercentage: 100 / (selectedETFs?.length || 1),
                pricePerShare: this.getEstimatedPriceForETF(etf),
                allowedDeviation: 5
              }
            }
          } catch (error) {
            console.error(`Error fetching price for fallback target ${etf}:`, error)
            return {
              name: etf,
              targetPercentage: 100 / (selectedETFs?.length || 1),
              pricePerShare: this.getEstimatedPriceForETF(etf),
              allowedDeviation: 5
            }
          }
        })
      )

      console.log('Final fallback target ETFs:', targetETFs.map(t => `${t.name}: ${t.targetPercentage}% @ $${t.pricePerShare.toFixed(2)}`))
      return targetETFs
    }
  }

  /**
   * Enrich current holdings with real market prices
   */
  private async enrichCurrentHoldingsWithRealPrices(currentHoldings: PortfolioHolding[]): Promise<Array<{
    name: string
    shares: number
    price: number
  }>> {
    console.log('=== Enriching Current Holdings with Real Prices ===')
    console.log('Holdings to enrich:', currentHoldings.length)

    const enrichedHoldings = await Promise.all(
      currentHoldings.map(async (holding) => {
        try {
          // Fetch real current price for this ETF
          const priceResponse = await fetch(`${this.baseUrl}/quote/${holding.etf}`)
          if (priceResponse.ok) {
            const priceData = await priceResponse.json()
            const realPrice = priceData.regularMarketPrice || priceData.price
            console.log(`Real price for ${holding.etf}: $${realPrice.toFixed(2)} (was placeholder: $1)`)

            return {
              name: holding.etf,
              shares: holding.shares,
              price: realPrice
            }
          } else {
            console.warn(`Failed to fetch price for ${holding.etf}, using estimated price`)
            return {
              name: holding.etf,
              shares: holding.shares,
              price: this.getEstimatedPriceForETF(holding.etf)
            }
          }
        } catch (error) {
          console.error(`Error fetching price for ${holding.etf}:`, error)
          return {
            name: holding.etf,
            shares: holding.shares,
            price: this.getEstimatedPriceForETF(holding.etf)
          }
        }
      })
    )

    console.log('Enriched holdings:', enrichedHoldings.map(h => `${h.name}: ${h.shares} shares @ $${h.price.toFixed(2)}`))
    return enrichedHoldings
  }

  /**
   * Get intelligent price estimate for ETF based on its type
   */
  private getEstimatedPriceForETF(etf: string): number {
    // Intelligent price estimates based on ETF categories (same as backend)
    const estimatedPrices: { [key: string]: number } = {
      // Stock ETFs - generally higher prices
      'VTI': 320, 'SPY': 450, 'QQQ': 350, 'IWM': 200, 'IWV': 300,
      'VEA': 60, 'VWO': 55, 'VXUS': 65, 'EWU': 35,

      // Bond ETFs - generally moderate prices
      'BND': 75, 'AGG': 100, 'TLT': 95, 'BWX': 50, 'SHY': 85,
      'IEF': 90, 'GOVT': 70, 'SPLB': 55, 'VUBS': 50, 'BIL': 92,
      'SGOV': 100,

      // Commodity and alternative ETFs
      'GLDM': 85, 'GLD': 180, 'IAU': 40, 'SLV': 20, 'PDBC': 20,

      // Crypto ETFs
      'IBIT': 50, 'FBTC': 65, 'BITO': 35,

      // Sector ETFs
      'VGT': 450, 'VHT': 250, 'VFH': 85, 'VDC': 180, 'VDE': 160,
      'VPU': 150, 'VCR': 210, 'VIS': 120, 'VOX': 95, 'VNQ': 100,

      // Additional common ETFs
      'VT': 110, 'VSS': 115, 'VNQI': 60,
      'BNDX': 55, 'EMB': 85, 'VTIP': 50, 'VGK': 50, 'VPL': 65
    }

    const upperETF = etf.toUpperCase()

    // Look for exact match first
    if (estimatedPrices[upperETF]) {
      return estimatedPrices[upperETF]
    }

    // Try to match by pattern (starts with)
    for (const [key, price] of Object.entries(estimatedPrices)) {
      if (key !== 'default' && upperETF.startsWith(key.substring(0, 3))) {
        return price
      }
    }

    // Use default estimate for unknown ETFs
    return 100
  }

  /**
   * Transform enhanced optimization response to expected PortfolioOptimization format
   */
  private transformEnhancedResponse(result: any, originalRequest: OptimizationRequest): PortfolioOptimization {
    const totalBudget = result.optimizationMetrics?.totalBudgetUsed || 0
    const unusedBudget = result.optimizationMetrics?.unusedBudget || 0

    return {
      optimizedAllocations: result.allocations?.reduce((acc: any, allocation: any) => {
        acc[allocation.etfName] = allocation.finalShares
        return acc
      }, {}) || {},
      targetValues: result.allocations?.reduce((acc: any, allocation: any) => {
        acc[allocation.etfName] = allocation.targetValue
        return acc
      }, {}) || {},
      utilizedCapital: totalBudget,
      uninvestedCash: unusedBudget,
      utilizationRate: totalBudget > 0 ? ((totalBudget / (totalBudget + unusedBudget)) * 100) : 0,
      objectiveValue: 0,
      isOptimal: result.solverStatus === 'optimal',
      solverStatus: result.solverStatus,
      fallbackUsed: result.fallbackUsed || false,
      allocations: result.allocations?.map((allocation: any) => ({
        etf: allocation.etfName,
        targetPercentage: allocation.targetPercentage,
        targetValue: allocation.targetValue,
        finalValue: allocation.finalValue,
        finalShares: allocation.finalShares,
        shares: allocation.finalShares,
        sharesToBuy: allocation.sharesToBuy,
        pricePerShare: allocation.costOfPurchase ? allocation.costOfPurchase / allocation.sharesToBuy : 0,
        costOfPurchase: allocation.costOfPurchase,
        deviation: allocation.deviation
      })) || []
    }
  }

  /**
   * Generate execution plan with specific trades
   */
  async generateExecutionPlan(request: OptimizationRequest): Promise<ExecutionPlan> {
    // Ensure we use the correct ETF universe based on strategy
    const correctedRequest = {
      ...request,
      selectedETFs: this.getStrategySpecificETFUniverse(request.strategyAnalysis, request.selectedETFs)
    }
    console.log('Execution plan using corrected ETF universe:', correctedRequest.selectedETFs)

    const response = await fetch(`${this.baseUrl}/portfolio/execution-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(correctedRequest),
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
    useEnhancedBudget?: boolean
  }): Promise<any> {
    // ENHANCED: Use enhanced budget strategy by default for better cash utilization
    const optimizationRequest = {
      ...request,
      optimizationStrategy: request.useEnhancedBudget !== false ? 'minimize-leftover' : (request.optimizationStrategy || 'minimize-leftover'),
      // Add objectives to trigger enhanced LP optimization with budget utilization focus
      objectives: {
        useAllBudget: true,
        maximizeUtilization: true,
        budgetWeight: 0.8,
        fairnessWeight: 0.2,
        utilizationDeviation: 5
      }
    }

    const response = await fetch(`${this.baseUrl}/optimization/rebalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(optimizationRequest),
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
   * Pre-fetch prices for multiple tickers
   */
  async preFetchPrices(tickers: string[]): Promise<any> {
    return this.apiClient.post<any>('/portfolio/pre-prices', { tickers })
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