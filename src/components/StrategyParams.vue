<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import Card from './ui/Card.vue'
import Slider from './ui/Slider.vue'
import Checkbox from './ui/Checkbox.vue'

const store = useMomentumRiderStore()
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <h2 class="text-lg font-semibold text-neutral-900 mb-4">Strategy Parameters</h2>

    <!-- Compact Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Top Assets -->
      <div class="space-y-2">
        <label for="top-assets" class="block text-sm font-medium text-neutral-700">
          Top Assets
        </label>
        <div class="flex items-center space-x-3">
          <input
            id="top-assets"
            type="range"
            v-model.number="store.topAssets"
            min="1"
            max="8"
            class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
          />
          <span class="text-sm font-medium text-neutral-900 min-w-8">
            {{ store.topAssets }}
          </span>
        </div>
        <p class="text-xs text-neutral-500">
          Number of top ETFs
        </p>
      </div>

      <!-- Bitcoin Allocation -->
      <div class="space-y-2">
        <label for="bitcoin-allocation" class="block text-sm font-medium text-neutral-700">
          Bitcoin Allocation
        </label>
        <div class="flex items-center space-x-3">
          <input
            id="bitcoin-allocation"
            type="range"
            v-model.number="store.bitcoinAllocation"
            min="0"
            max="20"
            step="0.5"
            class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
          />
          <span class="text-sm font-medium text-neutral-900 min-w-12">
            {{ store.bitcoinAllocation }}%
          </span>
        </div>
        <p class="text-xs text-neutral-500">
          Fixed allocation to IBIT
        </p>
      </div>

      <!-- Rebalancing Frequency -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-neutral-700">
          Rebalancing
        </label>
        <div class="flex space-x-3">
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.rebalancingFrequency"
              value="monthly"
              class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-1.5 text-xs text-neutral-700">Monthly</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.rebalancingFrequency"
              value="quarterly"
              class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-1.5 text-xs text-neutral-700">Quarterly</span>
          </label>
        </div>
      </div>

      <!-- Allocation Method -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-neutral-700">
          Cash Allocation
        </label>
        <div class="flex space-x-3">
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.allocationMethod"
              value="Proportional"
              class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-1.5 text-xs text-neutral-700">Proportional</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.allocationMethod"
              value="Underweight Only"
              class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-1.5 text-xs text-neutral-700">Underweight</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Momentum Periods - Full Width -->
    <div class="mt-4 pt-4 border-t border-neutral-200">
      <label class="block text-sm font-medium text-neutral-700 mb-2">
        Momentum Periods
      </label>
      <div class="flex space-x-4">
        <label
          v-for="period in [3, 6, 9, 12]"
          :key="period"
          class="inline-flex items-center"
        >
          <input
            type="checkbox"
            :value="period"
            v-model="store.momentumPeriods"
            class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300 rounded"
          />
          <span class="ml-1.5 text-xs text-neutral-700">{{ period }}m</span>
        </label>
      </div>
    </div>

    <!-- Strategy Summary -->
    <div class="mt-4 pt-4 border-t border-neutral-200">
      <h3 class="text-sm font-medium text-neutral-900 mb-2">Strategy Summary</h3>
      <div class="space-y-1 text-xs text-neutral-600">
        <div>• Top {{ store.topAssets }} ETFs with positive momentum</div>
        <div v-if="store.bitcoinAllocation > 0">• {{ store.bitcoinAllocation }}% Bitcoin allocation</div>
        <div>• {{ store.rebalancingFrequency }} rebalancing</div>
        <div>• Periods: {{ store.momentumPeriods.join(', ') }} months</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0ea5e9;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0ea5e9;
  cursor: pointer;
  border: none;
}
</style>