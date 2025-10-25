<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import Card from './ui/Card.vue'
import Checkbox from './ui/Checkbox.vue'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'

const store = useMomentumRiderStore()

function toggleETF(etf: string) {
  const index = store.selectedETFs.indexOf(etf)
  if (index > -1) {
    store.selectedETFs.splice(index, 1)
  } else {
    store.selectedETFs.push(etf)
  }
}

function getCategoryForETF(etf: string) {
  return Object.entries(store.etfUniverse).find(([cat, etfs]) => etfs.includes(etf))?.[0]
}

function selectAllETFs() {
  store.selectedETFs = [...store.availableETFs]
}

function clearAllETFs() {
  store.selectedETFs = []
}
</script>

<template>
  <Card padding="lg">
    <h2 class="text-lg font-semibold text-neutral-900 mb-4">ETF Universe</h2>

    <!-- Category Toggles -->
    <div class="space-y-3 mb-6">
      <Card
        v-for="category in Object.keys(store.etfUniverse)"
        :key="category"
        padding="sm"
        hover
      >
        <div class="flex items-center justify-between">
          <Checkbox
            :model-value="store.enabledCategories[category as keyof typeof store.enabledCategories]"
            @update:model-value="store.toggleCategory(category as keyof typeof store.enabledCategories)"
            :label="category"
          />
          <Badge>
            {{ store.etfUniverse[category as keyof typeof store.etfUniverse].length }} ETFs
          </Badge>
        </div>
      </Card>
    </div>

    <!-- ETF Selection -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-medium text-neutral-900">Select ETFs</h3>
        <div class="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            @click="selectAllETFs"
            :disabled="store.availableETFs.length === 0"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            @click="clearAllETFs"
            :disabled="store.selectedETFs.length === 0"
          >
            Clear All
          </Button>
        </div>
      </div>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <Card
          v-for="etf in store.availableETFs"
          :key="etf"
          padding="sm"
          hover
        >
          <div class="flex items-center justify-between w-full">
            <Checkbox
              :model-value="store.selectedETFs.includes(etf)"
              @update:model-value="toggleETF(etf)"
              :label="etf"
            />
            <span class="text-xs text-neutral-500">
              {{ getCategoryForETF(etf) }}
            </span>
          </div>
        </Card>
      </div>
    </div>

    <!-- Selected ETFs Summary -->
    <div v-if="Object.keys(store.selectedETFsWithCategories).length > 0" class="mt-6 pt-4 border-t border-neutral-200">
      <h3 class="text-sm font-medium text-neutral-900 mb-2">Selected ETFs by Category</h3>
      <div class="space-y-2">
        <div
          v-for="[category, etfs] in Object.entries(store.selectedETFsWithCategories)"
          :key="category"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-neutral-600">{{ category }}</span>
          <span class="text-neutral-900 font-medium">{{ etfs.join(', ') }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="store.availableETFs.length === 0"
      class="mt-4 text-center py-4 text-neutral-500"
    >
      <svg class="mx-auto h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="mt-2 text-sm">Enable categories to see available ETFs</p>
    </div>
  </Card>
</template>