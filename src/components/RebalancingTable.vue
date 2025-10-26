<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import { generateAriaLabel, ScreenReader } from '@/utils/accessibility'

const store = useMomentumRiderStore()

// Generate accessible table description
const tableDescription = `Rebalancing orders showing buy and sell recommendations for portfolio optimization. ${store.rebalancingOrders.length} total orders.`

// Announce table updates
if (store.rebalancingOrders.length > 0) {
  ScreenReader.announceTableUpdate('Rebalancing orders', store.rebalancingOrders.length)
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <h2 class="text-lg font-semibold text-neutral-900 mb-4">Rebalancing Orders</h2>

    <div v-if="store.rebalancingOrders.length > 0" class="overflow-hidden border border-neutral-200 rounded-lg">
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
              Target Value
            </th>
            <th scope="col" role="columnheader" class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Difference
            </th>
          </tr>
        </thead>
        <tbody class="bg-surface divide-y divide-neutral-200">
          <tr
            v-for="(order, index) in store.rebalancingOrders"
            :key="order.ticker"
            class="hover:bg-neutral-50 transition-colors"
            role="row"
            :aria-rowindex="index + 2"
          >
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900" role="gridcell">
              <span class="sr-only">Ticker: </span>
              {{ order.ticker }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap" role="gridcell">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-success-100 text-success-800': order.action === 'BUY',
                  'bg-error-100 text-error-800': order.action === 'SELL',
                  'bg-neutral-100 text-neutral-800': order.action === 'HOLD'
                }"
                :aria-label="`${order.action} action for ${order.ticker}`"
              >
                {{ order.action }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600" role="gridcell">
              <span class="sr-only">Shares: </span>
              {{ order.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600" role="gridcell">
              <span class="sr-only">Current Value: </span>
              ${{ order.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900" role="gridcell">
              <span class="sr-only">Target Value: </span>
              ${{ order.targetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium" role="gridcell"
                :class="order.difference >= 0 ? 'text-success-600' : 'text-error-600'">
              <span class="sr-only">Difference: </span>
              {{ order.difference >= 0 ? '+' : '' }}${{ order.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-neutral-50">
          <tr>
            <td colspan="3" class="px-4 py-3 text-sm font-medium text-neutral-900 text-right">
              Total Portfolio Value:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-neutral-900">
              ${{ store.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
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
    <div v-if="store.rebalancingOrders.length > 0" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div class="text-sm font-medium text-primary-800">Total Buys</div>
        <div class="text-2xl font-bold text-primary-900">
          ${{ store.rebalancingOrders
            .filter(order => order.action === 'BUY')
            .reduce((sum, order) => sum + Math.abs(order.difference), 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
      <div class="bg-error-50 border border-error-200 rounded-lg p-4">
        <div class="text-sm font-medium text-error-800">Total Sells</div>
        <div class="text-2xl font-bold text-error-900">
          ${{ store.rebalancingOrders
            .filter(order => order.action === 'SELL')
            .reduce((sum, order) => sum + Math.abs(order.difference), 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
      <div class="bg-success-50 border border-success-200 rounded-lg p-4">
        <div class="text-sm font-medium text-success-800">Net Change</div>
        <div class="text-2xl font-bold text-success-900">
          ${{ store.rebalancingOrders
            .reduce((sum, order) => sum + order.difference, 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
    </div>
  </div>
</template>