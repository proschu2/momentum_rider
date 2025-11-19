/**
 * Vue plugin for automatic ETF universe initialization
 */

import type { App } from 'vue'
import { useETFConfigStore } from '@/stores/etf-config'
import { shouldUseBackendETFUniverse } from '@/utils/etf-integration'

export interface ETFUniversePluginOptions {
  /**
   * Whether to automatically load the ETF universe on app initialization
   * @default true
   */
  autoLoad?: boolean

  /**
   * Whether to load silently (no console logs)
   * @default false
   */
  silent?: boolean

  /**
   * Timeout for loading in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Whether to prefetch in the background
   * @default true
   */
  prefetch?: boolean

  /**
   * Callback when loading completes (success or failure)
   */
  onLoadComplete?: (result: {
    success: boolean
    source: 'backend' | 'default' | 'error'
    error?: string
  }) => void

  /**
   * Callback when loading fails
   */
  onLoadError?: (error: string) => void
}

/**
 * Vue plugin for ETF universe management
 */
export const ETFUniversePlugin = {
  install(app: App, options: ETFUniversePluginOptions = {}) {
    const {
      autoLoad = true,
      silent = false,
      timeout = 10000,
      prefetch = true,
      onLoadComplete,
      onLoadError
    } = options

    // Provide configuration to the app
    app.provide('etfUniverseOptions', {
      autoLoad,
      silent,
      timeout,
      prefetch,
      onLoadComplete,
      onLoadError
    })

    // Auto-load on app initialization if requested
    if (autoLoad && shouldUseBackendETFUniverse()) {
      // Initialize after app is mounted to avoid blocking
      setTimeout(async () => {
        const store = useETFConfigStore()

        try {
          if (!silent) {
            console.log('🔄 Initializing ETF universe...')
          }

          // Set up timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ETF universe loading timeout')), timeout)
          })

          // Load ETF universe
          const loadPromise = store.loadETFUniverse()

          // Race between loading and timeout
          await Promise.race([loadPromise, timeoutPromise])

          const success = store.isLoadedFromBackend || store.loadStatus !== 'error'

          if (success) {
            if (!silent) {
              console.log(`✅ ETF universe loaded successfully (${store.isLoadedFromBackend ? 'backend' : 'default'})`)
            }
            onLoadComplete?.({
              success: true,
              source: store.isLoadedFromBackend ? 'backend' : 'default'
            })
          } else {
            const error = store.loadError || 'Unknown error'
            if (!silent) {
              console.warn('⚠️ ETF universe loading failed, using defaults:', error)
            }
            onLoadComplete?.({
              success: false,
              source: 'error',
              error
            })
            onLoadError?.(error)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          if (!silent) {
            console.error('❌ ETF universe initialization failed:', errorMessage)
          }
          onLoadComplete?.({
            success: false,
            source: 'error',
            error: errorMessage
          })
          onLoadError?.(errorMessage)
        }

        // Prefetch in background if enabled
        if (prefetch && store.isLoadedFromBackend) {
          setTimeout(() => {
            if (!silent) {
              console.log('🔄 Prefetching ETF universe data...')
            }
            store.refreshETFUniverse().catch(error => {
              if (!silent) {
                console.warn('ETF universe prefetch failed:', error)
              }
            })
          }, 2000) // Delay prefetch to avoid immediate reload
        }
      }, 100) // Small delay to ensure app is ready
    } else if (!shouldUseBackendETFUniverse()) {
      if (!silent) {
        console.log('📋 Using default ETF universe (backend disabled)')
      }
      onLoadComplete?.({
        success: true,
        source: 'default'
      })
    }
  }
}

/**
 * Create ETF universe plugin with default options
 */
export function createETFUniversePlugin(options: ETFUniversePluginOptions = {}) {
  return {
    install(app: App) {
      ETFUniversePlugin.install(app, options)
    }
  }
}

/**
 * Composable to access ETF universe plugin options
 */
export function useETFUniversePluginOptions() {
  return inject('etfUniverseOptions', {
    autoLoad: true,
    silent: false,
    timeout: 10000,
    prefetch: true
  })
}

// Import Vue's inject function
import { inject } from 'vue'

export default ETFUniversePlugin