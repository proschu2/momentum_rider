<script setup lang="ts">
import { useMomentumRiderStore } from '@/stores/momentum-rider'
import StrategyParams from '@/components/StrategyParams.vue'
import DraggablePortfolioManager from '@/components/DraggablePortfolioManager.vue'
import RebalancingTable from '@/components/RebalancingTable.vue'
import CollapsibleSection from '@/components/ui/CollapsibleSection.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import PortfolioAllocationChart from '@/components/data/PortfolioAllocationChart.vue'
import PerformanceTrendChart from '@/components/data/PerformanceTrendChart.vue'
import PortfolioDataTable from '@/components/data/PortfolioDataTable.vue'
import RealTimeDataManager from '@/components/data/RealTimeDataManager.vue'
import { onMounted, ref, reactive, computed } from 'vue'
import { financeAPI } from '@/services/finance-api'

const store = useMomentumRiderStore()
const isMounted = ref(false)

// API status tracking
const apiStatus = reactive({
  apiBaseUrl: 'Loading...',
  backendStatus: 'Checking...'
})

const currentUrl = ref('Loading...')

// Collapsible section states
const sections = reactive({
  configuration: true,
  portfolio: true,
  results: false
})

// Set current URL
if (typeof window !== 'undefined') {
  currentUrl.value = window.location.href
}

// Initialize with some default selections after component is mounted
onMounted(async () => {
  isMounted.value = true
  if (store.selectedETFs.length === 0) {
    store.selectedETFs = ['VTI', 'TLT', 'PDBC', 'IBIT', 'VEA', 'VWO', 'SGOL', 'BND', 'BWX']
  }

  // Get API base URL for display
  apiStatus.apiBaseUrl = financeAPI.API_BASE_URL || 'Unknown'

  // Test backend connection
  try {
    const response = await fetch(`${apiStatus.apiBaseUrl.replace('/api', '')}/health`)
    if (response.ok) {
      apiStatus.backendStatus = '✅ Connected'
    } else {
      apiStatus.backendStatus = '❌ Error: ' + response.status
    }
  } catch (error) {
    apiStatus.backendStatus = '❌ Offline'
  }
})

// Computed values for enhanced UX
const positiveMomentumCount = computed(() => {
  return Object.values(store.momentumData).filter(data => data.absoluteMomentum).length
})

const totalAssetsCount = computed(() => {
  return Object.keys(store.momentumData).length
})

