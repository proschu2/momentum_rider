<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import { ref } from 'vue'

const store = useMomentumRiderStore()

const newHolding = ref({
  ticker: '',
  shares: 0,
  price: 0
})

const showAddForm = ref(false)

async function addNewHolding() {
  if (newHolding.value.ticker && newHolding.value.shares > 0) {
    await store.addHolding(
      newHolding.value.ticker.toUpperCase(),
      newHolding.value.shares,
      newHolding.value.price > 0 ? newHolding.value.price : undefined
    )
    // Reset form
    newHolding.value = { ticker: '', shares: 0, price: 0 }
    showAddForm.value = false
  }
}

function removeHolding(ticker: string) {
  store.removeHolding(ticker)
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-neutral-900">Portfolio Management</h2>
      <button
        @click="showAddForm = !showAddForm"
        class="inline-flex items-center px-3 py-1.5 border border-neutral-300 text-xs font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
      >
        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Holding
      </button>
    </div>

    <!-- Add Holding Form -->
    <div v-if="showAddForm" class="mb-4 p-3 border border-neutral-200 rounded-lg bg-neutral-50">
      <h3 class="text-xs font-medium text-neutral-900 mb-2">Add New Holding</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label for="ticker" class="block text-xs font-medium text-neutral-700 mb-1">Ticker</label>
          <input
            id="ticker"
            v-model="newHolding.ticker"
            type="text"
            placeholder="e.g., VTI"
            class="w-full px-2 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-xs"
          />
        </div>
        <div>
          <label for="shares" class="block text-xs font-medium text-neutral-700 mb-1">Shares</label>
          <input
            id="shares"
            v-model.number="newHolding.shares"
            type="number"
            step="0.001"
            min="0"
            class="w-full px-2 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-xs"
          />
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
            class="w-full px-2 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-xs"
          />
        </div>
      </div>
      <div class="mt-2 flex justify-end space-x-2">
        <button
          @click="showAddForm = false"
          class="px-2 py-1 border border-neutral-300 text-xs font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="addNewHolding"
          :disabled="!newHolding.ticker || newHolding.shares <= 0"
          class="px-2 py-1 border border-transparent text-xs font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Current Holdings Table -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm font-medium text-neutral-900">Current Holdings</h3>
        <button
          @click="store.refreshCurrentPrices()"
          :disabled="Object.keys(store.currentHoldings).length === 0"
          class="inline-flex items-center px-2 py-1 border border-neutral-300 text-xs font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div v-if="Object.keys(store.currentHoldings).length > 0" class="overflow-hidden border border-neutral-200 rounded-lg">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Ticker
              </th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Shares
              </th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Value
              </th>
              <th scope="col" class="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-neutral-200">
            <tr
              v-for="[ticker, holding] in Object.entries(store.currentHoldings)"
              :key="ticker"
              class="hover:bg-neutral-50 transition-colors"
            >
              <td class="px-3 py-2 whitespace-nowrap text-xs font-medium text-neutral-900">
                {{ ticker }}
              </td>
              <td class="px-3 py-2 text-xs text-neutral-600 max-w-[100px] truncate" :title="holding.name">
                {{ holding.name || ticker }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-xs text-neutral-600">
                {{ holding.shares.toLocaleString() }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-xs text-neutral-600">
                ${{ holding.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-xs font-medium text-neutral-900">
                ${{ holding.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                <button
                  @click="removeHolding(ticker)"
                  class="text-error-600 hover:text-error-900 transition-colors"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-neutral-50">
            <tr>
              <td colspan="4" class="px-3 py-2 text-xs font-medium text-neutral-900 text-right">
                Total:
              </td>
              <td class="px-3 py-2 text-xs font-bold text-neutral-900">
                ${{ Object.values(store.currentHoldings).reduce((sum, h) => sum + h.value, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-center py-6 border-2 border-dashed border-neutral-300 rounded-lg"
      >
        <svg class="mx-auto h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 class="mt-1 text-xs font-medium text-neutral-900">No holdings</h3>
        <p class="mt-0.5 text-xs text-neutral-500">
          Add your current ETF holdings to get started.
        </p>
      </div>
    </div>

    <!-- Additional Cash -->
    <div class="mt-4 pt-3 border-t border-neutral-200">
      <label for="additional-cash" class="block text-xs font-medium text-neutral-700 mb-1">
        Additional Cash to Invest ($)
      </label>
      <input
        id="additional-cash"
        v-model.number="store.additionalCash"
        type="number"
        min="0"
        step="100"
        class="w-full px-2 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-xs"
      />
      <p class="mt-0.5 text-xs text-neutral-500">
        Additional cash available for investment
      </p>
    </div>
  </div>
</template>