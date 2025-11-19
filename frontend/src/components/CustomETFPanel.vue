<template>
  <div class="custom-etf-panel">
    <!-- Panel Header -->
    <div class="panel-header">
      <h3>Custom ETF Management</h3>
      <p>Add and manage your custom ETFs beyond the default selection</p>
    </div>

    <!-- Loading State -->
    <div v-if="loadingState.isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Loading your custom ETFs...</p>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="loadingState.error" class="error-message">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <p>{{ loadingState.error }}</p>
        <button @click="loadCustomETFs" class="btn btn-sm btn-outline">
          Retry
        </button>
      </div>
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
            <span v-if="loadingState.isLoading" class="btn-loading">
              <span class="btn-spinner"></span>
              Adding...
            </span>
            <span v-else>Add ETF</span>
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
          :disabled="customETFs.length === 0 || loadingState.isRefreshing"
          class="btn btn-secondary"
        >
          <span v-if="loadingState.isRefreshing" class="btn-loading">
            <span class="btn-spinner"></span>
            Refreshing...
          </span>
          <span v-else>Refresh All Data</span>
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
import { etfService } from '@/services/etf-service'
import type {
  CustomETFMetadata,
  ETFValidationResponse
} from '@/services/etf-service'
import type { ApiError } from '@/services/types'

interface CustomETF {
  ticker: string
  name?: string
  category?: string
  currentPrice?: number
  lastUpdated?: string
  status: 'valid' | 'loading' | 'error' | 'needs_update'
  price?: number
  marketState?: string
}

