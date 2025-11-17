<template>
  <div class="custom-etf-panel">
    <!-- Panel Header -->
    <div class="panel-header">
      <h3>Custom ETF Management</h3>
      <p>Add and manage your custom ETFs beyond the default selection</p>
    </div>

    <!-- Add Custom ETF Section -->
    <div class="add-etf-section">
      <div class="add-etf-form">
        <div class="input-group">
          <label for="etfTicker">ETF Ticker Symbol:</label>
          <input
            id="etfTicker"
            v-model="newETFTicker"
            placeholder="e.g., SPY, QQQ, ARKK"
            :class="['ticker-input', { valid: tickerValidation.valid, invalid: tickerValidation.invalid }]"
            @input="validateTicker"
          />
          <button
            @click="addCustomETF"
            :disabled="!canAddETF"
            class="btn btn-primary"
          >
            Add ETF
          </button>
        </div>

        <!-- Validation Messages -->
        <div v-if="tickerValidation.message" :class="['validation-message', tickerValidation.type]">
          {{ tickerValidation.message }}
        </div>
      </div>
    </div>

    <!-- Custom ETFs List -->
    <div class="custom-etfs-list">
      <h4>Your Custom ETFs</h4>

      <div v-if="customETFs.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No custom ETFs added yet</p>
        <p class="empty-hint">Add your first custom ETF using the form above</p>
      </div>

      <div v-else class="etf-grid">
        <div
          v-for="etf in customETFs"
          :key="etf.ticker"
          class="etf-card"
        >
          <div class="etf-header">
            <div class="etf-symbol">
              <span class="ticker">{{ etf.ticker }}</span>
              <span class="category">{{ etf.category || 'Custom' }}</span>
            </div>
            <button
              @click="removeETF(etf.ticker)"
              class="btn-remove"
              title="Remove ETF"
            >
              ×
            </button>
          </div>

          <div class="etf-details">
            <div class="etf-name">{{ etf.name || 'Loading...' }}</div>
            <div v-if="etf.currentPrice" class="etf-price">
              ${{ etf.currentPrice }}
            </div>
            <div v-if="etf.lastUpdated" class="etf-updated">
              Updated: {{ formatDate(etf.lastUpdated) }}
            </div>
          </div>

          <div class="etf-status">
            <span :class="['status-badge', etf.status]">
              {{ getStatusText(etf.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h4>Quick Actions</h4>
      <div class="action-buttons">
        <button
          @click="refreshAllETFs"
          :disabled="customETFs.length === 0"
          class="btn btn-secondary"
        >
          Refresh All Data
        </button>
        <button
          @click="exportETFs"
          :disabled="customETFs.length === 0"
          class="btn btn-outline"
        >
          Export List
        </button>
      </div>
    </div>

    <!-- Statistics -->
    <div class="panel-statistics">
      <div class="stat-item">
        <div class="stat-value">{{ customETFs.length }}</div>
        <div class="stat-label">Custom ETFs</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ validETFsCount }}</div>
        <div class="stat-label">Valid</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ needsUpdateCount }}</div>
        <div class="stat-label">Needs Update</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface CustomETF {
  ticker: string
  name?: string
  category?: string
  currentPrice?: number
  lastUpdated?: string
  status: 'valid' | 'loading' | 'error' | 'needs_update'
}

// State
const newETFTicker = ref('')
const customETFs = ref<CustomETF[]>([])
const tickerValidation = ref({
  valid: false,
  invalid: false,
  message: '',
  type: ''
})

// Computed properties
const canAddETF = computed(() => {
  return tickerValidation.value.valid && newETFTicker.value.trim() !== ''
})

const validETFsCount = computed(() => {
  return customETFs.value.filter(etf => etf.status === 'valid').length
})

const needsUpdateCount = computed(() => {
  return customETFs.value.filter(etf => etf.status === 'needs_update').length
})

// Methods
const validateTicker = () => {
  const ticker = newETFTicker.value.trim().toUpperCase()

  if (ticker.length === 0) {
    tickerValidation.value = {
      valid: false,
      invalid: false,
      message: '',
      type: ''
    }
    return
  }

  // Basic ticker validation
  const tickerRegex = /^[A-Z]{1,5}$/
  if (!tickerRegex.test(ticker)) {
    tickerValidation.value = {
      valid: false,
      invalid: true,
      message: 'Invalid ticker format. Use 1-5 uppercase letters.',
      type: 'error'
    }
    return
  }

  // Check if already exists
  const exists = customETFs.value.some(etf => etf.ticker === ticker)
  if (exists) {
    tickerValidation.value = {
      valid: false,
      invalid: true,
      message: 'This ETF is already in your custom list.',
      type: 'error'
    }
    return
  }

  tickerValidation.value = {
    valid: true,
    invalid: false,
    message: 'Valid ticker format. Click "Add ETF" to fetch details.',
    type: 'success'
  }
}

