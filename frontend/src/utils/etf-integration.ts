/**
 * Utility functions for integrating with ETF universe backend loading
 */

import { useETFConfigStore } from '@/stores/etf-config'
import type { ETFUniverse } from '@/stores/types'

/**
 * Helper to initialize ETF universe in a component
 * This can be called from component setup or lifecycle hooks
 */
export async function initializeETFUniverse(): Promise<{
  success: boolean
  source: 'backend' | 'default' | 'error'
  error?: string
}> {
  const store = useETFConfigStore()

  try {
    // If already loaded from backend, return success
    if (store.isLoadedFromBackend) {
      return { success: true, source: 'backend' }
    }

    // If currently loading, wait for it to complete
    if (store.isLoading) {
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait

      while (store.isLoading && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (store.isLoadedFromBackend) {
        return { success: true, source: 'backend' }
      }
    }

    // Try to load from backend
    const success = await store.loadETFUniverse()

    if (success) {
      return { success: true, source: 'backend' }
    } else {
      return {
        success: true,
        source: 'default',
        error: store.loadError || undefined
      }
    }
  } catch (error) {
    console.error('Failed to initialize ETF universe:', error)
    return {
      success: false,
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if a ticker is valid in the current ETF universe
 */
export function isValidTicker(ticker: string): boolean {
  const store = useETFConfigStore()
  return store.isSelectableETF(ticker)
}

/**
 * Get the category for a ticker
 */
export function getTickerCategory(ticker: string): string | undefined {
  const store = useETFConfigStore()
  return store.getCategoryForETF(ticker)
}

/**
 * Get all tickers in a specific category
 */
export function getTickersInCategory(category: keyof ETFUniverse): string[] {
  const store = useETFConfigStore()
  return store.etfUniverse[category] || []
}

/**
 * Check if a category has any enabled ETFs
 */
export function isCategoryAvailable(category: keyof ETFUniverse): boolean {
  const store = useETFConfigStore()
  return store.enabledCategories[category] && getTickersInCategory(category).length > 0
}

/**
 * Get a summary of the current ETF universe
 */
export function getETFUniverseSummary(): {
  totalTickers: number
  tickersByCategory: Record<string, number>
  selectedTickers: number
  categoriesEnabled: Record<string, boolean>
  loadStatus: string
  isLoadedFromBackend: boolean
} {
  const store = useETFConfigStore()

  const tickersByCategory: Record<string, number> = {}
  let totalTickers = 0

  Object.entries(store.etfUniverse).forEach(([category, tickers]) => {
    tickersByCategory[category] = tickers.length
    totalTickers += tickers.length
  })

  return {
    totalTickers,
    tickersByCategory,
    selectedTickers: store.selectedETFs.length,
    categoriesEnabled: { ...store.enabledCategories },
    loadStatus: store.loadStatus,
    isLoadedFromBackend: store.isLoadedFromBackend
  }
}

/**
 * Format load status for display
 */
export function formatLoadStatus(status: string): string {
  switch (status) {
    case 'loading':
      return 'Loading ETF universe...'
    case 'loaded':
      return 'ETF universe loaded successfully'
    case 'error':
      return 'Failed to load ETF universe (using defaults)'
    case 'default':
      return 'Using default ETF universe'
    default:
      return 'Unknown status'
  }
}

/**
 * Create a reactive ETF universe watcher for components
 */
export function createETFUniverseWatcher(
  callback: (universe: ETFUniverse, metadata: {
    isLoadedFromBackend: boolean
    loadStatus: string
    lastLoadTime: Date | null
  }) => void,
  immediate: boolean = true
) {
  const store = useETFConfigStore()

  return store.$subscribe((mutation, state) => {
    callback(state.etfUniverse, {
      isLoadedFromBackend: store.isLoadedFromBackend,
      loadStatus: store.loadStatus,
      lastLoadTime: store.lastLoadTime
    })
  }, { immediate })
}

/**
 * Utility to test ETF universe API connectivity
 */
export async function testETFUniverseConnectivity(): Promise<{
  isConnected: boolean
  responseTime?: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    const store = useETFConfigStore()
    const success = await store.loadETFUniverse()
    const responseTime = Date.now() - startTime

    return {
      isConnected: success || store.loadStatus === 'default', // Consider default as "connected" since we have a fallback
      responseTime,
      error: store.loadError || undefined
    }
  } catch (error) {
    return {
      isConnected: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Helper to prefetch ETF universe data
 * Useful for warming up the cache or preloading data
 */
export async function prefetchETFUniverse(): Promise<void> {
  try {
    const store = useETFConfigStore()

    // Only prefetch if not already loaded and not currently loading
    if (!store.isLoadedFromBackend && !store.isLoading) {
      await store.loadETFUniverse()
    }
  } catch (error) {
    console.warn('Failed to prefetch ETF universe:', error)
    // Don't throw - prefetch failures should be silent
  }
}

/**
 * Check if we should use backend ETF universe based on configuration
 */
export function shouldUseBackendETFUniverse(): boolean {
  // Check for environment variable override
  if (import.meta.env.VITE_DISABLE_ETF_BACKEND === 'true') {
    return false
  }

  // Check if we're in development and want to use defaults
  if (import.meta.env.DEV && import.meta.env.VITE_USE_DEFAULT_ETFS === 'true') {
    return false
  }

  return true
}