interface LoadingState {
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
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

const loadingState = ref<LoadingState>({
  isLoading: false,
  isRefreshing: false,
  error: null
})

// Computed properties
const canAddETF = computed(() => {
  return tickerValidation.value.valid &&
         newETFTicker.value.trim() !== '' &&
         !loadingState.value.isLoading
})

const validETFsCount = computed(() => {
  return customETFs.value.filter(etf => etf.status === 'valid').length
})

const needsUpdateCount = computed(() => {
  return customETFs.value.filter(etf => etf.status === 'needs_update').length
})

const isAnyOperationInProgress = computed(() => {
  return loadingState.value.isLoading ||
         loadingState.value.isRefreshing ||
         customETFs.value.some(etf => etf.status === 'loading')
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

  // Clear any previous errors
  loadingState.value.error = null

  // Add to list with loading state (optimistic update)
  const newETF: CustomETF = {
    ticker,
    status: 'loading'
  }

  customETFs.value.push(newETF)

  // Clear input immediately for better UX
  newETFTicker.value = ''
  tickerValidation.value = {
    valid: false,
    invalid: false,
    message: '',
    type: ''
  }

  try {
    // Add custom ETF via API with bypassValidation for Yahoo Finance issues
    const response = await etfService.addCustomETF({
      ticker,
      category: 'Custom',
      bypassValidation: true // Important due to Yahoo Finance API issues
    })

    // Update ETF with response data
    const etfIndex = customETFs.value.findIndex(etf => etf.ticker === ticker)
    if (etfIndex !== -1) {
      customETFs.value[etfIndex] = {
        ticker,
        name: response.etf.name || `${ticker} Fund`,
        category: response.etf.category || 'Custom',
        currentPrice: undefined, // Will be fetched separately if needed
        lastUpdated: new Date().toISOString(),
        status: 'valid'
      }
    }

    console.log('Successfully added custom ETF:', response.message)
  } catch (error) {
    console.error('Failed to add custom ETF:', error)

    // Remove the optimistic addition if it failed
    const etfIndex = customETFs.value.findIndex(etf => etf.ticker === ticker)
    if (etfIndex !== -1) {
      customETFs.value.splice(etfIndex, 1)
    }

    // Show error to user
    loadingState.value.error = error instanceof Error ? error.message : 'Failed to add ETF'

    // Restore the ticker input for user to retry
    newETFTicker.value = ticker
    validateTicker() // Re-validate to show the error state
  }
}

const removeETF = async (ticker: string) => {
  if (isAnyOperationInProgress.value) return

  // Clear any previous errors
  loadingState.value.error = null

  // Find the ETF to get its current state for potential rollback
  const etfIndex = customETFs.value.findIndex(etf => etf.ticker === ticker)
  if (etfIndex === -1) return

  const etfToRemove = customETFs.value[etfIndex]

  // Optimistic update: remove from UI immediately
  customETFs.value.splice(etfIndex, 1)

  try {
    // Call API to remove the ETF
    const response = await etfService.removeCustomETF(ticker)
    console.log('Successfully removed custom ETF:', response.message)
  } catch (error) {
    console.error('Failed to remove custom ETF:', error)

    // Rollback: restore the ETF if API call failed
    customETFs.value.splice(etfIndex, 0, etfToRemove)

    // Show error to user
    loadingState.value.error = error instanceof Error ? error.message : 'Failed to remove ETF'
  }
}

const refreshAllETFs = async () => {
  if (isAnyOperationInProgress.value || customETFs.value.length === 0) return

  loadingState.value.isRefreshing = true
  loadingState.value.error = null

  try {
    // Set all ETFs to loading state
    customETFs.value.forEach(etf => {
      if (etf.status === 'valid') {
        etf.status = 'loading'
      }
    })

    // Fetch fresh data from backend
    const response = await etfService.getCustomETFs()

    // Update the list with fresh data
    const updatedETFs: CustomETF[] = response.etfs.map(etf => ({
      ticker: etf.ticker,
      name: etf.name || `${etf.ticker} Fund`,
      category: etf.category || 'Custom',
      currentPrice: undefined, // Price data can be added later if needed
      lastUpdated: new Date().toISOString(),
      status: 'valid',
      price: undefined,
      marketState: undefined
    }))

    customETFs.value = updatedETFs

    console.log(`Successfully refreshed ${response.count} custom ETFs`)
  } catch (error) {
    console.error('Failed to refresh ETFs:', error)
    loadingState.value.error = error instanceof Error ? error.message : 'Failed to refresh ETFs'

    // Reset loading status on error
    customETFs.value.forEach(etf => {
      if (etf && etf.status === 'loading') {
        etf.status = 'error'
      }
    })
  } finally {
    loadingState.value.isRefreshing = false
  }
}

const exportETFs = () => {
  if (customETFs.value.length === 0) return

  try {
    // Create export data
    const exportData = customETFs.value.map(etf => ({
      Ticker: etf.ticker,
      Name: etf.name || '',
      Category: etf.category || 'Custom',
      Status: etf.status,
      'Last Updated': etf.lastUpdated ? new Date(etf.lastUpdated).toLocaleDateString() : ''
    }))

    // Ensure we have data before proceeding
    if (exportData.length === 0) {
      console.log('No ETFs to export')
      return
    }

    // Convert to CSV
    const headers = Object.keys(exportData[0]!)
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escape commas and quotes in values
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        }).join(',')
      )
    ].join('\n')

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `custom-etfs-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log(`Exported ${customETFs.value.length} custom ETFs to CSV`)
  } catch (error) {
    console.error('Failed to export ETFs:', error)
    loadingState.value.error = 'Failed to export ETF list'
  }
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

// Load custom ETFs from backend on component mount
const loadCustomETFs = async () => {
  loadingState.value.isLoading = true
  loadingState.value.error = null

  try {
    const response = await etfService.getCustomETFs()

    // Transform backend data to component format
    customETFs.value = response.etfs.map(etf => ({
      ticker: etf.ticker,
      name: etf.name || `${etf.ticker} Fund`,
      category: etf.category || 'Custom',
      currentPrice: undefined, // Price data can be added later if needed
      lastUpdated: new Date().toISOString(), // We'll use current time since backend doesn't provide this
      status: 'valid',
      price: undefined,
      marketState: undefined
    }))

    console.log(`Loaded ${response.count} custom ETFs from backend`)
  } catch (error) {
    console.error('Failed to load custom ETFs:', error)
    loadingState.value.error = error instanceof Error ? error.message : 'Failed to load custom ETFs'

    // Initialize with empty array on error
    customETFs.value = []
  } finally {
    loadingState.value.isLoading = false
  }
}

// Initialize component by loading data from backend
onMounted(() => {
  loadCustomETFs()
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

/* Loading States */
.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  margin-bottom: 20px;
}

.loading-content {
  text-align: center;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Error States */
.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #721c24;
}

.error-icon {
  font-size: 1.2em;
}

.error-content p {
  flex: 1;
  margin: 0;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.8em;
}

/* Status-specific loading for ETF cards */
.etf-card[data-status="loading"] {
  opacity: 0.7;
  pointer-events: none;
}

.etf-card[data-status="loading"] .etf-name::after {
  content: "Loading...";
  color: #999;
  font-style: italic;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    flex-direction: column;
  }

  .panel-statistics {
    grid-template-columns: 1fr;
  }
}
</style>