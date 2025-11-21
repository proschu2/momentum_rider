<template>
  <div class="strategy-hub">
    <!-- Header with Current Portfolio Status -->
    <div class="hub-header">
      <div class="header-content">
        <div class="title-section">
          <div class="title-with-back">
            <button
              v-if="portfolio"
              @click="emit('backToPortfolios')"
              class="back-btn"
              title="Back to Portfolios"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div>
              <h1 class="text-2xl font-bold text-neutral-900">Strategy Hub</h1>
              <p class="text-neutral-600">Configure and optimize your portfolio strategy</p>
            </div>
          </div>
        </div>
        <div class="current-portfolio-summary" v-if="portfolio">
          <div class="summary-card">
            <div class="summary-label">{{ portfolio?.name || 'No Portfolio' }}</div>
            <div class="summary-value">${{ totalPortfolioValue.toLocaleString() }}</div>
            <div class="summary-details">{{ Object.keys(portfolio?.holdings || {}).length }} holdings • ${{ portfolio?.additionalCash?.toLocaleString() || '0' }} cash</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Strategy Selection Tabs -->
    <div class="strategy-tabs">
      <button
        v-for="strategy in availableStrategies"
        :key="strategy.id"
        :class="['strategy-tab', { active: selectedStrategy?.id === strategy.id }]"
        @click="selectStrategy(strategy)"
      >
        <div class="tab-icon">{{ strategy.icon }}</div>
        <div class="tab-content">
          <div class="tab-title">{{ strategy.name }}</div>
          <div class="tab-description">{{ strategy.description }}</div>
        </div>
      </button>
    </div>

    <!-- Main Content Area -->
    <div v-if="selectedStrategy" class="strategy-content">
      <!-- Step 1: Strategy Configuration -->
      <div class="strategy-configuration">
        <h2 class="section-title">Configure {{ selectedStrategy?.name || 'Strategy' }}</h2>

        <!-- Momentum Strategy Configuration -->
        <div v-if="selectedStrategy.id === 'momentum'" class="config-panel">
          <div class="config-group">
            <label class="config-label">Top N ETFs</label>
            <div class="input-with-unit">
              <input
                v-model.number="strategyConfig.momentum.topN"
                type="number"
                min="1"
                max="10"
                class="config-input"
              />
              <span class="unit">ETFs</span>
            </div>
          </div>

          <div class="config-group">
            <label class="config-label">Include IBIT</label>
            <div class="toggle-group">
              <label class="toggle">
                <input
                  v-model="strategyConfig.momentum.includeIBIT"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-description">
                Include 4% fixed allocation to Bitcoin
              </span>
            </div>
          </div>

          <div class="config-group">
            <label class="config-label">Fallback ETF</label>
            <select v-model="strategyConfig.momentum.fallbackETF" class="config-select">
              <option value="SGOV">SGOV (Treasury Bills)</option>
              <option value="VUBS">VUBS (Short-Term Treasury)</option>
              <option value="BIL">BIL (Treasury Bills)</option>
            </select>
          </div>
        </div>

        <!-- All Weather Strategy Configuration -->
        <div v-if="selectedStrategy.id === 'allweather'" class="config-panel">
          <div class="config-group">
            <label class="config-label">SMA Period</label>
            <div class="input-with-unit">
              <input
                v-model.number="strategyConfig.allweather.smaPeriod"
                type="number"
                min="50"
                max="300"
                step="10"
                class="config-input"
              />
              <span class="unit">days</span>
            </div>
          </div>

          <div class="config-group">
            <label class="config-label">Bond Allocation When Below SMA</label>
            <div class="input-with-unit">
              <input
                v-model.number="strategyConfig.allweather.bondFallbackPercent"
                type="number"
                min="0"
                max="100"
                step="5"
                class="config-input"
              />
              <span class="unit">%</span>
            </div>
          </div>
        </div>

        <!-- Custom Strategy Configuration -->
        <div v-if="selectedStrategy.id === 'custom'" class="config-panel">
          <div class="custom-allocation-editor">
            <div class="allocation-header">
              <label class="config-label">Custom Allocations</label>
              <div class="allocation-total">
                Total: {{ totalAllocationPercent }}%
              </div>
            </div>

            <div class="allocation-list">
              <div
                v-for="(allocation, etf) in strategyConfig.custom.allocations"
                :key="etf"
                class="allocation-item"
              >
                <span class="etf-ticker">{{ etf }}</span>
                <div class="allocation-control">
                  <input
                    v-model.number="strategyConfig.custom.allocations[etf]"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    class="allocation-input"
                  />
                  <span class="percent">%</span>
                  <button
                    @click="removeCustomETF(etf)"
                    class="remove-btn"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div class="add-etf-section">
              <div class="add-etf-form">
                <input
                  v-model="newCustomETF"
                  placeholder="Add ETF ticker..."
                  class="add-etf-input"
                  @keyup.enter="addCustomETF"
                />
                <button
                  @click="addCustomETF"
                  :disabled="!newCustomETF.trim()"
                  class="add-btn"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

  
        <!-- ETF Selection -->
        <div class="etf-selection-section">
          <h3 class="subsection-title">Select ETF Universe</h3>

          <!-- Search and Filter -->
          <div class="etf-controls">
            <div class="search-box">
              <input
                v-model="etfSearchQuery"
                placeholder="Search ETFs..."
                class="search-input"
              />
            </div>
            <div class="filter-options">
              <label class="filter-checkbox">
                <input
                  v-model="showCustomOnly"
                  type="checkbox"
                />
                <span>Custom ETFs Only</span>
              </label>
              <button
                @click="refreshMomentumScores"
                class="refresh-btn"
                title="Refresh momentum scores"
              >
                🔄 Refresh Momentum
              </button>
            </div>
          </div>

          <!-- ETF Grid -->
          <div class="etf-grid">
            <div
              v-for="etf in filteredETFs"
              :key="etf.ticker"
              :class="['etf-card', {
                selected: selectedETFs.includes(etf.ticker),
                custom: etf.isCustom,
                positive: (etf.momentumScore ?? 0) > 0
              }]"
              @click="toggleETF(etf.ticker)"
            >
              <div class="etf-header">
                <span class="etf-ticker">{{ etf.ticker }}</span>
                <span v-if="etf.isCustom" class="custom-badge">Custom</span>
                <span v-if="(etf.momentumScore ?? 0) > 0" class="positive-badge">+{{ (etf.momentumScore ?? 0).toFixed(1) }}%</span>
              </div>
              <div class="etf-details">
                <div class="etf-name">{{ etf.name }}</div>
                <div class="etf-category">{{ etf.category }}</div>
                <div class="etf-price-info">
                  <div v-if="etf.currentPrice" class="etf-price">
                    ${{ etf.currentPrice.toFixed(2) }}
                  </div>
                  <div v-else class="etf-price-placeholder">
                    No price data
                  </div>
                  <div v-if="etf.dayChange" class="etf-change" :class="etf.dayChange >= 0 ? 'positive' : 'negative'">
                    {{ etf.dayChange >= 0 ? '+' : '' }}{{ etf.dayChange.toFixed(2) }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Buttons -->
      <div class="action-section">
        <button
          @click="analyzeStrategy"
          :disabled="!canAnalyze || isAnalyzing"
          class="btn btn-primary analyze-btn"
        >
          <span v-if="isAnalyzing" class="loading-spinner"></span>
          {{ isAnalyzing ? 'Analyzing...' : 'Analyze Strategy' }}
        </button>
      </div>
    </div>

    <!-- Strategy Analysis Results -->
    <div v-if="analysisResults" class="analysis-results">
      <h2 class="section-title">Strategy Analysis Results</h2>

      <div class="results-grid">
        <!-- Current vs Target Portfolio Composition -->
        <div class="result-card">
          <h3 class="card-title">Portfolio Rebalancing Summary</h3>
          <div class="rebalancing-table">
            <div class="table-header">
              <span>ETF</span>
              <span>Current Holdings</span>
              <span>Target Allocation</span>
              <span>Change</span>
            </div>
            <div
              v-for="comparison in filteredPortfolioComparison"
              :key="comparison.etf"
              class="table-row"
            >
              <span class="etf-name">{{ comparison?.etf || 'Unknown' }}</span>
              <span class="current-value">${{ comparison?.currentValue?.toLocaleString() || '0' }}</span>
              <span class="target-value">${{ comparison?.targetValue?.toLocaleString() || '0' }}</span>
              <span :class="['action-badge', comparison.action]">
                {{ comparison.action.toUpperCase() }}
              </span>
            </div>
            <div class="rebalancing-note">
              <small>*Target values include rebalanced portfolio composition</small>
            </div>
          </div>
        </div>

        <!-- Optimization Results -->
        <div class="result-card">
          <h3 class="card-title">Optimization Summary</h3>
          <div class="optimization-metrics">
            <div class="metric">
              <div class="metric-label">Total Investment</div>
              <div class="metric-value">${{ analysisResults?.totalInvestment?.toLocaleString() || '0' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Utilized Capital</div>
              <div class="metric-value">${{ analysisResults?.utilizedCapital?.toLocaleString() || '0' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Uninvested Cash</div>
              <div class="metric-value">${{ analysisResults?.uninvestedCash?.toLocaleString() || '0' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Utilization Rate</div>
              <div class="metric-value">{{ analysisResults?.utilizationRate?.toFixed(1) || '0.0' }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Execution Plan -->
      <div class="execution-plan">
        <h3 class="card-title">Trade Execution Plan</h3>
        
        <!-- Trade Summary -->
        <div class="trade-summary" v-if="executionPlan.length > 0">
          <div class="summary-item">
            <span class="summary-label">Total Trades:</span>
            <span class="summary-value">{{ executionPlan.length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Buy Actions:</span>
            <span class="summary-value buy">{{ executionPlan.filter(t => t.action === 'buy').length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Sell Actions:</span>
            <span class="summary-value sell">{{ executionPlan.filter(t => t.action === 'sell').length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Sell Proceeds:</span>
            <span class="summary-value">${{ totalSellProceeds.toLocaleString() }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Available Cash After Sales:</span>
            <span class="summary-value">${{ availableCashAfterSales.toLocaleString() }}</span>
          </div>
        </div>

        <div class="trade-list">
          <div
            v-for="trade in executionPlan"
            :key="`${trade.etf}-${trade.action}`"
            :class="['trade-item', trade.action]"
          >
            <div class="trade-action">{{ trade?.action?.toUpperCase() || 'UNKNOWN' }}</div>
            <div class="trade-details">
              <span class="trade-etf">{{ trade?.etf || 'Unknown' }}</span>
              <span class="trade-shares">{{ trade?.shares?.toFixed(2) || '0.00' }} shares</span>
              <span class="trade-value">${{ trade?.value?.toLocaleString() || '0' }}</span>
            </div>
            <div class="trade-reason">{{ trade?.reason || 'No reason provided' }}</div>
          </div>
        </div>

        <div class="execution-actions">
          <button
            @click="executeTrades"
            :disabled="!canExecute || isExecuting"
            class="btn btn-success execute-btn"
          >
            <span v-if="isExecuting" class="loading-spinner"></span>
            {{ isExecuting ? 'Executing...' : 'Execute Trades' }}
          </button>
          <button
            @click="optimizeFurther"
            class="btn btn-secondary"
          >
            Optimize Further
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useETFConfigStore } from '@/stores/etf-config'
import { usePortfolioStore, type Portfolio } from '@/stores/portfolio'
import { etfService } from '@/services/etf-service'
import { portfolioService, type PortfolioHolding } from '@/services/portfolio-service'

// Interfaces
interface Strategy {
  id: string
  name: string
  description: string
  icon: string
}

interface ETFInfo {
  ticker: string
  name: string
  category: string
  isCustom: boolean
  currentPrice?: number
  momentumScore?: number
}

interface StrategyConfig {
  momentum: {
    topN: number
    includeIBIT: boolean
    fallbackETF: string
  }
  allweather: {
    smaPeriod: number
    bondFallbackPercent: number
  }
  custom: {
    allocations: Record<string, number>
  }
}

interface AnalysisResults {
  totalInvestment: number
  utilizedCapital: number
  uninvestedCash: number
  utilizationRate: number
}

interface PortfolioComparison {
  etf: string
  currentValue: number
  targetValue: number
  action: 'buy' | 'sell' | 'hold'
}

interface Trade {
  etf: string
  action: 'buy' | 'sell'
  shares: number
  value: number
  price: number
  reason: string
}

// Store
const etfConfigStore = useETFConfigStore()
const portfolioStore = usePortfolioStore()

// Props
const props = defineProps<{
  portfolio?: Portfolio
}>()

const emit = defineEmits<{
  backToPortfolios: []
}>()

// State
const selectedStrategy = ref<Strategy | null>(null)
const selectedETFs = ref<string[]>([])
const etfSearchQuery = ref('')
const showCustomOnly = ref(false)
const newCustomETF = ref('')
const isAnalyzing = ref(false)
const isExecuting = ref(false)
const analysisResults = ref<AnalysisResults | null>(null)
const portfolioComparison = ref<PortfolioComparison[]>([])
const executionPlan = ref<Trade[]>([])
const cachedPrices = ref<Record<string, number>>({})

// Available strategies
const availableStrategies: Strategy[] = [
  {
    id: 'momentum',
    name: 'Momentum Strategy',
    description: 'Top performing ETFs based on momentum analysis',
    icon: '📈'
  },
  {
    id: 'allweather',
    name: 'All Weather Portfolio',
    description: 'Dalio-inspired balanced allocation with trend filters',
    icon: '🌤️'
  },
  {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Your own allocation percentages',
    icon: '🎯'
  }
]

// Strategy configuration
const strategyConfig = reactive<StrategyConfig>({
  momentum: {
    topN: 3,
    includeIBIT: true,
    fallbackETF: 'SGOV'
  },
  allweather: {
    smaPeriod: 200,
    bondFallbackPercent: 80
  },
  custom: {
    allocations: {}
  }
})

// Portfolio data
const currentHoldings = computed(() => {
  if (!props.portfolio) return []
  return Object.entries(props.portfolio.holdings).map(([ticker, holding]) => ({
    etf: ticker,
    shares: holding.shares
  }))
})

const allETFs = ref<ETFInfo[]>([])

// Computed properties
const totalPortfolioValue = computed(() => {
  if (!props.portfolio) return 0
  const holdingsValue = Object.values(props.portfolio.holdings).reduce((sum, holding) => sum + holding.value, 0)
  return holdingsValue + props.portfolio.additionalCash
})

const filteredETFs = computed(() => {
  let etfs = allETFs.value

  if (showCustomOnly.value) {
    etfs = etfs.filter(etf => etf.isCustom)
  }

  if (etfSearchQuery.value) {
    const query = etfSearchQuery.value.toLowerCase()
    etfs = etfs.filter(etf =>
      etf.ticker.toLowerCase().includes(query) ||
      etf.name.toLowerCase().includes(query)
    )
  }

  return etfs
})

const totalAllocationPercent = computed(() => {
  return Object.values(strategyConfig.custom.allocations).reduce((sum, val) => sum + val, 0)
})

const canAnalyze = computed(() => {
  const hasStrategy = !!selectedStrategy.value
  const hasETFs = selectedETFs.value.length > 0
  console.log('Debug canAnalyze:', {
    selectedStrategy: selectedStrategy.value,
    selectedETFsCount: selectedETFs.value.length,
    canAnalyze: hasStrategy && hasETFs
  })
  return hasStrategy && hasETFs
})

const canExecute = computed(() => {
  return analysisResults.value && executionPlan.value.length > 0
})

const totalSellProceeds = computed(() => {
  return executionPlan.value
    .filter(trade => trade.action === 'sell')
    .reduce((sum, trade) => sum + trade.value, 0)
})

const availableCashAfterSales = computed(() => {
  const currentCash = props.portfolio?.additionalCash || 0
  return currentCash + totalSellProceeds.value
})

// Filter out holdings with 0 current and target values from portfolio comparison
const filteredPortfolioComparison = computed(() => {
  return portfolioComparison.value.filter(comparison =>
    comparison.currentValue > 0 || comparison.targetValue > 0
  )
})

// Methods
const selectStrategy = (strategy: Strategy) => {
  selectedStrategy.value = strategy

  // Select ALL available ETFs by default for any strategy
  // If ETFs are not loaded yet, the watcher will handle selection when data becomes available
  if (allETFs.value.length > 0) {
    selectedETFs.value = allETFs.value.map(etf => etf.ticker)
    console.log(`Selected all ${selectedETFs.value.length} ETFs for ${strategy.id} strategy`)
  } else {
    console.log('ETF data not yet loaded, will select all when data becomes available')
    // Clear any existing selection to ensure the watcher will select all when data loads
    selectedETFs.value = []
  }

  // Refresh momentum scores when strategy changes
  refreshMomentumScores()

  // Save to localStorage
  saveToLocalStorage()
}

const toggleETF = (ticker: string) => {
  const index = selectedETFs.value.indexOf(ticker)
  if (index > -1) {
    selectedETFs.value.splice(index, 1)
  } else {
    selectedETFs.value.push(ticker)
  }
}

const addCustomETF = () => {
  const ticker = newCustomETF.value.trim().toUpperCase()
  if (ticker && !strategyConfig.custom.allocations[ticker]) {
    strategyConfig.custom.allocations[ticker] = 0
    newCustomETF.value = ''
  }
}

const removeCustomETF = (etf: string) => {
  delete strategyConfig.custom.allocations[etf]
}

const analyzeStrategy = async () => {
  if (!canAnalyze.value) return

  isAnalyzing.value = true

  // Initialize execution plan result variable outside try-catch to ensure proper scope
  let executionPlanResult = null

  try {
    // Debug: Log current state before building request
    console.log('=== Analyze Strategy Debug ===')
    console.log('Current Vue timestamp:', new Date().toISOString())
    console.log('Portfolio additionalCash:', props.portfolio?.additionalCash)
    console.log('selectedETFs.value length:', selectedETFs.value.length)
    console.log('canAnalyze.value:', canAnalyze.value)

    // Prepare analysis request with correct parameter structure
    let parameters = {};

    if (selectedStrategy.value?.id === 'momentum') {
      parameters = strategyConfig.momentum;
    } else if (selectedStrategy.value?.id === 'allweather') {
      parameters = strategyConfig.allweather;
    } else if (selectedStrategy.value?.id === 'custom') {
      parameters = strategyConfig.custom;
    }

    const analysisRequest = {
      strategy: {
        type: selectedStrategy.value?.id as 'momentum' | 'allweather' | 'custom' || 'custom',
        parameters: parameters
      },
      selectedETFs: selectedETFs.value,
      additionalCapital: props.portfolio ? props.portfolio.additionalCash : 0,
      currentHoldings: currentHoldings.value
    }

    // Debug: Log what we're sending
    console.log('Sending analysis request:', {
      strategy: selectedStrategy.value?.id || 'unknown',
      selectedETFsCount: selectedETFs.value.length,
      selectedETFs: selectedETFs.value,
      momentumConfig: strategyConfig.momentum,
      additionalCapital: analysisRequest.additionalCapital,
      portfolioCash: props.portfolio?.additionalCash,
      typeofAdditionalCapital: typeof analysisRequest.additionalCapital
    })

    // Pre-fetch current prices for all selected ETFs to ensure we have latest data
    console.log('Pre-fetching prices for selected ETFs:', selectedETFs.value)
    try {
      const tickersToFetch = selectedETFs.value
      if (tickersToFetch.length > 0) {
        const priceFetchResult = await portfolioService.preFetchPrices(tickersToFetch)
        console.log('Price pre-fetch completed:', priceFetchResult)

        // Update cached prices with the results
        if (priceFetchResult.success && priceFetchResult.prices) {
          Object.assign(cachedPrices.value, priceFetchResult.prices)
          console.log('Updated cached prices:', cachedPrices.value)
        }
      }
    } catch (priceError) {
      console.warn('Price pre-fetch failed, using cached prices:', priceError)
    }

    // Call real portfolio analysis API
    const analysis = await portfolioService.analyzeStrategy(analysisRequest)

    // Calculate proper optimization values using real portfolio optimization
    let optimizationResult = null
    try {
      // Use sensible default objectives (balanced approach)
      let objectives = {
        maximize_utilization: {
          weight: 0.7,
          deviation: 0.05 // 5% deviation
        },
        minimize_deviation: {
          weight: 0.3
        }
      }
  
      // Use the portfolio optimization service to get real optimization data
      console.log('Calling optimization service with strategy:', analysisRequest.strategy, 'and objectives:', objectives)
      optimizationResult = await portfolioService.optimizePortfolio({
        strategy: analysisRequest.strategy,
        selectedETFs: selectedETFs.value,
        additionalCapital: props.portfolio ? props.portfolio.additionalCash : 0,
        currentHoldings: analysisRequest.currentHoldings,
        objectives: objectives,
        strategyAnalysis: analysis // ENHANCED: Pass strategy analysis results for proper target allocations
      })
      console.log('Optimization service returned:', optimizationResult)

      // Generate execution plan with complete trade list (both buys AND sells)
      console.log('Generating execution plan from optimization result...')
      console.log('Execution plan input params:', {
        strategy: analysisRequest.strategy,
        selectedETFs: selectedETFs.value,
        additionalCapital: props.portfolio ? props.portfolio.additionalCash : 0,
        currentHoldingsCount: analysisRequest.currentHoldings?.length,
        currentHoldings: analysisRequest.currentHoldings,
        objectives: objectives
      })

      executionPlanResult = await portfolioService.generateExecutionPlan({
        strategy: analysisRequest.strategy,
        selectedETFs: selectedETFs.value,
        additionalCapital: props.portfolio ? props.portfolio.additionalCash : 0,
        currentHoldings: analysisRequest.currentHoldings,
        objectives: objectives
      })

      console.log('Execution plan API response:', {
        success: executionPlanResult?.success,
        tradesCount: executionPlanResult?.trades?.length || 0,
        trades: executionPlanResult?.trades,
        hasOptimization: !!executionPlanResult?.optimization,
        optimizationAllocations: executionPlanResult?.optimization?.allocations?.length || 0,
        utilizedCapital: executionPlanResult?.optimization?.utilizedCapital,
        utilizationRate: executionPlanResult?.optimization?.utilizationRate
      })

      // Extract optimization data from execution plan response
      if (executionPlanResult?.optimization) {
        console.log('Using optimization data from execution plan response')
        optimizationResult = {
          utilizedCapital: executionPlanResult.optimization.utilizedCapital || 0,
          uninvestedCash: executionPlanResult.optimization.uninvestedCash || 0,
          utilizationRate: executionPlanResult.optimization.utilizationRate || 0,
          targetValues: executionPlanResult.optimization.targetValues || {},
          allocations: executionPlanResult.optimization.allocations?.map((allocation: any) => ({
            etf: allocation.etfName, // Map etfName -> etf like the portfolio service does
            targetPercentage: allocation.targetPercentage,
            targetValue: allocation.targetValue,
            finalValue: allocation.finalValue,
            finalShares: allocation.finalShares,
            shares: allocation.finalShares,
            sharesToBuy: allocation.sharesToBuy,
            pricePerShare: allocation.costOfPurchase ? allocation.costOfPurchase / allocation.sharesToBuy : 0,
            costOfPurchase: allocation.costOfPurchase,
            deviation: allocation.deviation
          })) || [],
          solverStatus: executionPlanResult.optimization.solverStatus || 'unknown',
          fallbackUsed: executionPlanResult.optimization.fallbackUsed || false
        }
        console.log('Extracted optimization result from execution plan:', optimizationResult)
      }
    } catch (optimizationError) {
      console.warn('Portfolio optimization failed, using enhanced fallback:', optimizationError)

      // Enhanced fallback using actual analysis data and additional capital
      const currentPortfolioValue = analysis.currentPortfolioValue || 0
      const targetTotalValue = analysis.totalInvestment
      const actualAdditionalCapital = analysisRequest.additionalCapital || 0

      // Calculate realistic utilization (leave small buffer for trading costs)
      const bufferForCosts = Math.min(200, targetTotalValue * 0.02) // 2% or $200 max
      const utilizedCapital = targetTotalValue - bufferForCosts
      const uninvestedCash = bufferForCosts
      const utilizationRate = (utilizedCapital / targetTotalValue) * 100

      optimizationResult = {
        utilizedCapital,
        uninvestedCash,
        utilizationRate,
        targetValues: analysis.targetValues || {},
        allocations: [] // Empty allocations since we don't have optimization data
      }

      console.log('Enhanced fallback calculation:', {
        currentPortfolioValue,
        targetTotalValue,
        actualAdditionalCapital,
        bufferForCosts,
        utilizedCapital,
        utilizationRate
      })
    }

    console.log('Setting analysisResults with optimization data:', {
      utilizedCapital: optimizationResult.utilizedCapital,
      uninvestedCash: optimizationResult.uninvestedCash,
      utilizationRate: optimizationResult.utilizationRate
    })

    analysisResults.value = {
      totalInvestment: analysis.totalInvestment,
      utilizedCapital: optimizationResult.utilizedCapital || analysis.totalInvestment * 0.95,
      uninvestedCash: optimizationResult.uninvestedCash || analysis.totalInvestment * 0.05,
      utilizationRate: optimizationResult.utilizationRate || 95
    }

      // Use the execution plan result that contains both buys AND sells
      if (executionPlanResult && executionPlanResult.trades && Array.isArray(executionPlanResult.trades)) {
        try {
          console.log('✅ Using complete execution plan with trades:', executionPlanResult.trades)

          // Convert backend trades to frontend format
          executionPlan.value = executionPlanResult.trades.map((trade: any) => ({
            etf: trade.etf,
            action: trade.action,
            shares: trade.shares,
            value: trade.value,
            price: trade.price,
            reason: trade.reason || 'Portfolio Rebalance'
          }))

          console.log('✅ Generated execution plan with', executionPlan.value.length, 'trades:', {
            buys: executionPlan.value.filter(t => t.action === 'buy').length,
            sells: executionPlan.value.filter(t => t.action === 'sell').length,
            vtiTrade: executionPlan.value.find(t => t.etf === 'VTI')
          })
        } catch (error) {
          console.error('❌ Error processing execution plan:', error)
          executionPlan.value = []
        }
      } else {
        console.warn('❌ No valid execution plan result:', {
          executionPlanResult,
          hasTrades: !!executionPlanResult?.trades,
          isArray: Array.isArray(executionPlanResult?.trades),
          tradesLength: executionPlanResult?.trades?.length
        })
      }

      // CLEAN-SLATE: Use optimization allocations directly for portfolio comparison
      if (optimizationResult?.allocations && Array.isArray(optimizationResult.allocations)) {
        console.log('Using clean-slate optimization allocations for portfolio comparison')

        const cleanSlateComparisons = optimizationResult.allocations.map(allocation => {
          const etf = allocation.etf  // Portfolio service maps etfName -> etf
          const currentValue = analysis.currentValues?.[etf] || 0
          const targetValue = allocation.finalValue || 0

          // Calculate action based on actual current vs target values (general rebalancing logic)
          let action: 'buy' | 'sell' | 'hold' = 'hold'
          const difference = targetValue - currentValue

          if (difference > 10) { // Current holding is less than target, need to buy
            action = 'buy'
          } else if (difference < -10) { // Current holding is more than target, need to sell
            action = 'sell'
          } else {
            action = 'hold' // Within $10 of target, no action needed
          }

          return { etf, currentValue, targetValue, action }
        })

        portfolioComparison.value = cleanSlateComparisons
        console.log('Portfolio comparison generated from clean-slate allocations:', cleanSlateComparisons)
      } else {
        // Fallback to original logic if no optimization results
        console.log('No optimization allocations available, using fallback logic')
        const targetValues = optimizationResult?.targetValues || analysis.targetValues || {}

        // First, create comparison for ETFs that are in the target strategy
        const targetETFComparisons = selectedETFs.value.map(etf => {
          const currentValue = analysis.currentValues[etf] || 0
          const targetValue = targetValues[etf] || 0

          let action: 'buy' | 'sell' | 'hold' = 'hold'
          if (targetValue > currentValue * 1.05) action = 'buy'
          else if (targetValue < currentValue * 0.95) action = 'sell'

          return { etf, currentValue, targetValue, action }
        })

        // Next, identify holdings that are NOT in the target strategy and should be sold
        const currentHoldingETFs = Object.keys(analysis.currentValues || {})
        const nonTargetHoldings = currentHoldingETFs.filter(etf =>
          !selectedETFs.value.includes(etf) && (analysis.currentValues?.[etf] || 0) > 0
        )

        const sellComparisons = nonTargetHoldings.map(etf => {
          const currentValue = analysis.currentValues[etf] || 0
          return {
            etf,
            currentValue,
            targetValue: 0,
            action: 'sell' as const
          }
        })

        // Combine both comparisons
        portfolioComparison.value = [...targetETFComparisons, ...sellComparisons]
      }

      // CLEAN-SLATE: Only generate fallback execution plan if no optimization results at all
      // The clean-slate optimization should provide complete execution plan
      if (!optimizationResult?.allocations && (executionPlan.value.length === 0 || !executionPlan.value.some(trade => trade.action === 'sell'))) {
        console.log('No optimization results, generating fallback execution plan from portfolio comparison')
        
        // Generate trades for all comparisons (both target and non-target)
        const fallbackTrades = portfolioComparison.value
          .filter(comp => comp.action !== 'hold')
          .map(comp => {
            // Get real ETF price from cached prices, analysis momentum scores, or current values
            let etfPrice = cachedPrices.value[comp.etf] || 0 // Use cached price first
            if (etfPrice === 0 && analysis.currentValues?.[comp.etf] && currentHoldings.value.find(h => h.etf === comp.etf)) {
              // Calculate price from current holding value and shares
              const currentHolding = currentHoldings.value.find(h => h.etf === comp.etf)
              if (currentHolding && currentHolding.shares > 0) {
                etfPrice = (analysis.currentValues?.[comp.etf] || 0) / currentHolding.shares
              }
            } else if (etfPrice === 0 && (analysis as any).momentumScores?.[comp.etf]?.price) {
              etfPrice = (analysis as any).momentumScores[comp.etf].price
            }
            
            const shares = Math.abs(comp.targetValue - comp.currentValue) / etfPrice
            const value = comp.targetValue - comp.currentValue
            
            return {
              etf: comp.etf,
              action: comp.action as 'buy' | 'sell',
              shares,
              value: Math.abs(value),
              price: etfPrice,
              reason: comp.action === 'buy' ? 'Underweight' :
                      comp.targetValue === 0 ? 'Not in target allocation' : 'Overweight'
            }
          })
        
        // If we have some optimization trades but no sell trades, add sell trades
        if (executionPlan.value.length > 0 && !executionPlan.value.some(trade => trade.action === 'sell')) {
          const sellTrades = fallbackTrades.filter(trade => trade.action === 'sell')
          executionPlan.value = [...executionPlan.value, ...sellTrades]
          console.log('Added SELL trades to execution plan:', sellTrades)
        } else {
          // Use complete fallback plan
          executionPlan.value = fallbackTrades
          console.log('Using complete fallback execution plan:', fallbackTrades)
        }
      }

  } catch (error) {
    console.error('Strategy analysis failed:', error)
    alert(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    isAnalyzing.value = false
  }
}

// Watch for allETFs to be loaded and ensure all ETFs are selected if a strategy is active
watch(allETFs, (newETFs) => {
  if (newETFs.length > 0 && selectedStrategy.value) {
    // If we have a strategy selected but no ETFs selected yet, select all of them
    if (selectedETFs.value.length === 0) {
      console.log('ETF data loaded, selecting all ETFs for strategy:', selectedStrategy.value.id)
      selectedETFs.value = newETFs.map(etf => etf.ticker)
    }
  }
}, { immediate: true })

// Watch for strategy configuration changes and save to localStorage
watch(strategyConfig, () => {
  saveToLocalStorage()
}, { deep: true })

// Watch for selected strategy changes and save to localStorage
watch(selectedStrategy, () => {
  if (selectedStrategy.value) {
    saveToLocalStorage()
  }
}, { deep: true })

// Refresh momentum scores for all ETFs
const refreshMomentumScores = async () => {
  try {
    const allTickers = Object.values(etfConfigStore.etfUniverse).flat()
    console.log('Refreshing momentum scores for', allTickers.length, 'ETFs...')

    const momentumResponse = await portfolioService.analyzeStrategy({
      strategy: {
        type: 'momentum',
        parameters: {
          momentum: {
            topN: 10,
            includeIBIT: false,
            fallbackETF: 'SGOV'
          }
        }
      },
      selectedETFs: allTickers,
      additionalCapital: 0,
      currentHoldings: []
    })

    // Debug: Log the full response structure
    console.log('Full momentum response:', momentumResponse)
    console.log('Momentum response structure:', {
      hasMomentumScores: !!(momentumResponse as any).momentumScores,
      momentumKeys: (momentumResponse as any).momentumScores ? Object.keys((momentumResponse as any).momentumScores) : []
    })

    // Extract and update momentum scores with proper error handling
    const momentumScores = Object.entries((momentumResponse as any).momentumScores || {}).reduce((acc, [ticker, data]: [string, any]) => {
      const score = typeof data === 'object' && data.score ? data.score : (typeof data === 'number' ? data : 0)
      acc[ticker] = score
      return acc
    }, {} as { [ticker: string]: number })

    console.log('Extracted momentum scores:', momentumScores)

    // Update the allETFs array with new momentum scores
    allETFs.value.forEach(etf => {
      const score = momentumScores[etf.ticker] || 0
      etf.momentumScore = score
      console.log(`Updated ${etf.ticker} with momentum score: ${score}`)
    })

    console.log('Updated momentum scores for', Object.keys(momentumScores).length, 'ETFs')
    console.log('Sample ETF with momentum:', allETFs.value.find(etf => etf.ticker === 'GLDM' || etf.ticker === 'QQQ'))
  } catch (error) {
    console.error('Failed to refresh momentum scores:', error)
  }
}

const executeTrades = async () => {
  isExecuting.value = true
  try {
    if (!props.portfolio) {
      throw new Error('No portfolio selected for trade execution')
    }

    console.log('Executing trades:', executionPlan.value)
    
    // Process trades in order: SELL first to free up cash, then BUY
    const sellTrades = executionPlan.value.filter(trade => trade.action === 'sell')
    const buyTrades = executionPlan.value.filter(trade => trade.action === 'buy')
    
    // Execute SELL trades first
    for (const trade of sellTrades) {
      console.log(`Executing SELL: ${trade.shares.toFixed(2)} shares of ${trade.etf}`)
      
      // Use portfolio store to sell holdings
      if (props.portfolio.id) {
        portfolioStore.sellHoldingFromPortfolio(props.portfolio.id, trade.etf, trade.shares)
      } else {
        // Fallback for legacy portfolio format
        portfolioStore.removeHolding(trade.etf)
      }
    }
    
    // Wait a moment for sells to process
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Execute BUY trades with available cash (including sell proceeds)
    for (const trade of buyTrades) {
      console.log(`Executing BUY: ${trade.shares.toFixed(2)} shares of ${trade.etf}`)
      
      // Use portfolio store to add holdings
      if (props.portfolio.id) {
        await portfolioStore.addHoldingToPortfolio(props.portfolio.id, trade.etf, trade.shares, trade.price)
      } else {
        // Fallback for legacy portfolio format
        await portfolioStore.addHolding(trade.etf, trade.shares, trade.price)
      }
    }
    
    // Refresh portfolio prices to reflect new holdings
    if (props.portfolio.id) {
      await portfolioStore.refreshPortfolioPrices(props.portfolio.id)
    } else {
      await portfolioStore.refreshCurrentPrices()
    }
    
    console.log('All trades executed successfully!')
    alert(`Successfully executed ${executionPlan.value.length} trades:\n${sellTrades.length} SELL actions\n${buyTrades.length} BUY actions`)
    
    // Clear execution plan after successful execution
    executionPlan.value = []
    
  } catch (error) {
    console.error('Trade execution failed:', error)
    alert(`Trade execution failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    isExecuting.value = false
  }
}

const optimizeFurther = () => {
  // Implement further optimization logic
  console.log('Further optimization...')
}

// localStorage keys
const STRATEGY_CONFIG_KEY = 'momentum-rider-strategy-config'
const SELECTED_STRATEGY_KEY = 'momentum-rider-selected-strategy'

// Load saved configuration from localStorage
const loadFromLocalStorage = () => {
  try {
    const savedConfig = localStorage.getItem(STRATEGY_CONFIG_KEY)
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      // Update strategyConfig with saved values
      if (config.momentum) {
        Object.assign(strategyConfig.momentum, config.momentum)
      }
      if (config.allweather) {
        Object.assign(strategyConfig.allweather, config.allweather)
      }
      if (config.custom) {
        strategyConfig.custom.allocations = config.custom.allocations || {}
      }
      // Note: additionalCapital removed from strategy config to prevent conflicts
      // Portfolio cash is always used from props.portfolio.additionalCash
      console.log('Loaded strategy config from localStorage:', config)
    }

    // Load selected strategy
    const savedStrategy = localStorage.getItem(SELECTED_STRATEGY_KEY)
    if (savedStrategy) {
      const strategy = availableStrategies.find(s => s.id === savedStrategy)
      if (strategy) {
        selectedStrategy.value = strategy
        
        // If ETF data is already loaded, select all ETFs for the loaded strategy
        if (allETFs.value.length > 0) {
          selectedETFs.value = allETFs.value.map(etf => etf.ticker)
          console.log(`Loaded strategy ${strategy.id} and selected all ${selectedETFs.value.length} ETFs`)
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
  }
}

// Save configuration to localStorage
const saveToLocalStorage = () => {
  try {
    const configToSave = {
      momentum: strategyConfig.momentum,
      allweather: strategyConfig.allweather,
      custom: strategyConfig.custom
      // Note: additionalCapital removed to prevent conflicts with portfolio cash
    }
    localStorage.setItem(STRATEGY_CONFIG_KEY, JSON.stringify(configToSave))

    if (selectedStrategy.value) {
      localStorage.setItem(SELECTED_STRATEGY_KEY, selectedStrategy.value.id)
    }
    console.log('Saved strategy config to localStorage')
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// Watch portfolio cash for debugging
watch(() => props.portfolio?.additionalCash, (newValue, oldValue) => {
  console.log('Portfolio Additional Cash changed:', {
    newValue,
    oldValue,
    typeofNew: typeof newValue,
    timestamp: new Date().toISOString()
  })
}, { immediate: true })

// Initialize
onMounted(async () => {
  // Load saved configuration from localStorage first
  loadFromLocalStorage()

  // Debug: Check what was loaded
  console.log('After loading from localStorage:', {
    selectedStrategy: selectedStrategy.value,
    strategyConfig: strategyConfig
  })

  // Load ETF universe and fetch real ETF data with momentum
  try {
    await etfConfigStore.loadETFUniverse()

    // Get all tickers from the universe
    const allTickers = Object.values(etfConfigStore.etfUniverse).flat()

    // Fetch real quote data for all ETFs with better error handling
    console.log('Fetching real ETF data for', allTickers.length, 'tickers...')
    const quotePromises = allTickers.map(async ticker => {
      try {
        console.log(`Fetching quote for ${ticker}...`)
        const quote = await etfService.getQuote(ticker)
        console.log(`✅ Success for ${ticker}:`, {
          name: quote.shortName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent
        })
        return { ticker, ...quote, success: true }
      } catch (error) {
        console.warn(`❌ Failed to fetch quote for ${ticker}:`, error)
        return { ticker, success: false, error: error.message }
      }
    })

    const quoteResults = await Promise.allSettled(quotePromises)
    const quotes = quoteResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(quote => quote.success)

    console.log(`Successfully fetched quotes for ${quotes.length}/${allTickers.length} ETFs`)

    // Log sample successful quotes for debugging
    if (quotes.length > 0) {
      console.log('Sample successful quotes:', quotes.slice(0, 3))
    }

    // Create a ticker to quote mapping
    const quoteMap = new Map(quotes.map(quote => [quote.ticker, quote]))

    // Fetch real momentum scores from the portfolio analysis API
    console.log('Fetching momentum scores for ETFs...')
    let momentumScores: { [ticker: string]: number } = {}
    try {
      const momentumResponse = await portfolioService.analyzeStrategy({
        strategy: {
          type: 'momentum',
          parameters: {
            momentum: {
              topN: 10, // Get scores for all ETFs
              includeIBIT: false,
              fallbackETF: 'SGOV'
            }
          }
        },
        selectedETFs: allTickers,
        additionalCapital: 0,
        currentHoldings: []
      })

      // Extract momentum scores from the analysis
      momentumScores = Object.entries((momentumResponse as any).analysis?.momentumScores || {}).reduce((acc, [ticker, data]: [string, any]) => {
        const score = typeof data === 'object' && data.score ? data.score : (typeof data === 'number' ? data : 0)
        acc[ticker] = score
        return acc
      }, {} as { [ticker: string]: number })

      console.log('Loaded momentum scores for', Object.keys(momentumScores).length, 'ETFs')
      console.log('Sample momentum scores:', Object.entries(momentumScores).slice(0, 3))
    } catch (momentumError) {
      console.warn('Failed to fetch momentum scores, using zeros:', momentumError)
      // Use zero momentum scores as fallback
      momentumScores = allTickers.reduce((acc, ticker) => {
        acc[ticker] = 0
        return acc
      }, {} as { [ticker: string]: number })
    }

    // Transform store data to ETFInfo format with real data
    allETFs.value = Object.entries(etfConfigStore.etfUniverse).flatMap(([category, tickers]) =>
      tickers.map(ticker => {
        const quote = quoteMap.get(ticker)
        return {
          ticker,
          name: quote?.shortName || quote?.longName || `${ticker} ${category} ETF`,
          category,
          isCustom: false,
          currentPrice: quote?.regularMarketPrice || cachedPrices.value[ticker] || null,
          dayChange: quote?.regularMarketChangePercent || null,
          previousClose: quote?.regularMarketPreviousClose || null,
          marketCap: quote?.marketCap || null,
          volume: quote?.regularMarketVolume || null,
          momentumScore: momentumScores[ticker] || 0
        }
      })
    )

    console.log('Loaded real ETF data with momentum for', allETFs.value.length, 'ETFs')
  } catch (error) {
    console.error('Failed to load ETF universe or fetch data:', error)

    // Fallback to mock data if there's an error
    allETFs.value = Object.entries(etfConfigStore.etfUniverse).flatMap(([category, tickers]) =>
      tickers.map(ticker => ({
        ticker,
        name: `${ticker} ${category} ETF`,
        category,
        isCustom: false,
        currentPrice: Math.random() * 200 + 50, // Mock price
        momentumScore: (Math.random() - 0.5) * 20 // Mock momentum score
      }))
    )
  }
})
</script>

<style scoped>
.strategy-hub {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hub-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-portfolio-summary .summary-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.summary-label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.summary-details {
  font-size: 0.85rem;
  opacity: 0.7;
}

.strategy-tabs {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.strategy-tab {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
}

.strategy-tab:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.strategy-tab.active {
  border-color: #007bff;
  background: #f8f9ff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.tab-icon {
  font-size: 2rem;
}

.tab-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.tab-description {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.3;
}

.strategy-content {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.subsection-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.config-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
  padding: 25px;
  background: #f8f9fa;
  border-radius: 12px;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-input, .config-select {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.config-input:focus, .config-select:focus {
  outline: none;
  border-color: #007bff;
}

.currency-input {
  padding-left: 8px;
}

.currency {
  font-weight: 600;
  color: #666;
}

.unit {
  font-size: 0.9rem;
  color: #666;
  min-width: 40px;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #007bff;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-description {
  font-size: 0.9rem;
  color: #666;
}

.custom-allocation-editor {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
}

.allocation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.allocation-total {
  font-weight: 600;
  color: #333;
}

.allocation-list {
  margin-bottom: 20px;
}

.allocation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 12px;
  padding: 15px;
  background: white;
  border-radius: 8px;
}

.allocation-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.allocation-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
}

.percent {
  font-size: 0.9rem;
  color: #666;
  min-width: 20px;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-etf-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 20px;
}

.add-etf-form {
  display: flex;
  gap: 10px;
}

.add-etf-input {
  flex: 1;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.add-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.etf-selection-section {
  margin-bottom: 30px;
}

.etf-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.refresh-btn {
  padding: 8px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.refresh-btn:hover {
  background: #0056b3;
}

.etf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.etf-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.etf-card:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.etf-card.selected {
  border-color: #007bff;
  background: #f8f9ff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.etf-card.custom {
  border-color: #28a745;
}

.etf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.etf-ticker {
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
}

.custom-badge {
  background: #28a745;
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
}

.positive-badge {
  background: #28a745;
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
}

.etf-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.etf-category {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 5px;
}

.etf-price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.etf-price {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.etf-price-placeholder {
  font-size: 0.85rem;
  color: #999;
  font-style: italic;
}

.etf-change {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}

.etf-change.positive {
  color: #28a745;
  background: rgba(40, 167, 69, 0.1);
}

.etf-change.negative {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.capital-section {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.action-section {
  text-align: center;
  margin-bottom: 40px;
}

.analyze-btn {
  padding: 15px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 10px;
  min-width: 200px;
}

.analysis-results {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.results-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.result-card {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.comparison-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 15px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.action-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.action-badge.buy {
  background: #d4edda;
  color: #155724;
}

.action-badge.sell {
  background: #f8d7da;
  color: #721c24;
}

.action-badge.hold {
  background: #e2e3e5;
  color: #383d41;
}

.optimization-metrics {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
}

.metric-label {
  font-weight: 500;
  color: #666;
}

.metric-value {
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
}

.execution-plan {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
}

.trade-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: 500;
  color: #666;
}

.summary-value {
  font-weight: 600;
  color: #333;
}

.summary-value.buy {
  color: #28a745;
}

.summary-value.sell {
  color: #dc3545;
}

.trade-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.trade-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 10px;
  border-left: 4px solid #007bff;
}

.trade-item.buy {
  border-left-color: #28a745;
}

.trade-item.sell {
  border-left-color: #dc3545;
}

.trade-action {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.9rem;
  min-width: 50px;
}

.trade-details {
  display: flex;
  gap: 15px;
  align-items: center;
}

.trade-etf {
  font-weight: 600;
  min-width: 60px;
}

.trade-shares {
  color: #666;
  font-size: 0.9rem;
}

.trade-value {
  font-weight: 600;
  min-width: 100px;
  text-align: right;
}

.trade-reason {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.execution-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.execute-btn {
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 10px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.title-with-back {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .title-with-back {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .back-btn {
    align-self: flex-start;
  }

  .strategy-tabs {
    flex-direction: column;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .trade-item {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .execution-actions {
    flex-direction: column;
  }

  .deviation-info {
    margin-top: 8px;
    padding: 8px;
    background: #e7f3ff;
    border-radius: 6px;
    border-left: 4px solid #007bff;
  }

  .deviation-info small {
    color: #495057;
    line-height: 1.4;
  }
}
</style>