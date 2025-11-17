# Portfolio Optimization System Architecture

## System Overview

Extend the existing Momentum Rider architecture to support custom ETFs, flexible allocation strategies, and additional technical indicators while maintaining performance and scalability.

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend API   │    │  Data Sources   │
│  (Vue.js SPA)   │    │  (Node.js/Express)│    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • CustomETF     │    │ • CustomETF      │    │ • Yahoo Finance │
│   Manager       │◄───┤   Service        │◄───┤   API           │
│ • Strategy      │    │ • Strategy       │    │                 │
│   Builder       │    │   Service        │    │ • Redis Cache   │
│ • Portfolio     │    │ • SMAService     │    │                 │
│   Configurator  │    │ • Portfolio      │    │ • File Storage  │
│ • Comparison    │    │   ConfigService  │    │   (Portfolios)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Backend Architecture

### Service Layer Extensions

#### 1. CustomETFService
```javascript
class CustomETFService {
  async addCustomETF(ticker, metadata) {
    // Validate ticker with Yahoo Finance
    // Store metadata in persistent storage
    // Update ETF universe cache
  }

  async getCustomETFs() {
    // Retrieve custom ETF list
  }

  async validateETF(ticker) {
    // Check if ticker exists and has sufficient data
  }
}
```

#### 2. StrategyService
```javascript
class StrategyService {
  async configureStrategy(config) {
    // Save strategy configuration
  }

  async calculateAllocation(portfolio, strategy) {
    // Apply allocation strategy to portfolio
  }

  async getAvailableStrategies() {
    // Return list of available strategies
  }
}
```

#### 3. SMAService
```javascript
class SMAService {
  async calculateSMA(ticker, period = 200) {
    // Calculate Simple Moving Average
  }

  async getTrendSignal(ticker) {
    // Determine trend based on price vs SMA
  }

  async getSMACrossovers(ticker) {
    // Detect SMA crossover events
  }
}
```

#### 4. PortfolioConfigService
```javascript
class PortfolioConfigService {
  async savePortfolio(config) {
    // Save portfolio configuration
  }

  async loadPortfolio(portfolioId) {
    // Load portfolio configuration
  }

  async listPortfolios() {
    // List available portfolio templates
  }
}
```

### API Endpoint Extensions

#### Custom ETF Management
```
POST /api/etfs/custom
GET /api/etfs/custom
DELETE /api/etfs/custom/:ticker
GET /api/etfs/validate/:ticker
```

#### Strategy Configuration
```
POST /api/strategies
GET /api/strategies
GET /api/strategies/:strategyId
PUT /api/strategies/:strategyId
```

#### SMA Calculations
```
GET /api/strategies/sma/:ticker
GET /api/strategies/sma/signal/:ticker
POST /api/strategies/sma/batch
```

#### Portfolio Management
```
POST /api/portfolios
GET /api/portfolios
GET /api/portfolios/:portfolioId
PUT /api/portfolios/:portfolioId
```

## Frontend Architecture

### Component Structure

#### New Components

**CustomETFManager.vue**
```vue
<template>
  <div class="custom-etf-manager">
    <etf-search @add-etf="handleAddETF" />
    <etf-list :etfs="customETFs" @remove-etf="handleRemoveETF" />
    <etf-validation :validation-results="validationResults" />
  </div>
</template>
```

**StrategyBuilder.vue**
```vue
<template>
  <div class="strategy-builder">
    <strategy-type-selector v-model="strategyType" />
    <allocation-config :strategy="currentStrategy" />
    <strategy-parameters :params="strategyParams" />
    <strategy-preview :allocation="previewAllocation" />
  </div>
</template>
```

**PortfolioConfigurator.vue**
```vue
<template>
  <div class="portfolio-configurator">
    <portfolio-basics v-model="portfolioConfig" />
    <etf-universe-selector :selected-etfs="selectedETFs" />
    <strategy-selector :strategies="availableStrategies" />
    <portfolio-summary :config="portfolioConfig" />
  </div>
</template>
```

### State Management Extensions

#### Enhanced Stores

**etf-config.ts** (Extended)
```typescript
export const useETFConfigStore = defineStore('etf-config', () => {
  const customETFs = ref<CustomETF[]>([])
  const etfCategories = ref<ETFCategory[]>([])

  const addCustomETF = async (ticker: string, metadata: ETFMetadata) => {
    // Add custom ETF to universe
  }

  const validateETF = async (ticker: string) => {
    // Validate ETF availability
  }

  return { customETFs, etfCategories, addCustomETF, validateETF }
})
```

