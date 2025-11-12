<script setup lang="ts">
import { usePortfolioStore } from '@/stores/portfolio'
import { useMomentumStore } from '@/stores/momentum'
import { useRebalancingStore } from '@/stores/rebalancing'
import { ref } from 'vue'

const portfolioStore = usePortfolioStore()
const momentumStore = useMomentumStore()
const rebalancingStore = useRebalancingStore()

// Inline editing state
const editingHoldings = ref<{[key: string]: boolean}>({})
const newHoldingTicker = ref('')
const newHoldingShares = ref('')

// Add new holding
function addNewHolding() {
  if (newHoldingTicker.value && newHoldingShares.value) {
    const shares = parseFloat(newHoldingShares.value)
    if (shares > 0) {
      portfolioStore.addHolding(newHoldingTicker.value.toUpperCase(), shares)
      newHoldingTicker.value = ''
      newHoldingShares.value = ''
    }
  }
}

// Start editing a holding
function startEditHolding(ticker: string) {
  editingHoldings.value[ticker] = true
}

// Save edited holding
function saveHolding(ticker: string, shares: number) {
  portfolioStore.addHolding(ticker, shares)
  editingHoldings.value[ticker] = false
}

// Cancel editing
function cancelEditHolding(ticker: string) {
  editingHoldings.value[ticker] = false
}

// Get momentum insight for a holding
function getMomentumInsight(ticker: string) {
  const momentum = momentumStore.momentumData[ticker]
  const portfolioInsight = momentumStore.portfolioMomentumInsight[ticker]
  
  if (momentum && portfolioInsight) {
    return {
      momentum: momentum.average,
      absoluteMomentum: momentum.absoluteMomentum,
      rank: portfolioInsight.rank,
      isSelectable: portfolioInsight.isSelectable
    }
  }
  return null
}
</script>