const momentumScore = computed(() => {
  if (totalAssetsCount.value === 0) return 0
  return (positiveMomentumCount.value / totalAssetsCount.value) * 100
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

    <!-- API Status Display -->
    <div class="bg-info-50 border border-info-200 rounded-xl p-4">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 mt-0.5">
          <svg class="h-5 w-5 text-info-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-info-800">API Configuration</h3>
          <div class="mt-1 text-sm text-info-700 space-y-1">
            <div><strong>Frontend URL:</strong> {{ currentUrl }}</div>
            <div><strong>API Base URL:</strong> {{ apiStatus.apiBaseUrl }}</div>
            <div><strong>Backend Status:</strong> {{ apiStatus.backendStatus }}</div>
          </div>
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

    <!-- ETF Category Selection Bar -->
    <CollapsibleSection
      title="ETF Universe Selection"
      :default-open="sections.configuration"
      badge="Categories"
    >
      <template #description>
        Select asset categories to include in momentum analysis
      </template>

      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="flex-1">
          <p class="text-sm text-neutral-600 mb-4">
            Choose which asset categories to include in your momentum analysis. Each category contains ETFs that represent different market segments.
          </p>
          <div class="flex flex-wrap gap-2">
            <Tooltip
              v-for="category in Object.keys(store.etfUniverse)"
              :key="category"
              :content="`${store.etfUniverse[category as keyof typeof store.etfUniverse].length} ETFs in ${category} category`"
              position="top"
            >
              <button
                @click="store.toggleCategory(category as any)"
                class="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                :class="store.enabledCategories[category as keyof typeof store.enabledCategories]
                  ? 'bg-primary-100 text-primary-800 border-primary-300'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'"
                :aria-pressed="store.enabledCategories[category as keyof typeof store.enabledCategories]"
              >
                <svg
                  v-if="store.enabledCategories[category as keyof typeof store.enabledCategories]"
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ category }} ({{ store.etfUniverse[category as keyof typeof store.etfUniverse].length }})
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Data Visualization Section -->
    <div v-if="Object.keys(store.currentHoldings).length > 0" class="space-y-6">
      <!-- Portfolio Visualization Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Portfolio Allocation Chart -->
        <CollapsibleSection
          title="Portfolio Allocation"
          :default-open="sections.configuration"
          badge="Chart"
        >
          <template #description>
            Visual breakdown of your portfolio by asset allocation
          </template>
          <PortfolioAllocationChart />
        </CollapsibleSection>

        <!-- Performance Trends Chart -->
        <CollapsibleSection
          title="Performance Trends"
          :default-open="sections.configuration"
          badge="Trends"
        >
          <template #description>
            Track performance trends across different time periods
          </template>
          <PerformanceTrendChart />
        </CollapsibleSection>
      </div>

      <!-- Portfolio Data Table -->
      <CollapsibleSection
        title="Portfolio Holdings"
        :default-open="sections.portfolio"
        :badge="Object.keys(store.currentHoldings).length"
      >
        <template #description>
          Detailed view of all portfolio holdings with sorting and filtering
        </template>
        <PortfolioDataTable />
      </CollapsibleSection>

      <!-- Real-time Data Manager -->
      <CollapsibleSection
        title="Real-time Data"
        :default-open="sections.configuration"
        badge="Live"
      >
        <template #description>
          Configure and monitor real-time data updates for your portfolio
        </template>
        <RealTimeDataManager />
      </CollapsibleSection>
    </div>

    <!-- Primary Actions and Configuration -->
    <div class="space-y-6">
      <!-- Action Buttons -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleSection
          title="Analysis Actions"
          :default-open="sections.configuration"
          :show-toggle="false"
        >
          <div class="space-y-4">
            <Tooltip
              :content="store.selectedETFs.length === 0 ? 'Select ETFs first' : 'Calculate momentum scores for selected ETFs'"
              position="top"
            >
              <button
                @click="store.calculateMomentum()"
                :disabled="store.isLoading || store.selectedETFs.length === 0"
                class="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Calculate momentum scores"
              >
                <svg
                  v-if="store.isLoading"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ store.isLoading ? 'Calculating Momentum...' : 'Calculate Momentum' }}
              </button>
            </Tooltip>

            <Tooltip
              :content="Object.keys(store.momentumData).length === 0 ? 'Calculate momentum first' : 'Generate rebalancing orders based on momentum scores'"
              position="top"
            >
              <button
                @click="store.calculateRebalancing()"
                :disabled="Object.keys(store.momentumData).length === 0"
                class="w-full inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-base font-medium rounded-lg text-neutral-700 bg-surface hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Generate rebalancing orders"
              >
                Generate Rebalancing Orders
              </button>
            </Tooltip>
          </div>
        </CollapsibleSection>

        <!-- Quick Stats -->
        <CollapsibleSection
          title="Portfolio Overview"
          :default-open="sections.configuration"
          :show-toggle="false"
        >
          <div class="space-y-4">
            <!-- Momentum Score Progress Bar -->
            <div v-if="Object.keys(store.momentumData).length > 0">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-neutral-700">Momentum Score</span>
                <span class="text-sm font-semibold text-primary-600">{{ momentumScore.toFixed(1) }}%</span>
              </div>
              <ProgressBar
                :value="momentumScore"
                :max="100"
                size="sm"
                color="primary"
                :show-label="false"
              />
              <p class="text-xs text-neutral-500 mt-1">
                {{ positiveMomentumCount }} of {{ totalAssetsCount }} assets with positive momentum
              </p>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div class="text-xl font-bold text-neutral-900">{{ store.selectedETFs.length }}</div>
                <div class="text-sm text-neutral-600">Selected ETFs</div>
              </div>
              <div class="text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div class="text-xl font-bold text-success-600">{{ positiveMomentumCount }}</div>
                <div class="text-sm text-neutral-600">Positive Momentum</div>
              </div>
              <div class="text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div class="text-xl font-bold text-primary-600">{{ store.topAssets }}</div>
                <div class="text-sm text-neutral-600">Top Assets</div>
              </div>
              <div class="text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div class="text-xl font-bold text-neutral-900">
                  ${{ (store.totalPortfolioValue / 1000).toFixed(0) }}K
                </div>
                <div class="text-sm text-neutral-600">Portfolio Value</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <!-- Configuration Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Strategy Parameters -->
        <CollapsibleSection
          title="Strategy Parameters"
          :default-open="sections.configuration"
          badge="Settings"
        >
          <StrategyParams />
        </CollapsibleSection>

        <!-- Portfolio Management -->
        <CollapsibleSection
          title="Portfolio Management"
          :default-open="sections.portfolio"
          :badge="Object.keys(store.currentHoldings).length"
        >
          <DraggablePortfolioManager />
        </CollapsibleSection>
      </div>
    </div>

        <!-- Results Section -->
        <div v-if="Object.keys(store.momentumData).length > 0" class="space-y-6">
          <!-- Momentum Results -->
          <CollapsibleSection
            title="Momentum Results"
            :default-open="sections.results"
            :badge="Object.keys(store.momentumData).length"
          >
            <template #description>
              Sorted by momentum ranking - showing performance across different time periods
            </template>

            <!-- Desktop Table View -->
            <div class="hidden lg:block">
              <table class="w-full">
                <thead class="bg-neutral-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Rank</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ticker</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Momentum</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200">
                  <tr
                    v-for="([ticker, data], index) in store.sortedMomentumData"
                    :key="ticker"
                    class="hover:bg-neutral-50 transition-colors group"
                    :class="[
                      data.absoluteMomentum && store.selectedTopETFs.includes(ticker)
                        ? 'bg-primary-50 border-l-4 border-primary-500'
                        : data.absoluteMomentum
                        ? 'bg-success-50'
                        : 'bg-error-50'
                    ]"
                  >
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {{ index + 1 }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center space-x-2">
                        <span class="text-sm font-semibold text-neutral-900">{{ ticker }}</span>
                        <span
                          v-if="store.selectedTopETFs.includes(ticker)"
                          class="text-xs px-2 py-1 rounded-full font-medium bg-primary-100 text-primary-800 border border-primary-200"
                        >
                          Top {{ store.selectedTopETFs.indexOf(ticker) + 1 }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate" :title="store.etfPrices[ticker]?.name || ticker">
                      {{ store.etfPrices[ticker]?.name || ticker }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      ${{ store.etfPrices[ticker]?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="relative group/momentum">
                        <span class="text-sm font-bold cursor-help" :class="data.average >= 0 ? 'text-success-600' : 'text-error-600'">
                          {{ data.average.toFixed(2) }}%
                        </span>
                        <!-- Period Returns Tooltip -->
                        <div class="absolute left-0 bottom-full mb-2 hidden group-hover/momentum:block bg-neutral-800 text-white text-xs rounded-lg p-3 shadow-lg z-10 min-w-[180px]">
                          <div class="font-medium mb-2">Period Returns</div>
                          <div class="space-y-1">
                            <div v-for="period in ['3month', '6month', '9month', '12month']" :key="period" class="flex justify-between">
                              <span>{{ period.replace('month', 'm') }}:</span>
                              <span class="font-medium">{{ data.periods[period as keyof typeof data.periods].toFixed(2) }}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="text-xs px-2 py-1 rounded-full font-medium"
                        :class="data.absoluteMomentum ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'"
                      >
                        {{ data.absoluteMomentum ? 'Positive' : 'Negative' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="lg:hidden p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="[ticker, data] in store.sortedMomentumData"
                  :key="ticker"
                  class="border-2 rounded-xl p-4 transition-all hover:shadow-card-hover"
                  :class="[
                    data.absoluteMomentum
                      ? store.selectedTopETFs.includes(ticker)
                        ? 'border-primary-500 bg-primary-50 shadow-md' // Highlighted positive momentum (chosen)
                        : 'border-success-200 bg-success-50' // Positive momentum (not chosen)
                      : 'border-error-200 bg-error-50', // Negative momentum
                    store.selectedTopETFs.includes(ticker) ? 'ring-2 ring-primary-200' : ''
                  ]"
                >
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center space-x-2">
                      <span class="font-semibold text-neutral-900">{{ ticker }}</span>
                      <span
                        v-if="store.selectedTopETFs.includes(ticker)"
                        class="text-xs px-2 py-1 rounded-full font-medium bg-primary-100 text-primary-800 border border-primary-200"
                      >
                        Top {{ store.selectedTopETFs.indexOf(ticker) + 1 }}
                      </span>
                    </div>
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
                  <!-- Price and Value Information -->
                  <div class="text-xs text-neutral-500 space-y-1.5 mb-3">
                    <div class="flex justify-between">
                      <span>Price:</span>
                      <span class="font-medium">${{ store.etfPrices[ticker]?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Name:</span>
                      <span class="font-medium truncate max-w-[120px]" :title="store.etfPrices[ticker]?.name || ticker">
                        {{ store.etfPrices[ticker]?.name || ticker }}
                      </span>
                    </div>
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
          </CollapsibleSection>

          <!-- Rebalancing Orders -->
          <CollapsibleSection
            title="Rebalancing Orders"
            :default-open="sections.results"
            badge="Actions"
          >
            <template #description>
              Recommended buy and sell orders based on momentum analysis
            </template>
            <RebalancingTable />
          </CollapsibleSection>
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
