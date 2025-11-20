import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { quoteService } from '@/services'
import type { Holding, ETFPrice } from './types'

export type { Holding }

// Multi-portfolio interfaces
export interface Portfolio {
    id: string
    name: string
    description?: string
    holdings: { [ticker: string]: Holding }
    additionalCash: number
    createdAt: string
    updatedAt: string
}

export interface PortfoliosData {
    portfolios: { [portfolioId: string]: Portfolio }
    activePortfolioId: string
    defaultNames: string[]
}

export const usePortfolioStore = defineStore('portfolio', () => {
    // Multi-portfolio state
    const portfolios = ref<{ [id: string]: Portfolio }>({})
    const activePortfolioId = ref<string | null>(null)
    const defaultNames = ref<string[]>(['Portfolio 1', 'Portfolio 2', 'Portfolio 3', 'Portfolio 4', 'Portfolio 5'])

    // Legacy state for backward compatibility
    const currentHoldings = ref<{ [ticker: string]: Holding }>({})
    const additionalCash = ref(0)

    // ETF Price Data
    const etfPrices = ref<{ [ticker: string]: ETFPrice }>({})

    // Loading States
    const isLoading = ref(false)
    const error = ref<string | null>(null)

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

    // Computed Properties
    const activePortfolio = computed(() =>
        activePortfolioId.value ? portfolios.value[activePortfolioId.value] : null
    )

    const totalPortfolioValue = computed(() => {
        if (activePortfolio.value) {
            const holdingsValue = Object.values(activePortfolio.value.holdings).reduce((sum, holding) => sum + holding.value, 0)
            return holdingsValue + activePortfolio.value.additionalCash
        }
        // Fallback to legacy format for backward compatibility
        const holdingsValue = Object.values(currentHoldings.value).reduce((sum, holding) => sum + holding.value, 0)
        return holdingsValue + additionalCash.value
    })

    // Legacy computed properties for backward compatibility
    const legacyCurrentHoldings = computed(() => {
        if (activePortfolio.value) {
            return activePortfolio.value.holdings
        }
        return currentHoldings.value
    })

    const legacyAdditionalCash = computed(() => {
        if (activePortfolio.value) {
            return activePortfolio.value.additionalCash
        }
        return additionalCash.value
    })

    // Multi-portfolio management functions
    function generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    function getNextDefaultName(): string {
        const usedNames = Object.values(portfolios.value).map(p => p.name)
        const availableName = defaultNames.value.find(name => !usedNames.includes(name))
        return availableName || `Portfolio ${Object.keys(portfolios.value).length + 1}`
    }

    function createPortfolio(name?: string): string {
        const id = generateId()
        const portfolioName = name || getNextDefaultName()
        
        portfolios.value[id] = {
            id,
            name: portfolioName,
            holdings: {},
            additionalCash: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        
        saveToStorage()
        return id
    }

    function selectPortfolio(portfolioId: string) {
        if (portfolios.value[portfolioId]) {
            activePortfolioId.value = portfolioId
            // Update legacy state for backward compatibility
            const portfolio = portfolios.value[portfolioId]
            currentHoldings.value = { ...portfolio.holdings }
            additionalCash.value = portfolio.additionalCash
            saveToStorage()
        }
    }

    function updatePortfolio(portfolioId: string, updates: Partial<Portfolio>) {
        if (portfolios.value[portfolioId]) {
            portfolios.value[portfolioId] = {
                ...portfolios.value[portfolioId],
                ...updates,
                updatedAt: new Date().toISOString()
            }
            
            // Update legacy state if this is the active portfolio
            if (activePortfolioId.value === portfolioId) {
                const portfolio = portfolios.value[portfolioId]
                currentHoldings.value = { ...portfolio.holdings }
                additionalCash.value = portfolio.additionalCash
            }
            
            saveToStorage()
        }
    }

    function deletePortfolio(portfolioId: string) {
        if (portfolios.value[portfolioId]) {
            delete portfolios.value[portfolioId]
            if (activePortfolioId.value === portfolioId) {
                activePortfolioId.value = null
                // Clear legacy state
                currentHoldings.value = {}
                additionalCash.value = 0
            }
            saveToStorage()
        }
    }

    // Portfolio-specific actions
    async function addHoldingToPortfolio(portfolioId: string, ticker: string, shares: number, price?: number) {
        try {
            // Fetch current quote data
            const quoteData = await quoteService.getCurrentQuote(ticker)
            const currentPrice = quoteData.regularMarketPrice || quoteData.price || price || 1
            const name = quoteData.longName || quoteData.shortName || ticker

            const holding: Holding = {
                shares,
                price: currentPrice,
                value: shares * currentPrice,
                name,
                currentPrice
            }

            const portfolio = portfolios.value[portfolioId]
            if (portfolio) {
                portfolio.holdings[ticker] = holding
                portfolio.updatedAt = new Date().toISOString()

                // Update legacy state if this is the active portfolio
                if (activePortfolioId.value === portfolioId) {
                    currentHoldings.value[ticker] = holding
                }
            }

            saveToStorage()
        } catch (error) {
            console.warn(`Failed to fetch quote for ${ticker}:`, error)
            // Fallback: use provided price or default to 1
            const fallbackPrice = price || 1
            const holding: Holding = {
                shares,
                price: fallbackPrice,
                value: shares * fallbackPrice,
                name: ticker
            }

            const portfolio = portfolios.value[portfolioId]
            if (portfolio) {
                portfolio.holdings[ticker] = holding
                portfolio.updatedAt = new Date().toISOString()

                if (activePortfolioId.value === portfolioId) {
                    currentHoldings.value[ticker] = holding
                }
            }

            saveToStorage()
        }
    }

    function removeHoldingFromPortfolio(portfolioId: string, ticker: string) {
        if (portfolios.value[portfolioId]?.holdings[ticker]) {
            delete portfolios.value[portfolioId].holdings[ticker]
            portfolios.value[portfolioId].updatedAt = new Date().toISOString()

            // Update legacy state if this is the active portfolio
            if (activePortfolioId.value === portfolioId) {
                delete currentHoldings.value[ticker]
            }

            saveToStorage()
        }
    }

    function sellHoldingFromPortfolio(portfolioId: string, ticker: string, shares?: number) {
        const portfolio = portfolios.value[portfolioId]
        if (!portfolio?.holdings[ticker]) return

        const holding = portfolio.holdings[ticker]
        if (!holding) return
        
        const sharesToSell = shares !== undefined ? shares : holding.shares
        const sellValue = sharesToSell * holding.price

        if (sharesToSell >= holding.shares) {
            // Sell all shares - remove the holding entirely
            delete portfolio.holdings[ticker]
            
            // Update legacy state if this is the active portfolio
            if (activePortfolioId.value === portfolioId) {
                delete currentHoldings.value[ticker]
            }
        } else {
            // Sell partial shares - update the holding
            const updatedHolding = {
                ...holding,
                shares: holding.shares - sharesToSell,
                value: (holding.shares - sharesToSell) * holding.price
            }
            portfolio.holdings[ticker] = updatedHolding
            
            // Update legacy state if this is the active portfolio
            if (activePortfolioId.value === portfolioId) {
                currentHoldings.value[ticker] = updatedHolding
            }
        }

        // Add sell proceeds to cash
        portfolio.additionalCash += sellValue
        portfolio.updatedAt = new Date().toISOString()

        // Update legacy cash if this is the active portfolio
        if (activePortfolioId.value === portfolioId) {
            additionalCash.value = portfolio.additionalCash
        }

        saveToStorage()
    }

    async function refreshPortfolioPrices(portfolioId: string) {
        const portfolio = portfolios.value[portfolioId]
        if (!portfolio) return

        const tickers = Object.keys(portfolio.holdings)

        for (const ticker of tickers) {
            try {
                const quoteData = await quoteService.getCurrentQuote(ticker)
                const holding = portfolio.holdings[ticker]
                if (!holding) continue

                const currentPrice = quoteData.regularMarketPrice || quoteData.price || holding.price

                portfolio.holdings[ticker] = {
                    ...holding,
                    price: currentPrice,
                    value: holding.shares * currentPrice,
                    currentPrice
                }
            } catch (error) {
                console.warn(`Failed to refresh price for ${ticker}:`, error)
            }
        }

        portfolio.updatedAt = new Date().toISOString()

        // Update legacy state if this is the active portfolio
        if (activePortfolioId.value === portfolioId) {
            currentHoldings.value = { ...portfolio.holdings }
        }

        saveToStorage()
    }

    // Legacy actions (updated to work with multi-portfolio)
    async function addHolding(ticker: string, shares: number, price?: number) {
        if (activePortfolioId.value) {
            return addHoldingToPortfolio(activePortfolioId.value, ticker, shares, price)
        }

        // Fallback to legacy behavior
        try {
            const quoteData = await quoteService.getCurrentQuote(ticker)
            const currentPrice = quoteData.regularMarketPrice || quoteData.price || price || 1
            const name = quoteData.longName || quoteData.shortName || ticker

            currentHoldings.value[ticker] = {
                shares,
                price: currentPrice,
                value: shares * currentPrice,
                name,
                currentPrice
            }

            savePortfolioToStorage()
        } catch (error) {
            console.warn(`Failed to fetch quote for ${ticker}:`, error)
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
        if (activePortfolioId.value) {
            return removeHoldingFromPortfolio(activePortfolioId.value, ticker)
        }

        // Fallback to legacy behavior
        delete currentHoldings.value[ticker]
        savePortfolioToStorage()
    }

    async function refreshCurrentPrices() {
        if (activePortfolioId.value) {
            return refreshPortfolioPrices(activePortfolioId.value)
        }

        // Fallback to legacy behavior
        const tickers = Object.keys(currentHoldings.value)

        for (const ticker of tickers) {
            try {
                const quoteData = await quoteService.getCurrentQuote(ticker)
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
            console.debug(`[PortfolioStore] Fetching ETF price for ${ticker}`)
            const quoteData = await quoteService.getCurrentQuote(ticker)
            const price = quoteData.regularMarketPrice || quoteData.price || 1
            const name = quoteData.longName || quoteData.shortName || ticker

            console.debug(`[PortfolioStore] Successfully fetched price for ${ticker}: $${price}`)
            etfPrices.value[ticker] = { price, name }
            return { price, name }
        } catch (error) {
            console.warn(`[PortfolioStore] Failed to fetch price for ${ticker}:`, error)
            etfPrices.value[ticker] = { price: 1, name: ticker }
            return { price: 1, name: ticker }
        }
    }

    async function fetchAllETFPrices(tickers: string[]) {
        const pricePromises = tickers.map(ticker => fetchETFPrice(ticker))
        await Promise.all(pricePromises)
    }

    // Multi-portfolio storage functions
    const saveToStorage = () => {
        try {
            const data: PortfoliosData = {
                portfolios: portfolios.value,
                activePortfolioId: activePortfolioId.value || '',
                defaultNames: defaultNames.value
            }
            localStorage.setItem('momentumRider_portfolios', JSON.stringify(data))
        } catch (error) {
            console.warn('Failed to save portfolios to localStorage:', error)
        }
    }

    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem('momentumRider_portfolios')
            if (saved) {
                const data: PortfoliosData = JSON.parse(saved)
                portfolios.value = data.portfolios || {}
                activePortfolioId.value = data.activePortfolioId || null
                defaultNames.value = data.defaultNames || defaultNames.value

                // Update legacy state for backward compatibility
                if (activePortfolioId.value && portfolios.value[activePortfolioId.value]) {
                    const portfolio = portfolios.value[activePortfolioId.value]
                    if (portfolio) {
                        currentHoldings.value = { ...portfolio.holdings }
                        additionalCash.value = portfolio.additionalCash
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load portfolios from localStorage:', error)
        }
    }

    // Migration function
    const migrateFromOldFormat = () => {
        try {
            const oldHoldings = localStorage.getItem('momentumRider_portfolio')
            const oldCash = localStorage.getItem('momentumRider_additionalCash')
            
            // Only migrate if we have old data and no new portfolios
            if ((oldHoldings || oldCash) && Object.keys(portfolios.value).length === 0) {
                console.log('Migrating portfolio data from old format...')
                
                // Create first portfolio with migrated data
                const portfolioId = createPortfolio('Portfolio 1')
                const portfolio = portfolios.value[portfolioId]
                
                if (oldHoldings && portfolio) {
                    portfolio.holdings = JSON.parse(oldHoldings)
                }
                if (oldCash && portfolio) {
                    portfolio.additionalCash = JSON.parse(oldCash)
                }
                
                if (portfolio) {
                    portfolio.updatedAt = new Date().toISOString()
                }
                selectPortfolio(portfolioId)
                
                // Clear old data
                localStorage.removeItem('momentumRider_portfolio')
                localStorage.removeItem('momentumRider_additionalCash')
                
                console.log('Migration completed successfully')
            }
        } catch (error) {
            console.warn('Failed to migrate old portfolio data:', error)
        }
    }

    // Initialize multi-portfolio system
    loadFromStorage()
    migrateFromOldFormat()

    // Legacy initialization (for backward compatibility)
    if (!activePortfolioId.value) {
        loadPortfolioFromStorage()
    }

    return {
        // Multi-portfolio state
        portfolios,
        activePortfolioId,
        activePortfolio,
        defaultNames,

        // Legacy state (for backward compatibility)
        currentHoldings: legacyCurrentHoldings,
        additionalCash: legacyAdditionalCash,
        etfPrices,
        isLoading,
        error,

        // Computed
        totalPortfolioValue,

        // Multi-portfolio actions
        createPortfolio,
        selectPortfolio,
        updatePortfolio,
        deletePortfolio,
        addHoldingToPortfolio,
        removeHoldingFromPortfolio,
        sellHoldingFromPortfolio,
        refreshPortfolioPrices,

        // Legacy actions (for backward compatibility)
        addHolding,
        removeHolding,
        refreshCurrentPrices,
        fetchETFPrice,
        fetchAllETFPrices,
        savePortfolioToStorage
    }
})