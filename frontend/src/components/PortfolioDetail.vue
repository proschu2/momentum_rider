<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog.vue'
import { usePortfolioStore, type Portfolio } from '@/stores/portfolio'

const props = defineProps<{
  portfolioId: string
}>()

const emit = defineEmits<{
  close: []
  portfolioUpdated: [portfolioId: string]
  analyzePortfolio: [portfolioId: string]
}>()

const store = usePortfolioStore()

const portfolio = computed(() => store.portfolios[props.portfolioId])
const totalValue = computed(() => {
  if (!portfolio.value) return 0
  const holdingsValue = Object.values(portfolio.value.holdings).reduce((sum, holding) => sum + holding.value, 0)
  return holdingsValue + portfolio.value.additionalCash
})

// Form state
const showAddHolding = ref(false)
const newHolding = ref({
  ticker: '',
  shares: 0,
  price: 0
})
// Sell functionality state
const showSellDialog = ref(false)
const selectedHolding = ref<{ ticker: string; holding: any } | null>(null)
const sellShares = ref(0)

function updatePortfolio(updates: Partial<Portfolio>) {
  store.updatePortfolio(props.portfolioId, updates)
  emit('portfolioUpdated', props.portfolioId)
}

function closeDetail() {
  emit('close')
}

function saveAndAnalyze() {
  emit('analyzePortfolio', props.portfolioId)
}

async function addNewHolding() {
  if (newHolding.value.ticker && newHolding.value.shares > 0) {
    await store.addHoldingToPortfolio(
      props.portfolioId,
      newHolding.value.ticker.toUpperCase(),
      newHolding.value.shares,
      newHolding.value.price > 0 ? newHolding.value.price : undefined
    )
    // Reset form
    newHolding.value = { ticker: '', shares: 0, price: 0 }
    showAddHolding.value = false
  }
}

function removeHolding(ticker: string) {
  if (confirm(`Remove ${ticker} from portfolio?`)) {
    store.removeHoldingFromPortfolio(props.portfolioId, ticker)
  }
}

async function refreshPrices() {
  await store.refreshPortfolioPrices(props.portfolioId)
}

function getHoldingPercentage(holdingValue: number): string {
  if (totalValue.value === 0) return '0.0'
  return ((holdingValue / totalValue.value) * 100).toFixed(1)
}

function openSellDialog(ticker: string, holding: any) {
  selectedHolding.value = { ticker, holding }
  sellShares.value = holding.shares // Default to selling all shares
  showSellDialog.value = true
}

function confirmSell() {
  if (selectedHolding.value) {
    store.sellHoldingFromPortfolio(
      props.portfolioId,
      selectedHolding.value.ticker,
      sellShares.value
    )
    closeSellDialog()
  }
}

function closeSellDialog() {
  showSellDialog.value = false
  selectedHolding.value = null
  sellShares.value = 0
}

function getSellValue(): number {
  if (!selectedHolding.value) return 0
  return sellShares.value * selectedHolding.value.holding.price
}

function getSellConfirmationMessage(): string {
  if (!selectedHolding.value) return ''
  
  const { ticker, holding } = selectedHolding.value
  const isSellingAll = sellShares.value >= holding.shares
  const sellValue = getSellValue()
  
  if (isSellingAll) {
    return `Sell all ${holding.shares.toLocaleString()} shares of ${ticker} for $${sellValue.toLocaleString()}? The proceeds will be added to your cash balance.`
  } else {
    return `Sell ${sellShares.value.toLocaleString()} shares of ${ticker} for $${sellValue.toLocaleString()}? The proceeds will be added to your cash balance.`
  }
}
</script>

