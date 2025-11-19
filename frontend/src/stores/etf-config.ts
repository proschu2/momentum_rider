import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ETFUniverse, EnabledCategories } from './types'
import { etfService } from '@/services/etf-service'

export const useETFConfigStore = defineStore('etfConfig', () => {
    // State
    const isLoading = ref<boolean>(false)
    const loadError = ref<string | null>(null)
    const lastLoadTime = ref<Date | null>(null)

    // Default ETF Universe Configuration (fallback)
    const defaultETFUniverse: ETFUniverse = {
        STOCKS: ['VTI', 'VEA', 'VWO'],
        BONDS: ['TLT', 'BWX', 'BND'],
        COMMODITIES: ['PDBC', 'GLDM'],
        ALTERNATIVES: ['IBIT']
    }

    // ETF Universe Configuration
    const etfUniverse = ref<ETFUniverse>({...defaultETFUniverse})

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

    // API Integration Actions
    async function loadETFUniverse(): Promise<boolean> {
        isLoading.value = true
        loadError.value = null

        try {
            console.log('Loading ETF universe from backend...')
            const universe = await etfService.loadETFUniverse()

            // Update the universe
            etfUniverse.value = universe

            // Initialize selected ETFs based on new universe if they're empty
            if (selectedETFs.value.length === 0) {
                selectedETFs.value = [...Object.values(universe).flat()]
            } else {
                // Filter out any selected ETFs that are no longer in the universe
                const availableTickers = Object.values(universe).flat()
                selectedETFs.value = selectedETFs.value.filter(ticker => availableTickers.includes(ticker))
            }

            lastLoadTime.value = new Date()
            console.log('ETF universe loaded successfully:', universe)
            return true
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load ETF universe'
            loadError.value = errorMessage
            console.error('Failed to load ETF universe:', error)
            return false
        } finally {
            isLoading.value = false
        }
    }

    async function refreshETFUniverse(): Promise<boolean> {
        return loadETFUniverse()
    }

    function resetToDefaults(): void {
        console.log('Resetting ETF universe to defaults')
        etfUniverse.value = {...defaultETFUniverse}
        loadError.value = null

        // Reset selected ETFs based on default universe
        selectedETFs.value = [...Object.values(defaultETFUniverse).flat()]
        lastLoadTime.value = null
    }

    function clearError(): void {
        loadError.value = null
    }

    // Computed properties for API integration
    const hasLoadError = computed(() => loadError.value !== null)
    const isLoadedFromBackend = computed(() => lastLoadTime.value !== null)
    const loadStatus = computed(() => {
        if (isLoading.value) return 'loading'
        if (hasLoadError.value) return 'error'
        if (isLoadedFromBackend.value) return 'loaded'
        return 'default'
    })

    return {
        // State
        etfUniverse,
        enabledCategories,
        selectedETFs,
        isLoading,
        loadError,
        lastLoadTime,
        defaultETFUniverse,

        // Computed
        availableETFs,
        selectableETFs,
        isSelectableETF,
        selectedETFsWithCategories,
        hasLoadError,
        isLoadedFromBackend,
        loadStatus,

        // Actions
        toggleCategory,
        updateSelectedETFs,
        toggleETF,
        selectAllETFs,
        clearAllETFs,
        getCategoryForETF,

        // API Integration Actions
        loadETFUniverse,
        refreshETFUniverse,
        resetToDefaults,
        clearError
    }
})