const addCustomETF = async () => {
  if (!canAddETF.value) return

  const ticker = newETFTicker.value.trim().toUpperCase()

  // Add to list with loading state
  const newETF: CustomETF = {
    ticker,
    status: 'loading'
  }

  customETFs.value.push(newETF)

  // Clear input
  newETFTicker.value = ''
  tickerValidation.value = {
    valid: false,
    invalid: false,
    message: '',
    type: ''
  }

  // Simulate API call to fetch ETF details
  try {
    // TODO: Replace with actual API call
    await fetchETFDetails(ticker)

    // Update ETF status
    const etfIndex = customETFs.value.findIndex(etf => etf.ticker === ticker)
    if (etfIndex !== -1) {
      customETFs.value[etfIndex] = {
        ticker,
        name: `${ticker} Fund`, // Mock data
        category: 'Custom',
        currentPrice: Math.random() * 100 + 50, // Mock price
        lastUpdated: new Date().toISOString(),
        status: 'valid'
      }
    }
  } catch (error) {
    // Handle error
    const etfIndex = customETFs.value.findIndex(etf => etf.ticker === ticker)
    if (etfIndex !== -1) {
      customETFs.value[etfIndex].status = 'error'
    }
  }
}

const removeETF = (ticker: string) => {
  const index = customETFs.value.findIndex(etf => etf.ticker === ticker)
  if (index !== -1) {
    customETFs.value.splice(index, 1)
  }
}

const refreshAllETFs = async () => {
  // TODO: Implement refresh logic
  console.log('Refreshing all ETF data...')
}

const exportETFs = () => {
  // TODO: Implement export logic
  console.log('Exporting ETF list...')
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'valid': return 'Valid'
    case 'loading': return 'Loading...'
    case 'error': return 'Error'
    case 'needs_update': return 'Needs Update'
    default: return 'Unknown'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Mock function - replace with actual API call
const fetchETFDetails = async (ticker: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Mock successful response
  return Promise.resolve()
}

// Initialize with mock data
onMounted(() => {
  // Load existing custom ETFs
  customETFs.value = [
    {
      ticker: 'ARKK',
      name: 'ARK Innovation ETF',
      category: 'Technology',
      currentPrice: 45.67,
      lastUpdated: '2024-01-15',
      status: 'valid'
    },
    {
      ticker: 'QQQ',
      name: 'Invesco QQQ Trust',
      category: 'Technology',
      currentPrice: 432.10,
      lastUpdated: '2024-01-15',
      status: 'valid'
    }
  ]
})
</script>

<style scoped>
.custom-etf-panel {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.panel-header {
  text-align: center;
  margin-bottom: 30px;
}

.panel-header h3 {
  color: #333;
  margin-bottom: 8px;
}

.panel-header p {
  color: #666;
  font-size: 1.1em;
}

.add-etf-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.add-etf-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-group label {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.ticker-input {
  flex: 1;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1.1em;
  text-transform: uppercase;
}

.ticker-input.valid {
  border-color: #28a745;
}

.ticker-input.invalid {
  border-color: #dc3545;
}

.validation-message {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
}

.validation-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.validation-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.custom-etfs-list {
  margin-bottom: 30px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.empty-hint {
  font-size: 0.9em;
  color: #999;
}

.etf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.etf-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  background: white;
  transition: box-shadow 0.2s;
}

.etf-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.etf-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.etf-symbol {
  display: flex;
  flex-direction: column;
}

.ticker {
  font-size: 1.3em;
  font-weight: bold;
  color: #333;
}

.category {
  font-size: 0.8em;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
  align-self: flex-start;
  margin-top: 4px;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 1.5em;
  color: #dc3545;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.btn-remove:hover {
  background: #f8d7da;
}

.etf-details {
  margin-bottom: 12px;
}

.etf-name {
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.etf-price {
  font-size: 1.1em;
  font-weight: bold;
  color: #28a745;
}

.etf-updated {
  font-size: 0.8em;
  color: #999;
}

.etf-status {
  text-align: right;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
}

.status-badge.valid {
  background: #d4edda;
  color: #155724;
}

.status-badge.loading {
  background: #fff3cd;
  color: #856404;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.needs_update {
  background: #d1ecf1;
  color: #0c5460;
}

.quick-actions {
  margin-bottom: 30px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-statistics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  text-align: center;
}

.stat-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-outline {
  background: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover:not(:disabled) {
  background: #007bff;
  color: white;
}
</style>