<template>
  <div class="space-y-4">
    <!-- Add New Holding -->
    <div class="flex items-end space-x-2">
      <div class="flex-1">
        <label class="block text-sm font-medium text-neutral-700 mb-1">Ticker</label>
        <input
          v-model="newHoldingTicker"
          type="text"
          placeholder="e.g., VTI"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @keydown.enter="addNewHolding"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-neutral-700 mb-1">Shares</label>
        <input
          v-model="newHoldingShares"
          type="number"
          min="0"
          step="1"
          placeholder="e.g., 100"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @keydown.enter="addNewHolding"
        />
      </div>
      <div>
        <button
          @click="addNewHolding"
          :disabled="!newHoldingTicker || !newHoldingShares"
          class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Portfolio Holdings Table -->
    <div class="overflow-hidden border border-neutral-200 rounded-lg">
      <table class="min-w-full divide-y divide-neutral-200">
        <thead class="bg-neutral-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ticker</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Shares</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Price</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Value</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Momentum</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-surface divide-y divide-neutral-200">
          <tr
            v-for="[ticker, holding] in Object.entries(portfolioStore.currentHoldings)"
            :key="ticker"
            class="hover:bg-neutral-50 transition-colors"
          >
            <!-- Ticker -->
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900">
              {{ ticker }}
            </td>

            <!-- Shares (Editable) -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
              <div v-if="editingHoldings[ticker]" class="flex items-center space-x-2">
                <input
                  v-model.number="holding.shares"
                  type="number"
                  min="0"
                  step="1"
                  class="w-20 px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  @keydown.enter="saveHolding(ticker, holding.shares)"
                  @blur="saveHolding(ticker, holding.shares)"
                />
                <button
                  @click="saveHolding(ticker, holding.shares)"
                  class="text-xs px-2 py-1 bg-success-500 text-white rounded hover:bg-success-600"
                >
                  Save
                </button>
                <button
                  @click="cancelEditHolding(ticker)"
                  class="text-xs px-2 py-1 bg-neutral-500 text-white rounded hover:bg-neutral-600"
                >
                  Cancel
                </button>
              </div>
              <span
                v-else
                class="cursor-pointer hover:bg-neutral-100 px-2 py-1 rounded"
                @click="startEditHolding(ticker)"
              >
                {{ holding.shares.toLocaleString() }}
              </span>
            </td>

            <!-- Price -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
              ${{ holding.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A' }}
            </td>

            <!-- Value -->
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900">
              ${{ (holding.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>

            <!-- Momentum -->
            <td class="px-4 py-3 whitespace-nowrap text-sm">
              <div v-if="getMomentumInsight(ticker)" class="flex items-center space-x-2">
                <span
                  class="font-medium"
                  :class="(getMomentumInsight(ticker)?.momentum || 0) >= 0 ? 'text-success-600' : 'text-error-600'"
                >
                  {{ (getMomentumInsight(ticker)?.momentum || 0).toFixed(2) }}%
                </span>
                <template v-if="getMomentumInsight(ticker)">
                  <span
                    v-if="ticker === 'IBIT' && momentumStore.shouldShowIBIT"
                    class="text-xs px-2 py-1 bg-warning-100 text-warning-700 rounded"
                  >
                    Bitcoin
                  </span>
                  <span
                    v-else-if="getMomentumInsight(ticker)!.rank !== undefined && getMomentumInsight(ticker)!.rank > 0"
                    class="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded"
                  >
                    #{{ getMomentumInsight(ticker)!.rank }}
                  </span>
                  <span
                    v-else-if="getMomentumInsight(ticker)!.rank === -1"
                    class="text-xs px-2 py-1 bg-neutral-100 text-neutral-500 rounded"
                  >
                    N/A
                  </span>
                </template>
              </div>
              <span v-else class="text-neutral-400 text-xs">No data</span>
            </td>

            <!-- Status -->
            <td class="px-4 py-3 whitespace-nowrap">
              <span
                v-if="ticker === 'IBIT' && momentumStore.shouldShowIBIT"
                class="text-xs px-2 py-1 rounded-full font-medium bg-warning-100 text-warning-800 border border-warning-200"
              >
                Bitcoin ETF
              </span>
              <span
                v-else-if="getMomentumInsight(ticker) && getMomentumInsight(ticker)?.isSelectable"
                class="text-xs px-2 py-1 rounded-full font-medium"
                :class="getMomentumInsight(ticker)?.absoluteMomentum ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'"
              >
                {{ getMomentumInsight(ticker)?.absoluteMomentum ? 'Positive' : 'Negative' }}
              </span>
              <span
                v-else-if="getMomentumInsight(ticker) && !getMomentumInsight(ticker)?.isSelectable"
                class="text-xs px-2 py-1 rounded-full font-medium bg-neutral-100 text-neutral-600"
              >
                Non-Selectable
              </span>
              <span v-else class="text-neutral-400 text-xs">-</span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-3 whitespace-nowrap text-sm">
              <button
                @click="portfolioStore.removeHolding(ticker)"
                class="text-error-600 hover:text-error-800 transition-colors"
              >
                Remove
              </button>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="Object.keys(portfolioStore.currentHoldings).length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-neutral-500">
              <svg class="mx-auto h-8 w-8 text-neutral-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>No holdings yet. Add your first holding above.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div v-if="Object.keys(portfolioStore.currentHoldings).length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div class="bg-primary-50 border border-primary-200 rounded-lg p-3">
        <div class="font-medium text-primary-800">Total Holdings</div>
        <div class="text-lg font-bold text-primary-900">
          {{ Object.keys(portfolioStore.currentHoldings).length }}
        </div>
      </div>
      <div class="bg-success-50 border border-success-200 rounded-lg p-3">
        <div class="font-medium text-success-800">Positive Momentum</div>
        <div class="text-lg font-bold text-success-900">
          {{ Object.keys(portfolioStore.currentHoldings).filter(t => getMomentumInsight(t)?.absoluteMomentum).length }}
        </div>
      </div>
      <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
        <div class="font-medium text-neutral-800">Total Value</div>
        <div class="text-lg font-bold text-neutral-900">
          ${{ Object.values(portfolioStore.currentHoldings).reduce((sum, h) => sum + h.value, 0).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>