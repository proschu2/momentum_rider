<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMomentumRiderStore } from '@/stores/momentum-rider'

interface TrendDataPoint {
  period: string
  value: number
  date: Date
}

interface AssetTrendData {
  ticker: string
  name: string
  color: string
  data: TrendDataPoint[]
  currentValue: number
  averageMomentum: number
}

const store = useMomentumRiderStore()
const selectedTimeframe = ref<'1m' | '3m' | '6m' | '1y'>('1y')
const hoveredPoint = ref<{ ticker: string; point: TrendDataPoint } | null>(null)
const selectedAssets = ref<string[]>([])

// Color palette for different assets
const assetColors = {
  VTI: '#3B82F6',
  VEA: '#60A5FA',
  VWO: '#93C5FD',
  TLT: '#10B981',
  BWX: '#34D399',
  BND: '#6EE7B7',
  PDBC: '#F59E0B',
  SGOL: '#FBBF24',
  IBIT: '#8B5CF6'
}

// Generate mock trend data (in a real app, this would come from an API)
function generateTrendData(ticker: string, baseValue: number, volatility: number): TrendDataPoint[] {
  const periods = {
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 365
  }

  const days = periods[selectedTimeframe.value]
  const data: TrendDataPoint[] = []
  const now = new Date()

  // Start with the base value
  let currentValue = baseValue

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Simulate price movement with some randomness
    const change = (Math.random() - 0.5) * volatility
    currentValue = Math.max(1, currentValue * (1 + change / 100))

    data.push({
      period: date.toISOString().split('T')[0],
      value: currentValue,
      date
    })
  }

  return data
}

const trendData = computed<AssetTrendData[]>(() => {
  if (Object.keys(store.momentumData).length === 0) return []

  const assets = selectedAssets.value.length > 0
    ? selectedAssets.value
    : store.selectedTopETFs.slice(0, 5)

  return assets.map(ticker => {
    const momentum = store.momentumData[ticker]
    const price = store.etfPrices[ticker]?.price || 100
    const name = store.etfPrices[ticker]?.name || ticker

    // Higher volatility for assets with higher momentum
    const volatility = Math.abs(momentum?.average || 0) * 0.5 + 1

    return {
      ticker,
      name,
      color: assetColors[ticker as keyof typeof assetColors] || '#6B7280',
      data: generateTrendData(ticker, price, volatility),
      currentValue: price,
      averageMomentum: momentum?.average || 0
    }
  })
})

// Chart dimensions and scales
const chartWidth = 600
const chartHeight = 400
const margin = { top: 40, right: 40, bottom: 60, left: 60 }

const innerWidth = computed(() => chartWidth - margin.left - margin.right)
const innerHeight = computed(() => chartHeight - margin.top - margin.bottom)

// Calculate scales
const xScale = computed(() => {
  if (trendData.value.length === 0) return () => 0

  const allDates = trendData.value.flatMap(asset => asset.data.map(d => d.date))
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

  return (date: Date) => {
    const timeRange = maxDate.getTime() - minDate.getTime()
    const position = (date.getTime() - minDate.getTime()) / timeRange
    return position * innerWidth.value
  }
})

const yScale = computed(() => {
  if (trendData.value.length === 0) return () => 0

  const allValues = trendData.value.flatMap(asset => asset.data.map(d => d.value))
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const padding = (maxValue - minValue) * 0.1

  return (value: number) => {
    const normalized = (value - (minValue - padding)) / ((maxValue + padding) - (minValue - padding))
    return innerHeight.value - (normalized * innerHeight.value)
  }
})

// Generate line path for an asset
function generateLinePath(data: TrendDataPoint[]) {
  if (data.length === 0) return ''

  const points = data.map(point => {
    const x = xScale.value(point.date) + margin.left
    const y = yScale.value(point.value) + margin.top
    return `${x},${y}`
  })

  return `M ${points.join(' L ')}`
}

// Handle asset selection
function toggleAssetSelection(ticker: string) {
  const index = selectedAssets.value.indexOf(ticker)
  if (index > -1) {
    selectedAssets.value.splice(index, 1)
  } else {
    selectedAssets.value.push(ticker)
  }
}

// Handle point hover
function handlePointHover(ticker: string, point: TrendDataPoint | null) {
  hoveredPoint.value = point ? { ticker, point } : null
}

// Format currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

// Format percentage
function formatPercentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

// Watch for momentum data changes to update selected assets
watch(() => store.selectedTopETFs, (newTopETFs) => {
  if (selectedAssets.value.length === 0) {
    selectedAssets.value = newTopETFs.slice(0, 5)
  }
}, { immediate: true })
</script>

