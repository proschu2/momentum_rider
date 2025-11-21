/**
 * ETF Service for backend API integration
 * Handles loading custom ETF universe from the backend
 */

import { apiClient } from './api-client'
import type { ETFUniverse, ApiError } from './types'

// API Response Types
export interface ETFUniverseResponse {
  universe: ETFUniverse
  categories: string[]
}

export interface CustomETFMetadata {
  ticker: string
  category?: string
  expenseRatio?: number
  inceptionDate?: string
  notes?: string
  name?: string
  isCustom?: boolean
}

export interface CustomETFsResponse {
  etfs: CustomETFMetadata[]
  count: number
}

export interface ETFValidationResponse {
  ticker: string
  isValid: boolean
  name?: string
  price?: number
  currency?: string
  marketState?: string
  error?: string
}

export interface QuoteResponse {
  ticker: string
  shortName: string
  longName: string
  regularMarketPrice: number
  marketState: string
  currency: string
  quoteType: string
  regularMarketChangePercent?: number
  regularMarketPreviousClose?: number
  marketCap?: number
  regularMarketVolume?: number
}

export interface AddCustomETFRequest {
  ticker: string
  category?: string
  expenseRatio?: number
  inceptionDate?: string
  notes?: string
  bypassValidation?: boolean
}

export interface UpdateCustomETFRequest {
  category?: string
  expenseRatio?: number
  inceptionDate?: string
  notes?: string
}

export interface AddCustomETFResponse {
  message: string
  etf: CustomETFMetadata
}

/**
 * ETF Service class for interacting with ETF-related endpoints
 */
export class ETFService {
  private readonly apiClient = apiClient

  /**
   * Default ETF universe to use as fallback
   */
  private readonly defaultETFUniverse: ETFUniverse = {
    STOCKS: ['VTI', 'VEA', 'VWO'],
    BONDS: ['TLT', 'BWX', 'BND'],
    COMMODITIES: ['PDBC', 'GLDM'],
    ALTERNATIVES: ['IBIT']
  }

  /**
   * Load ETF universe from backend with fallback to defaults
   */
  async loadETFUniverse(): Promise<ETFUniverse> {
    try {
      console.log('Loading ETF universe from backend...')
      const response = await this.apiClient.get<ETFUniverseResponse>('/etfs/universe')

      if (response?.universe) {
        console.log('Successfully loaded ETF universe from backend:', response.universe)
        return response.universe
      } else {
        console.warn('Invalid response structure from ETF universe endpoint, using defaults')
        return this.defaultETFUniverse
      }
    } catch (error) {
      console.error('Failed to load ETF universe from backend:', error)

      // Log specific error details
      if (this.isApiError(error)) {
        console.error('API Error details:', {
          message: error.message,
          code: error.code,
          status: error.status
        })
      }

      console.log('Falling back to default ETF universe')
      return this.defaultETFUniverse
    }
  }

