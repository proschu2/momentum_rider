/**
 * Composable for managing ETF universe loading and state
 * Provides easy integration with the ETF configuration store
 */

import { computed, onMounted, watch, type Ref } from 'vue'
import { useETFConfigStore } from '@/stores/etf-config'
import type { ETFUniverse } from '@/stores/types'

export interface ETFUniverseComposable {
  // State (as refs for reactivity)
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  error: Ref<string | null>
  isLoadedFromBackend: Ref<boolean>
  loadStatus: Ref<'loading' | 'error' | 'loaded' | 'default'>
  lastLoadTime: Ref<Date | null>

  // Data (as refs for reactivity)
  etfUniverse: Ref<ETFUniverse>
  availableETFs: Ref<string[]>

  // Actions
  loadETFUniverse: () => Promise<boolean>
  refreshETFUniverse: () => Promise<boolean>
  resetToDefaults: () => void
  clearError: () => void
  retryLoad: () => Promise<boolean>
}

/**
 * Composable for managing ETF universe
 * @param autoLoad - Whether to automatically load the universe on mount (default: true)
 * @returns ETF universe management interface
 */
export function useETFUniverse(autoLoad: boolean = true): ETFUniverseComposable {
  const store = useETFConfigStore()

  // Computed properties
  const isLoading = computed(() => store.isLoading)
  const hasError = computed(() => store.hasLoadError)
  const error = computed(() => store.loadError)
  const isLoadedFromBackend = computed(() => store.isLoadedFromBackend)
  const loadStatus = computed(() => store.loadStatus)
  const lastLoadTime = computed(() => store.lastLoadTime)
  const etfUniverse = computed(() => store.etfUniverse)
  const availableETFs = computed(() => store.availableETFs)

  // Actions
  const loadETFUniverse = async (): Promise<boolean> => {
    return store.loadETFUniverse()
  }

  const refreshETFUniverse = async (): Promise<boolean> => {
    return store.refreshETFUniverse()
  }

  const resetToDefaults = (): void => {
    store.resetToDefaults()
  }

  const clearError = (): void => {
    store.clearError()
  }

  const retryLoad = async (): Promise<boolean> => {
    clearError()
    return loadETFUniverse()
  }

  // Auto-load on mount if requested
  onMounted(() => {
    if (autoLoad && !isLoadedFromBackend.value && !isLoading.value) {
      // Load the universe in the background without blocking
      loadETFUniverse().catch(error => {
        console.warn('Failed to auto-load ETF universe:', error)
      })
    }
  })

  return {
    // State (as refs for reactivity)
    isLoading,
    hasError,
    error,
    isLoadedFromBackend,
    loadStatus,
    lastLoadTime,

    // Data (as refs for reactivity)
    etfUniverse,
    availableETFs,

    // Actions
    loadETFUniverse,
    refreshETFUniverse,
    resetToDefaults,
    clearError,
    retryLoad
  }
}

/**
 * Watch for ETF universe changes and execute callbacks
 */
export function watchETFUniverse(
  callback: (universe: ETFUniverse) => void,
  immediate: boolean = true
) {
  const store = useETFConfigStore()

  return watch(
    () => store.etfUniverse,
    (newUniverse) => {
      callback(newUniverse)
    },
    { immediate, deep: true }
  )
}

/**
 * Utility composable for checking ETF universe health
 */
export function useETFUniverseHealth() {
  const { isLoading, hasError, error, isLoadedFromBackend, loadStatus } = useETFUniverse(false)

  const isHealthy = computed(() => {
    return !hasError.value && (isLoadedFromBackend.value || loadStatus.value === 'default')
  })

  const healthStatus = computed(() => {
    if (isLoading.value) return 'loading'
    if (hasError.value) return 'error'
    if (isLoadedFromBackend.value) return 'healthy-backend'
    return 'healthy-default'
  })

  const healthMessage = computed(() => {
    switch (healthStatus.value) {
      case 'loading':
        return 'Loading ETF universe...'
      case 'error':
        return error.value || 'Failed to load ETF universe'
      case 'healthy-backend':
        return 'ETF universe loaded from backend successfully'
      case 'healthy-default':
        return 'Using default ETF universe (backend unavailable)'
      default:
        return 'Unknown status'
    }
  })

  return {
    isHealthy,
    healthStatus,
    healthMessage
  }
}

/**
 * Composable for managing ETF loading with retry logic
 */
export function useETFUniverseWithRetry(maxRetries: number = 3, retryDelay: number = 2000) {
  const {
    isLoading,
    hasError,
    error,
    isLoadedFromBackend,
    loadStatus,
    etfUniverse,
    availableETFs,
    loadETFUniverse,
    refreshETFUniverse,
    resetToDefaults,
    clearError
  } = useETFUniverse(false) // Don't auto-load, we'll handle retries

  let retryCount = 0

  const loadWithRetry = async (): Promise<boolean> => {
    retryCount = 0

    while (retryCount < maxRetries) {
      try {
        const success = await loadETFUniverse()
        if (success) {
          return true
        }
      } catch (error) {
        console.warn(`ETF universe load attempt ${retryCount + 1} failed:`, error)
      }

      retryCount++

      if (retryCount < maxRetries) {
        console.log(`Retrying ETF universe load in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }

    console.error(`Failed to load ETF universe after ${maxRetries} attempts`)
    return false
  }

  const retryLoad = async (): Promise<boolean> => {
    clearError()
    return loadWithRetry()
  }

  // Auto-load with retry on mount
  onMounted(() => {
    loadWithRetry().catch(error => {
      console.error('ETF universe auto-load with retry failed:', error)
    })
  })

  return {
    isLoading,
    hasError,
    error,
    isLoadedFromBackend,
    loadStatus,
    etfUniverse,
    availableETFs,
    retryCount: computed(() => retryCount),
    maxRetries,

    // Actions
    loadWithRetry,
    retryLoad,
    refreshETFUniverse,
    resetToDefaults,
    clearError
  }
}

export default useETFUniverse