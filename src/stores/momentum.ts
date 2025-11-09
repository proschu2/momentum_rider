import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {momentumService, type MomentumResult} from '@/services'
import type {MomentumData, IBITMomentumData} from './types'
import {useETFConfigStore} from './etf-config'
import {usePortfolioStore} from './portfolio'
import {useRebalancingStore} from './rebalancing'

export const useMomentumStore = defineStore('momentum', () => {
    const etfConfigStore = useETFConfigStore()
    const portfolioStore = usePortfolioStore()
    const rebalancingStore = useRebalancingStore()

    // Momentum Data
    const momentumData = ref<MomentumData>({})
    const lastUpdated = ref<Date | null>(null)
    const cachedData = ref<Map<string, { data: MomentumData; timestamp: number }>>(new Map())

    // Loading States
    const isLoading = ref(false)
    const isCalculatingSingle = ref(false)
    const error = ref<string | null>(null)
    const connectionStatus = ref<'connected' | 'disconnected' | 'unknown'>('unknown')
    const operationProgress = ref<{ current: number; total: number; message: string } | null>(null)

    // Computed Properties
    const sortedMomentumData = computed(() => {
        return Object.entries(momentumData.value)
            .sort(([_, a], [__, b]) => b.average - a.average) // Sort by average momentum (highest to lowest)
    })

    const selectedTopETFs = computed(() => {
        return Object.entries(momentumData.value)
            .filter(([ticker, data]) =>
                data.absoluteMomentum &&
                etfConfigStore.isSelectableETF(ticker) &&
                ticker !== 'IBIT' // Exclude IBIT from Top 1-4 rankings
            )
            .sort(([_, a], [__, b]) => b.average - a.average)
            .slice(0, 4) // Default to top 4, can be overridden by rebalancing store
            .map(([ticker]) => ticker)
    })

    // Calculate momentum for current portfolio holdings
    const portfolioMomentumInsight = computed(() => {
        const insights: {
            [ticker: string]: { momentum: number; rank: number; absoluteMomentum: boolean; isSelectable: boolean }
        } = {}

        Object.keys(portfolioStore.currentHoldings).forEach(ticker => {
            const momentum = momentumData.value[ticker]
            const isSelectable = etfConfigStore.isSelectableETF(ticker)

            if (momentum) {
                // For selectable ETFs: calculate rank among ALL selectable ETFs (not just positive momentum)
                // For non-selectable holdings: show N/A for rank
                let rank = 0
                if (isSelectable) {
                    const selectableMomentumData = Object.entries(momentumData.value)
                        .filter(([t, data]) =>
                            etfConfigStore.isSelectableETF(t) &&
                            t !== 'IBIT' // Exclude IBIT from ranking calculations
                        )
                        .map(([t, data]) => ({ticker: t, ...data}))
                    const sortedMomentum = [...selectableMomentumData].sort((a, b) => b.average - a.average)
                    rank = sortedMomentum.findIndex(data => data.ticker === ticker) + 1
                    rank = rank > 0 ? rank : sortedMomentum.length // If not found, assign lowest rank
                }

                insights[ticker] = {
                    momentum: momentum.average,
                    rank: isSelectable ? rank : -1, // -1 indicates non-selectable (N/A)
                    absoluteMomentum: momentum.absoluteMomentum,
                    isSelectable
                }
            } else {
                // Handle holdings without momentum data
                insights[ticker] = {
                    momentum: 0,
                    rank: isSelectable ? 0 : -1, // 0 = no data, -1 = non-selectable
                    absoluteMomentum: false,
                    isSelectable
                }
            }
        })

        return insights
    })

    // Cache management
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    // Enhanced cache validation to detect corrupted data
    const isValidCachedData = (data: MomentumData): boolean => {
        if (!data || typeof data !== 'object') {
            console.debug('Cache validation: Invalid data structure')
            return false
        }

        // Check if data contains valid momentum values
        const entries = Object.entries(data)
        if (entries.length === 0) {
            console.debug('Cache validation: Empty data')
            return false
        }

        // Validate each entry has required fields
        for (const [ticker, momentum] of entries) {
            if (!momentum || typeof momentum !== 'object') {
                console.debug(`Cache validation: Invalid momentum data for ${ticker}`)
                return false
            }

            if (typeof momentum.average !== 'number' || isNaN(momentum.average)) {
                console.debug(`Cache validation: Invalid average for ${ticker}`)
                return false
            }

            if (!momentum.periods || typeof momentum.periods !== 'object') {
                console.debug(`Cache validation: Invalid periods for ${ticker}`)
                return false
            }
        }

        return true
    }

    const getCachedData = (key: string): MomentumData | null => {
        const cached = cachedData.value.get(key)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            // Validate cached data before using it
            if (isValidCachedData(cached.data)) {
                console.debug(`Using valid cached data for key: ${key}`)
                return cached.data
            } else {
                console.warn(`Cache validation failed for key: ${key}, forcing refresh`)
                cachedData.value.delete(key)
            }
        }
        return null
    }

    const setCachedData = (key: string, data: MomentumData) => {
        cachedData.value.set(key, {data, timestamp: Date.now()})
    }

    // Test backend connectivity
    async function checkBackendConnection(): Promise<boolean> {
        try {
            // Try a simple health check or use single momentum call
            await momentumService.calculateMomentum('AAPL', false)
            connectionStatus.value = 'connected'
            return true
        } catch (err) {
            connectionStatus.value = 'disconnected'
            return false
        }
    }

    // Calculate momentum for a single ticker with retry
    async function calculateSingleMomentum(ticker: string, maxRetries: number = 2): Promise<MomentumResult | null> {
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                isCalculatingSingle.value = true
                const result = await momentumService.calculateMomentum(ticker, false)
                isCalculatingSingle.value = false

                // Return the result directly (no longer expecting cache wrapper objects)
                return result
            } catch (err) {
                lastError = err as Error
                isCalculatingSingle.value = false

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 500
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        console.warn(`Failed to calculate momentum for ${ticker} after ${maxRetries} attempts:`, lastError)
        return null
    }

    // Fallback: Calculate momentum using individual calls
    async function calculateMomentumFallback(tickers: string[]): Promise<MomentumData> {
        const results: MomentumData = {}
        const total = tickers.length

        operationProgress.value = {current: 0, total, message: 'Calculating momentum (offline mode)...'}

        for (let i = 0; i < tickers.length; i++) {
            const ticker = tickers[i]
            operationProgress.value = {
                current: i + 1,
                total,
                message: `Calculating ${ticker}...`
            }

            const result = await calculateSingleMomentum(ticker, 1) // Single attempt in fallback mode
            if (result) {
                // Return the result directly (no longer expecting cache wrapper objects)
                const momentumData = result

                results[ticker] = {
                    periods: momentumData.periods,
                    average: momentumData.average,
                    absoluteMomentum: momentumData.absoluteMomentum,
                    error: momentumData.error
                }
            } else {
                // Mark as failed but continue with others
                results[ticker] = {
                    periods: {'3month': 0, '6month': 0, '9month': 0, '12month': 0},
                    average: 0,
                    absoluteMomentum: false,
                    error: 'Failed to fetch data'
                }
            }
        }

        operationProgress.value = null
        return results
    }

    // Main momentum calculation with comprehensive error handling
    async function calculateMomentum() {
        isLoading.value = true
        error.value = null
        operationProgress.value = {current: 0, total: 100, message: 'Initializing...'}

        try {
            // Get all tickers that need momentum calculation
            const allTickers = new Set([
                ...etfConfigStore.selectedETFs,
                ...Object.keys(portfolioStore.currentHoldings)
            ])

            const tickersArray = [...allTickers]
            const cacheKey = tickersArray.sort().join(',')

            // Check cache first but don't return early - we still need to fetch prices
            const cached = getCachedData(cacheKey)
            let useCachedMomentum = false

            if (cached) {
                useCachedMomentum = true
                // We'll use cached momentum data but still fetch current prices
            } else {
            }

            operationProgress.value = {current: 10, total: 100, message: 'Testing backend connection...'}

            // Test backend connection
            const isConnected = await checkBackendConnection()

            operationProgress.value = {current: 20, total: 100, message: 'Fetching current prices...'}

            // ALWAYS fetch current prices regardless of cache status
            await portfolioStore.fetchAllETFPrices(tickersArray)

            operationProgress.value = {current: 30, total: 100, message: 'Calculating momentum...'}

            // Calculate momentum based on connection status and cache availability
            let realMomentumData: MomentumData = {}

            if (useCachedMomentum && cached) {
                realMomentumData = cached
            } else if (isConnected) {
                try {
                    // Try batch calculation first
                    operationProgress.value = {current: 40, total: 100, message: 'Using batch calculation...'}

                    const results: MomentumResult[] = await momentumService.calculateBatchMomentum(tickersArray)

                    operationProgress.value = {current: 80, total: 100, message: 'Processing results...'}

                    for (const result of results) {
                        // Use the result directly (no longer expecting cache wrapper objects)
                        const momentumData = result
                        
                        if (momentumData.ticker) {
                            realMomentumData[momentumData.ticker] = {
                                periods: momentumData.periods,
                                average: momentumData.average,
                                absoluteMomentum: momentumData.absoluteMomentum,
                                error: momentumData.error
                            }
                        } else {
                            console.warn('Momentum result missing ticker')
                        }
                    }

                } catch (batchError) {
                    // Fall back to individual calls if batch fails
                    console.warn('Batch calculation failed, falling back to individual calls')
                    realMomentumData = await calculateMomentumFallback(tickersArray)
                }
            } else {
                // Backend not available, use fallback mode
                realMomentumData = await calculateMomentumFallback(tickersArray)
            }

            operationProgress.value = {current: 95, total: 100, message: 'Finalizing...'}

            // Update store
            momentumData.value = realMomentumData
            lastUpdated.value = new Date()

            // Cache the results (only if we calculated new data)
            if (!useCachedMomentum) {
                setCachedData(cacheKey, realMomentumData)
            }

            operationProgress.value = null

            // Show success feedback
            if (connectionStatus.value === 'disconnected') {
                error.value = 'Using cached/offline data. Some features may be limited.'
            }

        } catch (err) {
            console.error('Momentum calculation failed:', err)

            // Enhanced error handling
            let errorMessage = 'Failed to calculate momentum'

            if (err instanceof Error) {
                if (err.message.includes('fetch') || err.message.includes('network')) {
                    errorMessage = 'Network error: Unable to connect to the server. Using offline mode.'
                    connectionStatus.value = 'disconnected'

                    // Try fallback with cached data or empty results
                    const cacheKey = [...new Set([...etfConfigStore.selectedETFs, ...Object.keys(portfolioStore.currentHoldings)])].sort().join(',')
                    const cached = getCachedData(cacheKey)

                    if (cached) {
                        momentumData.value = cached
                        lastUpdated.value = new Date()
                        error.value = errorMessage + ' Using cached data.'
                    } else {
                        // Return empty but don't crash
                        momentumData.value = {}
                        error.value = errorMessage + ' No cached data available.'
                    }
                } else if (err.message.includes('timeout')) {
                    errorMessage = 'Request timeout: The server is taking too long to respond.'
                } else {
                    errorMessage = err.message
                }
            } else if (typeof err === 'string') {
                errorMessage = err
            }

            error.value = errorMessage
            operationProgress.value = null

        } finally {
            isLoading.value = false
        }
    }

    // Computed property to check if IBIT should be shown with visual indicators
    const shouldShowIBIT = computed(() => {
        const bitcoinAllocation = rebalancingStore.bitcoinAllocation
        const ibitMomentum = momentumData.value['IBIT']
        return bitcoinAllocation > 0 && ibitMomentum !== undefined
    })

    // Computed property to get IBIT momentum data with special handling
    const ibitMomentumData = computed<IBITMomentumData | null>(() => {
        const ibitData = momentumData.value['IBIT']
        if (!ibitData) return null

        return {
            ...ibitData,
            isBitcoinETF: true,
            shouldShow: shouldShowIBIT.value
        }
    })

    // Clear cache manually
    function clearCache() {
        cachedData.value.clear()
    }

    // Get connection status description
    function getConnectionStatusMessage(): string {
        switch (connectionStatus.value) {
            case 'connected':
                return 'Connected to server'
            case 'disconnected':
                return 'Offline mode - using cached data'
            default:
                return 'Connection status unknown'
        }
    }

    return {
        // State
        momentumData,
        lastUpdated,
        isLoading,
        isCalculatingSingle,
        error,
        connectionStatus,
        operationProgress,

        // Computed
        sortedMomentumData,
        selectedTopETFs,
        portfolioMomentumInsight,
        shouldShowIBIT,
        ibitMomentumData,

        // Actions
        calculateMomentum,
        checkBackendConnection,
        clearCache,
        getConnectionStatusMessage
    }
})