<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePortfolioStore, type Holding } from '@/stores/portfolio'

interface ChartData {
  ticker: string
  name: string
  value: number
  percentage: number
  color: string
  category: string
}

const store = usePortfolioStore()
const chartType = ref<'pie' | 'donut'>('donut')
const hoveredSlice = ref<ChartData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Watch for store loading state
watch(() => store.isLoading, (loading) => {
  isLoading.value = loading
  if (loading) {
    error.value = null
  }
})

// Watch for store errors
watch(() => store.error, (storeError) => {
  if (storeError) {
    error.value = storeError
  }
})

// Color palette for different asset categories
const categoryColors = {
  STOCKS: '#3B82F6', // Blue
  BONDS: '#10B981',  // Green
  COMMODITIES: '#F59E0B', // Amber
  ALTERNATIVES: '#8B5CF6', // Purple
  CASH: '#6B7280' // Gray
}

// Individual asset colors within categories
const assetColors = {
  VTI: '#2563EB',
  VEA: '#1D4ED8',
  VWO: '#1E40AF',
  TLT: '#059669',
  BWX: '#047857',
  BND: '#065F46',
  PDBC: '#D97706',
  SGOL: '#92400E',
  IBIT: '#7C3AED'
}

const chartData = computed<ChartData[]>(() => {
  const data: ChartData[] = []

  // Add current holdings
  Object.entries(store.currentHoldings).forEach(([ticker, holding]) => {
    if (holding.value > 0) {
      const category = getCategoryForTicker(ticker)
      data.push({
        ticker,
        name: holding.name || ticker,
        value: holding.value,
        percentage: (holding.value / store.totalPortfolioValue) * 100,
        color: assetColors[ticker as keyof typeof assetColors] || categoryColors[category],
        category
      })
    }
  })

  // Add cash
  if (store.additionalCash > 0) {
    data.push({
      ticker: 'CASH',
      name: 'Cash',
      value: store.additionalCash,
      percentage: (store.additionalCash / store.totalPortfolioValue) * 100,
      color: categoryColors.CASH,
      category: 'CASH'
    })
  }

  return data.sort((a, b) => b.value - a.value)
})

const totalValue = computed(() => store.totalPortfolioValue)

function getCategoryForTicker(ticker: string): keyof typeof categoryColors {
  if (['VTI', 'VEA', 'VWO'].includes(ticker)) return 'STOCKS'
  if (['TLT', 'BWX', 'BND'].includes(ticker)) return 'BONDS'
  if (['PDBC'].includes(ticker)) return 'COMMODITIES'
  if (['SGOL', 'IBIT'].includes(ticker)) return 'ALTERNATIVES'
  return 'STOCKS'
}

function getCategoryData() {
  const categories: Record<string, { value: number; percentage: number; color: string }> = {}

  chartData.value.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { value: 0, percentage: 0, color: categoryColors[item.category as keyof typeof categoryColors] }
    }
    const category = categories[item.category]
    if (category) {
      category.value += item.value
      category.percentage += item.percentage
    }
  })

  return Object.entries(categories).map(([category, data]) => ({
    category,
    ...data
  })).sort((a, b) => b.value - a.value)
}

// SVG Pie Chart Calculations
function calculateSliceAngles(data: ChartData[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = -90 // Start from top

  return data.map(item => {
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    return {
      ...item,
      startAngle,
      endAngle,
      largeArc: angle > 180 ? 1 : 0
    }
  })
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  }
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number, innerRadius = 0) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle)
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  if (innerRadius === 0) {
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', x, y,
      'Z'
    ].join(' ')
  } else {
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ')
  }
}

const handleSliceHover = (data: ChartData | null) => {
  hoveredSlice.value = data
}

const handleSliceClick = (data: ChartData) => {
  console.log('Slice clicked:', data)
  // Could trigger detailed view or navigation
}

// Keyboard navigation for chart
const handleChartKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    // Focus the first legend item
    const firstLegendItem = document.querySelector('.legend-item') as HTMLElement
    if (firstLegendItem) {
      firstLegendItem.focus()
    }
  }
}

