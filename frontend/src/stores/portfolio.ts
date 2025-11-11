import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { quoteService } from '@/services'
import type { Holding, ETFPrice } from './types'

export type { Holding }

export const usePortfolioStore = defineStore('portfolio', () => {
    // Current Holdings
    const currentHoldings = ref<{ [ticker: string]: Holding }>({})

    // Additional Investment
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
    const totalPortfolioValue = computed(() => {
        const holdingsValue = Object.values(currentHoldings.value).reduce((sum, holding) => sum + holding.value, 0)
        return holdingsValue + additionalCash.value
    })

    // Actions
    async function addHolding(ticker: string, shares: number, price?: number) {
        try {
            // Fetch current quote data
            const quoteData = await quoteService.getCurrentQuote(ticker)

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

    // Load portfolio on store initialization
    loadPortfolioFromStorage()

    return {
        // State
        currentHoldings,
        additionalCash,
        etfPrices,
        isLoading,
        error,

        // Computed
        totalPortfolioValue,

        // Actions
        addHolding,
        removeHolding,
        refreshCurrentPrices,
        fetchETFPrice,
        fetchAllETFPrices,
        savePortfolioToStorage
    }
})