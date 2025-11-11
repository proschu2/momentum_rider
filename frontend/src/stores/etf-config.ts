import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ETFUniverse, EnabledCategories } from './types'

export const useETFConfigStore = defineStore('etfConfig', () => {
    // ETF Universe Configuration
    const etfUniverse = ref<ETFUniverse>({
        STOCKS: ['VTI', 'VEA', 'VWO'],
        BONDS: ['TLT', 'BWX', 'BND'],
        COMMODITIES: ['PDBC', 'GLDM'],
        ALTERNATIVES: ['IBIT']
    })

    // Category Toggles
    const enabledCategories = ref<EnabledCategories>({
        STOCKS: true,
        BONDS: true,
        COMMODITIES: true,
        ALTERNATIVES: true
    })

    // Selected ETFs - all selected by default
    const selectedETFs = ref<string[]>([...Object.values(etfUniverse.value).flat()])

    // Computed Properties
    const availableETFs = computed(() => {
        const etfs: string[] = []
        for (const [category, tickers] of Object.entries(etfUniverse.value)) {
            if (enabledCategories.value[category as keyof EnabledCategories]) {
                etfs.push(...tickers)
            }
        }
        return etfs
    })

    const selectableETFs = computed(() => {
        return [...Object.values(etfUniverse.value).flat()]
    })

    const isSelectableETF = computed(() => (ticker: string) => {
        return selectableETFs.value.includes(ticker)
    })

    const selectedETFsWithCategories = computed(() => {
        const result: { [category: string]: string[] } = {}
        for (const [category, tickers] of Object.entries(etfUniverse.value)) {
            const categoryETFs = tickers.filter(ticker => selectedETFs.value.includes(ticker))
            if (categoryETFs.length > 0) {
                result[category] = categoryETFs
            }
        }
        return result
    })

    // Actions
    function toggleCategory(category: keyof EnabledCategories) {
        const newState = !enabledCategories.value[category]
        enabledCategories.value[category] = newState

        // Select or deselect all ETFs in this category
        const categoryETFs = etfUniverse.value[category as keyof ETFUniverse]
        if (newState) {
            // Add all ETFs from this category to selectedETFs
            for (const etf of categoryETFs) {
                if (!selectedETFs.value.includes(etf)) {
                    selectedETFs.value.push(etf)
                }
            }
        } else {
            // Remove all ETFs from this category from selectedETFs
            selectedETFs.value = selectedETFs.value.filter(etf => !categoryETFs.includes(etf))
        }
    }

    function updateSelectedETFs() {
        selectedETFs.value = availableETFs.value.filter(etf => selectedETFs.value.includes(etf))
    }

    function toggleETF(etf: string) {
        const index = selectedETFs.value.indexOf(etf)
        if (index > -1) {
            selectedETFs.value.splice(index, 1)
        } else {
            selectedETFs.value.push(etf)
        }
    }

    function selectAllETFs() {
        selectedETFs.value = [...availableETFs.value]
    }

    function clearAllETFs() {
        selectedETFs.value = []
    }

    function getCategoryForETF(etf: string) {
        return Object.entries(etfUniverse.value).find(([cat, etfs]) => etfs.includes(etf))?.[0]
    }

    return {
        // State
        etfUniverse,
        enabledCategories,
        selectedETFs,

        // Computed
        availableETFs,
        selectableETFs,
        isSelectableETF,
        selectedETFsWithCategories,

        // Actions
        toggleCategory,
        updateSelectedETFs,
        toggleETF,
        selectAllETFs,
        clearAllETFs,
        getCategoryForETF
    }
})