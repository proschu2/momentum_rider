<script setup lang="ts">
import { useRebalancingStore } from '@/stores/rebalancing'
import { usePortfolioStore } from '@/stores/portfolio'
import { generateAriaLabel, ScreenReader } from '@/utils/accessibility'
import { computed } from 'vue'

const rebalancingStore = useRebalancingStore()
const portfolioStore = usePortfolioStore()

// Generate accessible table description
const tableDescription = `Rebalancing orders showing buy and sell recommendations for portfolio optimization. ${rebalancingStore.rebalancingOrders.length} total orders.`

// Announce table updates
if (rebalancingStore.rebalancingOrders.length > 0) {
  ScreenReader.announceTableUpdate('Rebalancing orders', rebalancingStore.rebalancingOrders.length)
}

// Computed property to handle "SELL 0" → "HOLD" conversion and calculate net shares
const processedOrders = computed(() => {
  return rebalancingStore.rebalancingOrders.map(order => {
    // Convert "SELL" action to "HOLD" when shares = 0
    const processedAction = order.action === 'SELL' && order.shares === 0 ? 'HOLD' : order.action
    
    // Calculate net shares change
    let netShares = 0
    if (order.action === 'BUY') {
      // For BUY actions, calculate the additional shares to buy
      // currentValue / price = current shares, finalValue / price = final shares
      const currentPrice = portfolioStore.etfPrices[order.ticker]?.price || 1
      const currentShares = order.currentValue / currentPrice
      const finalShares = order.finalValue / currentPrice
      netShares = Math.round(finalShares - currentShares)
    } else if (order.action === 'SELL') {
      // For SELL actions, use the negative shares value (already represents net change)
      netShares = order.shares
    } else {
      // For HOLD actions, net change is 0
      netShares = 0
    }
    
    return {
      ...order,
      processedAction,
      netShares
    }
  })
})

// Row interaction handlers
function handleRowClick(order: any) {
  console.log('Row clicked:', order)
  // Could trigger detailed view or action execution
}

