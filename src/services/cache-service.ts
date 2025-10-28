// Cache management service for finance API

import { httpClient } from './http-client';
import type { CacheStatus, ApiError } from './types';

export class CacheService {
  private readonly http: typeof httpClient;

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.http.delete('/cache');
    } catch (error) {
      console.warn('Error clearing backend cache:', error);
      // Don't throw for cache clearing failures as it's non-critical
    }
  }

  /**
   * Get cache status and statistics
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      return await this.http.get<CacheStatus>('/cache/status');
    } catch (error) {
      console.warn('Error fetching cache status:', error);
      
      // Return default status if cache status endpoint is not available
      return {
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0
      };
    }
  }

  /**
   * Clear cache for specific ticker
   */
  async clearTickerCache(ticker: string): Promise<void> {
    try {
      await this.http.delete(`/cache/${ticker}`);
    } catch (error) {
      console.warn(`Error clearing cache for ${ticker}:`, error);
      // Don't throw for cache clearing failures as it's non-critical
    }
  }

  /**
   * Clear cache for multiple tickers
   */
  async clearBatchCache(tickers: string[]): Promise<void> {
    try {
      for (const ticker of tickers) {
        await this.clearTickerCache(ticker);
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.warn('Error clearing batch cache:', error);
    }
  }

  /**
   * Pre-warm cache for specific tickers
   */
  async prewarmCache(tickers: string[]): Promise<void> {
    try {
      // This would make requests to ensure data is cached
      // Implementation depends on backend API support
      console.log('Pre-warming cache for tickers:', tickers);
      
      // For now, we'll just make the requests to ensure they're cached
      for (const ticker of tickers) {
        try {
          // Make a request to ensure data is cached
          await this.http.get(`/quote/${ticker}`);
        } catch (error) {
          console.warn(`Failed to pre-warm cache for ${ticker}:`, error);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.warn('Error pre-warming cache:', error);
    }
  }
}

// Create a default instance for convenience
export const cacheService = new CacheService();