<template>
  <div class="portfolio-detail" v-if="portfolio">
    <!-- Portfolio Header -->
    <div class="detail-header">
      <div class="portfolio-info">
        <div class="portfolio-name-input-wrapper">
          <input
            v-model="portfolio.name"
            @input="updatePortfolio({ name: portfolio.name })"
            class="portfolio-name"
          />
          <div class="edit-icon-indicator" title="Portfolio name is editable">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>
        <div class="portfolio-total">${{ totalValue.toLocaleString() }}</div>
      </div>
      <div class="header-buttons">
        <button @click="saveAndAnalyze" class="analyze-btn">Analyze Portfolio</button>
        <button @click="closeDetail" class="close-btn">×</button>
      </div>
    </div>
    
    <!-- Holdings Summary -->
    <div class="holdings-summary">
      <div class="summary-item">
        <span class="label">Total Holdings:</span>
        <span class="value">{{ Object.keys(portfolio.holdings).length }}</span>
      </div>
      <div class="summary-item">
        <span class="label">Cash Available:</span>
        <span class="value">${{ portfolio.additionalCash.toLocaleString() }}</span>
      </div>
      <div class="summary-item">
        <span class="label">Total Value:</span>
        <span class="value">${{ totalValue.toLocaleString() }}</span>
      </div>
    </div>
    
    <!-- Holdings List with Percentages -->
    <div class="holdings-section">
      <div class="section-header">
        <h4>Current Holdings</h4>
        <div class="header-actions">
          <button @click="refreshPrices" class="refresh-btn" title="Refresh Prices">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button @click="showAddHolding = true" class="add-holding-btn">+ Add Holding</button>
        </div>
      </div>
      
      <!-- Add Holding Form -->
      <div v-if="showAddHolding" class="add-holding-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Ticker</label>
            <input
              v-model="newHolding.ticker"
              type="text"
              placeholder="e.g., VTI"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Shares</label>
            <input
              v-model.number="newHolding.shares"
              type="number"
              step="0.001"
              min="0"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Price ($) <span class="optional">(optional)</span></label>
            <input
              v-model.number="newHolding.price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Auto-fetch"
              class="form-input"
            />
          </div>
        </div>
        <div class="form-actions">
          <button @click="showAddHolding = false" class="cancel-btn">Cancel</button>
          <button 
            @click="addNewHolding" 
            :disabled="!newHolding.ticker || newHolding.shares <= 0"
            class="add-btn"
          >
            Add
          </button>
        </div>
      </div>
      
      <!-- Holdings List -->
      <div v-if="Object.keys(portfolio.holdings).length > 0" class="holdings-list">
        <div 
          v-for="[ticker, holding] in Object.entries(portfolio.holdings)" 
          :key="ticker" 
          class="holding-item"
        >
          <div class="holding-main">
            <div class="holding-info">
              <span class="ticker">{{ ticker }}</span>
              <span class="percentage">{{ getHoldingPercentage(holding.value) }}%</span>
            </div>
            <div class="holding-details">
              <span class="shares">{{ holding.shares.toLocaleString() }} shares @ ${{ holding.price.toFixed(2) }}</span>
              <span class="value">${{ holding.value.toLocaleString() }}</span>
            </div>
          </div>
          <div class="holding-actions">
            <button @click="openSellDialog(ticker, holding)" class="sell-btn" title="Sell Holding">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v2m0-4V3m0 4H9m3 0h3m-3 0h.01M12 12v.01M8 12h.01M12 16v.01M12 8h.01" />
              </svg>
            </button>
            <button @click="removeHolding(ticker)" class="remove-btn" title="Remove Holding">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-holdings">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3>No holdings yet</h3>
        <p>Add your first holding to get started with portfolio analysis.</p>
      </div>
    </div>
    
    <!-- Cash Management -->
    <div class="cash-section">
      <label class="cash-label">Additional Cash to Invest ($)</label>
      <div class="cash-input-group">
        <input 
          v-model.number="portfolio.additionalCash" 
          @input="updatePortfolio({ additionalCash: portfolio.additionalCash })"
          type="number" 
          min="0" 
          step="100" 
          class="cash-input"
        />
        <span class="cash-help">Extra cash available for investment strategies</span>
      </div>
    </div>
    
    <!-- Sell Confirmation Dialog -->
    <ConfirmationDialog
      v-model="showSellDialog"
      title="Sell Holding"
      :message="getSellConfirmationMessage()"
      confirm-text="Sell"
      cancel-text="Cancel"
      variant="warning"
      @confirm="confirmSell"
      @cancel="closeSellDialog"
    >
      <template #default>
        <div v-if="selectedHolding" class="sell-details">
          <div class="form-group">
            <label>Shares to Sell</label>
            <input
              v-model.number="sellShares"
              type="number"
              :max="selectedHolding.holding.shares"
              min="0.001"
              step="0.001"
              class="form-input"
            />
            <div class="sell-info">
              <span>Available: {{ selectedHolding.holding.shares.toLocaleString() }} shares</span>
              <span>Value: ${{ getSellValue().toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </template>
    </ConfirmationDialog>
  </div>
</template>

<style scoped>
.portfolio-detail {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.portfolio-info {
  flex: 1;
}

.portfolio-name-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  max-width: 400px;
}

.portfolio-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  border: 1px solid transparent;
  background: transparent;
  padding: 4px 8px;
  border-radius: 6px;
  width: 100%;
  flex: 1;
  transition: border-color 0.2s ease;
}

.portfolio-name:hover {
  border-color: #e5e7eb;
}

.portfolio-name:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.portfolio-name:focus ~ .edit-icon-indicator {
  color: #3b82f6;
}

.edit-icon-indicator {
  color: #9ca3af;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.edit-icon-indicator svg {
  width: 18px;
  height: 18px;
}

.portfolio-total {
  font-size: 2rem;
  font-weight: 800;
  color: #059669;
}

.analyze-btn {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.analyze-btn:hover {
  background: #059669;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.holdings-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.summary-item {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.summary-item .label {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.summary-item .value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.holdings-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.refresh-btn:hover {
  background: #f3f4f6;
}

.refresh-btn svg {
  width: 16px;
  height: 16px;
}

.add-holding-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.add-holding-btn:hover {
  background: #2563eb;
}

.add-holding-form {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.optional {
  color: #9ca3af;
  font-weight: 400;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-color: #3b82f6;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.add-btn {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.add-btn:hover:not(:disabled) {
  background: #059669;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.holdings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.holding-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.holding-item:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
}

.holding-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.holding-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ticker {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.percentage {
  font-size: 0.875rem;
  font-weight: 500;
  color: #059669;
  background: #ecfdf5;
  padding: 4px 8px;
  border-radius: 12px;
}

.holding-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.shares {
  font-size: 0.875rem;
  color: #6b7280;
}

.value {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.holding-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}

.sell-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #fef3c7;
  border-radius: 6px;
  color: #d97706;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.sell-btn:hover {
  background: #fde68a;
  color: #b45309;
}

.sell-btn svg {
  width: 16px;
  height: 16px;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #fef2f2;
  border-radius: 6px;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #fee2e2;
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

.empty-holdings {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: #d1d5db;
}

.empty-holdings h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
}

.cash-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.cash-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.cash-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cash-input {
  flex: 1;
  max-width: 300px;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.cash-input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-color: #3b82f6;
}

.cash-help {
  font-size: 0.875rem;
  color: #6b7280;
}

.sell-details {
  margin-top: 16px;
}

.sell-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Responsive Design */
@media (max-width: 768px) {
  .portfolio-detail {
    padding: 20px;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .portfolio-name-input-wrapper {
    max-width: 100%;
  }
  
  .holdings-summary {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .holding-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .cash-input-group {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .cash-input {
    max-width: 100%;
  }
}
</style>