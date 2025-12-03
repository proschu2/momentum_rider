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
        <div v-if="selectedStrategy.id === 'allweather'" class="config-panel compact">
          <div class="allweather-header compact">
            <div class="allweather-icon">🌤️</div>
            <div class="allweather-title">
              <h3>All-Weather Portfolio</h3>
              <p>Dalio-inspired allocation with 10-month SMA trend filtering</p>
            </div>
          </div>

          <!-- Configuration Summary -->
          <div class="config-summary">
            <div class="summary-item">
              <div class="summary-icon">💰</div>
              <div class="summary-text">
                <strong>Portfolio:</strong> Uses actual holdings value
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon">📊</div>
              <div class="summary-text">
                <strong>SMA Period:</strong> Fixed at 10 months
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon">🎯</div>
              <div class="summary-text">
                <strong>ETFs:</strong> 9 optimized assets
              </div>
            </div>
          </div>

          <!-- Minimal ETF Cards View -->
          <div class="minimal-etf-cards">
            <div class="cards-header">
              <h4>ETF Universe Performance</h4>
              <span class="subtitle">10-month Simple Moving Average Analysis</span>
            </div>
            <div class="cards-grid">
              <div
                v-for="etf in getAllWeatherETFs()"
                :key="etf.ticker"
                class="minimal-etf-card"
                :class="getETFCardClass(etf)"
              >
                <div class="card-ticker">{{ etf.ticker }}</div>
                <div class="card-status" :class="getETFStatusClass(etf)">
                  {{ getETFStatus(etf) }}
                </div>
                <div class="card-details">
                  <div class="card-price">${{ getETFPrice(etf) }}</div>
                  <div class="card-sma">SMA: ${{ getETFSMA(etf) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="config-group">
            <label class="config-label">📊 Analysis Options</label>
            <div class="compact-options">
              <label class="compact-checkbox">
                <input
                  v-model="strategyConfig.allweather.showTrendSignals"
                  type="checkbox"
                />
                <span>Show detailed trend signals & SGOV allocation</span>
              </label>
            </div>
          </div>

          <div class="config-help compact">
            <strong>Strategy:</strong> 10-month SMA trend filtering with SGOV cash fallback |
            <strong>Universe:</strong> VTI, VEA, VWO, IEF, TIP, IGIL.L, PDBC, GLDM, SGOV |
            <strong>Expense Ratio:</strong> 0.162% | <strong>Rebalancing:</strong> Monthly
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
        <div v-show="selectedStrategy?.id !== 'allweather'" class="etf-selection-section">
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

    <!-- Unified Portfolio Execution Interface -->
    <div v-if="analysisResults && filteredPortfolioComparison.length > 0" class="portfolio-execution">
      <!-- Header with Metrics -->
      <div class="execution-header">
        <div class="execution-title">
          <h3 class="title-text">Portfolio Execution Plan</h3>
          <p class="title-subtitle">{{ selectedStrategy?.name || 'Selected Strategy' }}</p>
        </div>

        <!-- Compact Metrics Bar -->
        <div class="metrics-bar">
          <div class="metric-item">
            <div class="metric-content">
              <span class="metric-value">${{ analysisResults?.totalInvestment?.toLocaleString() || '0' }}</span>
              <span class="metric-label">Total</span>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-content">
              <span class="metric-value">{{ analysisResults?.utilizationRate?.toFixed(1) || '0.0' }}%</span>
              <span class="metric-label">Used</span>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-content">
              <span class="metric-value">${{ analysisResults?.uninvestedCash?.toLocaleString() || '0' }}</span>
              <span class="metric-label">Left</span>
            </div>
          </div>
          <div class="metric-item">
            <span :class="['utilization-indicator', getUtilizationClass()]">
              {{ getUtilizationEmoji() }}
            </span>
          </div>
        </div>
      </div>

      <!-- All-Weather Specific Displays -->
      <div v-if="selectedStrategy?.id === 'allweather' && strategyConfig.allweather.showTrendSignals">
        <!-- Trend Signals Section -->
        <div v-if="analysisResults?.trendSignals" class="trend-signals-section">
          <h4 class="section-title">📈 10-Month SMA Trend Signals</h4>
          <div class="trend-signals-container">
            <div
              v-for="(signal, etf) in analysisResults.trendSignals"
              :key="etf"
              :class="['trend-signal-card', signal.signal === 1 ? 'in-uptrend' : 'in-downtrend']"
            >
              <div class="trend-signal-header">
                <span class="trend-signal-ticker">{{ etf }}</span>
                <span :class="['trend-signal-status', signal.signal === 1 ? 'in' : 'out']">
                  {{ signal.action }}
                </span>
              </div>
              <div class="trend-signal-details">
                {{ signal.analysis.percentDifference }} from 10-month SMA
              </div>
              <div class="trend-signal-price">
                <span>Price: ${{ signal.analysis.price }}</span>
                <span>SMA: ${{ signal.analysis.sma }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SGOV Allocation Section -->
        <div v-if="analysisResults?.targetAllocations" class="sgov-section">
          <div class="sgov-allocation-card">
            <div class="sgov-allocation-header">
              <span class="sgov-allocation-icon">💰</span>
              <span class="sgov-allocation-title">SGOV Cash Allocation</span>
            </div>
            <div class="sgov-allocation-details">
              <div class="sgov-metric">
                <div class="sgov-metric-value">{{ analysisResults.targetAllocations.sgovAllocation.toFixed(1) }}%</div>
                <div class="sgov-metric-label">Cash Position</div>
              </div>
              <div class="sgov-metric">
                <div class="sgov-metric-value">{{ analysisResults.targetAllocations.totalActiveWeight.toFixed(1) }}%</div>
                <div class="sgov-metric-label">Deployed Capital</div>
              </div>
              <div class="sgov-metric">
                <div class="sgov-metric-value">{{ analysisResults.targetAllocations.trendFilteredETFs.length }}</div>
                <div class="sgov-metric-label">Active ETFs</div>
              </div>
              <div class="sgov-metric">
                <div class="sgov-metric-value">4.8%</div>
                <div class="sgov-metric-label">Expected Yield</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Methodology Info -->
        <div class="allweather-methodology">
          <h4 class="section-title">🎯 All-Weather Methodology</h4>
          <div class="methodology-grid">
            <div class="methodology-item">
              <div class="methodology-icon">📊</div>
              <div class="methodology-text">
                <strong>10-Month SMA</strong> trend filtering for all positions
              </div>
            </div>
            <div class="methodology-item">
              <div class="methodology-icon">🎯</div>
              <div class="methodology-text">
                <strong>Dynamic Deviation Tolerances</strong> (±1-5% based on position size)
              </div>
            </div>
            <div class="methodology-item">
              <div class="methodology-icon">🔢</div>
              <div class="methodology-text">
                <strong>Integer Share Optimization</strong> with linear programming
              </div>
            </div>
            <div class="methodology-item">
              <div class="methodology-icon">💰</div>
              <div class="methodology-text">
                <strong>SGOV Cash Fallback</strong> for trend exit proceeds
              </div>
            </div>
          </div>
          <div class="methodology-summary">
            <small>
              <strong>Expense Ratio:</strong> {{ analysisResults?.expenseRatio ? (analysisResults.expenseRatio * 100).toFixed(3) : '0.162' }}% |
              <strong>Validation:</strong> {{ analysisResults?.finalPortfolioState?.validation?.isValid ? '✅ PASSED' : '❌ FAILED' }} |
              <strong>Rebalancing:</strong> Monthly
            </small>
          </div>
        </div>
      </div>

      <!-- Mobile Cards / Desktop Table -->
      <div class="execution-content">
        <!-- Mobile: Card Layout -->
        <div class="mobile-cards">
          <div
            v-for="comparison in filteredPortfolioComparison"
            :key="comparison.etf"
            class="etf-card"
            @click="toggleCardExpansion(comparison.etf)"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="etf-info">
                <span class="etf-name">{{ comparison.etf }}</span>
                <span class="action-status" :class="comparison.action">
                  {{ getActionIcon(comparison.action) }} {{ comparison.action.toUpperCase() }}
                </span>
              </div>
              <div class="trade-value" :class="getTradeValueClass(comparison)">
                {{ formatTradeValue(comparison) }}
              </div>
            </div>

            <!-- Expandable Details -->
            <div v-if="expandedCards.has(comparison.etf)" class="card-details">
              <div class="detail-row">
                <span class="detail-label">Current:</span>
                <span class="detail-value">${{ comparison.currentValue?.toLocaleString() || '0' }} ({{ comparison.currentShares || 0 }} sh)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Target:</span>
                <span class="detail-value">{{ comparison.targetValue?.toLocaleString() || '0' }} ({{ (comparison.targetAllocation || 0).toFixed(1) }}%)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shares to Trade:</span>
                <span class="detail-value">{{ comparison.sharesToTrade?.toFixed(2) || '0.00' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reason:</span>
                <span class="detail-value reason-badge">{{ getCompactReason(comparison) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: Table Layout -->
        <div class="desktop-table">
          <div class="table-header">
            <span>ETF</span>
            <span>Current Holdings</span>
            <span>Target Allocation</span>
            <span>Action Status</span>
            <span>Shares to Trade</span>
            <span>Trade Value</span>
            <span>Reason</span>
          </div>
          <div
            v-for="comparison in filteredPortfolioComparison"
            :key="comparison.etf"
            class="table-row"
          >
            <span class="etf-name">{{ comparison.etf }}</span>
            <span class="current-value">${{ comparison.currentValue?.toLocaleString() || '0' }}</span>
            <span class="target-value">{{ comparison.targetValue?.toLocaleString() || '0' }} ({{ (comparison.targetAllocation || 0).toFixed(1) }}%)</span>
            <span class="action-status" :class="comparison.action">
              {{ getActionIcon(comparison.action) }} {{ comparison.action.toUpperCase() }}
            </span>
            <span class="shares-to-trade">{{ comparison.sharesToTrade?.toFixed(2) || '0.00' }}</span>
            <span class="trade-value" :class="getTradeValueClass(comparison)">
              {{ formatTradeValue(comparison) }}
            </span>
            <span class="compact-reason">{{ getCompactReason(comparison) }}</span>
          </div>
        </div>
      </div>

      <!-- Execution Summary -->
      <div class="execution-summary">
        <div class="summary-title">📋 Trade Summary</div>
        <div class="summary-metrics">
          <div class="summary-item">
            <span class="summary-label">
              {{ executionPlan.filter(t => t.action === 'buy').length }} BUY orders:
            </span>
            <span class="summary-value buy">
              +${{ totalBuyCost.toLocaleString() }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">
              {{ executionPlan.filter(t => t.action === 'sell').length }} SELL orders:
            </span>
            <span class="summary-value sell">
              -${{ totalSellProceeds.toLocaleString() }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Net cash flow:</span>
            <span class="summary-value" :class="getNetCashFlowClass()">
              {{ formatNetCashFlow() }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Optimization:</span>
            <span class="summary-value method">Linear Programming</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Confidence:</span>
            <span class="summary-value confidence">🟢 High</span>
          </div>
        </div>
      </div>

      <!-- Execution Actions -->
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
  dayChange?: number
  dayChangePercent?: number
  previousClose?: number
  marketCap?: number
  volume?: number
}

interface QuoteResponse {
  ticker: string
  success: boolean
  error?: any
  shortName?: string
  longName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketPreviousClose?: number
  marketCap?: number
  regularMarketVolume?: number
  currency?: string
  marketState?: string
  quoteType?: string
}

interface StrategyConfig {
  momentum: {
    topN: number
    includeIBIT: boolean
    fallbackETF: string
  }
  allweather: {
    smaPeriod: number
    totalPortfolioValue: number
    rebalanceDate: string
    showTrendSignals: boolean
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
  // All-Weather specific fields
  strategy?: string
  trendSignals?: Record<string, {
    currentPrice: number
    sma10Month: number
    signal: number
    priceToSmaRatio: number
    action: string
    analysis: {
      price: string
      sma: string
      difference: string
      percentDifference: string
    }
  }>
  targetAllocations?: {
    etfAllocations: Record<string, number>
    sgovAllocation: number
    totalActiveWeight: number
    trendFilteredETFs: string[]
  }
  expenseRatio?: number
  finalPortfolioState?: {
    validation: {
      isValid: boolean
      violations: any[]
    }
  }
}

interface PortfolioComparison {
  etf: string
  currentValue: number
  targetValue: number
  action: 'buy' | 'sell' | 'hold'
  currentShares?: number
  targetAllocation?: number
  sharesToTrade?: number
  reason?: string
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
const expandedCards = ref(new Set<string>())

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
    smaPeriod: 10, // Fixed at 10-month SMA
    totalPortfolioValue: 100000, // This will be overridden by actual portfolio value
    rebalanceDate: new Date().toISOString().split('T')[0] || '2025-11-21', // Today's date in YYYY-MM-DD format
    showTrendSignals: true
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

const totalBuyCost = computed(() => {
  return executionPlan.value
    .filter(trade => trade.action === 'buy')
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

  // For All-Weather strategy, use the fixed optimized ETF universe
  if (strategy.id === 'allweather') {
    const allWeatherETFs = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
    selectedETFs.value = allWeatherETFs
    console.log(`Selected All-Weather ETF universe: ${allWeatherETFs.join(', ')}`)
  } else {
    // For other strategies, select ALL available ETFs by default
    if (allETFs.value.length > 0) {
      selectedETFs.value = allETFs.value.map(etf => etf.ticker)
      console.log(`Selected all ${selectedETFs.value.length} ETFs for ${strategy.id} strategy`)
    } else {
      console.log('ETF data not yet loaded, will select all when data becomes available')
      // Clear any existing selection to ensure the watcher will select all when data loads
      selectedETFs.value = []
    }
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
      // For All-Weather strategy, calculate total portfolio value (current holdings + cash)
      // and use that as the totalPortfolioValue parameter
      const currentHoldingsValue = currentHoldings.value.reduce((total: number, holding: any) => {
        const price = cachedPrices.value[holding.etf] || holding.price || 0;
        return total + (holding.shares * price);
      }, 0);

      const totalPortfolioValue = currentHoldingsValue + (props.portfolio?.additionalCash || 0);

      // Update the All-Weather config with calculated total portfolio value
      parameters = {
        ...strategyConfig.allweather,
        totalPortfolioValue: totalPortfolioValue
      };

      console.log('All-Weather portfolio calculation:', {
        currentHoldingsValue,
        additionalCash: props.portfolio?.additionalCash || 0,
        totalPortfolioValue,
        holdingsCount: currentHoldings.value.length
      });
    } else if (selectedStrategy.value?.id === 'custom') {
      parameters = strategyConfig.custom;
    }

    // For All-Weather strategy, ensure we use the correct ETF universe
    const etfUniverse = selectedStrategy.value?.id === 'allweather'
      ? ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
      : selectedETFs.value;

    const analysisRequest = {
      strategy: {
        type: selectedStrategy.value?.id as 'momentum' | 'allweather' | 'custom' || 'custom',
        parameters: parameters
      },
      selectedETFs: etfUniverse,
      additionalCapital: props.portfolio ? props.portfolio.additionalCash : 0,
      currentHoldings: currentHoldings.value
    }

    // Debug: Log what we're sending
    console.log('Sending analysis request:', {
      strategy: selectedStrategy.value?.id || 'unknown',
      selectedETFsCount: etfUniverse.length,
      selectedETFs: etfUniverse,
      isAllWeatherStrategy: selectedStrategy.value?.id === 'allweather',
      momentumConfig: strategyConfig.momentum,
      additionalCapital: analysisRequest.additionalCapital,
      portfolioCash: props.portfolio?.additionalCash,
      typeofAdditionalCapital: typeof analysisRequest.additionalCapital
    })

    // Pre-fetch current prices for all selected ETFs to ensure we have latest data
    console.log('Pre-fetching prices for selected ETFs:', etfUniverse)
    try {
      const tickersToFetch = etfUniverse
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
            sells: executionPlan.value.filter(t => t.action === 'sell').length
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

          // Calculate target allocation percentage from the optimization result
          const targetAllocation = allocation.targetPercentage || 0

          // Get actual shares from execution plan API response instead of calculating locally
          const executionTrade = executionPlan.value.find(trade => trade.etf === etf)
          let sharesToTrade = 0

          if (executionTrade) {
            // Use the actual shares from the API response
            sharesToTrade = executionTrade.shares
            // Override action with the actual API action to ensure consistency
            action = executionTrade.action
          } else {
            // Fallback: calculate shares if no execution trade found
            const pricePerShare = allocation.pricePerShare || 100
            const valueDifference = targetValue - currentValue
            if (action === 'buy' && valueDifference > 0) {
              sharesToTrade = Math.round((valueDifference / pricePerShare) * 100) / 100
            } else if (action === 'sell' && valueDifference < 0) {
              sharesToTrade = Math.round((Math.abs(valueDifference) / pricePerShare) * 100) / 100
            }
          }

          return { etf, currentValue, targetValue, targetAllocation, sharesToTrade, action }
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

          // Calculate target allocation percentage from analysis results
          const targetAllocation = analysis.targetAllocations?.[etf] || 0

          // Get actual shares from execution plan API response instead of calculating locally
          const executionTrade = executionPlan.value.find(trade => trade.etf === etf)
          let sharesToTrade = 0
          let action = 'hold'

          if (executionTrade) {
            // Use the actual shares from the API response
            sharesToTrade = executionTrade.shares
            action = executionTrade.action
          } else {
            // Fallback: determine action from value difference if no execution trade found
            const valueDifference = targetValue - currentValue
            if (Math.abs(valueDifference) > 10) { // Only trade if difference > $10
              if (valueDifference > 0) {
                action = 'buy'
                const pricePerShare = cachedPrices.value[etf] || 100
                sharesToTrade = Math.round((valueDifference / pricePerShare) * 100) / 100
              } else {
                action = 'sell'
                const pricePerShare = cachedPrices.value[etf] || 100
                sharesToTrade = Math.round((Math.abs(valueDifference) / pricePerShare) * 100) / 100
              }
            }
          }

          return { etf, currentValue, targetValue, targetAllocation, sharesToTrade, action: action as 'buy' | 'sell' | 'hold' }
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

// Watch for allETFs to be loaded and ensure appropriate ETFs are selected for the strategy
watch(allETFs, (newETFs) => {
  if (newETFs.length > 0 && selectedStrategy.value) {
    // If we have a strategy selected but no ETFs selected yet, select appropriate ETFs
    if (selectedETFs.value.length === 0) {
      if (selectedStrategy.value.id === 'allweather') {
        const allWeatherETFs = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
        selectedETFs.value = allWeatherETFs
        console.log('ETF data loaded, selecting All-Weather ETF universe:', allWeatherETFs.join(', '))
      } else {
        selectedETFs.value = newETFs.map(etf => etf.ticker)
        console.log('ETF data loaded, selecting all ETFs for strategy:', selectedStrategy.value.id)
      }
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

// Refresh momentum scores for all ETFs (only if not All-Weather strategy)
const refreshMomentumScores = async () => {
  // Skip momentum refresh for All-Weather strategy since it doesn't use momentum scores
  if (selectedStrategy.value?.id === 'allweather') {
    console.log('Skipping momentum refresh for All-Weather strategy')
    return
  }

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

// UI Utility Methods for New Portfolio Execution Interface
const toggleCardExpansion = (etf: string) => {
  if (expandedCards.value.has(etf)) {
    expandedCards.value.delete(etf)
  } else {
    expandedCards.value.add(etf)
  }
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'buy':
      return '+'
    case 'sell':
      return '-'
    case 'hold':
      return '•'
    default:
      return '•'
  }
}

const getTradeValueClass = (comparison: any) => {
  if (comparison.action === 'buy') return 'buy-value'
  if (comparison.action === 'sell') return 'sell-value'
  return 'hold-value'
}

const formatTradeValue = (comparison: any) => {
  // Calculate trade value based on actual execution plan data
  const trade = executionPlan.value.find(t => t.etf === comparison.etf && t.action === comparison.action)
  if (trade) {
    const prefix = comparison.action === 'sell' ? '-' : '+'
    return `${prefix}$${Math.abs(trade.value).toLocaleString()}`
  }

  // Fallback calculation if trade not found
  const targetPricePerShare = comparison.targetValue > 0 && comparison.targetAllocation > 0
    ? comparison.targetValue / comparison.targetAllocation
    : 0

  const value = (comparison.sharesToTrade || 0) * targetPricePerShare
  const prefix = comparison.action === 'sell' ? '-' : '+'
  return `${prefix}$${Math.abs(value).toLocaleString()}`
}

const getCompactReason = (comparison: any) => {
  // Extract key reason from verbose descriptions
  if (comparison.reason?.toLowerCase().includes('rebalance')) return '-Rebalance'
  if (comparison.reason?.toLowerCase().includes('new')) return '-New Pos'
  if (comparison.reason?.toLowerCase().includes('remove')) return '-Remove'
  if (comparison.reason?.toLowerCase().includes('momentum')) return '-Momentum'
  return '-Strategy'
}

const getUtilizationClass = () => {
  const rate = analysisResults.value?.utilizationRate || 0
  if (rate >= 95) return 'high'
  if (rate >= 80) return 'medium'
  return 'low'
}

const getUtilizationEmoji = () => {
  const rate = analysisResults.value?.utilizationRate || 0
  if (rate >= 95) return '✓'
  if (rate >= 80) return '!'
  return '!'
}

const getNetCashFlowClass = () => {
  const netFlow = totalBuyCost.value - totalSellProceeds.value
  if (netFlow > 0) return 'buy-value'
  if (netFlow < 0) return 'sell-value'
  return 'hold-value'
}

const formatNetCashFlow = () => {
  const netFlow = totalBuyCost.value - totalSellProceeds.value
  const prefix = netFlow >= 0 ? '+' : ''
  return `${prefix}$${Math.abs(netFlow).toLocaleString()}`
}

// All-Weather ETF Card Helper Methods
const getAllWeatherETFs = () => {
  const allWeatherTickers = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
  return allWeatherTickers.map(ticker => {
    const etfInfo = allETFs.value.find(etf => etf.ticker === ticker)
    const trendSignal = analysisResults.value?.trendSignals?.[ticker]

    return {
      ticker,
      name: etfInfo?.name || `${ticker} ETF`,
      currentPrice: etfInfo?.currentPrice || (trendSignal?.analysis?.price ? parseFloat(trendSignal.analysis.price.replace('$', '')) : 0),
      sma: trendSignal?.analysis?.sma ? parseFloat(trendSignal.analysis.sma.replace('$', '')) : 0,
      signal: trendSignal?.signal || 0,
      action: trendSignal?.action || 'HOLD',
      percentDifference: trendSignal?.analysis?.percentDifference || '0%'
    }
  })
}

const getETFCardClass = (etf: any) => {
  if (etf.signal === 1) return 'in-uptrend'
  if (etf.signal === 0) return 'in-downtrend'
  return 'neutral'
}

const getETFStatus = (etf: any) => {
  if (etf.action === 'BUY') return 'BUY'
  if (etf.action === 'SELL') return 'SELL'
  return 'HOLD'
}

const getETFStatusClass = (etf: any) => {
  if (etf.action === 'BUY') return 'status-buy'
  if (etf.action === 'SELL') return 'status-sell'
  return 'status-hold'
}

const getETFPrice = (etf: any) => {
  return etf.currentPrice > 0 ? etf.currentPrice.toFixed(2) : '---'
}

const getETFSMA = (etf: any) => {
  return etf.sma > 0 ? etf.sma.toFixed(2) : '---'
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

    // Check the current strategy to determine which ETFs to load
    const savedStrategy = localStorage.getItem('momentum-rider-selected-strategy')
    const currentStrategy = savedStrategy || selectedStrategy.value?.id || 'momentum'
    console.log('Current strategy for ETF universe loading:', currentStrategy)

    // Get strategy-specific tickers from the universe
    let strategyTickers: string[] = []
    if (currentStrategy === 'allweather') {
      // All-Weather specific ETF universe
      strategyTickers = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
      console.log('Loading All-Weather ETF universe:', strategyTickers)
    } else {
      // Momentum strategy ETF universe
      strategyTickers = Object.values(etfConfigStore.etfUniverse).flat()
      console.log('Loading Momentum ETF universe (', strategyTickers.length, 'tickers):', strategyTickers)
    }

    // Fetch real quote data for strategy-specific ETFs with better error handling
    console.log('Fetching real ETF data for', strategyTickers.length, 'tickers...')
    const quotePromises = strategyTickers.map(async ticker => {
      try {
        console.log(`Fetching quote for ${ticker}...`)
        const quote = await etfService.getQuote(ticker)
        console.log(`✅ Success for ${ticker}:`, {
          name: quote.shortName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent
        })
        return { success: true, ticker, ...Object.fromEntries(Object.entries(quote).filter(([key]) => key !== 'ticker')) }
      } catch (error) {
        console.warn(`❌ Failed to fetch quote for ${ticker}:`, error)
        return { ticker, success: false, error: (error as Error).message }
      }
    })

    const quoteResults = await Promise.allSettled(quotePromises)
    const quotes = quoteResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(quote => quote.success)

    console.log(`Successfully fetched quotes for ${quotes.length}/${strategyTickers.length} ETFs`)

    // Log sample successful quotes for debugging
    if (quotes.length > 0) {
      console.log('Sample successful quotes:', quotes.slice(0, 3))
    }

    // Create a ticker to quote mapping
    const quoteMap = new Map(quotes.map(quote => [quote.ticker, quote]))

    // Fetch momentum scores ONLY if needed (not for All-Weather strategy)
    console.log('Determining if momentum scores are needed...')
    let momentumScores: { [ticker: string]: number } = {}

    if (currentStrategy !== 'allweather') {
      console.log('Fetching momentum scores for non-All-Weather strategy:', currentStrategy)
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
          selectedETFs: strategyTickers,
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
        momentumScores = strategyTickers.reduce((acc, ticker) => {
          acc[ticker] = 0
          return acc
        }, {} as { [ticker: string]: number })
      }
    } else {
      console.log('Skipping momentum scores for All-Weather strategy - not needed')
      // Use zero momentum scores for All-Weather (they won't be displayed anyway)
      momentumScores = strategyTickers.reduce((acc, ticker) => {
        acc[ticker] = 0
        return acc
      }, {} as { [ticker: string]: number })
    }

    // Transform strategy tickers to ETFInfo format with real data
    if (currentStrategy === 'allweather') {
      // For All-Weather, create custom categories for each ETF
      allETFs.value = strategyTickers.map(ticker => {
        const quote = quoteMap.get(ticker)
        const category = `All-Weather ${ticker}`
        const safeQuote = quote && quote.success ? quote as any : null
        return {
          ticker,
          name: safeQuote?.shortName || safeQuote?.longName || `${ticker} ETF`,
          category,
          isCustom: false,
          currentPrice: safeQuote?.regularMarketPrice || cachedPrices.value[ticker] || undefined,
          dayChange: safeQuote?.regularMarketChangePercent || undefined,
          previousClose: safeQuote?.regularMarketPreviousClose || undefined,
          marketCap: safeQuote?.marketCap || undefined,
          volume: safeQuote?.regularMarketVolume || undefined,
          momentumScore: (ticker ? momentumScores[ticker] : undefined) || 0
        }
      })
    } else {
      // For Momentum, use the original categories from etfConfigStore
      allETFs.value = []
      for (const category in etfConfigStore.etfUniverse) {
        const tickers = etfConfigStore.etfUniverse[category as keyof typeof etfConfigStore.etfUniverse]
        for (let i = 0; i < tickers.length; i++) {
          const ticker = tickers[i]
          if (ticker && strategyTickers.includes(ticker)) {
            const quote = quoteMap.get(ticker)
            const safeQuote = quote && quote.success ? quote as any : null
            allETFs.value.push({
              ticker,
              name: safeQuote?.shortName || safeQuote?.longName || `${ticker} ${category} ETF`,
              category,
              isCustom: false,
              currentPrice: safeQuote?.regularMarketPrice || cachedPrices.value[ticker] || undefined,
              dayChange: safeQuote?.regularMarketChangePercent || undefined,
              previousClose: safeQuote?.regularMarketPreviousClose || undefined,
              marketCap: safeQuote?.marketCap || undefined,
              volume: safeQuote?.regularMarketVolume || undefined,
              momentumScore: (ticker ? momentumScores[ticker] : undefined) || 0
            })
          }
        }
      }
    }

    console.log('Loaded real ETF data for', allETFs.value.length, 'ETFs (strategy:', currentStrategy, ')')
  } catch (error) {
    console.error('Failed to load ETF universe or fetch data:', error)

    // Check the current strategy for fallback as well
    const savedStrategy = localStorage.getItem('momentum-rider-selected-strategy')
    const currentStrategy = savedStrategy || selectedStrategy.value?.id || 'momentum'

    let fallbackTickers: string[] = []
    if (currentStrategy === 'allweather') {
      fallbackTickers = ['VTI', 'VEA', 'VWO', 'IEF', 'TIP', 'IGIL.L', 'PDBC', 'GLDM', 'SGOV']
    } else {
      fallbackTickers = []
      for (const category in etfConfigStore.etfUniverse) {
        const tickers = etfConfigStore.etfUniverse[category as keyof typeof etfConfigStore.etfUniverse]
        for (let i = 0; i < tickers.length; i++) {
          const ticker = tickers[i]
          if (ticker) {
            fallbackTickers.push(ticker)
          }
        }
      }
    }

    // Fallback to mock data if there's an error
    allETFs.value = fallbackTickers.map(ticker => ({
      ticker,
      name: `${ticker} ETF`,
      category: currentStrategy === 'allweather' ? `All-Weather ${ticker}` : `${ticker} Category`,
      isCustom: false,
      currentPrice: Math.random() * 200 + 50, // Mock price
      momentumScore: (Math.random() - 0.5) * 20 // Mock momentum score
    }))
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
  background: #4f46e5;
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
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.summary-label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 5px;
  color: #6b7280;
}

.summary-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #1f2937;
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

/* ===== MOBILE-FIRST RESPONSIVE PORTFOLIO EXECUTION INTERFACE ===== */

.portfolio-execution {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  margin: 2rem 0;
}

/* Header Section */
.execution-header {
  padding: 1.5rem 0;
  margin-bottom: 1.5rem;
}

.execution-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.title-icon {
  font-size: 1.5rem;
}

.title-text {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.title-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.metrics-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  align-items: center;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.metric-icon {
  font-size: 1.25rem;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  color: #1f2937;
}

.metric-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.utilization-indicator {
  font-size: 1.5rem;
  padding: 0.5rem;
  border-radius: 50%;
  text-align: center;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.utilization-indicator.high { background: rgba(16, 185, 129, 0.1); }
.utilization-indicator.medium { background: rgba(245, 158, 11, 0.1); }
.utilization-indicator.low { background: rgba(239, 68, 68, 0.1); }

/* Mobile Cards Layout */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.etf-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: border-color 0.2s ease;
  min-height: 80px;
}

.etf-card:hover {
  border-color: #d1d5db;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.etf-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.etf-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  border: 1px solid transparent;
}

.action-status.buy {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.2);
}

.action-status.sell {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);
}

.action-status.hold {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.2);
}

.trade-value {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  text-align: right;
  min-width: 100px;
}

.buy-value { background: rgba(16, 185, 129, 0.1); color: #059669; }
.sell-value { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.hold-value { background: rgba(245, 158, 11, 0.1); color: #d97706; }

/* Expandable Details */
.card-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.detail-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6b7280;
  min-width: 100px;
}

.detail-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1f2937;
  text-align: right;
  flex: 1;
}

.reason-badge {
  background: rgba(102, 126, 234, 0.1);
  color: #4f46e5;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

/* Desktop Table Layout - Hidden on Mobile */
.desktop-table {
  display: none;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.desktop-table .table-header {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.desktop-table .table-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

.desktop-table .table-row:hover {
  background: #f8fafc;
}

.desktop-table .etf-name {
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.desktop-table .current-value,
.desktop-table .target-value {
  color: #6b7280;
  font-weight: 500;
}

.desktop-table .shares-to-trade {
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.desktop-table .compact-reason {
  background: rgba(102, 126, 234, 0.1);
  color: #4f46e5;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

/* Execution Summary */
.execution-summary {
  padding: 1.5rem 0;
  margin-bottom: 1.5rem;
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary-metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
}

.summary-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
}

.summary-value {
  font-size: 0.9rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.summary-value.buy { color: #059669; }
.summary-value.sell { color: #dc2626; }
.summary-value.method { color: #667eea; }
.summary-value.confidence { color: #059669; }

/* Execution Actions */
.execution-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
}

/* ===== RESPONSIVE BREAKPOINTS ===== */

/* Tablet Styles (768px and up) */
@media (min-width: 768px) {
  .execution-header {
    padding: 2rem;
  }

  .execution-title {
    margin-bottom: 2rem;
  }

  .metrics-bar {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .mobile-cards {
    gap: 1.25rem;
  }

  .etf-card {
    padding: 1.25rem;
  }

  .card-header {
    gap: 1.5rem;
  }

  .summary-metrics {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .execution-actions {
    flex-direction: row;
    justify-content: flex-start;
    gap: 1rem;
  }
}

/* Desktop Styles (1024px and up) */
@media (min-width: 1024px) {
  .portfolio-execution {
    margin: 3rem 0;
  }

  .execution-header {
    padding: 2.5rem;
    border-radius: 20px;
  }

  .title-icon {
    font-size: 2.5rem;
  }

  .title-text {
    font-size: 1.75rem;
  }

  .metrics-bar {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  .metric-item {
    padding: 1rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  /* Hide mobile cards on desktop */
  .mobile-cards {
    display: none;
  }

  /* Show desktop table on desktop */
  .desktop-table {
    display: block;
  }

  .summary-metrics {
    grid-template-columns: repeat(5, 1fr);
  }

  .execution-actions {
    justify-content: center;
  }

  .btn {
    min-width: 200px;
  }
}

/* Large Desktop Styles (1280px and up) */
@media (min-width: 1280px) {
  .execution-header {
    padding: 3rem;
  }

  .metrics-bar {
    gap: 2.5rem;
  }

  .summary-metrics {
    grid-template-columns: repeat(5, 1fr);
    gap: 1.5rem;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .portfolio-execution {
    color: #f9fafb;
    /* Keep light background for portfolio execution */
  }

  /* Keep light backgrounds for execution plan components */
  /*
  .etf-card,
  .execution-summary {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
  */

  .etf-card:hover {
    border-color: #667eea;
  }

  .card-details {
    border-top-color: #374151;
  }

  .detail-label {
    color: #4b5563;
  }

  .detail-value {
    color: #1f2937;
  }

  .shares-to-trade {
    color: #374151 !important;
  }

  /* Keep light backgrounds for summary items and tables */
  /*
  .summary-item {
    background: #374151;
    border-left-color: #667eea;
  }

  .desktop-table {
    background: #1f2937;
    border-color: #374151;
  }

  .desktop-table .table-header {
    background: #374151;
    color: #f9fafb;
  }

  .desktop-table .table-row {
    border-bottom-color: #374151;
  }

  .desktop-table .table-row:hover {
    background: #374151;
  }
  */

  /* Use dark text colors for better visibility on light backgrounds */
  .desktop-table .current-value,
  .desktop-table .target-value {
    color: #374151; /* Dark gray for light background */
  }

  .desktop-table .etf-name {
    color: #1f2937; /* Darker text for ETF names on light background */
  }
}

/* Accessibility Enhancements */
@media (prefers-reduced-motion: reduce) {
  .etf-card,
  .metric-item,
  .action-status,
  .utilization-indicator {
    transition: none;
  }
}

/* All-Weather Strategy Specific Styles */
.allweather-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #667eea;
  color: white;
  border-radius: 12px;
  margin-bottom: 20px;
}

.allweather-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.allweather-header.compact {
  padding: 16px;
  margin-bottom: 16px;
}

.allweather-title h3 {
  font-size: 1.2rem;
}

.compact-configs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.config-group.compact {
  margin-bottom: 12px;
}

.config-input.compact {
  padding: 10px;
  font-size: 0.95rem;
}

.input-with-unit.compact {
  gap: 6px;
}

.compact-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compact-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.config-help.compact {
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.allweather-title h3 {
  margin: 0 0 8px 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.allweather-title p {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
}

.config-help {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-top: 4px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
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

.toggle-label:before {
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

.toggle-switch input:checked + .toggle-label {
  background-color: #007bff;
}

.toggle-switch input:checked + .toggle-label:before {
  transform: translateX(26px);
}

.etf-universe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.etf-category {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #007bff;
}

.category-header {
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.etf-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.etf-item {
  font-size: 0.85rem;
  color: #666;
  padding: 6px 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.etf-note {
  font-style: italic;
  color: #888;
  font-size: 0.8rem;
}

/* Trend Signal Display Styles */
.trend-signals-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.trend-signal-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.trend-signal-card.in-uptrend {
  border-left: 4px solid #28a745;
}

.trend-signal-card.in-downtrend {
  border-left: 4px solid #dc3545;
}

.trend-signal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trend-signal-ticker {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
}

.trend-signal-status {
  font-size: 0.85rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
}

.trend-signal-status.in {
  background: #d4edda;
  color: #155724;
}

.trend-signal-status.out {
  background: #f8d7da;
  color: #721c24;
}

.trend-signal-details {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
}

.trend-signal-price {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* SGOV Allocation Display */
.sgov-allocation-card {
  background: #28a745;
  color: #1f2937; /* Dark text for visibility */
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.sgov-allocation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.sgov-allocation-title {
  font-size: 1.2rem;
  font-weight: 600;
}

.sgov-allocation-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.sgov-metric {
  text-align: center;
}

.sgov-metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.sgov-metric-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

/* Section Titles */
.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 20px 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* All-Weather Methodology */
.allweather-methodology {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  border: 1px solid #e0e0e0;
}

.methodology-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.methodology-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.methodology-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.methodology-text {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

.methodology-text strong {
  color: #333;
}

.methodology-summary {
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.methodology-summary small {
  color: #666;
  font-size: 0.85rem;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .etf-card,
  .execution-summary {
    border-width: 2px;
  }

  .action-status {
    border: 2px solid currentColor;
  }
}
</style>