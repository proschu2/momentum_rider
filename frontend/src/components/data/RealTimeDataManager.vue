<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio'
import { useMomentumStore } from '@/stores/momentum'

interface RealTimeUpdate {
  timestamp: number
  type: 'price' | 'momentum' | 'portfolio'
  data: any
}

const portfolioStore = usePortfolioStore()
const momentumStore = useMomentumStore()

// Real-time configuration
const realTimeConfig = ref({
  enabled: false,
  refreshInterval: 30000, // 30 seconds
  autoRefreshPrices: true,
  autoRecalculateMomentum: false,
  maxUpdates: 100
})

// Real-time data
const realTimeUpdates = ref<RealTimeUpdate[]>([])
const lastUpdateTime = ref<number | null>(null)
const updateInterval = ref<number | null>(null)
const isUpdating = ref(false)

// Performance metrics
const performanceMetrics = ref({
  totalUpdates: 0,
  averageUpdateTime: 0,
  lastUpdateDuration: 0,
  errors: 0
})

// Watch for store changes to trigger real-time updates
watch(() => portfolioStore.currentHoldings, () => {
  if (realTimeConfig.value.enabled) {
    addUpdate('portfolio', portfolioStore.currentHoldings)
  }
}, { deep: true })

watch(() => momentumStore.momentumData, () => {
  if (realTimeConfig.value.enabled) {
    addUpdate('momentum', momentumStore.momentumData)
  }
}, { deep: true })

// Real-time update methods
function addUpdate(type: RealTimeUpdate['type'], data: any) {
  const update: RealTimeUpdate = {
    timestamp: Date.now(),
    type,
    data
  }

  realTimeUpdates.value.unshift(update)

  // Keep only the latest updates
  if (realTimeUpdates.value.length > realTimeConfig.value.maxUpdates) {
    realTimeUpdates.value = realTimeUpdates.value.slice(0, realTimeConfig.value.maxUpdates)
  }

  lastUpdateTime.value = update.timestamp
  performanceMetrics.value.totalUpdates++
}

async function performRealTimeUpdate() {
  if (isUpdating.value) return

  const startTime = Date.now()
  isUpdating.value = true

  try {
    // Refresh prices if enabled
    if (realTimeConfig.value.autoRefreshPrices && Object.keys(portfolioStore.currentHoldings).length > 0) {
      await portfolioStore.refreshCurrentPrices()
      addUpdate('price', { holdings: portfolioStore.currentHoldings })
    }

    // Recalculate momentum if enabled
    if (realTimeConfig.value.autoRecalculateMomentum && momentumStore.selectedTopETFs.length > 0) {
      await momentumStore.calculateMomentum()
      addUpdate('momentum', { momentumData: momentumStore.momentumData })
    }

    const duration = Date.now() - startTime
    performanceMetrics.value.lastUpdateDuration = duration

    // Update average update time
    performanceMetrics.value.averageUpdateTime =
      (performanceMetrics.value.averageUpdateTime * (performanceMetrics.value.totalUpdates - 1) + duration) /
      performanceMetrics.value.totalUpdates

  } catch (error) {
    console.error('Real-time update failed:', error)
    performanceMetrics.value.errors++
  } finally {
    isUpdating.value = false
  }
}

function startRealTimeUpdates() {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }

  realTimeConfig.value.enabled = true
  updateInterval.value = setInterval(() => {
    performRealTimeUpdate()
  }, realTimeConfig.value.refreshInterval)

  // Perform initial update
  performRealTimeUpdate()
}

function stopRealTimeUpdates() {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
    updateInterval.value = null
  }
  realTimeConfig.value.enabled = false
}

function toggleRealTimeUpdates() {
  if (realTimeConfig.value.enabled) {
    stopRealTimeUpdates()
  } else {
    startRealTimeUpdates()
  }
}

function updateRefreshInterval(interval: number) {
  realTimeConfig.value.refreshInterval = interval

  if (realTimeConfig.value.enabled) {
    stopRealTimeUpdates()
    startRealTimeUpdates()
  }
}

function clearUpdates() {
  realTimeUpdates.value = []
  performanceMetrics.value.totalUpdates = 0
  performanceMetrics.value.averageUpdateTime = 0
  performanceMetrics.value.lastUpdateDuration = 0
  performanceMetrics.value.errors = 0
}

