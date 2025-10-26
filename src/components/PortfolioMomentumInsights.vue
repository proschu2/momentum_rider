<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'

const store = useMomentumRiderStore()
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <h2 class="text-lg font-semibold text-neutral-900 mb-4">Portfolio Momentum Insights</h2>

    <div v-if="Object.keys(store.portfolioMomentumInsight).length > 0" class="space-y-3">
      <div 
        v-for="[ticker, insight] in Object.entries(store.portfolioMomentumInsight)" 
        :key="ticker"
        class="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-neutral-50"
      >
        <div class="flex items-center space-x-3">
          <span class="text-sm font-medium text-neutral-900">{{ ticker }}</span>
          <div class="flex items-center space-x-1">
            <span 
              class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
              :class="insight.absoluteMomentum 
                ? 'bg-success-100 text-success-800 border border-success-200' 
                : 'bg-error-100 text-error-800 border border-error-200'"
            >
              {{ insight.absoluteMomentum ? 'Positive' : 'Negative' }}
            </span>
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-sm font-medium text-neutral-900">
            {{ insight.rank === 0 ? 'No data' : insight.rank === -1 ? 'N/A' : `${insight.momentum.toFixed(2)}%` }}
          </div>
          <div class="text-xs text-neutral-500">
            {{ insight.rank === 0 ? 'Momentum not calculated' : insight.rank === -1 ? 'Non-selectable' : `Rank: ${insight.rank}` }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="Object.keys(store.currentHoldings).length > 0"
      class="text-center py-6 border-2 border-dashed border-neutral-300 rounded-lg"
    >
      <svg class="mx-auto h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-1 text-sm font-medium text-neutral-900">No momentum data</h3>
      <p class="mt-0.5 text-xs text-neutral-500">
        Calculate momentum to see insights for your holdings.
      </p>
    </div>

    <!-- No Holdings State -->
    <div
      v-else
      class="text-center py-6 border-2 border-dashed border-neutral-300 rounded-lg"
    >
      <svg class="mx-auto h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="mt-1 text-sm font-medium text-neutral-900">No holdings</h3>
      <p class="mt-0.5 text-xs text-neutral-500">
        Add holdings to see momentum insights.
      </p>
    </div>

    <!-- Strategy Summary -->
    <div v-if="Object.keys(store.portfolioMomentumInsight).length > 0" class="mt-4 pt-3 border-t border-neutral-200">
      <h3 class="text-sm font-medium text-neutral-900 mb-2">Strategy Summary</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span class="text-neutral-500">Top ETFs:</span>
          <span class="font-medium text-neutral-900 ml-1">{{ store.topAssets }}</span>
        </div>
        <div>
          <span class="text-neutral-500">Bitcoin Allocation:</span>
          <span class="font-medium text-neutral-900 ml-1">{{ store.bitcoinAllocation }}%</span>
        </div>
        <div>
          <span class="text-neutral-500">Positive Momentum Holdings:</span>
          <span class="font-medium text-success-600 ml-1">
            {{ Object.values(store.portfolioMomentumInsight).filter(i => i.absoluteMomentum).length }}
          </span>
        </div>
        <div>
          <span class="text-neutral-500">Negative Momentum Holdings:</span>
          <span class="font-medium text-error-600 ml-1">
            {{ Object.values(store.portfolioMomentumInsight).filter(i => !i.absoluteMomentum).length }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>