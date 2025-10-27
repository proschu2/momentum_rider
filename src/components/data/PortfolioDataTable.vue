<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePortfolioStore, type Holding } from '@/stores/portfolio'
import { useMomentumStore } from '@/stores/momentum'
import { useETFConfigStore } from '@/stores/etf-config'

interface TableRow {
  id: string
  ticker: string
  name: string
  category: string
  currentPrice: number
  shares: number
  value: number
  allocation: number
  momentum: number
  momentumStatus: 'positive' | 'negative'
  periods: {
    '3month': number
    '6month': number
    '9month': number
    '12month': number
  }
  isSelected: boolean
  isTopAsset: boolean
}

const portfolioStore = usePortfolioStore()
const momentumStore = useMomentumStore()
const etfConfigStore = useETFConfigStore()
const searchQuery = ref('')
const sortBy = ref<'ticker' | 'value' | 'allocation' | 'momentum'>('momentum')
const sortDirection = ref<'asc' | 'desc'>('desc')
const selectedCategory = ref<string>('all')
const expandedRows = ref<Set<string>>(new Set())
const selectedRows = ref<Set<string>>(new Set())

// Available categories
const categories = computed(() => {
  const cats = ['all', ...Object.keys(etfConfigStore.etfUniverse)]
  return cats
})

// Table data
const tableData = computed<TableRow[]>(() => {
  const data: TableRow[] = []

  // Add current holdings
  Object.entries(portfolioStore.currentHoldings).forEach(([ticker, holding]) => {
    const momentum = momentumStore.momentumData[ticker]
    const category = getCategoryForTicker(ticker)
    const value = holding.value
    const allocation = (value / portfolioStore.totalPortfolioValue) * 100

    data.push({
      id: ticker,
      ticker,
      name: holding.name || ticker,
      category,
      currentPrice: holding.price,
      shares: holding.shares,
      value,
      allocation,
      momentum: momentum?.average || 0,
      momentumStatus: momentum?.absoluteMomentum ? 'positive' : 'negative',
      periods: momentum?.periods || {
        '3month': 0,
        '6month': 0,
        '9month': 0,
        '12month': 0
      },
      isSelected: etfConfigStore.selectedETFs.includes(ticker),
      isTopAsset: etfConfigStore.selectedTopETFs.includes(ticker)
    })
  })

  // Add cash
  if (portfolioStore.additionalCash > 0) {
    data.push({
      id: 'CASH',
      ticker: 'CASH',
      name: 'Cash',
      category: 'CASH',
      currentPrice: 1,
      shares: portfolioStore.additionalCash,
      value: portfolioStore.additionalCash,
      allocation: (portfolioStore.additionalCash / portfolioStore.totalPortfolioValue) * 100,
      momentum: 0,
      momentumStatus: 'positive',
      periods: {
        '3month': 0,
        '6month': 0,
        '9month': 0,
        '12month': 0
      },
      isSelected: false,
      isTopAsset: false
    })
  }

  return data
})

// Filtered and sorted data
const filteredData = computed(() => {
  let result = [...tableData.value]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(row =>
      row.ticker.toLowerCase().includes(query) ||
      row.name.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query)
    )
  }

  // Apply category filter
  if (selectedCategory.value !== 'all') {
    result = result.filter(row => row.category === selectedCategory.value)
  }

  // Apply sorting
  result.sort((a, b) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'ticker':
        comparison = a.ticker.localeCompare(b.ticker)
        break
      case 'value':
        comparison = a.value - b.value
        break
      case 'allocation':
        comparison = a.allocation - b.allocation
        break
      case 'momentum':
        comparison = a.momentum - b.momentum
        break
    }

    return sortDirection.value === 'desc' ? -comparison : comparison
  })

  return result
})

// Summary statistics
const summaryStats = computed(() => {
  const data = tableData.value
  return {
    totalValue: portfolioStore.totalPortfolioValue,
    totalHoldings: data.length,
    positiveMomentum: data.filter(row => row.momentumStatus === 'positive').length,
    topAssets: etfConfigStore.selectedTopETFs.length,
    averageAllocation: data.length > 0 ? data.reduce((sum, row) => sum + row.allocation, 0) / data.length : 0
  }
})