  /**
   * Get all custom ETFs from backend
   */
  async getCustomETFs(): Promise<CustomETFsResponse> {
    try {
      const response = await this.apiClient.get<CustomETFsResponse>('/etfs/custom')
      return response
    } catch (error) {
      console.error('Failed to get custom ETFs:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Add a new custom ETF
   */
  async addCustomETF(request: AddCustomETFRequest): Promise<AddCustomETFResponse> {
    try {
      const response = await this.apiClient.post<AddCustomETFResponse>('/etfs/custom', request)
      return response
    } catch (error) {
      console.error('Failed to add custom ETF:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Update an existing custom ETF
   */
  async updateCustomETF(ticker: string, updates: UpdateCustomETFRequest): Promise<AddCustomETFResponse> {
    try {
      const response = await this.apiClient.put<AddCustomETFResponse>(`/etfs/custom/${ticker}`, updates)
      return response
    } catch (error) {
      console.error('Failed to update custom ETF:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Remove a custom ETF
   */
  async removeCustomETF(ticker: string): Promise<{ message: string }> {
    try {
      const response = await this.apiClient.delete<{ message: string }>(`/etfs/custom/${ticker}`)
      return response
    } catch (error) {
      console.error('Failed to remove custom ETF:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Validate an ETF ticker
   */
  async validateETF(ticker: string): Promise<ETFValidationResponse> {
    try {
      const response = await this.apiClient.get<ETFValidationResponse>(`/etfs/validate/${ticker}`)
      return response
    } catch (error) {
      console.error('Failed to validate ETF:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Validate all custom ETFs (admin endpoint)
   */
  async validateAllCustomETFs(): Promise<{
    message: string
    validCount: number
    invalidCount: number
    invalidETFs: string[]
  }> {
    try {
      const response = await this.apiClient.post<any>('/etfs/validate-all', {})
      return response
    } catch (error) {
      console.error('Failed to validate all custom ETFs:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get quote information for a specific ticker with localStorage caching
   */
  async getQuote(ticker: string): Promise<QuoteResponse> {
    // Check localStorage cache first (5 minutes TTL)
    const cacheKey = `quote_${ticker}`
    const cachedData = this.getCachedQuote(cacheKey)
    if (cachedData) {
      console.log(`Using cached quote data for ${ticker}`)
      return cachedData
    }

    try {
      const response = await this.apiClient.get<any>(`/quote/${ticker}`)

      // Extract the relevant fields from the quote response
      const quoteData: QuoteResponse = {
        ticker: response.symbol || ticker,
        shortName: response.shortName || `${ticker} ETF`,
        longName: response.longName || response.shortName || `${ticker} ETF`,
        regularMarketPrice: response.regularMarketPrice || 0,
        marketState: response.marketState || 'UNKNOWN',
        currency: response.currency || 'USD',
        quoteType: response.quoteType || 'ETF',
        regularMarketChangePercent: response.regularMarketChangePercent,
        regularMarketPreviousClose: response.previousClose,
        marketCap: response.marketCap,
        regularMarketVolume: response.regularMarketVolume
      }

      // Cache the result in localStorage
      this.setCachedQuote(cacheKey, quoteData)
      console.log(`Fetched and cached quote data for ${ticker}:`, quoteData.shortName)

      return quoteData
    } catch (error) {
      console.error(`Failed to get quote for ${ticker}:`, error)

      // Return a fallback response instead of throwing
      const fallbackData: QuoteResponse = {
        ticker,
        shortName: `${ticker} ETF`,
        longName: `${ticker} Exchange Traded Fund`,
        regularMarketPrice: 0,
        marketState: 'UNKNOWN',
        currency: 'USD',
        quoteType: 'ETF'
      }

      return fallbackData
    }
  }

  /**
   * Get quotes for multiple tickers (batch request)
   */
  async getBatchQuotes(tickers: string[]): Promise<QuoteResponse[]> {
    try {
      const promises = tickers.map(ticker => this.getQuote(ticker))
      const quotes = await Promise.all(promises)
      return quotes
    } catch (error) {
      console.error('Failed to get batch quotes:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Check if the backend API is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      await this.apiClient.get('/health')
      return true
    } catch (error) {
      console.warn('Backend health check failed:', error)
      return false
    }
  }

  /**
   * Type guard to check if error is an ApiError
   */
  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'message' in error
  }

  /**
   * Handle API errors and convert to user-friendly messages
   */
  private handleError(error: any): Error {
    if (this.isApiError(error)) {
      const message = error.code === 'NETWORK_ERROR'
        ? 'Network error: Unable to connect to the server. Please check your connection.'
        : error.status === 401
        ? 'Authentication required. Please log in again.'
        : error.status === 403
        ? 'Permission denied. You do not have access to this feature.'
        : error.status === 404
        ? 'The requested resource was not found.'
        : error.status === 500
        ? 'Server error. Please try again later.'
        : error.message || 'An unexpected error occurred.'

      return new Error(message)
    }

    if (error instanceof Error) {
      return error
    }

    return new Error('An unexpected error occurred.')
  }

  /**
   * Get cached quote data from localStorage
   */
  private getCachedQuote(cacheKey: string): QuoteResponse | null {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const cacheAge = Date.now() - timestamp

      // 5 minutes TTL (300,000 ms)
      if (cacheAge > 300000) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return data
    } catch (error) {
      console.warn('Failed to parse cached quote data:', error)
      localStorage.removeItem(cacheKey)
      return null
    }
  }

  /**
   * Cache quote data in localStorage
   */
  private setCachedQuote(cacheKey: string, data: QuoteResponse): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
    } catch (error) {
      console.warn('Failed to cache quote data:', error)
    }
  }
}

// Create and export a singleton instance
export const etfService = new ETFService()

// Export types for use in components - these are already defined in the file
// No need to re-export them to avoid conflicts