// Format timestamp for display
function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString()
}

// Format duration for display
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// Get update type color
function getUpdateTypeColor(type: RealTimeUpdate['type']) {
  switch (type) {
    case 'price': return 'var(--color-blue-500)'
    case 'momentum': return 'var(--color-green-500)'
    case 'portfolio': return 'var(--color-purple-500)'
    default: return 'var(--color-neutral-500)'
  }
}

// Get update type icon
function getUpdateTypeIcon(type: RealTimeUpdate['type']) {
  switch (type) {
    case 'price': return '💰'
    case 'momentum': return '📈'
    case 'portfolio': return '📊'
    default: return '🔄'
  }
}

// Lifecycle hooks
onMounted(() => {
  // Auto-start real-time updates if there are holdings
  if (Object.keys(portfolioStore.currentHoldings).length > 0) {
    startRealTimeUpdates()
  }
})

onUnmounted(() => {
  stopRealTimeUpdates()
})
</script>

<template>
  <div class="real-time-data-manager">
    <!-- Control Panel -->
    <div class="control-panel">
      <div class="control-header">
        <h3 class="control-title">Real-time Data</h3>
        <div class="control-status">
          <div
            class="status-indicator"
            :class="{ active: realTimeConfig.enabled, updating: isUpdating }"
          ></div>
          <span class="status-text">
            {{ realTimeConfig.enabled ? (isUpdating ? 'Updating...' : 'Active') : 'Paused' }}
          </span>
        </div>
      </div>

      <div class="control-actions">
        <button
          @click="toggleRealTimeUpdates"
          :class="['control-btn', realTimeConfig.enabled ? 'stop-btn' : 'start-btn']"
          :disabled="isUpdating"
        >
          {{ realTimeConfig.enabled ? 'Stop Updates' : 'Start Updates' }}
        </button>

        <button
          @click="performRealTimeUpdate"
          class="control-btn update-now-btn"
          :disabled="isUpdating"
        >
          Update Now
        </button>

        <button
          @click="clearUpdates"
          class="control-btn clear-btn"
        >
          Clear History
        </button>
      </div>

      <div class="control-settings">
        <div class="setting-group">
          <label class="setting-label">Refresh Interval</label>
          <select
            v-model="realTimeConfig.refreshInterval"
            @change="updateRefreshInterval(Number(($event.target as HTMLSelectElement).value))"
            class="setting-select"
          >
            <option value="15000">15 seconds</option>
            <option value="30000">30 seconds</option>
            <option value="60000">1 minute</option>
            <option value="300000">5 minutes</option>
          </select>
        </div>

        <div class="setting-group">
          <label class="setting-label">Auto Actions</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="realTimeConfig.autoRefreshPrices"
              />
              <span class="checkbox-custom"></span>
              Refresh Prices
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="realTimeConfig.autoRecalculateMomentum"
              />
              <span class="checkbox-custom"></span>
              Recalculate Momentum
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-panel">
      <h4 class="metrics-title">Performance Metrics</h4>
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-label">Total Updates</span>
          <span class="metric-value">{{ performanceMetrics.totalUpdates }}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Avg Update Time</span>
          <span class="metric-value">{{ formatDuration(performanceMetrics.averageUpdateTime) }}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Last Update</span>
          <span class="metric-value">{{ formatDuration(performanceMetrics.lastUpdateDuration) }}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Errors</span>
          <span class="metric-value error">{{ performanceMetrics.errors }}</span>
        </div>
      </div>
    </div>

    <!-- Update History -->
    <div class="history-panel">
      <div class="history-header">
        <h4 class="history-title">Update History</h4>
        <span class="history-count">{{ realTimeUpdates.length }} updates</span>
      </div>

      <div class="history-list">
        <div
          v-for="update in realTimeUpdates.slice(0, 10)"
          :key="update.timestamp"
          class="history-item"
        >
          <div class="update-type" :style="{ backgroundColor: getUpdateTypeColor(update.type) }">
            {{ getUpdateTypeIcon(update.type) }}
          </div>
          <div class="update-details">
            <div class="update-info">
              <span class="update-type-label">{{ update.type.toUpperCase() }}</span>
              <span class="update-time">{{ formatTimestamp(update.timestamp) }}</span>
            </div>
            <div class="update-data">
              <template v-if="update.type === 'price'">
                Updated {{ Object.keys(update.data.holdings || {}).length }} holdings
              </template>
              <template v-else-if="update.type === 'momentum'">
                Updated {{ Object.keys(update.data.momentumData || {}).length }} assets
              </template>
              <template v-else-if="update.type === 'portfolio'">
                Portfolio changes detected
              </template>
            </div>
          </div>
        </div>

        <div v-if="realTimeUpdates.length === 0" class="empty-history">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No updates yet</p>
          <p class="empty-subtext">Start real-time updates to see history</p>
        </div>
      </div>
    </div>

    <!-- Last Update Info -->
    <div v-if="lastUpdateTime" class="last-update-info">
      <div class="last-update-header">
        <span class="last-update-label">Last Update</span>
        <span class="last-update-time">{{ formatTimestamp(lastUpdateTime) }}</span>
      </div>
      <div class="update-stats">
        <span class="stat">Total Value: {{ portfolioStore.totalPortfolioValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}</span>
        <span class="stat">Holdings: {{ Object.keys(portfolioStore.currentHoldings).length }}</span>
        <span class="stat">Positive Momentum: {{ Object.values(momentumStore.momentumData).filter(data => data.absoluteMomentum).length }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.real-time-data-manager {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.control-panel {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 24px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.control-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
}

.control-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-neutral-400);
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: var(--color-success-500);
  animation: pulse 2s infinite;
}

.status-indicator.updating {
  background: var(--color-primary-500);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 14px;
  color: var(--color-neutral-600);
  font-weight: 500;
}

.control-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.control-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--color-surface);
}

