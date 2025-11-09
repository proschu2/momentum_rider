<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6 w-full">
    <div class="flex items-center space-x-2 mb-4">
      <h3 class="text-lg font-semibold text-neutral-900">Budget Allocation Strategy</h3>
      <Tooltip
        content="Choose how to allocate your budget across ETFs. Each strategy optimizes for different goals like maximizing shares, prioritizing momentum, or maintaining balance."
        position="top"
        :max-width="300"
      >
        <div class="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-200 hover:bg-neutral-300 cursor-help">
          <span class="text-xs font-medium text-neutral-600">?</span>
        </div>
      </Tooltip>
    </div>
    
    <!-- Strategy Selection -->
    <div class="space-y-4">
      <!-- Dropdown Selection -->
      <div class="space-y-2">
        <div class="flex items-center space-x-2">
          <label class="block text-sm font-medium text-neutral-700">
            Primary Strategy
          </label>
          <Tooltip
            content="Select the main strategy for budget allocation. The strategy determines how leftover budget is distributed after initial share purchases."
            position="top"
            :max-width="250"
          >
            <div class="flex items-center justify-center w-3 h-3 rounded-full bg-neutral-200 hover:bg-neutral-300 cursor-help">
              <span class="text-xs font-medium text-neutral-600">?</span>
            </div>
          </Tooltip>
        </div>
        <div class="relative">
          <select
            v-model="selectedStrategy"
            class="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none cursor-pointer"
          >
            <option
              v-for="strategy in availableStrategies"
              :key="strategy.value"
              :value="strategy.value"
            >
              {{ strategy.name }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Strategy Details -->
      <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 mt-0.5">
            <div class="w-3 h-3 rounded-full bg-primary-500"></div>
          </div>
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-1">
              <div class="font-medium text-sm text-neutral-900">
                {{ getCurrentStrategy()?.name || 'Unknown Strategy' }}
              </div>
              <Tooltip
                :content="getCurrentStrategy()?.tooltip || 'Strategy details not available'"
                position="top"
                :max-width="280"
              >
                <div class="flex items-center justify-center w-3 h-3 rounded-full bg-neutral-200 hover:bg-neutral-300 cursor-help">
                  <span class="text-xs font-medium text-neutral-600">?</span>
                </div>
              </Tooltip>
            </div>
            <div class="text-xs text-neutral-600">
              {{ getCurrentStrategy()?.description || 'No description available' }}
            </div>
            <div class="text-xs text-neutral-500 mt-2">
              <span class="font-medium">Best for:</span> {{ getCurrentStrategy()?.bestFor || 'General use' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Options -->
      <div class="border-t pt-4 mt-4">
        <button 
          @click="showAdvanced = !showAdvanced"
          class="flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <span>{{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options</span>
          <svg 
            class="w-4 h-4 transition-transform duration-200" 
            :class="{ 'rotate-180': showAdvanced }"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showAdvanced" class="mt-4 space-y-4">
          <!-- Fallback Strategy -->
          <div class="space-y-2">
            <label class="flex items-center space-x-3">
              <input 
                type="checkbox" 
                v-model="enableFallback"
                class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div class="font-medium text-sm">Enable Fallback Strategy</div>
                <div class="text-xs text-neutral-600">Use secondary strategy if budget remains</div>
              </div>
            </label>
            
            <div v-if="enableFallback" class="ml-6 space-y-2">
              <label class="block text-sm font-medium">Fallback Strategy</label>
              <select 
                v-model="fallbackStrategy"
                class="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option 
                  v-for="strategy in availableStrategies.filter(s => s.value !== selectedStrategy)" 
                  :key="strategy.value" 
                  :value="strategy.value"
                >
                  {{ strategy.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Strategy Performance Preview -->
          <div class="bg-neutral-50 rounded-lg p-4">
            <h4 class="font-medium text-sm mb-2">Strategy Preview</h4>
            <div class="text-xs text-neutral-600 space-y-1">
              <div>Primary: {{ getStrategyName(selectedStrategy) }}</div>
              <div v-if="enableFallback">Fallback: {{ getStrategyName(fallbackStrategy) }}</div>
              <div class="text-success-600 font-medium mt-2">
                Expected budget utilization: 95%+
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRebalancingStore } from '@/stores/rebalancing'
import type { AllocationStrategy } from '@/stores/types'
import Tooltip from '@/components/ui/Tooltip.vue'

const rebalancingStore = useRebalancingStore()

const showAdvanced = ref(false)
const enableFallback = ref(true)
const fallbackStrategy = ref<AllocationStrategy>('price-efficient')

const availableStrategies = computed(() => [
  {
    value: 'remainder-first' as AllocationStrategy,
    name: 'Remainder-First',
    description: 'Prioritize ETFs closest to target allocation percentages',
    bestFor: 'Maintaining strict allocation balance',
    tooltip: 'Prioritizes ETFs that are furthest from their target allocation percentages. Best for maintaining strict portfolio balance and minimizing drift from target allocations. Use when precise allocation control is more important than maximizing shares.'
  },
  {
    value: 'multi-share' as AllocationStrategy,
    name: 'Multi-Share',
    description: 'Maximize total shares purchased, minimize leftover budget',
    bestFor: 'Maximum budget utilization across all ETFs',
    tooltip: 'Maximizes the total number of shares purchased across all ETFs while minimizing leftover budget. Prioritizes ETFs where additional shares can be purchased with remaining budget. Use when you want to maximize your investment exposure and minimize uninvested cash.'
  },
  {
    value: 'momentum-weighted' as AllocationStrategy,
    name: 'Momentum-Weighted',
    description: 'Prioritize ETFs with highest momentum scores',
    bestFor: 'Maximizing exposure to strongest performers',
    tooltip: 'Prioritizes ETFs with the highest momentum scores for additional share purchases. Allocates leftover budget to assets showing strongest recent performance. Use when you want to overweight your portfolio towards the best-performing assets.'
  },
  {
    value: 'price-efficient' as AllocationStrategy,
    name: 'Price-Efficient',
    description: 'Prioritize cheaper ETFs for more share promotions',
    bestFor: 'Cost-effective allocation across price spectrum',
    tooltip: 'Prioritizes lower-priced ETFs to maximize the number of shares purchased with remaining budget. Focuses on cost-effective allocation across the price spectrum. Use when you want to maximize diversification and share count across your portfolio.'
  },
  {
    value: 'hybrid' as AllocationStrategy,
    name: 'Hybrid',
    description: 'Balance momentum and price efficiency',
    bestFor: 'Balanced approach considering multiple factors',
    tooltip: 'Combines momentum and price efficiency factors to create a balanced allocation approach. Considers both performance and cost-effectiveness when distributing leftover budget. Use when you want a balanced approach that considers multiple investment factors.'
  }
])

const selectedStrategy = computed({
  get: () => rebalancingStore.allocationStrategy,
  set: (value) => rebalancingStore.setAllocationStrategy(value)
})

function selectStrategy(strategy: AllocationStrategy) {
  rebalancingStore.setAllocationStrategy(strategy)
}

function getStrategyName(strategy: AllocationStrategy): string {
  return availableStrategies.value.find(s => s.value === strategy)?.name || strategy
}

function getCurrentStrategy() {
  return availableStrategies.value.find(s => s.value === selectedStrategy.value) || availableStrategies.value[0]
}

// Update config when advanced options change
watch([enableFallback, fallbackStrategy], () => {
  rebalancingStore.updateStrategyConfig({
    enableFallback: enableFallback.value,
    fallbackStrategy: enableFallback.value ? fallbackStrategy.value : undefined
  })
})
</script>