function getCategoryForTicker(ticker: string): string {
  if (['VTI', 'VEA', 'VWO'].includes(ticker)) return 'STOCKS'
  if (['TLT', 'BWX', 'BND'].includes(ticker)) return 'BONDS'
  if (['PDBC'].includes(ticker)) return 'COMMODITIES'
  if (['SGOL', 'IBIT'].includes(ticker)) return 'ALTERNATIVES'
  return 'OTHER'
}

// Row actions
function toggleRowExpansion(ticker: string) {
  if (expandedRows.value.has(ticker)) {
    expandedRows.value.delete(ticker)
  } else {
    expandedRows.value.add(ticker)
  }
}

function toggleRowSelection(ticker: string) {
  if (selectedRows.value.has(ticker)) {
    selectedRows.value.delete(ticker)
  } else {
    selectedRows.value.add(ticker)
  }
}

function handleSort(column: 'ticker' | 'value' | 'allocation' | 'momentum') {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDirection.value = 'desc'
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

function formatPercentage(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

// Watch for data changes
watch(() => portfolioStore.currentHoldings, () => {
  expandedRows.value.clear()
  selectedRows.value.clear()
}, { deep: true })
</script>

<template>
  <div class="portfolio-data-table">
    <!-- Table Header -->
    <div class="table-header">
      <h3 class="table-title">Portfolio Holdings</h3>

      <!-- Summary Stats -->
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-label">Total Value</span>
          <span class="stat-value">{{ formatCurrency(summaryStats.totalValue) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Holdings</span>
          <span class="stat-value">{{ summaryStats.totalHoldings }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Positive Momentum</span>
          <span class="stat-value positive">{{ summaryStats.positiveMomentum }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Top Assets</span>
          <span class="stat-value primary">{{ summaryStats.topAssets }}</span>
        </div>
      </div>
    </div>

    <!-- Table Controls -->
    <div class="table-controls">
      <div class="controls-left">
        <!-- Search -->
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search holdings..."
            class="search-input"
          />
          <div class="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="category-filter">
          <select v-model="selectedCategory" class="category-select">
            <option value="all">All Categories</option>
            <option
              v-for="category in categories.filter(c => c !== 'all')"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
        </div>
      </div>

      <div class="controls-right">
        <!-- Active Filters Badge -->
        <div
          v-if="searchQuery || selectedCategory !== 'all'"
          class="active-filters"
        >
          <span class="filter-count">
            {{ (searchQuery ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) }} active
          </span>
          <button
            @click="searchQuery = ''; selectedCategory = 'all'"
            class="clear-filters-btn"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <table class="data-table">
        <!-- Table Header -->
        <thead>
          <tr>
            <th class="expand-column"></th>
            <th
              class="sortable-header"
              :class="{ sorted: sortBy === 'ticker' }"
              @click="handleSort('ticker')"
            >
              <div class="header-content">
                <span>Ticker</span>
                <div class="sort-indicator" v-if="sortBy === 'ticker'">
                  <svg :class="{ flipped: sortDirection === 'desc' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Shares</th>
            <th
              class="sortable-header"
              :class="{ sorted: sortBy === 'value' }"
              @click="handleSort('value')"
            >
              <div class="header-content">
                <span>Value</span>
                <div class="sort-indicator" v-if="sortBy === 'value'">
                  <svg :class="{ flipped: sortDirection === 'desc' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </th>
            <th
              class="sortable-header"
              :class="{ sorted: sortBy === 'allocation' }"
              @click="handleSort('allocation')"
            >
              <div class="header-content">
                <span>Allocation</span>
                <div class="sort-indicator" v-if="sortBy === 'allocation'">
                  <svg :class="{ flipped: sortDirection === 'desc' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </th>
            <th
              class="sortable-header"
              :class="{ sorted: sortBy === 'momentum' }"
              @click="handleSort('momentum')"
            >
              <div class="header-content">
                <span>Momentum</span>
                <div class="sort-indicator" v-if="sortBy === 'momentum'">
                  <svg :class="{ flipped: sortDirection === 'desc' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </th>
            <th>Status</th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody>
          <!-- Empty State -->
          <tr v-if="filteredData.length === 0">
            <td colspan="9" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 3h18v18H3z" />
                  <path d="M8 8h8v8H8z" />
                </svg>
                <p>No portfolio holdings found</p>
                <p class="empty-subtext">Add holdings to see portfolio data</p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-for="row in filteredData" :key="row.id">
            <!-- Main Row -->
            <tr
              class="data-row"
              :class="{
                expanded: expandedRows.has(row.ticker),
                selected: selectedRows.has(row.ticker),
                'top-asset': row.isTopAsset
              }"
            >
              <td class="expand-cell">
                <button
                  @click="toggleRowExpansion(row.ticker)"
                  class="expand-btn"
                  :class="{ expanded: expandedRows.has(row.ticker) }"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </td>
              <td class="ticker-cell">
                <div class="ticker-content">
                  <span class="ticker-symbol">{{ row.ticker }}</span>
                  <span
                    v-if="row.isTopAsset"
                    class="top-asset-badge"
                  >
                    Top Asset
                  </span>
                </div>
              </td>
              <td class="name-cell" :title="row.name">
                {{ row.name }}
              </td>
              <td class="category-cell">
                <span class="category-badge" :class="row.category.toLowerCase()">
                  {{ row.category }}
                </span>
              </td>
              <td class="price-cell">
                {{ formatCurrency(row.currentPrice) }}
              </td>
              <td class="shares-cell">
                {{ row.shares.toLocaleString() }}
              </td>
              <td class="value-cell">
                {{ formatCurrency(row.value) }}
              </td>
              <td class="allocation-cell">
                <div class="allocation-bar">
                  <div
                    class="allocation-fill"
                    :style="{ width: `${Math.min(row.allocation, 100)}%` }"
                  ></div>
                  <span class="allocation-text">{{ row.allocation.toFixed(1) }}%</span>
                </div>
              </td>
              <td class="momentum-cell">
                <span
                  class="momentum-value"
                  :class="{ positive: row.momentumStatus === 'positive', negative: row.momentumStatus === 'negative' }"
                >
                  {{ formatPercentage(row.momentum) }}
                </span>
              </td>
              <td class="status-cell">
                <span
                  class="status-badge"
                  :class="row.momentumStatus"
                >
                  {{ row.momentumStatus === 'positive' ? 'Positive' : 'Negative' }}
                </span>
              </td>
            </tr>

            <!-- Expanded Row -->
            <tr
              v-if="expandedRows.has(row.ticker)"
              class="expanded-row"
            >
              <td colspan="9" class="expanded-content">
                <div class="period-details">
                  <h4 class="details-title">Period Returns for {{ row.ticker }}</h4>
                  <div class="period-grid">
                    <div
                      v-for="period in ['3month', '6month', '9month', '12month']"
                      :key="period"
                      class="period-item"
                    >
                      <span class="period-label">{{ period.replace('month', 'm') }}</span>
                      <span
                        class="period-value"
                        :class="{ positive: row.periods[period as keyof typeof row.periods] >= 0, negative: row.periods[period as keyof typeof row.periods] < 0 }"
                      >
                        {{ formatPercentage(row.periods[period as keyof typeof row.periods]) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="row-actions">
                  <button
                    @click="portfolioStore.removeHolding(row.ticker)"
                    class="action-btn remove-btn"
                  >
                    Remove Holding
                  </button>
                  <button
                    @click="portfolioStore.refreshCurrentPrices()"
                    class="action-btn refresh-btn"
                  >
                    Refresh Price
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Table Footer -->
    <div class="table-footer">
      <div class="footer-info">
        Showing {{ filteredData.length }} of {{ tableData.length }} holdings
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-data-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-neutral-50);
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
}

.summary-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-neutral-500);
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.stat-value.positive {
  color: var(--color-success-600);
}

.stat-value.primary {
  color: var(--color-primary-600);
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-neutral-50);
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400);
}

.category-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: 14px;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-lg);
  font-size: 12px;
}

