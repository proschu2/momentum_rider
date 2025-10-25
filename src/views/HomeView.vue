<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import ETFUniverse from '@/components/ETFUniverse.vue'
import StrategyParams from '@/components/StrategyParams.vue'
import PortfolioManager from '@/components/PortfolioManager.vue'
import RebalancingTable from '@/components/RebalancingTable.vue'
import { onMounted, ref } from 'vue'

const store = useMomentumRiderStore()
const isMounted = ref(false)

// Initialize with some default selections after component is mounted
onMounted(() => {
  isMounted.value = true
  if (store.selectedETFs.length === 0) {
    store.selectedETFs = ['VTI', 'TLT', 'PDBC', 'IBIT']
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="bg-surface rounded-xl border border-neutral-200 p-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-900">Portfolio Dashboard</h1>
          <p class="mt-1 text-neutral-600 text-sm">
            Systematic momentum-based ETF portfolio management
          </p>
        </div>
        <div class="text-center sm:text-right">
          <div class="text-2xl font-bold text-neutral-900">
            ${{ store.totalPortfolioValue.toLocaleString() }}
          </div>
          <div class="text-xs text-neutral-500">Total Portfolio Value</div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="store.error"
      class="bg-error-50 border border-error-200 rounded-xl p-4"
    >
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 mt-0.5">
          <svg class="h-5 w-5 text-error-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-medium text-error-800">Error</h3>
          <div class="mt-1 text-sm text-error-700">
            {{ store.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column - Configuration -->
      <div class="lg:col-span-1 space-y-6">
        <ETFUniverse />
        <StrategyParams />
        <PortfolioManager />
      </div>

      <!-- Right Column - Results -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Action Buttons -->
        <div class="bg-surface rounded-xl border border-neutral-200 p-6">
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="store.calculateMomentum()"
              :disabled="store.isLoading || store.selectedETFs.length === 0"
              class="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                v-if="store.isLoading"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ store.isLoading ? 'Calculating...' : 'Calculate Momentum' }}
            </button>

            <button
              @click="store.calculateRebalancing()"
              :disabled="Object.keys(store.momentumData).length === 0"
              class="inline-flex items-center px-5 py-2.5 border border-neutral-300 text-sm font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Rebalancing Orders
            </button>
          </div>
        </div>

        <!-- Results Section -->
        <div v-if="Object.keys(store.momentumData).length > 0" class="space-y-6">
          <!-- Momentum Results -->
          <div class="bg-surface rounded-xl border border-neutral-200 p-6">
            <h2 class="text-lg font-semibold text-neutral-900 mb-4">Momentum Results</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="[ticker, data] in Object.entries(store.momentumData)"
                :key="ticker"
                class="border rounded-xl p-4 transition-colors hover:shadow-card-hover"
                :class="data.absoluteMomentum ? 'border-success-200 bg-success-50' : 'border-error-200 bg-error-50'"
              >
                <div class="flex justify-between items-start mb-3">
                  <span class="font-semibold text-neutral-900">{{ ticker }}</span>
                  <span
                    class="text-xs px-2 py-1 rounded-full font-medium"
                    :class="data.absoluteMomentum ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'"
                  >
                    {{ data.absoluteMomentum ? 'Positive' : 'Negative' }}
                  </span>
                </div>
                <div class="text-xl font-bold mb-3" :class="data.average >= 0 ? 'text-success-600' : 'text-error-600'">
                  {{ data.average.toFixed(2) }}%
                </div>
                <div class="text-xs text-neutral-500 space-y-1.5">
                  <div v-for="period in ['3month', '6month', '9month', '12month']" :key="period" class="flex justify-between">
                    <span>{{ period.replace('month', 'm') }}:</span>
                    <span class="font-medium">{{ data.periods[period as keyof typeof data.periods].toFixed(2) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rebalancing Orders -->
          <RebalancingTable />
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="bg-surface rounded-xl border border-neutral-200 p-12 text-center"
        >
          <svg class="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 class="mt-3 text-sm font-medium text-neutral-900">No momentum data</h3>
          <p class="mt-1 text-sm text-neutral-500">
            Select ETFs and calculate momentum to see results.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
