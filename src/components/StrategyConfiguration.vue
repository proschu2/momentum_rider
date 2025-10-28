<template>
  <div class="bg-surface rounded-xl border border-neutral-200 p-6">
    <h3 class="text-lg font-semibold text-neutral-900 mb-4">Budget Allocation Strategy</h3>
    
    <!-- Strategy Selection -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="strategy in availableStrategies" 
          :key="strategy.value"
          class="border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
          :class="{
            'border-primary-500 bg-primary-50 shadow-sm': selectedStrategy === strategy.value,
            'border-neutral-200 bg-white': selectedStrategy !== strategy.value
          }"
          @click="selectStrategy(strategy.value)"
        >
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                   :class="selectedStrategy === strategy.value ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'">
                <div v-if="selectedStrategy === strategy.value" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div class="flex-1">
              <div class="font-medium text-neutral-900">{{ strategy.name }}</div>
              <div class="text-sm text-neutral-600 mt-1">{{ strategy.description }}</div>
              <div class="text-xs text-neutral-500 mt-2">
                <span class="font-medium">Best for:</span> {{ strategy.bestFor }}
              </div>
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

const rebalancingStore = useRebalancingStore()

const showAdvanced = ref(false)
const enableFallback = ref(true)
const fallbackStrategy = ref<AllocationStrategy>('price-efficient')

const availableStrategies = computed(() => [
  {
    value: 'remainder-first' as AllocationStrategy,
    name: 'Remainder-First',
    description: 'Prioritize ETFs closest to target allocation percentages',
    bestFor: 'Maintaining strict allocation balance'
  },
  {
    value: 'multi-share' as AllocationStrategy,
    name: 'Multi-Share',
    description: 'Maximize total shares purchased, minimize leftover budget',
    bestFor: 'Maximum budget utilization across all ETFs'
  },
  {
    value: 'momentum-weighted' as AllocationStrategy,
    name: 'Momentum-Weighted',
    description: 'Prioritize ETFs with highest momentum scores',
    bestFor: 'Maximizing exposure to strongest performers'
  },
  {
    value: 'price-efficient' as AllocationStrategy,
    name: 'Price-Efficient',
    description: 'Prioritize cheaper ETFs for more share promotions',
    bestFor: 'Cost-effective allocation across price spectrum'
  },
  {
    value: 'hybrid' as AllocationStrategy,
    name: 'Hybrid',
    description: 'Balance momentum and price efficiency',
    bestFor: 'Balanced approach considering multiple factors'
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

// Update config when advanced options change
watch([enableFallback, fallbackStrategy], () => {
  rebalancingStore.updateStrategyConfig({
    enableFallback: enableFallback.value,
    fallbackStrategy: enableFallback.value ? fallbackStrategy.value : undefined
  })
})
</script>