<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import { ref, computed, watch } from 'vue'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog.vue'
import { ScreenReader } from '@/utils/accessibility'

const store = useMomentumRiderStore()

// Drag and drop state
const dragItem = ref<string | null>(null)
const dragOverItem = ref<string | null>(null)

// Refresh prices with screen reader announcement
async function refreshPrices() {
  if (Object.keys(store.currentHoldings).length > 0) {
    await store.refreshCurrentPrices()
    ScreenReader.announce('Current prices refreshed')
  }
}

// Confirmation dialog state
const showDeleteDialog = ref(false)
const holdingToDelete = ref<string | null>(null)

// Form state
const showAddForm = ref(false)
const newHolding = ref({
  ticker: '',
  shares: 0,
  price: 0
})

// Computed holdings with drag state
const draggableHoldings = computed(() => {
  return Object.entries(store.currentHoldings).map(([ticker, holding]) => ({
    ticker,
    ...holding,
    isDragging: dragItem.value === ticker,
    isDragOver: dragOverItem.value === ticker
  }))
})

// Drag start handler
function handleDragStart(event: DragEvent, ticker: string) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', ticker)
    dragItem.value = ticker
  }

  // Add visual feedback
  if (event.target) {
    (event.target as HTMLElement).classList.add('opacity-50')
  }
}

// Drag over handler
function handleDragOver(event: DragEvent, ticker: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverItem.value = ticker
}

// Drag leave handler
function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  dragOverItem.value = null
}

// Drop handler
function handleDrop(event: DragEvent, targetTicker: string) {
  event.preventDefault()

  const draggedTicker = dragItem.value
  if (!draggedTicker || draggedTicker === targetTicker) {
    resetDragState()
    return
  }

  // Reorder holdings
  const holdingsArray = Object.entries(store.currentHoldings)
  const draggedIndex = holdingsArray.findIndex(([ticker]) => ticker === draggedTicker)
  const targetIndex = holdingsArray.findIndex(([ticker]) => ticker === targetTicker)

  if (draggedIndex !== -1 && targetIndex !== -1) {
    const newHoldingsArray = [...holdingsArray]
    const draggedItems = newHoldingsArray.splice(draggedIndex, 1)
    const draggedItem = draggedItems[0]
    if (draggedItem) {
      newHoldingsArray.splice(targetIndex, 0, draggedItem)
    }

    // Update store with reordered holdings
    const reorderedHoldings: Record<string, any> = {}
    newHoldingsArray.forEach(([ticker, holding]) => {
      reorderedHoldings[ticker] = holding
    })

    // Note: This would need store support for reordering
    // For now, we'll just log the reorder
    console.log('Reordered holdings:', reorderedHoldings)
  }

  resetDragState()
}

function resetDragState() {
  dragItem.value = null
  dragOverItem.value = null
}

// Delete holding with confirmation
function confirmDeleteHolding(ticker: string) {
  holdingToDelete.value = ticker
  showDeleteDialog.value = true
}

function deleteHolding() {
  if (holdingToDelete.value) {
    const ticker = holdingToDelete.value
    store.removeHolding(ticker)
    holdingToDelete.value = null
    showDeleteDialog.value = false

    // Announce to screen reader
    ScreenReader.announce(`Deleted ${ticker} holding from portfolio`)
  }
}

// Add new holding
async function addNewHolding() {
  if (newHolding.value.ticker && newHolding.value.shares > 0) {
    const ticker = newHolding.value.ticker.toUpperCase()
    await store.addHolding(
      ticker,
      newHolding.value.shares,
      newHolding.value.price > 0 ? newHolding.value.price : undefined
    )
    // Reset form
    newHolding.value = { ticker: '', shares: 0, price: 0 }
    showAddForm.value = false

    // Announce to screen reader
    ScreenReader.announce(`Added ${ticker} holding to portfolio`)
  }
}

// Touch support for mobile
function handleTouchStart(event: TouchEvent, ticker: string) {
  dragItem.value = ticker
  // Add haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(50)
  }
}

function handleTouchMove(event: TouchEvent) {
  // Implement touch-based drag and drop
  // This would require more complex touch handling
}

function handleTouchEnd(event: TouchEvent) {
  resetDragState()
}

