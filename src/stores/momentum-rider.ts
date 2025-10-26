import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeAPI, type MomentumResult } from '@/services/finance-api'

export interface Holding {
  shares: number
  price: number
  value: number
  name?: string
  currentPrice?: number
}

export interface MomentumData {
  [ticker: string]: {
    periods: {
      '3month': number
      '6month': number
      '9month': number
      '12month': number
    }
    average: number
    absoluteMomentum: boolean
    error?: string
  }
}

export interface RebalancingOrder {
  ticker: string
  action: 'BUY' | 'SELL' | 'HOLD'
  shares: number
  targetValue: number
  currentValue: number
  difference: number
}

export const useMomentumRiderStore = defineStore('momentumRider', () => {
  // ETF Universe Configuration
  const etfUniverse = ref({
    STOCKS: ['VTI', 'VEA', 'VWO'],
    BONDS: ['TLT', 'BWX', 'BND'],
    COMMODITIES: ['PDBC'],
    ALTERNATIVES: ['SGOL', 'IBIT']
  })

  // Load portfolio from localStorage on initialization
  const loadPortfolioFromStorage = () => {
    try {
      const savedHoldings = localStorage.getItem('momentumRider_portfolio')
      const savedAdditionalCash = localStorage.getItem('momentumRider_additionalCash')

      if (savedHoldings) {
        currentHoldings.value = JSON.parse(savedHoldings)
      }
      if (savedAdditionalCash) {
        additionalCash.value = JSON.parse(savedAdditionalCash)
      }
    } catch (error) {
      console.warn('Failed to load portfolio from localStorage:', error)
    }
  }

  // Save portfolio to localStorage
  const savePortfolioToStorage = () => {
    try {
      localStorage.setItem('momentumRider_portfolio', JSON.stringify(currentHoldings.value))
      localStorage.setItem('momentumRider_additionalCash', JSON.stringify(additionalCash.value))
    } catch (error) {
      console.warn('Failed to save portfolio to localStorage:', error)
    }
  }

  // Selected ETFs - all selected by default
  const selectedETFs = ref<string[]>([...Object.values(etfUniverse.value).flat()])
  
  // Category Toggles
  const enabledCategories = ref({
    STOCKS: true,
    BONDS: true,
    COMMODITIES: true,
    ALTERNATIVES: true
  })

  // Strategy Parameters
  const topAssets = ref(4)
  const bitcoinAllocation = ref(4.0)
  const rebalancingFrequency = ref<'monthly' | 'quarterly'>('monthly')
  const momentumPeriods = ref([3, 6, 9, 12])

  // Current Holdings
  const currentHoldings = ref<{ [ticker: string]: Holding }>({})

  // Additional Investment
  const additionalCash = ref(0)
  const allocationMethod = ref<'Proportional' | 'Underweight Only'>('Proportional')

  // Load portfolio from localStorage on store initialization
  loadPortfolioFromStorage()

  // Momentum Data
  const momentumData = ref<MomentumData>({})

  // ETF Price Data
  const etfPrices = ref<{ [ticker: string]: { price: number; name: string } }>({})

  // Rebalancing Orders
  const rebalancingOrders = ref<RebalancingOrder[]>([])

  // Loading States
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed Properties - Optimized with caching
  const totalPortfolioValue = computed(() => {
    const holdingsValue = Object.values(currentHoldings.value).reduce((sum, holding) => sum + holding.value, 0)
    return holdingsValue + additionalCash.value
  })

  const availableETFs = computed(() => {
    const etfs: string[] = []
    Object.entries(etfUniverse.value).forEach(([category, tickers]) => {
      if (enabledCategories.value[category as keyof typeof enabledCategories.value]) {
        etfs.push(...tickers)
      }
    })
    return etfs
  })

  const selectedETFsWithCategories = computed(() => {
    const result: { [category: string]: string[] } = {}
    Object.entries(etfUniverse.value).forEach(([category, tickers]) => {
      const categoryETFs = tickers.filter(ticker => selectedETFs.value.includes(ticker))
      if (categoryETFs.length > 0) {
        result[category] = categoryETFs
      }
    })
    return result
  })

  const sortedMomentumData = computed(() => {
    return Object.entries(momentumData.value)
      .sort(([_, a], [__, b]) => b.average - a.average) // Sort by average momentum (highest to lowest)
  })

  const selectedTopETFs = computed(() => {
    return Object.entries(momentumData.value)
      .filter(([_, data]) => data.absoluteMomentum)
      .sort(([_, a], [__, b]) => b.average - a.average)
      .slice(0, topAssets.value)
      .map(([ticker]) => ticker)
  })

  // Actions
  function toggleCategory(category: keyof typeof enabledCategories.value) {
    const newState = !enabledCategories.value[category]
    enabledCategories.value[category] = newState

    // Select or deselect all ETFs in this category
    const categoryETFs = etfUniverse.value[category as keyof typeof etfUniverse.value]
    if (newState) {
      // Add all ETFs from this category to selectedETFs
      categoryETFs.forEach(etf => {
        if (!selectedETFs.value.includes(etf)) {
          selectedETFs.value.push(etf)
        }
      })
    } else {
      // Remove all ETFs from this category from selectedETFs
      selectedETFs.value = selectedETFs.value.filter(etf => !categoryETFs.includes(etf))
    }
  }

  function updateSelectedETFs() {
    selectedETFs.value = availableETFs.value.filter(etf => selectedETFs.value.includes(etf))
  }

  async function addHolding(ticker: string, shares: number, price?: number) {
    try {
      // Fetch current quote data
      const quoteData = await financeAPI.getCurrentQuote(ticker)

      const currentPrice = quoteData.regularMarketPrice || quoteData.price || price || 1
      const name = quoteData.longName || quoteData.shortName || ticker

      currentHoldings.value[ticker] = {
        shares,
        price: currentPrice, // Use current price from API
        value: shares * currentPrice,
        name,
        currentPrice
      }

      savePortfolioToStorage()
    } catch (error) {
      console.warn(`Failed to fetch quote for ${ticker}:`, error)
      // Fallback: use provided price or default to 1
      const fallbackPrice = price || 1
      currentHoldings.value[ticker] = {
        shares,
        price: fallbackPrice,
        value: shares * fallbackPrice,
        name: ticker
      }
      savePortfolioToStorage()
    }
  }

  function removeHolding(ticker: string) {
    delete currentHoldings.value[ticker]
    savePortfolioToStorage()
  }

  async function refreshCurrentPrices() {
    const tickers = Object.keys(currentHoldings.value)

    for (const ticker of tickers) {
      try {
        const quoteData = await financeAPI.getCurrentQuote(ticker)
        const holding = currentHoldings.value[ticker]
        if (!holding) continue

        const currentPrice = quoteData.regularMarketPrice || quoteData.price || holding.price

        currentHoldings.value[ticker] = {
          ...holding,
          price: currentPrice,
          value: holding.shares * currentPrice,
          currentPrice
        }
      } catch (error) {
        console.warn(`Failed to refresh price for ${ticker}:`, error)
      }
    }

    savePortfolioToStorage()
  }

  async function fetchETFPrice(ticker: string) {
    try {
      const quoteData = await financeAPI.getCurrentQuote(ticker)
      const price = quoteData.regularMarketPrice || quoteData.price || 1
      const name = quoteData.longName || quoteData.shortName || ticker

      etfPrices.value[ticker] = { price, name }
      return { price, name }
    } catch (error) {
      console.warn(`Failed to fetch price for ${ticker}:`, error)
      etfPrices.value[ticker] = { price: 1, name: ticker }
      return { price: 1, name: ticker }
    }
  }

  async function fetchAllETFPrices(tickers: string[]) {
    const pricePromises = tickers.map(ticker => fetchETFPrice(ticker))
    await Promise.all(pricePromises)
  }

  async function calculateMomentum() {
    isLoading.value = true
    error.value = null

    try {
      const realMomentumData: MomentumData = {}

      // Fetch current prices for all selected ETFs
      await fetchAllETFPrices(selectedETFs.value)

      // Use batch momentum calculation for better performance
      const results: MomentumResult[] = await financeAPI.calculateBatchMomentum(selectedETFs.value)

      for (const result of results) {
        realMomentumData[result.ticker] = {
          periods: {
            '3month': result.periods['3month'],
            '6month': result.periods['6month'],
            '9month': result.periods['9month'],
            '12month': result.periods['12month']
          },
          average: result.average,
          absoluteMomentum: result.absoluteMomentum,
          error: result.error
        }
      }

      momentumData.value = realMomentumData

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate momentum'
    } finally {
      isLoading.value = false
    }
  }

  function calculateRebalancing() {
    if (Object.keys(momentumData.value).length === 0) {
      error.value = 'Please calculate momentum first'
      return
    }

    // Filter ETFs with positive momentum
    const positiveMomentumETFs = Object.entries(momentumData.value)
      .filter(([_, data]) => data.absoluteMomentum)
      .sort(([_, a], [__, b]) => b.average - a.average)
      .slice(0, topAssets.value)
      .map(([ticker]) => ticker)

    if (positiveMomentumETFs.length === 0) {
      error.value = 'No ETFs with positive momentum found'
      return
    }

    // Calculate target allocations
    const bitcoinETFs = positiveMomentumETFs.filter(etf => etf === 'IBIT')
    const nonBitcoinETFs = positiveMomentumETFs.filter(etf => etf !== 'IBIT')
    
    const totalAllocation = 100
    const bitcoinTargetPercent = bitcoinAllocation.value
    const remainingPercent = totalAllocation - bitcoinTargetPercent
    
    const nonBitcoinTargetPercent = nonBitcoinETFs.length > 0 
      ? remainingPercent / nonBitcoinETFs.length 
      : 0

    // Generate rebalancing orders
    const orders: RebalancingOrder[] = []
    const totalValue = totalPortfolioValue.value

    positiveMomentumETFs.forEach(ticker => {
      const isBitcoin = ticker === 'IBIT'
      const targetPercent = isBitcoin ? bitcoinTargetPercent : nonBitcoinTargetPercent
      const targetValue = (totalValue * targetPercent) / 100
      
      const currentHolding = currentHoldings.value[ticker]
      const currentValue = currentHolding?.value || 0
      const difference = targetValue - currentValue
      
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
      if (difference > 0) action = 'BUY'
      else if (difference < 0) action = 'SELL'
      
      const currentPrice = currentHolding?.price || 1 // Fallback price for calculation
      const shares = Math.abs(difference) / currentPrice

      orders.push({
        ticker,
        action,
        shares: Math.round(shares * 100) / 100, // Round to 2 decimal places
        targetValue,
        currentValue,
        difference
      })
    })

    rebalancingOrders.value = orders
  }

  return {
    // State
    etfUniverse,
    selectedETFs,
    enabledCategories,
    topAssets,
    bitcoinAllocation,
    rebalancingFrequency,
    momentumPeriods,
    currentHoldings,
    additionalCash,
    allocationMethod,
    momentumData,
    etfPrices,
    rebalancingOrders,
    isLoading,
    error,
    
    // Computed
    totalPortfolioValue,
    availableETFs,
    selectedETFsWithCategories,
    sortedMomentumData,
    selectedTopETFs,
    
    // Actions
    toggleCategory,
    updateSelectedETFs,
    addHolding,
    removeHolding,
    refreshCurrentPrices,
    calculateMomentum,
    calculateRebalancing
  }
})