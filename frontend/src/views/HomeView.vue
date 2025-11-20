<template>
  <div class="home-view">
    <!-- Portfolio Summary when no portfolios exist -->
    <PortfolioSummaryCard
      v-if="!hasPortfolios"
      @create-portfolio="handleCreatePortfolio"
    />
    
    <!-- Portfolio Selection View -->
    <PortfolioSelector
      v-else-if="showPortfolioSelector"
      @portfolio-selected="handlePortfolioSelection"
      @create-portfolio="handleCreatePortfolio"
      @edit-portfolio="handleEditPortfolio"
    />
    
    <!-- Portfolio Detail View -->
    <PortfolioDetail
      v-else-if="showPortfolioDetail && selectedPortfolioId"
      :portfolio-id="selectedPortfolioId"
      @close="closePortfolioDetail"
      @portfolio-updated="handlePortfolioUpdated"
      @analyze-portfolio="handleAnalyzePortfolio"
    />
    
    <!-- Strategy Hub with Selected Portfolio -->
    <StrategyHub
      v-else-if="selectedPortfolio"
      :portfolio="selectedPortfolio"
      @back-to-portfolios="backToPortfolios"
    />
    
    <!-- Floating Action Button -->
    <button
      v-if="hasPortfolios && !selectedPortfolioId"
      @click="showSelector"
      class="floating-action-btn"
      title="Portfolio Manager"
    >
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio'
import PortfolioSelector from '@/components/PortfolioSelector.vue'
import PortfolioDetail from '@/components/PortfolioDetail.vue'
import PortfolioSummaryCard from '@/components/PortfolioSummaryCard.vue'
import StrategyHub from '@/components/StrategyHub.vue'

const store = usePortfolioStore()

const selectedPortfolioId = ref<string | null>(null)
const showPortfolioDetail = ref(false)
const showPortfolioSelector = ref(false)

const selectedPortfolio = computed(() =>
  selectedPortfolioId.value ? store.portfolios[selectedPortfolioId.value] : null
)

const hasPortfolios = computed(() => Object.keys(store.portfolios).length > 0)

function handlePortfolioSelection(portfolioId: string) {
  selectedPortfolioId.value = portfolioId
  store.selectPortfolio(portfolioId)
  showPortfolioSelector.value = false
}

function handlePortfolioUpdated(portfolioId: string) {
  // Portfolio was updated, refresh store reference
  console.log('Portfolio updated:', portfolioId)
}

function backToPortfolios() {
  selectedPortfolioId.value = null
  showPortfolioDetail.value = false
  showPortfolioSelector.value = true
}

function showSelector() {
  showPortfolioSelector.value = true
}

function handleCreatePortfolio() {
  const portfolioId = store.createPortfolio()
  selectedPortfolioId.value = portfolioId
  showPortfolioDetail.value = true
  showPortfolioSelector.value = false
}

function handleEditPortfolio(portfolioId: string) {
  selectedPortfolioId.value = portfolioId
  showPortfolioDetail.value = true
  showPortfolioSelector.value = false
}

function closePortfolioDetail() {
  showPortfolioDetail.value = false
  selectedPortfolioId.value = null
  // Show portfolio selector if there are portfolios
  if (hasPortfolios.value) {
    showPortfolioSelector.value = true
  }
}

function handleAnalyzePortfolio(portfolioId: string) {
  selectedPortfolioId.value = portfolioId
  store.selectPortfolio(portfolioId)
  showPortfolioDetail.value = false
  // Now selectedPortfolio computed will show StrategyHub
}

// Initialize with active portfolio if it exists
if (store.activePortfolioId) {
  selectedPortfolioId.value = store.activePortfolioId
} else if (hasPortfolios.value) {
  // Show portfolio selector if there are portfolios but none active
  showPortfolioSelector.value = true
}
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: #f9fafb;
}

.floating-action-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  border: none;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1000;
}

.floating-action-btn:hover {
  background: #2563eb;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.floating-action-btn svg {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .floating-action-btn {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }
  
  .floating-action-btn svg {
    width: 20px;
    height: 20px;
  }
}
</style>