// Keyboard navigation handler
function handleKeydown(event: KeyboardEvent, ticker: string) {
  const target = event.target as HTMLElement

  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      // Focus the delete button for quick access
      const deleteButton = target.querySelector('[aria-label*="Delete"]') as HTMLButtonElement
      if (deleteButton) {
        deleteButton.focus()
      }
      break
    case 'Delete':
    case 'Backspace':
      event.preventDefault()
      confirmDeleteHolding(ticker)
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      // Navigate between holdings
      const holdings = Array.from(document.querySelectorAll('[role="button"][tabindex="0"]'))
      const currentIndex = holdings.indexOf(target)
      let nextIndex = currentIndex

      if (event.key === 'ArrowUp' && currentIndex > 0) {
        nextIndex = currentIndex - 1
      } else if (event.key === 'ArrowDown' && currentIndex < holdings.length - 1) {
        nextIndex = currentIndex + 1
      }

      if (nextIndex !== currentIndex) {
        ;(holdings[nextIndex] as HTMLElement).focus()
      }
      break
  }
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-neutral-900">Portfolio Management</h2>
      <div class="flex space-x-2">
        <button
          @click="refreshPrices"
          :disabled="Object.keys(store.currentHoldings).length === 0"
          class="inline-flex items-center px-3 py-1.5 border border-neutral-300 text-xs font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh current prices"
          :aria-disabled="Object.keys(store.currentHoldings).length === 0"
        >
          <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          @click="showAddForm = !showAddForm"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          :aria-expanded="showAddForm"
          aria-controls="add-holding-form"
          aria-label="Add new holding"
        >
          <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Holding
        </button>
      </div>
    </div>

    <!-- Add Holding Form -->
    <div
      v-if="showAddForm"
      id="add-holding-form"
      class="mb-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50"
      role="region"
      aria-labelledby="add-holding-title"
    >
      <h3 id="add-holding-title" class="text-sm font-medium text-neutral-900 mb-3">Add New Holding</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3" role="form">
        <div>
          <label for="ticker" class="block text-xs font-medium text-neutral-700 mb-1">Ticker</label>
          <input
            id="ticker"
            v-model="newHolding.ticker"
            type="text"
            placeholder="e.g., VTI"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            aria-required="true"
            aria-describedby="ticker-description"
          />
          <p id="ticker-description" class="sr-only">Enter the stock ticker symbol for the holding</p>
        </div>
        <div>
          <label for="shares" class="block text-xs font-medium text-neutral-700 mb-1">Shares</label>
          <input
            id="shares"
            v-model.number="newHolding.shares"
            type="number"
            step="0.001"
            min="0"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            aria-required="true"
            aria-describedby="shares-description"
          />
          <p id="shares-description" class="sr-only">Enter the number of shares for this holding</p>
        </div>
        <div>
          <label for="price" class="block text-xs font-medium text-neutral-700 mb-1">Price ($) <span class="text-neutral-400">(optional)</span></label>
          <input
            id="price"
            v-model.number="newHolding.price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Auto-fetch"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            aria-describedby="price-description"
          />
          <p id="price-description" class="sr-only">Enter the current price per share, or leave blank to auto-fetch</p>
        </div>
      </div>
      <div class="mt-3 flex justify-end space-x-2">
        <button
          @click="showAddForm = false"
          class="px-3 py-2 border border-neutral-300 text-sm font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          aria-label="Cancel adding new holding"
        >
          Cancel
        </button>
        <button
          @click="addNewHolding"
          :disabled="!newHolding.ticker || newHolding.shares <= 0"
          class="px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :aria-disabled="!newHolding.ticker || newHolding.shares <= 0"
          aria-label="Add new holding to portfolio"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Draggable Holdings List -->
    <div role="region" aria-labelledby="current-holdings-title">
      <div class="flex justify-between items-center mb-3">
        <h3 id="current-holdings-title" class="text-sm font-medium text-neutral-900">Current Holdings</h3>
        <div class="flex items-center space-x-4">
          <p class="text-xs text-neutral-500" aria-hidden="true">Drag to reorder</p>
          <p class="sr-only">Use drag and drop to reorder holdings</p>
          <!-- Desktop-only keyboard shortcuts hint -->
          <div class="hidden lg:flex items-center space-x-1 text-xs text-neutral-400">
            <kbd class="px-1.5 py-0.5 text-xs bg-neutral-100 border border-neutral-300 rounded">Alt</kbd>
            <span class="text-neutral-500">+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-neutral-100 border border-neutral-300 rounded">R</kbd>
            <span class="text-neutral-500">to refresh</span>
          </div>
        </div>
      </div>

      <div v-if="draggableHoldings.length > 0" class="space-y-2">
        <div
          v-for="holding in draggableHoldings"
          :key="holding.ticker"
          draggable="true"
          @dragstart="handleDragStart($event, holding.ticker)"
          @dragend="resetDragState"
          @dragover="handleDragOver($event, holding.ticker)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, holding.ticker)"
          @touchstart="handleTouchStart($event, holding.ticker)"
          @touchend="handleTouchEnd"
          @keydown="handleKeydown($event, holding.ticker)"
          :class="[
            'flex items-center justify-between p-3 border rounded-lg transition-all duration-200 cursor-move group',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            holding.isDragging ? 'opacity-50 bg-primary-50 border-primary-300' : '',
            holding.isDragOver ? 'bg-primary-100 border-primary-400 border-dashed' : 'bg-surface border-neutral-200 hover:bg-neutral-50'
          ]"
          role="button"
          tabindex="0"
          :aria-label="`${holding.ticker} holding: ${holding.shares} shares at $${holding.price}. Drag to reorder or press Delete to remove.`"
        >
          <!-- Drag Handle -->
          <div class="flex items-center space-x-3 flex-1">
            <div class="text-neutral-400 cursor-grab active:cursor-grabbing">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
            </div>

            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-semibold text-neutral-900">{{ holding.ticker }}</span>
                <span class="text-xs text-neutral-500 truncate max-w-[120px]">{{ holding.name || holding.ticker }}</span>
              </div>
              <div class="text-xs text-neutral-500">
                {{ holding.shares.toLocaleString() }} shares @ ${{ holding.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
            </div>
          </div>

          <!-- Value and Actions -->
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-sm font-semibold text-neutral-900">
                ${{ holding.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
              <div class="text-xs text-neutral-500">
                {{ ((holding.value / store.totalPortfolioValue) * 100).toFixed(1) }}%
              </div>
            </div>

            <button
              @click="confirmDeleteHolding(holding.ticker)"
              class="p-1 text-neutral-400 hover:text-error-600 transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded group/delete"
              :aria-label="`Delete ${holding.ticker} holding (or press Delete key)`"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <!-- Desktop tooltip -->
              <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Delete (Del)
                <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-neutral-800 rotate-45"></div>
              </div>
            </button>
          </div>
        </div>

        <!-- Total Value -->
        <div class="flex justify-between items-center pt-3 mt-3 border-t border-neutral-200">
          <span class="text-sm font-medium text-neutral-900">Total Portfolio Value:</span>
          <span class="text-lg font-bold text-neutral-900">
            ${{ store.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-center py-8 border-2 border-dashed border-neutral-300 rounded-lg"
      >
        <svg class="mx-auto h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-neutral-900">No holdings</h3>
        <p class="mt-1 text-sm text-neutral-500">
          Add your current ETF holdings to get started.
        </p>
      </div>
    </div>

    <!-- Additional Cash -->
    <div class="mt-4 pt-4 border-t border-neutral-200">
      <label for="additional-cash" class="block text-sm font-medium text-neutral-700 mb-2">
        Additional Cash to Invest ($)
      </label>
      <input
        id="additional-cash"
        v-model.number="store.additionalCash"
        type="number"
        min="0"
        step="100"
        class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
      />
      <p class="mt-1 text-xs text-neutral-500">
        Additional cash available for investment
      </p>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmationDialog
      v-model="showDeleteDialog"
      title="Delete Holding"
      :message="`Are you sure you want to delete ${holdingToDelete} from your portfolio?`"
      confirm-text="Delete"
      variant="danger"
      @confirm="deleteHolding"
      @cancel="holdingToDelete = null"
    />
  </div>
</template>