.control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.start-btn {
  background: var(--color-success-500);
  color: white;
  border-color: var(--color-success-500);
}

.start-btn:hover:not(:disabled) {
  background: var(--color-success-600);
}

.stop-btn {
  background: var(--color-error-500);
  color: white;
  border-color: var(--color-error-500);
}

.stop-btn:hover:not(:disabled) {
  background: var(--color-error-600);
}

.update-now-btn {
  background: var(--color-primary-500);
  color: white;
  border-color: var(--color-primary-500);
}

.update-now-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.clear-btn {
  background: var(--color-neutral-200);
  color: var(--color-neutral-700);
}

.clear-btn:hover {
  background: var(--color-neutral-300);
}

.control-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-700);
}

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-neutral-700);
  cursor: pointer;
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-neutral-400);
  border-radius: 4px;
  background: white;
  transition: all 0.15s ease;
  position: relative;
}

.checkbox-label input:checked + .checkbox-custom {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.metrics-panel {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 24px;
}

.metrics-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: var(--color-neutral-50);
  border-radius: var(--radius-lg);
}

.metric-label {
  font-size: 12px;
  color: var(--color-neutral-500);
  font-weight: 500;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.metric-value.error {
  color: var(--color-error-600);
}

.history-panel {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 24px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
}

.history-count {
  font-size: 14px;
  color: var(--color-neutral-500);
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.history-item:hover {
  background: var(--color-neutral-50);
}

.history-item:last-child {
  border-bottom: none;
}

.update-type {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.update-details {
  flex: 1;
  min-width: 0;
}

.update-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.update-type-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-neutral-700);
  text-transform: uppercase;
}

.update-time {
  font-size: 11px;
  color: var(--color-neutral-500);
}

.update-data {
  font-size: 13px;
  color: var(--color-neutral-600);
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-neutral-400);
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.empty-subtext {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 4px;
}

.last-update-info {
  background: var(--color-neutral-50);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.last-update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.last-update-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.last-update-time {
  font-size: 14px;
  color: var(--color-neutral-500);
}

.update-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  font-size: 12px;
  color: var(--color-neutral-600);
  background: var(--color-surface);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

/* Responsive Design */
@media (max-width: 768px) {
  .real-time-data-manager {
    padding: 16px;
  }

  .control-actions {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }

  .control-settings {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .update-stats {
    flex-direction: column;
    gap: 8px;
  }

  .stat {
    text-align: center;
  }
}
</style>