<template>
  <div class="strategy-builder-wizard">
    <!-- Wizard Header -->
    <div class="wizard-header">
      <h2>Portfolio Strategy Builder</h2>
      <div class="wizard-progress">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          :class="['progress-step', { active: currentStep === index, completed: currentStep > index }]"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
    </div>

    <!-- Wizard Content -->
    <div class="wizard-content">
      <!-- Step 1: Strategy Type -->
      <div v-if="currentStep === 0" class="step-container">
        <h3>Choose Strategy Type</h3>
        <div class="strategy-options">
          <div
            v-for="strategy in strategyTypes"
            :key="strategy.id"
            :class="['strategy-card', { selected: selectedStrategy === strategy.id }]"
            @click="selectStrategy(strategy.id)"
          >
            <div class="strategy-icon">{{ strategy.icon }}</div>
            <h4>{{ strategy.name }}</h4>
            <p>{{ strategy.description }}</p>
          </div>
        </div>
      </div>

      <!-- Step 2: ETF Selection -->
      <div v-if="currentStep === 1" class="step-container">
        <h3>Select ETFs</h3>
        <div class="etf-selection">
          <div class="etf-categories">
            <div
              v-for="category in etfCategories"
              :key="category.name"
              class="category-section"
            >
              <h4>{{ category.name }}</h4>
              <div class="etf-list">
                <div
                  v-for="etf in category.etfs"
                  :key="etf.ticker"
                  :class="['etf-item', { selected: selectedETFs.includes(etf.ticker) }]"
                  @click="toggleETF(etf.ticker)"
                >
                  <span class="etf-ticker">{{ etf.ticker }}</span>
                  <span class="etf-name">{{ etf.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Allocation Setup -->
      <div v-if="currentStep === 2" class="step-container">
        <h3>Set Allocations</h3>
        <div class="allocation-setup">
          <div
            v-for="etf in selectedETFs"
            :key="etf"
            class="allocation-item"
          >
            <div class="etf-info">
              <span class="ticker">{{ etf }}</span>
              <span class="allocation-percentage">{{ allocations[etf] || 0 }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              :value="allocations[etf] || 0"
              @input="updateAllocation(etf, $event.target.value)"
              class="allocation-slider"
            />
          </div>
          <div class="allocation-summary">
            <div :class="['total-percentage', { valid: totalAllocation === 100, invalid: totalAllocation !== 100 }]">
              Total: {{ totalAllocation }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Review & Save -->
      <div v-if="currentStep === 3" class="step-container">
        <h3>Review Strategy</h3>
        <div class="strategy-review">
          <div class="strategy-summary">
            <h4>Strategy Summary</h4>
            <div class="summary-item">
              <strong>Type:</strong> {{ getStrategyName(selectedStrategy) }}
            </div>
            <div class="summary-item">
              <strong>ETFs Selected:</strong> {{ selectedETFs.length }}
            </div>
            <div class="allocations-list">
              <h5>Allocations:</h5>
              <div
                v-for="etf in selectedETFs"
                :key="etf"
                class="allocation-item"
              >
                {{ etf }}: {{ allocations[etf] || 0 }}%
              </div>
            </div>
          </div>
          <div class="strategy-name-input">
            <label for="strategyName">Strategy Name:</label>
            <input
              id="strategyName"
              v-model="strategyName"
              placeholder="e.g., My Custom Portfolio"
              class="name-input"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Wizard Navigation -->
    <div class="wizard-navigation">
      <button
        v-if="currentStep > 0"
        @click="previousStep"
        class="btn btn-secondary"
      >
        Back
      </button>
      <button
        v-if="currentStep < steps.length - 1"
        @click="nextStep"
        :disabled="!canProceed"
        class="btn btn-primary"
      >
        Next
      </button>
      <button
        v-if="currentStep === steps.length - 1"
        @click="saveStrategy"
        :disabled="!canSave"
        class="btn btn-success"
      >
        Save Strategy
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Wizard state
const currentStep = ref(0)
const selectedStrategy = ref('')
const selectedETFs = ref<string[]>([])
const allocations = ref<Record<string, number>>({})
const strategyName = ref('')

// Mock data for demonstration
const steps = [
  { id: 'strategy-type', label: 'Strategy Type' },
  { id: 'etf-selection', label: 'ETF Selection' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'review', label: 'Review' }
]

const strategyTypes = [
  { id: 'momentum', name: 'Momentum Strategy', description: 'Allocate based on momentum scores', icon: '📈' },
  { id: 'sma', name: 'SMA Strategy', description: '200-day moving average trend following', icon: '📊' },
  { id: 'custom', name: 'Custom Allocation', description: 'Set your own percentage allocations', icon: '🎯' }
]

const etfCategories = [
  {
    name: 'Stocks',
    etfs: [
      { ticker: 'VTI', name: 'Vanguard Total Stock Market' },
      { ticker: 'VEA', name: 'Vanguard Developed Markets' },
      { ticker: 'VWO', name: 'Vanguard Emerging Markets' }
    ]
  },
  {
    name: 'Bonds',
    etfs: [
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
      { ticker: 'BND', name: 'Vanguard Total Bond Market' }
    ]
  }
]

// Computed properties
const totalAllocation = computed(() => {
  return Object.values(allocations.value).reduce((sum, val) => sum + val, 0)
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0: return selectedStrategy.value !== ''
    case 1: return selectedETFs.value.length > 0
    case 2: return totalAllocation.value === 100
    default: return true
  }
})

const canSave = computed(() => {
  return strategyName.value.trim() !== '' && totalAllocation.value === 100
})

// Methods
const selectStrategy = (strategyId: string) => {
  selectedStrategy.value = strategyId
}

const toggleETF = (ticker: string) => {
  const index = selectedETFs.value.indexOf(ticker)
  if (index > -1) {
    selectedETFs.value.splice(index, 1)
    delete allocations.value[ticker]
  } else {
    selectedETFs.value.push(ticker)
    allocations.value[ticker] = 0
  }
}

const updateAllocation = (ticker: string, value: string) => {
  allocations.value[ticker] = parseInt(value)
}

const getStrategyName = (strategyId: string) => {
  const strategy = strategyTypes.find(s => s.id === strategyId)
  return strategy ? strategy.name : ''
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const saveStrategy = () => {
  // TODO: Implement actual save logic
  console.log('Saving strategy:', {
    name: strategyName.value,
    type: selectedStrategy.value,
    etfs: selectedETFs.value,
    allocations: allocations.value
  })
  alert('Strategy saved successfully!')
}

// Initialize
onMounted(() => {
  // Mock initialization
})
</script>

<style scoped>
.strategy-builder-wizard {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.wizard-header {
  text-align: center;
  margin-bottom: 30px;
}

.wizard-progress {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.progress-step.active {
  opacity: 1;
}

.progress-step.completed {
  opacity: 0.8;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.progress-step.active .step-number {
  background: #007bff;
  color: white;
}

.step-label {
  font-size: 0.9em;
  color: #666;
}

.step-container {
  min-height: 400px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 20px;
}

.strategy-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.strategy-card {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.strategy-card:hover {
  border-color: #007bff;
}

.strategy-card.selected {
  border-color: #007bff;
  background: #f8f9ff;
}

.strategy-icon {
  font-size: 2em;
  margin-bottom: 10px;
}

.etf-selection {
  max-height: 400px;
  overflow-y: auto;
}

.category-section {
  margin-bottom: 25px;
}

.etf-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.etf-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.etf-item:hover {
  border-color: #007bff;
}

.etf-item.selected {
  border-color: #007bff;
  background: #f8f9ff;
}

.etf-ticker {
  font-weight: bold;
  font-size: 1.1em;
}

.etf-name {
  font-size: 0.9em;
  color: #666;
}

.allocation-item {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.etf-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.allocation-slider {
  width: 100%;
}

.allocation-summary {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.total-percentage.valid {
  color: #28a745;
  font-weight: bold;
}

.total-percentage.invalid {
  color: #dc3545;
  font-weight: bold;
}

.strategy-review {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.strategy-summary {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.summary-item {
  margin-bottom: 10px;
}

.allocations-list {
  margin-top: 15px;
}

.strategy-name-input {
  margin-top: 20px;
}

.name-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-top: 5px;
}

.wizard-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}
</style>