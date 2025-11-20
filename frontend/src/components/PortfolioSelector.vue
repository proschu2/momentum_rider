<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore, type Portfolio } from '@/stores/portfolio'

const emit = defineEmits<{
  portfolioSelected: [portfolioId: string]
  createPortfolio: []
  editPortfolio: [portfolioId: string]
}>()

const store = usePortfolioStore()

const portfolios = computed(() => Object.values(store.portfolios))
const activePortfolioId = computed(() => store.activePortfolioId)

function selectPortfolio(portfolioId: string) {
  store.selectPortfolio(portfolioId)
  emit('portfolioSelected', portfolioId)
}

function createPortfolio() {
  emit('createPortfolio')}

function editPortfolio(portfolioId: string) {
  emit('editPortfolio', portfolioId)
}

function deletePortfolio(portfolioId: string) {
  if (confirm('Are you sure you want to delete this portfolio?')) {
    store.deletePortfolio(portfolioId)
  }
}

function calculateTotalValue(portfolio: Portfolio): number {
  const holdingsValue = Object.values(portfolio.holdings).reduce((sum, holding) => sum + holding.value, 0)
  return holdingsValue + portfolio.additionalCash
}
</script>

<template>
  <div class="portfolio-selector">
    <div class="selector-header">
      <h2 class="selector-title">Select Portfolio</h2>
      <p class="selector-subtitle">Choose a portfolio to analyze with different strategies</p>
    </div>

    <div class="portfolio-grid">
      <!-- Existing Portfolio Cards -->
      <div 
        v-for="portfolio in portfolios" 
        :key="portfolio.id"
        :class="['portfolio-card', { active: portfolio.id === activePortfolioId }]"
        @click="selectPortfolio(portfolio.id)"
      >
        <div class="portfolio-header">
          <div class="portfolio-name-wrapper">
            <h3 class="portfolio-name">{{ portfolio.name }}</h3>
            <div class="edit-indicator" title="Click to edit portfolio name" @click.stop="editPortfolio(portfolio.id)">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div class="portfolio-value">${{ calculateTotalValue(portfolio).toLocaleString() }}</div>
        </div>
        
        <div class="portfolio-preview">
          <div class="holdings-summary">
            <svg class="summary-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {{ Object.keys(portfolio.holdings).length }} holdings
          </div>
          <div class="cash-summary">
            <svg class="summary-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v2m0-4V3m0 4H9m3 0h3m-3 0h.01M12 12v.01M8 12h.01M12 16v.01M12 8h.01" />
            </svg>
            ${{ portfolio.additionalCash.toLocaleString() }} cash
          </div>
        </div>
        
        <div class="portfolio-actions">
          <button @click.stop="editPortfolio(portfolio.id)" class="action-btn edit-btn" title="Edit Portfolio">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button @click.stop="deletePortfolio(portfolio.id)" class="action-btn delete-btn" title="Delete Portfolio">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Add New Portfolio Card -->
      <div class="portfolio-card add-portfolio" @click="createPortfolio">
        <div class="add-content">
          <div class="add-icon">+</div>
          <div class="add-text">Add Portfolio</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-selector {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.selector-header {
  text-align: center;
  margin-bottom: 40px;
}

.selector-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.selector-subtitle {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0;
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.portfolio-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.portfolio-card:hover {
  border-color: #3b82f6;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.portfolio-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.portfolio-header {
  margin-bottom: 16px;
}

.portfolio-name-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.portfolio-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  position: relative;
  padding-bottom: 2px;
}

.portfolio-name::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #3b82f6;
  transition: width 0.2s ease;
}

.portfolio-card:hover .portfolio-name::after {
  width: 100%;
}

.edit-indicator {
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
}

.portfolio-card:hover .edit-indicator {
  opacity: 1;
}

.edit-indicator:hover {
  color: #3b82f6;
}

.edit-indicator svg {
  width: 16px;
  height: 16px;
}

.portfolio-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #059669;
}

.portfolio-preview {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.holdings-summary,
.cash-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #6b7280;
}

.summary-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.portfolio-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.edit-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.edit-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.add-portfolio {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border: 2px dashed #d1d5db;
  background: #f9fafb;
}

.add-portfolio:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.add-content {
  text-align: center;
}

.add-icon {
  font-size: 3rem;
  font-weight: 300;
  color: #6b7280;
  margin-bottom: 8px;
  line-height: 1;
}

.add-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #374151;
}

/* Responsive Design */
@media (max-width: 768px) {
  .portfolio-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .selector-title {
    font-size: 1.5rem;
  }
  
  .portfolio-card {
    padding: 20px;
  }
  
  .portfolio-preview {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .portfolio-selector {
    padding: 16px;
  }
  
  .portfolio-value {
    font-size: 1.25rem;
  }
}
</style>