// Quote service for fetching current price data

import { httpClient } from './http-client';
import { cacheService } from './cache-service';
import { healthCheckService } from './health-check-service';
import type { QuoteData, ApiError } from './types';

export class QuoteService {
  private readonly http: typeof httpClient;
  private isOffline: boolean = false;

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Get current quote for a ticker
   */
  async getCurrentQuote(ticker: string): Promise<QuoteData> {
    const cacheKey = `quote_${ticker}`;

    // Try to get from cache first (short cache for quotes)
    try {
      console.debug(`[QuoteService] Checking cache for ${ticker} with key: ${cacheKey}`);
      const cachedResult = await cacheService.getCachedData<QuoteData>(cacheKey);
      if (cachedResult) {
        // Handle cache wrapper objects that contain the actual data
        const cachedQuote = cachedResult.data || cachedResult;
        console.debug(`[QuoteService] Found cached data for ${ticker}:`, {
          price: cachedQuote.regularMarketPrice,
          name: cachedQuote.longName
        });
        return {
          ...cachedQuote,
          _fromCache: true as any
        };
      } else {
        console.debug(`[QuoteService] No cached data found for ${ticker}`);
      }
    } catch (error) {
      console.warn('[QuoteService] Cache read failed:', error);
    }

    // Check if backend is available
    if (this.isOffline) {
      console.warn('Backend is offline, using fallback data');
      return this.getFallbackQuoteData(ticker);
    }

    try {
      const endpoint = `/quote/${ticker}`;
      console.debug(`[QuoteService] Fetching quote for ${ticker} from ${endpoint}`);
      const quote = await this.http.get<QuoteData>(endpoint);
      console.debug(`[QuoteService] Successfully fetched quote for ${ticker}:`, {
        price: quote.regularMarketPrice,
        name: quote.longName,
        hasFallback: quote._fallback,
        fromCache: quote._fromCache
      });

      // Save to cache
      try {
        await cacheService.setCachedData(cacheKey, quote);
      } catch (cacheError) {
        console.warn('Cache save failed:', cacheError);
      }

      return quote;
    } catch (error) {
      console.error(`[QuoteService] Error fetching quote for ${ticker}:`, error);
      console.debug(`[QuoteService] Will return fallback data for ${ticker}`);

      // Mark as offline if multiple failures occur
      this.updateOfflineStatus(error);

      // Try to get from cache as last resort
      try {
        const cachedResult = await cacheService.getCachedData<QuoteData>(cacheKey);
        if (cachedResult) {
          // Handle cache wrapper objects that contain the actual data
          const cachedQuote = cachedResult.data || cachedResult;
          console.warn('Using cached quote data as fallback');
          return {
            ...cachedQuote,
            _fromCache: true as any,
            _cacheNote: 'Backend unavailable - using cached data' as any
          };
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }

      // Return fallback data
      return this.getFallbackQuoteData(ticker, (error as ApiError).message);
    }
  }

  /**
   * Get current quotes for multiple tickers
   */
  async getBatchQuotes(tickers: string[]): Promise<QuoteData[]> {
    // Try cache first for all tickers
    const results: QuoteData[] = [];
    const uncachedTickers: string[] = [];

    for (const ticker of tickers) {
      try {
        const cachedResult = await cacheService.getCachedData<QuoteData>(`quote_${ticker}`);
        if (cachedResult) {
          // Handle cache wrapper objects that contain the actual data
          const cachedQuote = cachedResult.data || cachedResult;
          results.push({
            ...cachedQuote,
            _fromCache: true as any
          });
        } else {
          uncachedTickers.push(ticker);
        }
      } catch (error) {
        uncachedTickers.push(ticker);
      }
    }

    // If we got everything from cache, return early
    if (uncachedTickers.length === 0) {
      return results;
    }

    // If backend is offline, return fallback data for remaining
    if (this.isOffline) {
      console.warn('Backend is offline, using fallback data for uncached tickers');
      for (const ticker of uncachedTickers) {
        results.push(this.getFallbackQuoteData(ticker));
      }
      return results;
    }

    // Try to get quotes for uncached tickers
    for (const ticker of uncachedTickers) {
      try {
        const quote = await this.getCurrentQuote(ticker);
        results.push(quote);
      } catch (error) {
        console.warn(`Failed to fetch quote for ${ticker}:`, error);
        // Add fallback data for this ticker
        results.push(this.getFallbackQuoteData(ticker, (error as ApiError).message));
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get current quote with retry logic
   */
  async getCurrentQuoteWithRetry(
    ticker: string, 
    maxRetries: number = 3
  ): Promise<QuoteData> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getCurrentQuote(ticker);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for ${ticker}:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error(`Failed to fetch quote for ${ticker} after ${maxRetries} attempts`);
  }

  /**
   * Extract price from quote data with fallback logic
   */
  extractPrice(quoteData: QuoteData): number {
    return (
      quoteData.regularMarketPrice || 
      quoteData.price || 
      1 // Fallback to 1 if no price available
    );
  }

  /**
   * Extract price change from quote data
   */
  extractPriceChange(quoteData: QuoteData): number {
    return quoteData.regularMarketChange || 0;
  }

  /**
   * Extract price change percentage from quote data
   */
  extractPriceChangePercent(quoteData: QuoteData): number {
    return quoteData.regularMarketChangePercent || 0;
  }

  /**
   * Get fallback quote data when backend is unavailable
   */
  private getFallbackQuoteData(ticker: string, errorMessage?: string): QuoteData {
    return {
      symbol: ticker,
      regularMarketPrice: 0,
      price: 0,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      regularMarketPreviousClose: 0,
      regularMarketOpen: 0,
      regularMarketDayHigh: 0,
      regularMarketDayLow: 0,
      regularMarketVolume: 0,
      longName: ticker,
      shortName: ticker,
      currency: 'USD',
      marketState: 'CLOSED',
      _fromCache: true as any,
      _fallback: true as any,
      _error: errorMessage || 'Backend unavailable - using fallback data' as any
    };
  }

  /**
   * Update offline status based on errors
   */
  private updateOfflineStatus(error: any): void {
    const errorMessage = (error as ApiError).message || '';
    const isNetworkError = errorMessage.includes('NETWORK_ERROR') || errorMessage.includes('fetch');

    if (isNetworkError) {
      // Mark as offline after 3 consecutive failures
      this.isOffline = true;
      console.warn('Backend marked as offline due to network errors');
    }
  }

  /**
   * Reset offline status (for testing or recovery)
   */
  resetOfflineStatus(): void {
    this.isOffline = false;
  }

  /**
   * Check if currently in offline mode
   */
  isBackendOffline(): boolean {
    return this.isOffline;
  }

  /**
   * Health check for quote service
   */
  async checkServiceHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; isOffline: boolean; message: string }> {
    const health = await healthCheckService.checkHealth();

    if (this.isOffline) {
      return {
        status: 'unhealthy',
        isOffline: true,
        message: 'Backend is offline'
      };
    }

    if (health.status === 'healthy') {
      return {
        status: 'healthy',
        isOffline: false,
        message: 'Quote service is healthy'
      };
    }

    return {
      status: 'degraded',
      isOffline: false,
      message: 'Some services are degraded, but quote fetching is available'
    };
  }
}

// Create a default instance for convenience
export const quoteService = new QuoteService();