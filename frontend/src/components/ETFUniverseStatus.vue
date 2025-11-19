<!--
  ETF Universe Status Component
  Displays the current status of ETF universe loading and provides controls
-->

<template>
  <div class="etf-universe-status">
    <!-- Status Header -->
    <div class="status-header">
      <h3>ETF Universe Status</h3>
      <div class="status-indicator" :class="statusClass">
        <div class="status-dot"></div>
        <span>{{ statusMessage }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading ETF universe from backend...</p>
    </div>

    <!-- Error State -->
    <div v-if="hasError" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <button @click="handleRetryLoad" :disabled="isLoading" class="btn btn-primary">
          {{ isLoading ? 'Retrying...' : 'Retry' }}
        </button>
        <button @click="useDefaults" class="btn btn-secondary">
          Use Defaults
        </button>
      </div>
    </div>

    <!-- Success State -->
    <div v-if="!isLoading && !hasError" class="success-state">
      <div class="success-details">
        <div class="detail-row">
          <span class="label">Source:</span>
          <span class="value">{{ isLoadedFromBackend ? 'Backend API' : 'Default Configuration' }}</span>
        </div>
        <div v-if="lastLoadTime" class="detail-row">
          <span class="label">Last loaded:</span>
          <span class="value">{{ formatDate(lastLoadTime) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total ETFs:</span>
          <span class="value">{{ totalTickers }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Categories:</span>
          <span class="value">{{ Object.keys(etfUniverse).length }}</span>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="category-breakdown">
        <h4>Categories</h4>
        <div class="category-list">
          <div
            v-for="(tickers, category) in etfUniverse"
            :key="category"
            class="category-item"
            :class="{ enabled: enabledCategories[category] }"
          >
            <span class="category-name">{{ formatCategoryName(category) }}</span>
            <span class="category-count">{{ tickers.length }} ETFs</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="refreshETFUniverse" :disabled="isLoading" class="btn btn-outline">
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button @click="resetToDefaults" class="btn btn-outline">
          Reset to Defaults
        </button>
        <button @click="testConnectivity" :disabled="isTesting" class="btn btn-outline">
          {{ isTesting ? 'Testing...' : 'Test Connection' }}
        </button>
      </div>
    </div>

    <!-- Connection Test Results -->
    <div v-if="connectionResult" class="connection-test">
      <h4>Connection Test</h4>
      <div class="test-result" :class="{ success: connectionResult.isConnected, error: !connectionResult.isConnected }">
        <div class="result-icon">{{ connectionResult.isConnected ? '✅' : '❌' }}</div>
        <div class="result-details">
          <span class="result-status">
            {{ connectionResult.isConnected ? 'Connected' : 'Connection Failed' }}
          </span>
          <span v-if="connectionResult.responseTime" class="response-time">
            Response time: {{ connectionResult.responseTime }}ms
          </span>
          <span v-if="connectionResult.error" class="error-text">
            {{ connectionResult.error }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useETFUniverse, useETFUniverseHealth } from '@/composables/useETFUniverse'
import { testETFUniverseConnectivity, formatLoadStatus, getETFUniverseSummary } from '@/utils/etf-integration'
import type { ETFUniverse } from '@/stores/types'

// Use ETF universe composable
const {
  isLoading,
  hasError,
  error,
  isLoadedFromBackend,
  loadStatus,
  lastLoadTime,
  etfUniverse,
  availableETFs,
  loadETFUniverse: loadUniverse,
  refreshETFUniverse,
  resetToDefaults,
  retryLoad: retryLoadUniverse,
  clearError
} = useETFUniverse(true) // Auto-load on mount

// Use health composable
const { healthStatus, healthMessage } = useETFUniverseHealth()

// Local state
const isTesting = ref(false)
const connectionResult = ref<{ isConnected: boolean; responseTime?: number; error?: string } | null>(null)

// Store state
const store = useETFConfigStore()
const enabledCategories = computed(() => store.enabledCategories)

// Computed properties
const statusClass = computed(() => ({
  'status-loading': isLoading.value,
  'status-error': hasError.value,
  'status-success': !isLoading.value && !hasError.value,
  'status-backend': isLoadedFromBackend.value,
  'status-default': !isLoadedFromBackend.value
}))

const statusMessage = computed(() => {
  if (isLoading.value) return 'Loading...'
  if (hasError.value) return 'Error'
  return isLoadedFromBackend.value ? 'Loaded from Backend' : 'Using Defaults'
})

const totalTickers = computed(() => {
  return Object.values(etfUniverse.value).flat().length
})

// Methods
const formatDate = (date: Date): string => {
  return date.toLocaleString()
}

const formatCategoryName = (category: string): string => {
  const names: Record<string, string> = {
    STOCKS: 'Stocks',
    BONDS: 'Bonds',
    COMMODITIES: 'Commodities',
    ALTERNATIVES: 'Alternatives'
  }
  return names[category] || category
}

const handleRetryLoad = async () => {
  clearError()
  await loadUniverse()
}

const useDefaults = () => {
  resetToDefaults()
  clearError()
}

const testConnectivity = async () => {
  isTesting.value = true
  connectionResult.value = null

  try {
    const result = await testETFUniverseConnectivity()
    connectionResult.value = result
  } catch (error) {
    connectionResult.value = {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    isTesting.value = false
  }
}

// Expose for template
</script>

<script lang="ts">
import { defineComponent } from 'vue'
import { useETFConfigStore } from '@/stores/etf-config'

export default defineComponent({
  name: 'ETFUniverseStatus'
})
</script>

<style scoped>
.etf-universe-status {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background-color: #f8fafc;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-success {
  background-color: #10b981;
  color: white;
}

.status-error {
  background-color: #ef4444;
  color: white;
}

.status-loading {
  background-color: #3b82f6;
  color: white;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: currentColor;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  padding: 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.success-state {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.success-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.25rem;
}

.label {
  font-weight: 500;
  color: #6b7280;
}

.value {
  font-weight: 600;
}

.category-breakdown h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
}

.category-item.enabled {
  background-color: #ecfdf5;
  border-color: #10b981;
}

.category-name {
  font-weight: 500;
}

.category-count {
  font-size: 0.875rem;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
  border-color: #6b7280;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.btn-outline {
  background-color: transparent;
  color: #374151;
  border-color: #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background-color: #f9fafb;
}

.connection-test {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.connection-test h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.25rem;
}

.test-result.success {
  background-color: #ecfdf5;
  border: 1px solid #10b981;
}

.test-result.error {
  background-color: #fef2f2;
  border: 1px solid #ef4444;
}

.result-icon {
  font-size: 1.25rem;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-status {
  font-weight: 600;
}

.response-time {
  font-size: 0.875rem;
  color: #6b7280;
}

.error-text {
  font-size: 0.875rem;
  color: #dc2626;
}
</style>