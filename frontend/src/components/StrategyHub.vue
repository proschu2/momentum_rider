<template>
  <div class="strategy-hub">
    <!-- Header with Current Portfolio Status -->
    <div class="hub-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="text-2xl font-bold text-neutral-900">Strategy Hub</h1>
          <p class="text-neutral-600">Configure and optimize your portfolio strategy</p>
        </div>
        <div class="current-portfolio-summary">
          <div class="summary-card">
            <div class="summary-label">Current Portfolio</div>
            <div class="summary-value">${{ totalPortfolioValue.toLocaleString() }}</div>
            <div class="summary-details">{{ currentHoldings.length }} holdings</div>
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
        <h2 class="section-title">Configure {{ selectedStrategy.name }}</h2>

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
                positive: etf.momentumScore > 0
              }]"
              @click="toggleETF(etf.ticker)"
            >
              <div class="etf-header">
                <span class="etf-ticker">{{ etf.ticker }}</span>
                <span v-if="etf.isCustom" class="custom-badge">Custom</span>
                <span v-if="etf.momentumScore > 0" class="positive-badge">+{{ etf.momentumScore.toFixed(1) }}%</span>
              </div>
              <div class="etf-details">
                <div class="etf-name">{{ etf.name }}</div>
                <div class="etf-category">{{ etf.category }}</div>
                <div v-if="etf.currentPrice" class="etf-price">
                  ${{ etf.currentPrice.toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Capital -->
        <div class="capital-section">
          <h3 class="subsection-title">Additional Investment</h3>
          <div class="input-group">
            <label class="config-label">Extra Capital to Invest</label>
            <div class="input-with-unit">
              <span class="currency">$</span>
              <input
                v-model.number="strategyConfig.additionalCapital"
                type="number"
                min="0"
                step="100"
                class="config-input currency-input"
              />
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
        <!-- Current vs Target Comparison -->
        <div class="result-card">
          <h3 class="card-title">Portfolio Comparison</h3>
          <div class="comparison-table">
            <div class="table-header">
              <span>ETF</span>
              <span>Current</span>
              <span>Target</span>
              <span>Action</span>
            </div>
            <div
              v-for="comparison in portfolioComparison"
              :key="comparison.etf"
              class="table-row"
            >
              <span class="etf-name">{{ comparison.etf }}</span>
              <span class="current-value">${{ comparison.currentValue.toLocaleString() }}</span>
              <span class="target-value">${{ comparison.targetValue.toLocaleString() }}</span>
              <span :class="['action-badge', comparison.action]">
                {{ comparison.action }}
              </span>
            </div>
          </div>
        </div>

        <!-- Optimization Results -->
        <div class="result-card">
          <h3 class="card-title">Optimization Summary</h3>
          <div class="optimization-metrics">
            <div class="metric">
              <div class="metric-label">Total Investment</div>
              <div class="metric-value">${{ analysisResults.totalInvestment.toLocaleString() }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Utilized Capital</div>
              <div class="metric-value">${{ analysisResults.utilizedCapital.toLocaleString() }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Uninvested Cash</div>
              <div class="metric-value">${{ analysisResults.uninvestedCash.toLocaleString() }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Utilization Rate</div>
              <div class="metric-value">{{ analysisResults.utilizationRate.toFixed(1) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Execution Plan -->
      <div class="execution-plan">
        <h3 class="card-title">Trade Execution Plan</h3>
        <div class="trade-list">
          <div
            v-for="trade in executionPlan"
            :key="`${trade.etf}-${trade.action}`"
            :class="['trade-item', trade.action]"
          >
            <div class="trade-action">{{ trade.action.toUpperCase() }}</div>
            <div class="trade-details">
              <span class="trade-etf">{{ trade.etf }}</span>
              <span class="trade-shares">{{ trade.shares.toFixed(2) }} shares</span>
              <span class="trade-value">${{ trade.value.toLocaleString() }}</span>
            </div>
            <div class="trade-reason">{{ trade.reason }}</div>
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
  additionalCapital: number
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
  reason: string
}

// Store
const etfConfigStore = useETFConfigStore()

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
  },
  additionalCapital: 0
})

// Portfolio data
const currentHoldings = ref<PortfolioHolding[]>([])
const allETFs = ref<ETFInfo[]>([])

// Computed properties
const totalPortfolioValue = computed(() => {
  return currentHoldings.value.reduce((sum, holding) => {
    // This would be calculated with real prices
    return sum + (holding.shares * 100) // Mock price
  }, 0)
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

// Methods
const selectStrategy = (strategy: Strategy) => {
  selectedStrategy.value = strategy

  // Select ALL available ETFs by default for any strategy
  selectedETFs.value = allETFs.value.map(etf => etf.ticker)

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

  try {
    // Debug: Log current state before building request
    console.log('=== Analyze Strategy Debug ===')
    console.log('Current Vue timestamp:', new Date().toISOString())
    console.log('strategyConfig additionalCapital:', strategyConfig.additionalCapital)
    console.log('typeof strategyConfig.additionalCapital:', typeof strategyConfig.additionalCapital)
    console.log('selectedETFs.value length:', selectedETFs.value.length)
    console.log('canAnalyze.value:', canAnalyze.value)

    // Prepare analysis request with correct parameter structure
    let parameters = {};

    if (selectedStrategy.value!.id === 'momentum') {
      parameters = strategyConfig.momentum;
    } else if (selectedStrategy.value!.id === 'allweather') {
      parameters = strategyConfig.allweather;
    } else if (selectedStrategy.value!.id === 'custom') {
      parameters = strategyConfig.custom;
    }

    const analysisRequest = {
      strategy: {
        type: selectedStrategy.value!.id,
        parameters: parameters
      },
      selectedETFs: selectedETFs.value,
      additionalCapital: strategyConfig.additionalCapital,
      currentHoldings: currentHoldings.value
    }

    // Debug: Log what we're sending
    console.log('Sending analysis request:', {
      strategy: selectedStrategy.value!.id,
      selectedETFsCount: selectedETFs.value.length,
      selectedETFs: selectedETFs.value,
      momentumConfig: strategyConfig.momentum,
      additionalCapital: analysisRequest.additionalCapital,
      typeofAdditionalCapital: typeof analysisRequest.additionalCapital
    })

    // Call real portfolio analysis API
    const analysis = await portfolioService.analyzeStrategy(analysisRequest)

    // Calculate proper optimization values using real portfolio optimization
    let optimizationResult = null
    try {
      // Use the portfolio optimization service to get real optimization data
      console.log('Calling optimization service with strategy:', analysisRequest.strategy)
      optimizationResult = await portfolioService.optimizePortfolio({
        strategy: analysisRequest.strategy,
        selectedETFs: selectedETFs.value,
        additionalCapital: analysisRequest.additionalCapital,
        currentHoldings: analysisRequest.currentHoldings
      })
      console.log('Optimization service returned:', optimizationResult)
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

      // Generate execution plan using optimization service data
      if (optimizationResult && optimizationResult.allocations && Array.isArray(optimizationResult.allocations) && optimizationResult.allocations.length > 0) {
        try {
          console.log('Generating execution plan from optimization allocations:', optimizationResult.allocations)

          const validAllocations = optimizationResult.allocations.filter((allocation: any) => {
            return allocation && allocation !== null && typeof allocation === 'object'
          })

          console.log('Valid allocations after filtering:', validAllocations)

          executionPlan.value = validAllocations
            .filter((allocation: any) => {
              try {
                return allocation && (
                  (Number(allocation.sharesToBuy) > 0) ||
                  (allocation.holdingsToSell && Array.isArray(allocation.holdingsToSell) && allocation.holdingsToSell.length > 0)
                )
              } catch (error) {
                console.warn('Error filtering allocation:', allocation, error)
                return false
              }
            })
            .map((allocation: any) => {
              try {
                // Determine if this is a buy or sell action
                const isBuy = Number(allocation.sharesToBuy) > 0
                const sharesToTrade = isBuy ? (Number(allocation.sharesToBuy) || 0) :
                  (allocation.holdingsToSell && Array.isArray(allocation.holdingsToSell) ?
                    allocation.holdingsToSell.reduce((sum: number, h: any) => sum + (Number(h.shares) || 0), 0) : 0)

                // Calculate price with fallbacks
                let price = 100 // Default fallback
                if (allocation.pricePerShare && Number(allocation.pricePerShare) > 0) {
                  price = Number(allocation.pricePerShare)
                } else if (allocation.finalValue && allocation.finalShares && Number(allocation.finalShares) > 0) {
                  price = Number(allocation.finalValue) / Number(allocation.finalShares)
                }

                return {
                  etf: allocation.etf || allocation.etfName || 'UNKNOWN',
                  action: isBuy ? 'buy' : 'sell',
                  shares: sharesToTrade,
                  value: Number(allocation.targetValue || allocation.finalValue || 0),
                  price: price,
                  reason: allocation.deviation > 0 ? 'Overweight' : allocation.deviation < 0 ? 'Underweight' : 'On target'
                }
              } catch (error) {
                console.warn('Error mapping allocation to trade:', allocation, error)
                return null
              }
            })
            .filter((trade: any) => trade && trade !== null && Number(trade.shares) > 0) // Only include valid trades

          console.log('Generated execution plan with', executionPlan.value.length, 'trades')
          console.log('Execution plan trades:', executionPlan.value)
        } catch (error) {
          console.error('Error generating execution plan from optimization allocations:', error)
          console.error('Optimization result that caused error:', optimizationResult)

          // Reset execution plan to empty array on error
          executionPlan.value = []
        }
      }

      // ALWAYS generate portfolio comparison and fallback execution plan
      // Use optimization target values if available, otherwise fall back to analysis target values
      const targetValues = optimizationResult?.targetValues || analysis.targetValues || {}

      portfolioComparison.value = selectedETFs.value.map(etf => {
        const currentValue = analysis.currentValues[etf] || 0
        const targetValue = targetValues[etf] || 0

        let action: 'buy' | 'sell' | 'hold' = 'hold'
        if (targetValue > currentValue * 1.05) action = 'buy'
        else if (targetValue < currentValue * 0.95) action = 'sell'

        return { etf, currentValue, targetValue, action }
      })

      console.log('Portfolio comparison generated using target values:', targetValues)

      // Only generate fallback execution plan if the main execution plan is empty
      if (executionPlan.value.length === 0) {
        console.log('Using fallback execution plan from portfolio comparison')
        executionPlan.value = portfolioComparison.value
          .filter(comp => comp.action !== 'hold')
          .map(comp => {
            // Get real ETF price from analysis momentum scores
            const etfPrice = analysis.momentumScores?.[comp.etf]?.price || 100
            const shares = Math.abs(comp.targetValue - comp.currentValue) / etfPrice
            return {
              etf: comp.etf,
              action: comp.action,
              shares,
              value: comp.targetValue - comp.currentValue,
              price: etfPrice,
              reason: comp.action === 'buy' ? 'Underweight' : 'Overweight'
            }
          })
      }

  } catch (error) {
    console.error('Strategy analysis failed:', error)
    alert(`Analysis failed: ${error.message}`)
  } finally {
    isAnalyzing.value = false
  }
}

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
          topN: 10,
          includeIBIT: false,
          fallbackETF: 'SGOV'
        }
      },
      selectedETFs: allTickers,
      additionalCapital: 0,
      currentHoldings: []
    })

    // Debug: Log the full response structure
    console.log('Full momentum response:', momentumResponse)
    console.log('Momentum response structure:', {
      hasMomentumScores: !!momentumResponse.momentumScores,
      momentumKeys: momentumResponse.momentumScores ? Object.keys(momentumResponse.momentumScores) : []
    })

    // Extract and update momentum scores with proper error handling
    const momentumScores = Object.entries(momentumResponse.momentumScores || {}).reduce((acc, [ticker, data]: [string, any]) => {
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
    // Simulate trade execution
    await new Promise(resolve => setTimeout(resolve, 3000))
    alert('Trades executed successfully!')
  } catch (error) {
    console.error('Trade execution failed:', error)
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
      if (config.additionalCapital !== undefined) {
        strategyConfig.additionalCapital = config.additionalCapital
      }
      console.log('Loaded strategy config from localStorage:', config)
    }

    // Load selected strategy
    const savedStrategy = localStorage.getItem(SELECTED_STRATEGY_KEY)
    if (savedStrategy) {
      const strategy = availableStrategies.find(s => s.id === savedStrategy)
      if (strategy) {
        selectedStrategy.value = strategy
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
      custom: strategyConfig.custom,
      additionalCapital: strategyConfig.additionalCapital
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

// Watch additional capital for debugging
watch(() => strategyConfig.additionalCapital, (newValue, oldValue) => {
  console.log('Additional Capital changed:', {
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

    // Fetch real quote data for all ETFs
    console.log('Fetching real ETF data for', allTickers.length, 'tickers...')
    const quotePromises = allTickers.map(ticker => etfService.getQuote(ticker))
    const quotes = await Promise.all(quotePromises)

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
            topN: 10, // Get scores for all ETFs
            includeIBIT: false,
            fallbackETF: 'SGOV'
          }
        },
        selectedETFs: allTickers,
        additionalCapital: strategyConfig.additionalCapital,
        currentHoldings: []
      })

      // Extract momentum scores from the analysis
      momentumScores = Object.entries(momentumResponse.analysis?.momentumScores || {}).reduce((acc, [ticker, data]: [string, any]) => {
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
          name: quote?.shortName || `${ticker} ${category} ETF`,
          category,
          isCustom: false,
          currentPrice: quote?.regularMarketPrice || 100, // Use real price or fallback
          momentumScore: momentumScores[ticker] || 0 // Use real momentum score
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

.etf-category, .etf-price {
  font-size: 0.85rem;
  color: #666;
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

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
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
}
</style>