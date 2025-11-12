<script setup lang="ts">
import { useRebalancingStore } from '@/stores/rebalancing'
import Card from './ui/Card.vue'
import Slider from './ui/Slider.vue'
import Checkbox from './ui/Checkbox.vue'
import { generateAriaLabel, ScreenReader } from '@/utils/accessibility'

const rebalancingStore = useRebalancingStore()

// Handle parameter changes with screen reader announcements
function handleTopAssetsChange(value: number) {
  rebalancingStore.topAssets = value
  ScreenReader.announce(`Top assets set to ${value}`)
}

function handleBitcoinAllocationChange(value: number) {
  rebalancingStore.bitcoinAllocation = value
  ScreenReader.announce(`Bitcoin allocation set to ${value} percent`)
}

function handleRebalancingChange(value: 'monthly' | 'quarterly') {
  rebalancingStore.rebalancingFrequency = value
  ScreenReader.announce(`Rebalancing frequency set to ${value}`)
}

function handleAllocationMethodChange(value: 'Proportional' | 'Underweight Only') {
  rebalancingStore.allocationMethod = value
  ScreenReader.announce(`Allocation method set to ${value}`)
}

function handleMomentumPeriodsChange(period: number, checked: boolean) {
  const currentPeriods = [...rebalancingStore.momentumPeriods]

  if (checked) {
    rebalancingStore.momentumPeriods = [...currentPeriods, period]
    ScreenReader.announce(`${period} month momentum period added`)
  } else {
    rebalancingStore.momentumPeriods = currentPeriods.filter(p => p !== period)
    ScreenReader.announce(`${period} month momentum period removed`)
  }
}
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
            v-model.number="rebalancingStore.topAssets"
            @input="handleTopAssetsChange(parseInt(($event.target as HTMLInputElement).value))"
            min="1"
            max="8"
            aria-valuemin="1"
            aria-valuemax="8"
            :aria-valuenow="rebalancingStore.topAssets"
            :aria-valuetext="`${rebalancingStore.topAssets} top assets`"
            class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
          <span
            class="text-sm font-medium text-neutral-900 min-w-8"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ rebalancingStore.topAssets }}
          </span>
        </div>
        <p class="text-xs text-neutral-500" id="top-assets-description">
          Number of top ETFs to include in portfolio
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
            v-model.number="rebalancingStore.bitcoinAllocation"
            @input="handleBitcoinAllocationChange(parseFloat(($event.target as HTMLInputElement).value))"
            min="0"
            max="20"
            step="0.5"
            aria-valuemin="0"
            aria-valuemax="20"
            :aria-valuenow="rebalancingStore.bitcoinAllocation"
            :aria-valuetext="`${rebalancingStore.bitcoinAllocation} percent bitcoin allocation`"
            class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
          <span
            class="text-sm font-medium text-neutral-900 min-w-12"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ rebalancingStore.bitcoinAllocation }}%
          </span>
        </div>
        <p class="text-xs text-neutral-500" id="bitcoin-allocation-description">
          Fixed allocation percentage to IBIT Bitcoin ETF
        </p>
      </div>

      <!-- Rebalancing Frequency -->
      <div class="space-y-2">
        <fieldset>
          <legend class="block text-sm font-medium text-neutral-700">
            Rebalancing Frequency
          </legend>
          <div class="flex space-x-3 mt-1" role="radiogroup" aria-labelledby="rebalancing-legend">
            <label class="inline-flex items-center">
              <input
                type="radio"
                v-model="rebalancingStore.rebalancingFrequency"
                @change="handleRebalancingChange('monthly')"
                value="monthly"
                class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
                aria-describedby="rebalancing-description"
              />
              <span class="ml-1.5 text-xs text-neutral-700">Monthly</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                v-model="rebalancingStore.rebalancingFrequency"
                @change="handleRebalancingChange('quarterly')"
                value="quarterly"
                class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
                aria-describedby="rebalancing-description"
              />
              <span class="ml-1.5 text-xs text-neutral-700">Quarterly</span>
            </label>
          </div>
          <p class="text-xs text-neutral-500 mt-1" id="rebalancing-description">
            How often to rebalance the portfolio
          </p>
        </fieldset>
      </div>

      <!-- Allocation Method -->
      <div class="space-y-2">
        <fieldset>
          <legend class="block text-sm font-medium text-neutral-700">
            Cash Allocation Method
          </legend>
          <div class="flex space-x-3 mt-1" role="radiogroup" aria-labelledby="allocation-legend">
            <label class="inline-flex items-center">
              <input
                type="radio"
                v-model="rebalancingStore.allocationMethod"
                @change="handleAllocationMethodChange('Proportional')"
                value="Proportional"
                class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
                aria-describedby="allocation-description"
              />
              <span class="ml-1.5 text-xs text-neutral-700">Proportional</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                v-model="rebalancingStore.allocationMethod"
                @change="handleAllocationMethodChange('Underweight Only')"
                value="Underweight Only"
                class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300"
                aria-describedby="allocation-description"
              />
              <span class="ml-1.5 text-xs text-neutral-700">Underweight</span>
            </label>
          </div>
          <p class="text-xs text-neutral-500 mt-1" id="allocation-description">
            How to allocate additional cash to portfolio assets
          </p>
        </fieldset>
      </div>
    </div>

    <!-- Momentum Periods - Full Width -->
    <div class="mt-4 pt-4 border-t border-neutral-200">
      <fieldset>
        <legend class="block text-sm font-medium text-neutral-700 mb-2">
          Momentum Periods
        </legend>
        <div class="flex space-x-4" role="group" aria-labelledby="momentum-periods-legend">
          <label
            v-for="period in [3, 6, 9, 12]"
            :key="period"
            class="inline-flex items-center"
          >
            <input
              type="checkbox"
              :value="period"
              v-model="rebalancingStore.momentumPeriods"
              @change="handleMomentumPeriodsChange(period, ($event.target as HTMLInputElement).checked)"
              class="h-3 w-3 text-primary-500 focus:ring-primary-500 border-neutral-300 rounded"
              aria-describedby="momentum-periods-description"
            />
            <span class="ml-1.5 text-xs text-neutral-700">{{ period }}m</span>
          </label>
        </div>
        <p class="text-xs text-neutral-500 mt-1" id="momentum-periods-description">
          Time periods used to calculate momentum scores
        </p>
      </fieldset>
    </div>

    <!-- Strategy Summary -->
    <div class="mt-4 pt-4 border-t border-neutral-200">
      <h3 class="text-sm font-medium text-neutral-900 mb-2">Strategy Summary</h3>
      <div class="space-y-1 text-xs text-neutral-600" role="status" aria-live="polite" aria-atomic="true">
        <div>• Top {{ rebalancingStore.topAssets }} ETFs with positive momentum</div>
        <div v-if="rebalancingStore.bitcoinAllocation > 0">• {{ rebalancingStore.bitcoinAllocation }}% Bitcoin allocation</div>
        <div>• {{ rebalancingStore.rebalancingFrequency }} rebalancing</div>
        <div>• Periods: {{ rebalancingStore.momentumPeriods.join(', ') }} months</div>
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