// Keyboard navigation for legend items
const handleLegendKeydown = (event: KeyboardEvent, item: ChartData) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleSliceClick(item)
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      const legendItems = Array.from(document.querySelectorAll('.legend-item'))
      const currentIndex = legendItems.indexOf(event.target as HTMLElement)
      let nextIndex = currentIndex

      if (event.key === 'ArrowUp' && currentIndex > 0) {
        nextIndex = currentIndex - 1
      } else if (event.key === 'ArrowDown' && currentIndex < legendItems.length - 1) {
        nextIndex = currentIndex + 1
      }

      if (nextIndex !== currentIndex) {
        ;(legendItems[nextIndex] as HTMLElement).focus()
      }
      break
  }
}
</script>

<template>
  <div class="portfolio-allocation-chart">
    <!-- Chart Header -->
    <div class="chart-header">
      <div class="flex items-center space-x-3">
        <h3 class="chart-title">Portfolio Allocation</h3>
        <!-- Desktop-only quick stats -->
        <div class="hidden lg:flex items-center space-x-4 text-sm">
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
            <span class="text-neutral-600">{{ chartData.length }} assets</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-success-500 rounded-full"></div>
            <span class="text-neutral-600">${{ totalValue.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <div class="chart-controls">
        <button
          @click="chartType = 'pie'"
          :class="['chart-type-btn', { active: chartType === 'pie' }]"
          aria-label="Switch to pie chart view"
        >
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
          Pie
        </button>
        <button
          @click="chartType = 'donut'"
          :class="['chart-type-btn', { active: chartType === 'donut' }]"
          aria-label="Switch to donut chart view"
        >
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          Donut
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner">
        <svg class="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle class="spinner-circle" cx="12" cy="12" r="10" stroke-width="4" />
        </svg>
      </div>
      <p class="loading-text">Loading portfolio data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p class="error-text">{{ error }}</p>
      <button @click="store.refreshCurrentPrices()" class="retry-btn">
        Retry
      </button>
    </div>

    <!-- Chart Container -->
    <div v-else class="chart-container">
      <!-- SVG Chart -->
      <div class="chart-svg-container">
        <svg
          :viewBox="`0 0 400 400`"
          class="allocation-chart"
          @mouseleave="handleSliceHover(null)"
          @keydown="handleChartKeydown"
          tabindex="0"
          role="img"
          :aria-label="`Portfolio allocation chart showing ${chartData.length} assets. Total value $${totalValue.toLocaleString()}.`"
        >
          <!-- Background Circle -->
          <circle
            cx="200"
            cy="200"
            :r="chartType === 'donut' ? 150 : 160"
            fill="none"
            stroke="#e5e7eb"
            stroke-width="1"
          />

          <!-- Chart Slices -->
          <g v-for="(slice, index) in calculateSliceAngles(chartData)" :key="slice.ticker">
            <path
              :d="describeArc(200, 200, 160, slice.startAngle, slice.endAngle, chartType === 'donut' ? 80 : 0)"
              :fill="slice.color"
              :stroke="hoveredSlice?.ticker === slice.ticker ? '#1f2937' : 'white'"
              :stroke-width="hoveredSlice?.ticker === slice.ticker ? 3 : 2"
              class="chart-slice"
              @mouseenter="handleSliceHover(slice)"
              @mouseleave="handleSliceHover(null)"
              @click="handleSliceClick(slice)"
            />
          </g>

          <!-- Center Text for Donut Chart -->
          <g v-if="chartType === 'donut'">
            <text
              x="200"
              y="190"
              text-anchor="middle"
              class="center-total-value"
            >
              ${{ totalValue.toLocaleString() }}
            </text>
            <text
              x="200"
              y="210"
              text-anchor="middle"
              class="center-total-label"
            >
              Total Value
            </text>
          </g>

          <!-- Hover Tooltip -->
          <g v-if="hoveredSlice">
            <rect
              :x="180"
              :y="180"
              width="140"
              height="60"
              rx="8"
              fill="#1f2937"
              class="tooltip-bg"
            />
            <text
              x="200"
              y="200"
              text-anchor="middle"
              fill="white"
              class="tooltip-name"
            >
              {{ hoveredSlice.name }}
            </text>
            <text
              x="200"
              y="220"
              text-anchor="middle"
              fill="white"
              class="tooltip-value"
            >
              ${{ hoveredSlice.value.toLocaleString() }}
            </text>
            <text
              x="200"
              y="240"
              text-anchor="middle"
              fill="white"
              class="tooltip-percentage"
            >
              {{ hoveredSlice.percentage.toFixed(1) }}%
            </text>
          </g>
        </svg>
      </div>

      <!-- Legend -->
      <div class="chart-legend">
        <div
          v-for="item in chartData.slice(0, 8)"
          :key="item.ticker"
          class="legend-item"
          @mouseenter="handleSliceHover(item)"
          @mouseleave="handleSliceHover(null)"
          @click="handleSliceClick(item)"
          @keydown="handleLegendKeydown($event, item)"
          tabindex="0"
          role="button"
          :aria-label="`${item.name}: $${item.value.toLocaleString()} (${item.percentage.toFixed(1)}%)`"
        >
          <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
          <div class="legend-details">
            <span class="legend-name">{{ item.name }}</span>
            <span class="legend-percentage">{{ item.percentage.toFixed(1) }}%</span>
          </div>
          <div class="legend-value">${{ item.value.toLocaleString() }}</div>
        </div>

        <!-- Show "Other" if there are more than 8 items -->
        <div v-if="chartData.length > 8" class="legend-item other-item">
          <div class="legend-color" style="background-color: #9ca3af"></div>
          <div class="legend-details">
            <span class="legend-name">Other</span>
            <span class="legend-percentage">
              {{ chartData.slice(8).reduce((sum, item) => sum + item.percentage, 0).toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="category-breakdown">
      <h4 class="breakdown-title">Asset Category Breakdown</h4>
      <div class="category-list">
        <div
          v-for="category in getCategoryData()"
          :key="category.category"
          class="category-item"
        >
          <div class="category-color" :style="{ backgroundColor: category.color }"></div>
          <span class="category-name">{{ category.category }}</span>
          <span class="category-percentage">{{ category.percentage.toFixed(1) }}%</span>
          <span class="category-value">${{ category.value.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="chartData.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="empty-text">No portfolio data available</p>
      <p class="empty-subtext">Add holdings to see allocation breakdown</p>
    </div>
  </div>
</template>

<style scoped>
.portfolio-allocation-chart {
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

.chart-controls {
  display: flex;
  gap: 8px;
  background: var(--color-neutral-100);
  border-radius: var(--radius-lg);
  padding: 4px;
}

.chart-type-btn {
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

.chart-type-btn:hover {
  background: var(--color-neutral-200);
}

.chart-type-btn.active {
  background: var(--color-primary-500);
  color: white;
}

.chart-container {
  display: flex;
  gap: 32px;
  align-items: center;
  flex: 1;
  min-height: 300px;
}

.chart-svg-container {
  flex-shrink: 0;
}

.allocation-chart {
  width: 300px;
  height: 300px;
}

.chart-slice {
  cursor: pointer;
  transition: all 0.2s ease;
  filter: brightness(1);
}

.chart-slice:hover {
  filter: brightness(1.1);
  transform-origin: center;
  transform: scale(1.02);
}

.center-total-value {
  font-size: 18px;
  font-weight: 700;
  fill: var(--color-neutral-900);
}

.center-total-label {
  font-size: 12px;
  fill: var(--color-neutral-500);
}

.tooltip-bg {
  opacity: 0.95;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.tooltip-name {
  font-size: 14px;
  font-weight: 600;
}

.tooltip-value {
  font-size: 12px;
  font-weight: 500;
}

.tooltip-percentage {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.9;
}

.chart-legend {
  flex: 1;
  max-height: 300px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.legend-item:hover {
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin: 0 -12px;
}

.legend-item:last-child {
  border-bottom: none;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.legend-name {
  font-size: 14px;
  color: var(--color-neutral-700);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-percentage {
  font-size: 14px;
  color: var(--color-neutral-600);
  font-weight: 600;
  margin-left: 8px;
}

.legend-value {
  font-size: 12px;
  color: var(--color-neutral-500);
  white-space: nowrap;
}

.other-item .legend-details {
  justify-content: flex-start;
}

.category-breakdown {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.breakdown-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 16px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.category-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-name {
  font-size: 14px;
  color: var(--color-neutral-700);
  font-weight: 500;
  flex: 1;
}

.category-percentage {
  font-size: 14px;
  color: var(--color-neutral-600);
  font-weight: 600;
  margin-right: 12px;
}

.category-value {
  font-size: 12px;
  color: var(--color-neutral-500);
  white-space: nowrap;
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
@media (max-width: 768px) {
  .chart-container {
    flex-direction: column;
    gap: 24px;
  }

  .allocation-chart {
    width: 250px;
    height: 250px;
  }

  .chart-legend {
    width: 100%;
    max-height: 200px;
  }
}
</style>