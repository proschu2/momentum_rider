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

    <div class="space-y-4">
      <!-- Top Assets -->
      <div>
        <label for="top-assets" class="block text-sm font-medium text-neutral-700 mb-2">
          Number of Top Assets
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
        <p class="mt-1 text-xs text-neutral-500">
          Number of top-performing ETFs to include in the portfolio
        </p>
      </div>

      <!-- Bitcoin Allocation -->
      <div>
        <label for="bitcoin-allocation" class="block text-sm font-medium text-neutral-700 mb-2">
          Bitcoin Allocation (%)
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
        <p class="mt-1 text-xs text-neutral-500">
          Fixed allocation percentage for Bitcoin ETF (IBIT)
        </p>
      </div>

      <!-- Rebalancing Frequency -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          Rebalancing Frequency
        </label>
        <div class="flex space-x-4">
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.rebalancingFrequency"
              value="monthly"
              class="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-2 text-sm text-neutral-700">Monthly</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.rebalancingFrequency"
              value="quarterly"
              class="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-2 text-sm text-neutral-700">Quarterly</span>
          </label>
        </div>
      </div>

      <!-- Momentum Periods -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          Momentum Calculation Periods (months)
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="period in [3, 6, 9, 12]"
            :key="period"
            class="inline-flex items-center"
          >
            <input
              type="checkbox"
              :value="period"
              v-model="store.momentumPeriods"
              class="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <span class="ml-2 text-sm text-neutral-700">{{ period }} months</span>
          </label>
        </div>
        <p class="mt-1 text-xs text-neutral-500">
          Historical periods used for momentum calculation
        </p>
      </div>

      <!-- Allocation Method -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          Allocation Method
        </label>
        <div class="flex space-x-4">
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.allocationMethod"
              value="Proportional"
              class="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-2 text-sm text-neutral-700">Proportional</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              v-model="store.allocationMethod"
              value="Underweight Only"
              class="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300"
            />
            <span class="ml-2 text-sm text-neutral-700">Underweight Only</span>
          </label>
        </div>
        <p class="mt-1 text-xs text-neutral-500">
          How to allocate additional cash during rebalancing
        </p>
      </div>
    </div>

    <!-- Strategy Summary -->
    <div class="mt-6 pt-4 border-t border-neutral-200">
      <h3 class="text-sm font-medium text-neutral-900 mb-2">Strategy Summary</h3>
      <div class="space-y-1 text-sm text-neutral-600">
        <div>• Select top {{ store.topAssets }} ETFs with positive momentum</div>
        <div v-if="store.bitcoinAllocation > 0">• {{ store.bitcoinAllocation }}% fixed allocation to Bitcoin</div>
        <div>• {{ store.rebalancingFrequency }} rebalancing</div>
        <div>• Momentum periods: {{ store.momentumPeriods.join(', ') }} months</div>
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