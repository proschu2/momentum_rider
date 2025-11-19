<template>
  <div class="strategy-template-selector">
    <!-- Header -->
    <div class="selector-header">
      <h2 class="text-2xl font-semibold text-neutral-900 mb-2">Create New Strategy</h2>
      <p class="text-neutral-600">Choose a strategy template and customize it to your needs</p>
    </div>

    <!-- Template Selection -->
    <div class="template-grid">
      <div
        v-for="template in strategyTemplates"
        :key="template.id"
        :class="['template-card', { selected: selectedTemplate?.id === template.id }]"
        @click="selectTemplate(template)"
      >
        <div class="template-icon">{{ template.icon }}</div>
        <h3 class="text-lg font-semibold text-neutral-900">{{ template.name }}</h3>
        <p class="template-description text-neutral-600">{{ template.description }}</p>

        <!-- Default Parameters Preview -->
        <div class="parameters-preview">
          <div class="parameter-item">
            <span class="parameter-label text-neutral-600">Default ETFs:</span>
            <span class="parameter-value font-semibold text-neutral-900">{{ template.defaultETFs.length }}</span>
          </div>
          <div
            v-for="param in template.parameters"
            :key="param.name"
            class="parameter-item"
          >
            <span class="parameter-label text-neutral-600">{{ param.label }}:</span>
            <span class="parameter-value font-semibold text-neutral-900">{{ param.defaultValue }}{{ param.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Customization (when template selected) -->
    <div v-if="selectedTemplate" class="template-customization">
      <h3 class="text-xl font-semibold text-neutral-900 mb-4">Customize {{ selectedTemplate.name }}</h3>

      <!-- Strategy Parameters -->
      <div class="parameters-section">
        <h4 class="text-lg font-medium text-neutral-900 mb-3">Strategy Parameters</h4>
        <div class="parameter-controls">
          <div
            v-for="param in selectedTemplate.parameters"
            :key="param.name"
            class="parameter-control"
          >
            <label :for="param.name" class="block text-sm font-medium text-neutral-700 mb-2">{{ param.label }}:</label>
            <div class="control-group">
              <input
                :id="param.name"
                v-model="customParameters[param.name]"
                :type="param.type"
                :min="param.min"
                :max="param.max"
                :step="param.step"
                class="parameter-input"
              />
              <span class="parameter-unit text-neutral-600">{{ param.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ETF Selection -->
      <div class="etf-selection-section">
        <h4 class="text-lg font-medium text-neutral-900 mb-3">ETF Selection</h4>

        <!-- Loading State -->
        <div v-if="isLoadingETFs" class="loading-state">
          <p>Loading ETF universe...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="etfLoadError" class="error-state">
          <p class="text-red-600">{{ etfLoadError }}</p>
          <button @click="loadETFUniverse" class="btn btn-secondary">Retry</button>
        </div>

        <!-- ETF List -->
        <div v-else>
          <!-- Categorized ETFs -->
          <div v-for="(tickers, category) in etfUniverse" :key="category" class="etf-category">
            <h5 class="category-title">{{ category }}</h5>
            <div class="etf-list">
              <div
                v-for="ticker in tickers"
                :key="ticker"
                class="etf-item"
              >
                <label class="etf-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedETFs.includes(ticker)"
                    @change="toggleETF(ticker)"
                  />
                  <span class="etf-info">
                    <span class="etf-ticker font-semibold text-neutral-900">
                      {{ ticker }}
                      <span v-if="customETFs.some(etf => etf.ticker === ticker)" class="custom-badge">Custom</span>
                    </span>
                    <span class="etf-name text-neutral-600">
                      {{ etfNames[ticker] || `${ticker} ${category} ETF` }}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Custom ETF Addition -->
          <div class="custom-etf-addition">
            <h5>Add Custom ETF</h5>
            <div class="input-group">
              <input
                v-model="customETFTicker"
                placeholder="Enter ETF ticker (e.g., SPY, QQQ)..."
                class="custom-ticker-input"
                @keyup.enter="addCustomETF"
              />
              <button
                @click="addCustomETF"
                :disabled="!customETFTicker.trim()"
                class="btn btn-primary"
              >
                Add ETF
              </button>
            </div>
            <div v-if="customETFsList.length > 0" class="custom-etfs-list">
              <h6>Added Custom ETFs:</h6>
              <div
                v-for="etf in customETFsList"
                :key="etf"
                class="custom-etf-item"
              >
                <span class="custom-ticker font-semibold text-blue-600">{{ etf }}</span>
                <button
                  @click="removeCustomETF(etf)"
                  class="btn-remove"
                  title="Remove ETF"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          @click="createStrategy"
          :disabled="!canCreateStrategy"
          class="btn btn-success"
        >
          Create Strategy
        </button>
        <button
          @click="clearSelection"
          class="btn btn-secondary"
        >
          Choose Different Template
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useETFConfigStore } from '@/stores/etf-config'
import { useRebalancingStore } from '@/stores/rebalancing'
import { etfService } from '@/services/etf-service'

interface StrategyTemplate {
  id: string
  name: string
  description: string
  icon: string
  defaultETFs: Array<{ ticker: string; name: string; category?: string; isCustom?: boolean }>
  parameters: Array<{
    name: string
    label: string
    type: 'number' | 'select'
    defaultValue: number | string
    min?: number
    max?: number
    step?: number
    unit?: string
    options?: Array<{ value: string; label: string }>
  }>
}

interface ETFUniverse {
  [category: string]: string[]
}

const etfConfigStore = useETFConfigStore()
const rebalancingStore = useRebalancingStore()

// State for ETF universe
const etfUniverse = ref<ETFUniverse>({})
const customETFs = ref<Array<{ ticker: string; name: string; category: string }>>([])
const isLoadingETFs = ref(false)
const etfLoadError = ref('')

// ETF names and prices cache
const etfNames = ref<{ [ticker: string]: string }>({})
const etfPrices = ref<{ [ticker: string]: number }>({})

// Strategy templates with sensible defaults
const strategyTemplates: StrategyTemplate[] = [
  {
    id: 'momentum',
    name: 'Momentum Strategy',
    description: 'Invest in top performing ETFs based on momentum scores',
    icon: '📈',
    defaultETFs: [
      { ticker: 'VTI', name: 'Vanguard Total Stock Market' },
      { ticker: 'VEA', name: 'Vanguard Developed Markets' },
      { ticker: 'VWO', name: 'Vanguard Emerging Markets' },
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
      { ticker: 'BND', name: 'Vanguard Total Bond Market' }
    ],
    parameters: [
      {
        name: 'topN',
        label: 'Top N ETFs',
        type: 'number',
        defaultValue: 3,
        min: 1,
        max: 10,
        step: 1,
        unit: ''
      },
      {
        name: 'equalAllocation',
        label: 'Equal Allocation',
        type: 'select',
        defaultValue: 'yes',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No (Custom)' }
        ]
      }
    ]
  },
  {
    id: 'sma',
    name: 'SMA Strategy',
    description: 'Trend following using moving average signals',
    icon: '📊',
    defaultETFs: [
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
      { ticker: 'IWM', name: 'iShares Russell 2000 ETF' },
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
      { ticker: 'GLD', name: 'SPDR Gold Shares' }
    ],
    parameters: [
      {
        name: 'smaPeriod',
        label: 'SMA Period',
        type: 'number',
        defaultValue: 200,
        min: 50,
        max: 300,
        step: 10,
        unit: ' days'
      },
      {
        name: 'allocationAboveSMA',
        label: 'Allocation Above SMA',
        type: 'number',
        defaultValue: 80,
        min: 0,
        max: 100,
        step: 5,
        unit: '%'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Build your own allocation from scratch',
    icon: '🎯',
    defaultETFs: [],
    parameters: []
  }
]

// Component state
const selectedTemplate = ref<StrategyTemplate | null>(null)
const selectedETFs = ref<string[]>([])
const customETFsList = ref<string[]>([])
const customETFTicker = ref('')
const customParameters = reactive<Record<string, any>>({})

// Computed properties
const canCreateStrategy = computed(() => {
  if (!selectedTemplate.value) return false

  const totalETFs = selectedETFs.value.length + customETFsList.value.length
  return totalETFs > 0
})

const availableETFs = computed(() => {
  if (!etfUniverse.value) return []

  const allETFs: Array<{ ticker: string; name: string; category: string; isCustom: boolean }> = []

  Object.entries(etfUniverse.value).forEach(([category, tickers]) => {
    tickers.forEach(ticker => {
      const isCustom = customETFs.value.some(etf => etf.ticker === ticker)
      allETFs.push({
        ticker,
        name: `${ticker} ${isCustom ? '(Custom)' : 'ETF'}`,
        category,
        isCustom
      })
    })
  })

  return allETFs
})

// Methods
// Load ETF universe from API with real ETF names
const loadETFUniverse = async () => {
  try {
    isLoadingETFs.value = true
    etfLoadError.value = ''

    const response = await fetch('/api/etfs/universe')
    if (!response.ok) {
      throw new Error(`Failed to load ETF universe: ${response.status}`)
    }

    const data = await response.json()
    etfUniverse.value = data.universe

    // Fetch real ETF names and prices for all tickers
    const allTickers = Object.values(data.universe).flat()
    console.log('Fetching ETF names for', allTickers.length, 'tickers...')

    try {
      const quotePromises = allTickers.map(ticker => etfService.getQuote(ticker))
      const quotes = await Promise.all(quotePromises)

      // Cache the names and prices
      quotes.forEach(quote => {
        etfNames.value[quote.ticker] = quote.shortName
        etfPrices.value[quote.ticker] = quote.regularMarketPrice
      })

      console.log('Loaded names for', Object.keys(etfNames.value).length, 'ETFs')
    } catch (quoteError) {
      console.warn('Failed to fetch ETF names, using fallback:', quoteError)
    }

    // Load custom ETFs separately
    await loadCustomETFs()
  } catch (error) {
    console.error('Error loading ETF universe:', error)
    etfLoadError.value = error.message || 'Failed to load ETF universe'
  } finally {
    isLoadingETFs.value = false
  }
}

// Load custom ETFs
const loadCustomETFs = async () => {
  try {
    const response = await fetch('/api/etfs/custom')
    if (!response.ok) {
      throw new Error(`Failed to load custom ETFs: ${response.status}`)
    }

    const data = await response.json()
    customETFs.value = data.etfs || []
  } catch (error) {
    console.error('Error loading custom ETFs:', error)
    // Don't set error state for this as it's not critical
  }
}

const selectTemplate = (template: StrategyTemplate) => {
  selectedTemplate.value = template
  selectedETFs.value = template.defaultETFs.map(etf => etf.ticker)
  customETFsList.value = []

  // Initialize custom parameters with defaults
  template.parameters.forEach(param => {
    customParameters[param.name] = param.defaultValue
  })
}

const toggleETF = (ticker: string) => {
  const index = selectedETFs.value.indexOf(ticker)
  if (index > -1) {
    selectedETFs.value.splice(index, 1)
  } else {
    selectedETFs.value.push(ticker)
  }
}

const addCustomETF = async () => {
  const ticker = customETFTicker.value.trim().toUpperCase()
  if (!ticker || customETFsList.value.includes(ticker) || selectedETFs.value.includes(ticker)) {
    return
  }

  try {
    const response = await fetch('/api/etfs/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticker,
        bypassValidation: false
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to add ETF: ${response.status}`)
    }

    // Add to local list
    customETFsList.value.push(ticker)
    customETFTicker.value = ''

    // Reload custom ETFs to get updated data
    await loadCustomETFs()
    await loadETFUniverse() // Refresh universe
  } catch (error) {
    alert(`Error adding ETF: ${error.message}`)
  }
}

const removeCustomETF = async (ticker: string) => {
  try {
    const response = await fetch(`/api/etfs/custom/${ticker}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to remove ETF: ${response.status}`)
    }

    // Remove from local list
    const index = customETFsList.value.indexOf(ticker)
    if (index > -1) {
      customETFsList.value.splice(index, 1)
    }

    // Reload data
    await loadCustomETFs()
    await loadETFUniverse() // Refresh universe
  } catch (error) {
    alert(`Error removing ETF: ${error.message}`)
  }
}

const createStrategy = () => {
  if (!selectedTemplate.value) return

  const strategy = {
    template: selectedTemplate.value.id,
    name: `${selectedTemplate.value.name} ${new Date().toLocaleDateString()}`,
    parameters: { ...customParameters },
    etfs: [...selectedETFs.value, ...customETFsList.value],
    customETFs: [...customETFsList.value]
  }

  // Update the existing stores with selected ETFs
  etfConfigStore.selectedETFs = strategy.etfs

  // Update rebalancing store parameters based on template
  if (selectedTemplate.value.id === 'momentum') {
    rebalancingStore.topAssets = customParameters.topN || 3
  }

  console.log('Creating strategy:', strategy)
  // TODO: Save to backend
  alert(`Strategy created successfully!\n\nTemplate: ${selectedTemplate.value.name}\nETFs: ${strategy.etfs.length}\nParameters: ${JSON.stringify(strategy.parameters, null, 2)}`)
}

const clearSelection = () => {
  selectedTemplate.value = null
  selectedETFs.value = []
  customETFsList.value = []
  Object.keys(customParameters).forEach(key => {
    delete customParameters[key]
  })
}

// Initialize component
onMounted(async () => {
  await loadETFUniverse()
})
</script>

<style scoped>
.strategy-template-selector {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.selector-header {
  text-align: center;
  margin-bottom: 30px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.template-card {
  padding: 25px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  text-align: center;
}

.template-card:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.selected {
  border-color: #007bff;
  background: #f8f9ff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.template-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.template-description {
  margin-bottom: 15px;
  line-height: 1.4;
}

.parameters-preview {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.9em;
}

.parameter-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.template-customization {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 25px;
  margin-top: 20px;
}

.parameters-section,
.etf-selection-section {
  margin-bottom: 30px;
}

.parameter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.parameter-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parameter-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1em;
}

.parameter-unit {
  font-size: 0.9em;
  min-width: 40px;
}

.etf-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.etf-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f8f9fa;
}

.etf-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.etf-info {
  display: flex;
  flex-direction: column;
}

.etf-name {
  font-size: 0.8em;
}

.custom-etf-addition {
  border-top: 1px solid #e0e0e0;
  padding-top: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.custom-ticker-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-transform: uppercase;
}

.custom-etfs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-etf-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e7f3ff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9em;
}

.btn-remove {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.btn-remove:hover {
  background: #f8d7da;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

/* Custom ETF Integration Styles */
.etf-category {
  margin-bottom: 25px;
}

.category-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0e0e0;
}

.custom-badge {
  background: #007bff;
  color: white;
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: normal;
}

.custom-etf-addition {
  border-top: 2px solid #e0e0e0;
  padding-top: 20px;
  margin-top: 20px;
}

.custom-etf-addition h5 {
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.custom-etfs-list h6 {
  font-size: 0.9em;
  font-weight: 600;
  color: #666;
  margin-bottom: 10px;
  margin-top: 15px;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error-state {
  text-align: center;
  padding: 20px;
}

.error-state .btn {
  margin-top: 10px;
}
</style>