<template>
  <div class="performance-trend-chart">
    <!-- Chart Header -->
    <div class="chart-header">
      <h3 class="chart-title">Performance Trends</h3>
      <div class="chart-controls">
        <div class="timeframe-selector">
          <button
            v-for="timeframe in ['1m', '3m', '6m', '1y']"
            :key="timeframe"
            @click="selectedTimeframe = timeframe as any"
            :class="['timeframe-btn', { active: selectedTimeframe === timeframe }]"
          >
            {{ timeframe }}
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="chart-container">
      <!-- SVG Chart -->
      <div class="chart-svg-container">
        <svg
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          class="trend-chart"
          @mouseleave="handlePointHover('', null)"
        >
          <!-- Grid Lines -->
          <g class="grid-lines">
            <!-- Horizontal Grid Lines -->
            <line
              v-for="i in 5"
              :key="`h-grid-${i}`"
              :x1="margin.left"
              :y1="margin.top + (i * innerHeight / 5)"
              :x2="margin.left + innerWidth"
              :y2="margin.top + (i * innerHeight / 5)"
              stroke="#e5e7eb"
              stroke-width="1"
            />

            <!-- Vertical Grid Lines -->
            <line
              v-for="i in 6"
              :key="`v-grid-${i}`"
              :x1="margin.left + (i * innerWidth / 6)"
              :y1="margin.top"
              :x2="margin.left + (i * innerWidth / 6)"
              :y2="margin.top + innerHeight"
              stroke="#e5e7eb"
              stroke-width="1"
            />
          </g>

          <!-- Trend Lines -->
          <g class="trend-lines">
            <path
              v-for="asset in trendData"
              :key="asset.ticker"
              :d="generateLinePath(asset.data)"
              :stroke="asset.color"
              stroke-width="2"
              fill="none"
              class="trend-line"
              :class="{ 'highlighted': selectedAssets.includes(asset.ticker) || selectedAssets.length === 0 }"
            />
          </g>

          <!-- Data Points -->
          <g class="data-points">
            <circle
              v-for="asset in trendData"
              :key="`point-${asset.ticker}`"
              v-for="(point, index) in asset.data.filter((_, i) => i % 7 === 0)"
              :cx="xScale(point.date) + margin.left"
              :cy="yScale(point.value) + margin.top"
              r="3"
              :fill="asset.color"
              class="data-point"
              @mouseenter="handlePointHover(asset.ticker, point)"
              @mouseleave="handlePointHover('', null)"
            />
          </g>

          <!-- Axes -->
          <g class="axes">
            <!-- X Axis -->
            <line
              :x1="margin.left"
              :y1="margin.top + innerHeight"
              :x2="margin.left + innerWidth"
              :y2="margin.top + innerHeight"
              stroke="#374151"
              stroke-width="2"
            />

            <!-- Y Axis -->
            <line
              :x1="margin.left"
              :y1="margin.top"
              :x2="margin.left"
              :y2="margin.top + innerHeight"
              stroke="#374151"
              stroke-width="2"
            />
          </g>

          <!-- Hover Tooltip -->
          <g v-if="hoveredPoint" class="hover-tooltip">
            <rect
              :x="xScale(hoveredPoint.point.date) + margin.left + 10"
              :y="yScale(hoveredPoint.point.value) + margin.top - 60"
              width="160"
              height="50"
              rx="8"
              fill="#1f2937"
              class="tooltip-bg"
            />
            <text
              :x="xScale(hoveredPoint.point.date) + margin.left + 20"
              :y="yScale(hoveredPoint.point.value) + margin.top - 40"
              fill="white"
              class="tooltip-asset"
            >
              {{ hoveredPoint.ticker }}
            </text>
            <text
              :x="xScale(hoveredPoint.point.date) + margin.left + 20"
              :y="yScale(hoveredPoint.point.value) + margin.top - 25"
              fill="white"
              class="tooltip-value"
            >
              {{ formatCurrency(hoveredPoint.point.value) }}
            </text>
            <text
              :x="xScale(hoveredPoint.point.date) + margin.left + 20"
              :y="yScale(hoveredPoint.point.value) + margin.top - 10"
              fill="white"
              class="tooltip-date"
            >
              {{ hoveredPoint.point.period }}
            </text>
          </g>

          <!-- Current Value Markers -->
          <g class="current-markers">
            <circle
              v-for="asset in trendData"
              :key="`current-${asset.ticker}`"
              :cx="margin.left + innerWidth"
              :cy="yScale(asset.currentValue) + margin.top"
              r="6"
              :fill="asset.color"
              stroke="white"
              stroke-width="2"
              class="current-marker"
            />
          </g>
        </svg>
      </div>

      <!-- Asset Selector -->
      <div class="asset-selector">
        <h4 class="selector-title">Select Assets</h4>
        <div class="asset-list">
          <div
            v-for="asset in store.selectedTopETFs"
            :key="asset"
            class="asset-item"
            @click="toggleAssetSelection(asset)"
          >
            <div class="asset-checkbox">
              <input
                type="checkbox"
                :checked="selectedAssets.includes(asset) || selectedAssets.length === 0"
                @change="toggleAssetSelection(asset)"
              />
              <div class="checkbox-indicator"></div>
            </div>
            <div class="asset-color" :style="{ backgroundColor: assetColors[asset as keyof typeof assetColors] || '#6B7280' }"></div>
            <span class="asset-ticker">{{ asset }}</span>
            <span class="asset-momentum" :class="{ positive: store.momentumData[asset]?.average >= 0, negative: store.momentumData[asset]?.average < 0 }">
              {{ formatPercentage(store.momentumData[asset]?.average || 0) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Summary -->
    <div class="performance-summary">
      <h4 class="summary-title">Performance Summary</h4>
      <div class="summary-grid">
        <div
          v-for="asset in trendData"
          :key="`summary-${asset.ticker}`"
          class="summary-item"
        >
          <div class="summary-header">
            <div class="summary-color" :style="{ backgroundColor: asset.color }"></div>
            <span class="summary-ticker">{{ asset.ticker }}</span>
            <span class="summary-momentum" :class="{ positive: asset.averageMomentum >= 0, negative: asset.averageMomentum < 0 }">
              {{ formatPercentage(asset.averageMomentum) }}
            </span>
          </div>
          <div class="summary-details">
            <div class="summary-price">{{ formatCurrency(asset.currentValue) }}</div>
            <div class="summary-change">
              <span v-if="asset.data.length > 1">
                {{ formatPercentage(((asset.currentValue - asset.data[0].value) / asset.data[0].value) * 100) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="trendData.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="empty-text">No performance data available</p>
      <p class="empty-subtext">Calculate momentum to see trend analysis</p>
    </div>
  </div>
</template>

<style scoped>
.performance-trend-chart {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
}

.timeframe-selector {
  display: flex;
  gap: 8px;
  background: var(--color-neutral-100);
  border-radius: var(--radius-lg);
  padding: 4px;
}

.timeframe-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.15s ease;
}

.timeframe-btn:hover {
  background: var(--color-neutral-200);
}

.timeframe-btn.active {
  background: var(--color-primary-500);
  color: white;
}

.chart-container {
  display: flex;
  gap: 32px;
  flex: 1;
  min-height: 400px;
}

.chart-svg-container {
  flex: 1;
  min-width: 0;
}

.trend-chart {
  width: 100%;
  height: 400px;
}

.trend-line {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.trend-line:not(.highlighted) {
  opacity: 0.3;
}

.data-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.data-point:hover {
  r: 5;
}

.current-marker {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.hover-tooltip {
  pointer-events: none;
}

.tooltip-bg {
  opacity: 0.95;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.tooltip-asset {
  font-size: 14px;
  font-weight: 600;
}

.tooltip-value {
  font-size: 12px;
  font-weight: 500;
}

.tooltip-date {
  font-size: 11px;
  opacity: 0.8;
}

.asset-selector {
  width: 200px;
  flex-shrink: 0;
}

.selector-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 16px;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.asset-item:hover {
  background: var(--color-neutral-50);
}

.asset-checkbox {
  position: relative;
}

.asset-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkbox-indicator {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-neutral-300);
  border-radius: 4px;
  background: white;
  transition: all 0.15s ease;
}

.asset-checkbox input:checked + .checkbox-indicator {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.asset-checkbox input:checked + .checkbox-indicator::after {
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

.asset-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.asset-ticker {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-700);
  flex: 1;
}

.asset-momentum {
  font-size: 12px;
  font-weight: 600;
}

.asset-momentum.positive {
  color: var(--color-success-600);
}

.asset-momentum.negative {
  color: var(--color-error-600);
}

.performance-summary {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-neutral-50);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.summary-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.summary-ticker {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-900);
  flex: 1;
}

.summary-momentum {
  font-size: 12px;
  font-weight: 600;
}

.summary-momentum.positive {
  color: var(--color-success-600);
}

.summary-momentum.negative {
  color: var(--color-error-600);
}

.summary-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.summary-change {
  font-size: 14px;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-neutral-400);
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 14px;
  opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .chart-container {
    flex-direction: column;
  }

  .asset-selector {
    width: 100%;
  }

  .asset-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .asset-item {
    flex: 1;
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>