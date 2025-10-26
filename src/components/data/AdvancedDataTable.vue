<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: (value: any) => string
}

export interface TableRow {
  [key: string]: any
  id: string | number
}

export interface AdvancedDataTableProps {
  columns: TableColumn[]
  data: TableRow[]
  itemsPerPage?: number
  selectable?: boolean
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
  pagination?: boolean
  loading?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<AdvancedDataTableProps>(), {
  itemsPerPage: 25,
  selectable: false,
  searchable: true,
  filterable: true,
  sortable: true,
  pagination: true,
  loading: false,
  emptyMessage: 'No data available'
})

const emit = defineEmits<{
  'row-click': [row: TableRow]
  'row-select': [selectedRows: TableRow[]]
  'sort-change': [sort: { key: string; direction: 'asc' | 'desc' }]
  'filter-change': [filters: Record<string, any>]
}>()

// State
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref<string>('')
const sortDirection = ref<'asc' | 'desc'>('asc')
const selectedRows = ref<Set<string | number>>(new Set())
const columnFilters = ref<Record<string, any>>({})

// Computed
const filteredData = computed(() => {
  let result = [...props.data]

  // Apply search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(query)
      )
    )
  }

  // Apply column filters
  Object.entries(columnFilters.value).forEach(([key, filterValue]) => {
    if (filterValue !== null && filterValue !== '') {
      result = result.filter(row => {
        const cellValue = row[key]
        if (typeof cellValue === 'string') {
          return cellValue.toLowerCase().includes(String(filterValue).toLowerCase())
        }
        return cellValue == filterValue
      })
    }
  })

  // Apply sorting
  if (sortKey.value && props.sortable) {
    result.sort((a, b) => {
      const aValue = a[sortKey.value]
      const bValue = b[sortKey.value]

      if (aValue === bValue) return 0

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else {
        comparison = aValue < bValue ? -1 : 1
      }

      return sortDirection.value === 'desc' ? -comparison : comparison
    })
  }

  return result
})

const paginatedData = computed(() => {
  if (!props.pagination) return filteredData.value

  const startIndex = (currentPage.value - 1) * props.itemsPerPage
  const endIndex = startIndex + props.itemsPerPage
  return filteredData.value.slice(startIndex, endIndex)
})

const totalPages = computed(() =>
  Math.ceil(filteredData.value.length / props.itemsPerPage)
)

const isAllSelected = computed(() => {
  if (!props.selectable || paginatedData.value.length === 0) return false
  return paginatedData.value.every(row => selectedRows.value.has(row.id))
})

// Methods
function handleSort(column: TableColumn) {
  if (!column.sortable) return

  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDirection.value = 'asc'
  }

  emit('sort-change', { key: sortKey.value, direction: sortDirection.value })
}

function handleRowClick(row: TableRow) {
  emit('row-click', row)
}

function handleRowSelect(row: TableRow) {
  if (!props.selectable) return

  if (selectedRows.value.has(row.id)) {
    selectedRows.value.delete(row.id)
  } else {
    selectedRows.value.add(row.id)
  }

  const selected = props.data.filter(r => selectedRows.value.has(r.id))
  emit('row-select', selected)
}

function handleSelectAll() {
  if (!props.selectable) return

  if (isAllSelected.value) {
    paginatedData.value.forEach(row => selectedRows.value.delete(row.id))
  } else {
    paginatedData.value.forEach(row => selectedRows.value.add(row.id))
  }

  const selected = props.data.filter(r => selectedRows.value.has(r.id))
  emit('row-select', selected)
}

function handleFilterChange(columnKey: string, value: any) {
  columnFilters.value[columnKey] = value
  emit('filter-change', columnFilters.value)
  currentPage.value = 1
}

function clearFilters() {
  searchQuery.value = ''
  columnFilters.value = {}
  currentPage.value = 1
}

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// Keyboard navigation
function handleKeyDown(event: KeyboardEvent, row: TableRow) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleRowClick(row)
  }
}

// Watch for data changes
watch(() => props.data, () => {
  currentPage.value = 1
  selectedRows.value.clear()
})

// Expose methods for parent component
defineExpose({
  clearFilters,
  getSelectedRows: () => props.data.filter(r => selectedRows.value.has(r.id)),
  setFilter: (columnKey: string, value: any) => handleFilterChange(columnKey, value)
})
</script>