.filter-count {
  color: var(--color-primary-700);
  font-weight: 500;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: var(--color-primary-600);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}

.clear-filters-btn:hover {
  background: var(--color-primary-100);
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-border);
  padding: 12px 16px;
  font-weight: 600;
  color: var(--color-neutral-700);
  text-align: left;
  position: relative;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.sortable-header:hover {
  background: var(--color-neutral-100);
}

.sortable-header.sorted {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sort-indicator svg {
  transition: transform 0.2s ease;
}

.sort-indicator svg.flipped {
  transform: rotate(180deg);
}

.data-row {
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.data-row:hover {
  background: var(--color-neutral-50);
}

.data-row.selected {
  background: var(--color-primary-50);
}

.data-row.top-asset {
  border-left: 4px solid var(--color-primary-500);
}

.expand-column,
.expand-cell {
  width: 48px;
  text-align: center;
  padding: 12px 8px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.expand-btn:hover {
  background: var(--color-neutral-200);
}

.expand-btn.expanded svg {
  transform: rotate(180deg);
}

.ticker-cell {
  padding: 12px 16px;
}

.ticker-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticker-symbol {
  font-weight: 600;
  color: var(--color-neutral-900);
}

.top-asset-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-primary-100);
  color: var(--color-primary-800);
  border-radius: 12px;
  font-weight: 500;
}

.name-cell {
  padding: 12px 16px;
  color: var(--color-neutral-700);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-cell {
  padding: 12px 16px;
}

.category-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.category-badge.stocks {
  background: var(--color-blue-100);
  color: var(--color-blue-800);
}

.category-badge.bonds {
  background: var(--color-green-100);
  color: var(--color-green-800);
}

.category-badge.commodities {
  background: var(--color-amber-100);
  color: var(--color-amber-800);
}

.category-badge.alternatives {
  background: var(--color-purple-100);
  color: var(--color-purple-800);
}

.category-badge.cash {
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.price-cell,
.shares-cell,
.value-cell {
  padding: 12px 16px;
  font-weight: 500;
  color: var(--color-neutral-900);
}

.allocation-cell {
  padding: 12px 16px;
}

.allocation-bar {
  position: relative;
  height: 24px;
  background: var(--color-neutral-200);
  border-radius: 12px;
  overflow: hidden;
}

.allocation-fill {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: 12px;
  transition: width 0.3s ease;
}

.allocation-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-neutral-900);
}

.momentum-cell {
  padding: 12px 16px;
}

.momentum-value {
  font-weight: 600;
}

.momentum-value.positive {
  color: var(--color-success-600);
}

.momentum-value.negative {
  color: var(--color-error-600);
}

.status-cell {
  padding: 12px 16px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.positive {
  background: var(--color-success-100);
  color: var(--color-success-800);
}

.status-badge.negative {
  background: var(--color-error-100);
  color: var(--color-error-800);
}

.expanded-row {
  background: var(--color-neutral-50);
}

.expanded-content {
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.period-details {
  margin-bottom: 16px;
}

.details-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 16px;
}

.period-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.period-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.period-label {
  font-size: 12px;
  color: var(--color-neutral-500);
  font-weight: 500;
}

.period-value {
  font-size: 14px;
  font-weight: 600;
}

.period-value.positive {
  color: var(--color-success-600);
}

.period-value.negative {
  color: var(--color-error-600);
}

.row-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--color-neutral-100);
}

.remove-btn {
  color: var(--color-error-600);
  border-color: var(--color-error-200);
}

.remove-btn:hover {
  background: var(--color-error-50);
}

.refresh-btn {
  color: var(--color-primary-600);
  border-color: var(--color-primary-200);
}

.refresh-btn:hover {
  background: var(--color-primary-50);
}

.empty-cell {
  padding: 48px 16px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-neutral-500);
}

.empty-subtext {
  font-size: 14px;
  opacity: 0.7;
}

.table-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-neutral-50);
}

.footer-info {
  color: var(--color-neutral-600);
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .summary-stats {
    width: 100%;
    justify-content: space-between;
  }

  .table-controls {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .controls-left,
  .controls-right {
    width: 100%;
  }

  .search-box {
    min-width: auto;
    width: 100%;
  }

  .period-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .data-table {
    font-size: 12px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 12px;
  }

  .period-grid {
    grid-template-columns: 1fr;
  }

  .row-actions {
    flex-direction: column;
  }
}
</style>