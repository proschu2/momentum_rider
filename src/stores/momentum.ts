import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeAPI, type MomentumResult } from '@/services/finance-api'
import type { MomentumData } from './types'
import { useETFConfigStore } from './etf-config'
import { usePortfolioStore } from './portfolio'

export const useMomentumStore = defineStore('momentum', () => {
    const etfConfigStore = useETFConfigStore()
    const portfolioStore = usePortfolioStore()

    // Momentum Data
    const momentumData = ref<MomentumData>({})

    // Loading States
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Computed Properties
    const sortedMomentumData = computed(() => {
        return Object.entries(momentumData.value)
            .sort(([_, a], [__, b]) => b.average - a.average) // Sort by average momentum (highest to lowest)
    })

    const selectedTopETFs = computed(() => {
        return Object.entries(momentumData.value)
            .filter(([ticker, data]) => data.absoluteMomentum && etfConfigStore.isSelectableETF(ticker))
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
                        .filter(([t, data]) => etfConfigStore.isSelectableETF(t))
                        .map(([t, data]) => ({ ticker: t, ...data }))
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

    // Actions
    async function calculateMomentum() {
        isLoading.value = true
        error.value = null

        try {
            const realMomentumData: MomentumData = {}

            // Get all tickers that need momentum calculation
            // Include selected ETFs AND current portfolio holdings
            const allTickers = new Set([
                ...etfConfigStore.selectedETFs,
                ...Object.keys(portfolioStore.currentHoldings)
            ])

            // Fetch current prices for all relevant tickers
            await portfolioStore.fetchAllETFPrices([...allTickers])

            // Use batch momentum calculation for better performance
            const results: MomentumResult[] = await financeAPI.calculateBatchMomentum([...allTickers])

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

    return {
        // State
        momentumData,
        isLoading,
        error,

        // Computed
        sortedMomentumData,
        selectedTopETFs,
        portfolioMomentumInsight,

        // Actions
        calculateMomentum
    }
})