<template>
  <div class="advanced-data-table">
    <!-- Table Controls -->
    <div v-if="searchable || filterable" class="table-controls">
      <div class="controls-left">
        <!-- Search -->
        <div v-if="searchable" class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="search-input"
            aria-label="Search table"
          />
          <div class="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        <!-- Active Filters Badge -->
        <div
          v-if="Object.keys(columnFilters).filter(k => columnFilters[k]).length > 0 || searchQuery"
          class="active-filters"
        >
          <span class="filter-count">
            {{ Object.keys(columnFilters).filter(k => columnFilters[k]).length + (searchQuery ? 1 : 0) }} active
          </span>
          <button @click="clearFilters" class="clear-filters-btn" aria-label="Clear all filters">
            Clear
          </button>
        </div>
      </div>

      <div class="controls-right">
        <!-- Items per page selector -->
        <div v-if="pagination" class="items-per-page">
          <label for="items-per-page" class="sr-only">Items per page</label>
          <select
            id="items-per-page"
            :value="itemsPerPage"
            @change="currentPage = 1"
            class="items-select"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <table class="data-table" role="grid" aria-label="Advanced data table">
        <!-- Table Header -->
        <thead>
          <tr>
            <!-- Select All Checkbox -->
            <th v-if="selectable" class="select-column">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="handleSelectAll"
                :indeterminate="selectedRows.size > 0 && !isAllSelected"
                aria-label="Select all rows"
              />
            </th>

            <!-- Column Headers -->
            <th
              v-for="column in columns"
              :key="column.key"
              :style="{
                width: column.width ? `${column.width}px` : 'auto',
                textAlign: column.align || 'left'
              }"
              :class="[
                'table-header',
                { 'sortable': column.sortable && sortable },
                { 'sorted': sortKey === column.key }
              ]"
              @click="handleSort(column)"
              role="columnheader"
              :aria-sort="sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
            >
              <div class="header-content">
                <span>{{ column.label }}</span>
                <div v-if="column.sortable && sortable" class="sort-indicator">
                  <svg
                    v-if="sortKey === column.key"
                    :class="{ 'flipped': sortDirection === 'desc' }"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <!-- Column Filter -->
              <div v-if="column.filterable && filterable" class="column-filter">
                <input
                  type="text"
                  :value="columnFilters[column.key] || ''"
                  @input="handleFilterChange(column.key, $event.target.value)"
                  :placeholder="`Filter ${column.label}`"
                  class="filter-input"
                  :aria-label="`Filter by ${column.label}`"
                />
              </div>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody>
          <!-- Loading State -->
          <tr v-if="loading">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="loading-cell">
              <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Loading data...</span>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="paginatedData.length === 0">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 3h18v18H3z" />
                  <path d="M8 8h8v8H8z" />
                </svg>
                <p>{{ emptyMessage }}</p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-for="row in paginatedData"
            v-else
            :key="row.id"
            :class="[
              'table-row',
              { 'selected': selectedRows.has(row.id) },
              { 'clickable': true }
            ]"
            @click="handleRowClick(row)"
            @keydown="(event) => handleKeyDown(event, row)"
            :tabindex="0"
            role="row"
          >
            <!-- Row Selection Checkbox -->
            <td v-if="selectable" class="select-cell">
              <input
                type="checkbox"
                :checked="selectedRows.has(row.id)"
                @click.stop="handleRowSelect(row)"
                :aria-label="`Select row ${row.id}`"
              />
            </td>

            <!-- Data Cells -->
            <td
              v-for="column in columns"
              :key="column.key"
              :style="{ textAlign: column.align || 'left' }"
              class="table-cell"
              role="gridcell"
            >
              {{ column.format ? column.format(row[column.key]) : row[column.key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && totalPages > 1" class="pagination">
      <div class="pagination-info">
        Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to
        {{ Math.min(currentPage * itemsPerPage, filteredData.length) }} of
        {{ filteredData.length }} entries
      </div>

      <div class="pagination-controls">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
          aria-label="Previous page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div class="page-numbers">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="goToPage(page)"
            :class="['page-btn', { 'active': page === currentPage }]"
            :aria-label="`Go to page ${page}`"
            :aria-current="page === currentPage ? 'page' : null"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
          aria-label="Next page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advanced-data-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-neutral-50);
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
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

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
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

.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-select {
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  font-size: 14px;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table-header {
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-border);
  padding: 12px 16px;
  font-weight: 600;
  color: var(--color-neutral-700);
  text-align: left;
  position: relative;
}

.table-header.sortable {
  cursor: pointer;
  user-select: none;
}

.table-header.sortable:hover {
  background: var(--color-neutral-100);
}

.table-header.sorted {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sort-indicator {
  display: flex;
  align-items: center;
}

.sort-indicator svg {
  transition: transform 0.2s ease;
}

.sort-indicator svg.flipped {
  transform: rotate(180deg);
}

.column-filter {
  margin-top: 8px;
}

.filter-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--color-surface);
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
}

.table-row {
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background: var(--color-neutral-50);
}

.table-row.clickable {
  cursor: pointer;
}

.table-row.selected {
  background: var(--color-primary-50);
}

.select-column,
.select-cell {
  width: 48px;
  text-align: center;
  padding: 12px 8px;
}

.table-cell {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.loading-cell,
.empty-cell {
  padding: 48px 16px;
  text-align: center;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-neutral-500);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-neutral-200);
  border-top: 2px solid var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-neutral-500);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-neutral-50);
}

.pagination-info {
  color: var(--color-neutral-600);
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn,
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
  min-width: 40px;
  height: 40px;
}

.pagination-btn:hover:not(:disabled),
.page-btn:hover:not(.active) {
  background: var(--color-neutral-100);
  border-color: var(--color-neutral-300);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: var(--color-primary-500);
  color: white;
  border-color: var(--color-primary-500);
}

/* Accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus styles */
.table-row:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: -2px;
}

button:focus,
input:focus,
select:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
</style>