function handleRowKeydown(event: KeyboardEvent, order: any) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleRowClick(order)
  }
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <h2 class="text-lg font-semibold text-neutral-900 mb-4">Rebalancing Orders</h2>

    <div v-if="processedOrders.length > 0" class="overflow-hidden border border-neutral-200 rounded-lg">
      <!-- Desktop table controls -->
      <div class="hidden lg:flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div class="flex items-center space-x-4">
          <span class="text-sm text-neutral-600">{{ processedOrders.length }} orders</span>
          <div class="flex items-center space-x-1 text-xs text-neutral-400">
            <kbd class="px-1.5 py-0.5 text-xs bg-white border border-neutral-300 rounded">Tab</kbd>
            <span class="text-neutral-500">to navigate</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-xs text-neutral-500">Sort by:</span>
          <select class="text-xs border border-neutral-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option>Action</option>
            <option>Difference</option>
            <option>Ticker</option>
          </select>
        </div>
      </div>

      <table
        class="min-w-full divide-y divide-neutral-200"
        :aria-describedby="'rebalancing-table-description'"
        role="grid"
        aria-label="Rebalancing Orders"
      >
        <caption class="sr-only">
          Portfolio rebalancing orders showing recommended buy, sell, and hold actions
        </caption>
        <thead class="bg-neutral-50">
          <tr role="row">
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Ticker
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Action
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Shares
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Current Value
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Final Value
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Difference
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Deviation
            </th>
          </tr>
        </thead>
        <tbody class="bg-surface divide-y divide-neutral-200">
          <tr
            v-for="(order, index) in processedOrders"
            :key="order.ticker"
            class="hover:bg-neutral-50 transition-colors group cursor-pointer"
            role="row"
            :aria-rowindex="index + 2"
            @click="handleRowClick(order)"
            @keydown="handleRowKeydown($event, order)"
            tabindex="0"
          >
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900" role="gridcell">
              <span class="sr-only">Ticker: </span>
              {{ order.ticker }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap" role="gridcell">
              <span
                class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 group-hover:scale-105"
                :class="{
                  'bg-success-100 text-success-800 border border-success-200 shadow-sm': order.processedAction === 'BUY',
                  'bg-error-100 text-error-800 border border-error-200 shadow-sm': order.processedAction === 'SELL',
                  'bg-neutral-100 text-neutral-800 border border-neutral-200': order.processedAction === 'HOLD'
                }"
                :aria-label="`${order.processedAction} action for ${order.ticker}`"
              >
                <svg
                  v-if="order.processedAction === 'BUY'"
                  class="w-3 h-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <svg
                  v-if="order.processedAction === 'SELL'"
                  class="w-3 h-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
                <svg
                  v-if="order.processedAction === 'HOLD'"
                  class="w-3 h-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {{ order.processedAction }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium" role="gridcell"
                :class="order.netShares > 0 ? 'text-success-600' : order.netShares < 0 ? 'text-error-600' : 'text-neutral-600'">
              <span class="sr-only">Shares: </span>
              {{ order.netShares > 0 ? '+' : '' }}{{ order.netShares.toLocaleString() }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600" role="gridcell">
              <span class="sr-only">Current Value: </span>
              ${{ order.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900" role="gridcell">
              <span class="sr-only">Final Value: </span>
              ${{ order.finalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium" role="gridcell"
                :class="order.difference >= 0 ? 'text-success-600' : 'text-error-600'">
              <span class="sr-only">Difference: </span>
              {{ order.difference >= 0 ? '+' : '' }}${{ order.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium" role="gridcell"
                :class="Math.abs(order.deviationPercentage) <= 1 ? 'text-neutral-600' : order.deviationPercentage > 0 ? 'text-success-600' : 'text-error-600'">
              <span class="sr-only">Deviation: </span>
              {{ order.deviationPercentage >= 0 ? '+' : '' }}{{ order.deviationPercentage.toFixed(2) }}%
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-neutral-50">
          <tr role="row">
            <td colspan="4" class="px-4 py-3 text-sm font-medium text-neutral-900 text-right" role="gridcell">
              Total Portfolio Value:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-neutral-900" role="gridcell">
              ${{ portfolioStore.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td colspan="2" role="gridcell"></td>
          </tr>
        </tfoot>
      </table>
      <p id="rebalancing-table-description" class="sr-only">
        {{ tableDescription }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-8 border-2 border-dashed border-neutral-300 rounded-lg"
    >
      <svg class="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-neutral-900">No rebalancing orders</h3>
      <p class="mt-1 text-sm text-neutral-500">
        Generate rebalancing orders to see recommended trades.
      </p>
    </div>

    <!-- Summary Statistics -->
    <div v-if="processedOrders.length > 0" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" role="status" aria-label="Rebalancing Summary">
      <div class="bg-primary-50 border border-primary-200 rounded-lg p-4" role="region" aria-label="Total Buy Orders">
        <div class="text-sm font-medium text-primary-800">Total Buys</div>
        <div class="text-2xl font-bold text-primary-900" aria-live="polite" aria-atomic="true">
          ${{ processedOrders
            .filter(order => order.processedAction === 'BUY')
            .reduce((sum, order) => sum + (order.finalValue - order.currentValue), 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
      <div class="bg-error-50 border border-error-200 rounded-lg p-4" role="region" aria-label="Total Sell Orders">
        <div class="text-sm font-medium text-error-800">Total Sells</div>
        <div class="text-2xl font-bold text-error-900" aria-live="polite" aria-atomic="true">
          ${{ processedOrders
            .filter(order => order.processedAction === 'SELL')
            .reduce((sum, order) => sum + Math.abs(order.currentValue - order.finalValue), 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
      <div class="bg-success-50 border border-success-200 rounded-lg p-4" role="region" aria-label="Net Portfolio Change">
        <div class="text-sm font-medium text-success-800">Net Change</div>
        <div class="text-2xl font-bold text-success-900" aria-live="polite" aria-atomic="true">
          ${{ processedOrders
            .reduce((sum, order) => sum + (order.finalValue - order.currentValue), 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
    </div>
  </div>
</template>