**New: strategy-store.ts**
```typescript
export const useStrategyStore = defineStore('strategy', () => {
  const currentStrategy = ref<AllocationStrategy>(null)
  const availableStrategies = ref<StrategyDefinition[]>([])
  const strategyParameters = ref<StrategyParams>({})

  const configureStrategy = async (config: StrategyConfig) => {
    // Configure allocation strategy
  }

  const calculateAllocation = async (portfolio: Portfolio) => {
    // Calculate allocation based on strategy
  }

  return { currentStrategy, availableStrategies, strategyParameters, configureStrategy, calculateAllocation }
})
```

**New: portfolio-store.ts**
```typescript
export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolioTemplates = ref<PortfolioTemplate[]>([])
  const currentPortfolio = ref<PortfolioConfig>(null)

  const savePortfolio = async (config: PortfolioConfig) => {
    // Save portfolio configuration
  }

  const loadPortfolio = async (portfolioId: string) => {
    // Load portfolio configuration
  }

  return { portfolioTemplates, currentPortfolio, savePortfolio, loadPortfolio }
})
```

## Data Storage Architecture

### Custom ETF Storage
```typescript
interface CustomETF {
  ticker: string
  name: string
  category: string
  expenseRatio: number
  inceptionDate: string
  addedDate: string
  isValid: boolean
  lastValidation: string
}
```

### Strategy Configuration Storage
```typescript
interface AllocationStrategy {
  id: string
  name: string
  type: 'percentage' | 'momentum' | 'sma' | 'hybrid'
  parameters: StrategyParameters
  created: string
  updated: string
}

interface StrategyParameters {
  // Percentage allocation
  allocations?: { [ticker: string]: number }

  // Momentum allocation
  topN?: number
  momentumThreshold?: number

  // SMA allocation
  smaPeriod?: number
  trendThreshold?: number

  // Hybrid parameters
  strategyWeights?: { [strategy: string]: number }
}
```

### Portfolio Configuration Storage
```typescript
interface PortfolioConfig {
  id: string
  name: string
  description: string
  etfUniverse: string[]
  allocationStrategy: string
  strategyParameters: StrategyParameters
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  rebalancingFrequency: 'weekly' | 'monthly' | 'quarterly'
  created: string
  updated: string
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. **Custom ETF Support**
   - Backend: CustomETFService implementation
   - Frontend: CustomETFManager component
   - Storage: Custom ETF persistence

2. **Basic Allocation Strategies**
   - Percentage-based allocation
   - Momentum-ranked allocation
   - Strategy configuration API

### Phase 2: Advanced Strategies (Week 3-4)
1. **200 SMA Strategy**
   - SMAService implementation
   - Trend signal calculation
   - SMA-based allocation

2. **Hybrid Strategies**
   - Strategy combination logic
   - Weighted strategy allocation
   - Strategy performance metrics

### Phase 3: Portfolio Management (Week 5-6)
1. **Portfolio Configuration**
   - Portfolio templates
   - Configuration persistence
   - Portfolio comparison

2. **Enhanced UI/UX**
   - Strategy builder interface
   - Portfolio configurator
   - Performance visualization

## Performance Considerations

### Caching Strategy
- **Custom ETF Data**: Cache validation results (24h TTL)
- **Strategy Calculations**: Cache allocation results (1h TTL)
- **SMA Calculations**: Cache SMA values (4h TTL)
- **Portfolio Configs**: Cache loaded configurations

### Data Validation
- **Async Validation**: Validate custom ETFs in background
- **Graceful Degradation**: Handle unavailable ETFs
- **Data Quality**: Monitor data completeness and accuracy

### Scalability
- **Database Optimization**: Index custom ETF collections
- **API Rate Limiting**: Protect external API calls
- **Background Processing**: Offload heavy calculations

## Security Considerations

- **Input Validation**: Sanitize all user inputs
- **Authorization**: Portfolio access controls
- **Data Privacy**: Secure storage of portfolio configurations
- **API Security**: Rate limiting and request validation

## Monitoring and Logging

- **Performance Metrics**: API response times, cache hit rates
- **Error Tracking**: Failed validations, data fetch errors
- **User Analytics**: Strategy usage, portfolio creation patterns
- **System Health**: Service availability, data source status