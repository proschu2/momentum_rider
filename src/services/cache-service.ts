// Cache management service for finance API with localStorage fallback

import { httpClient } from './http-client';
import type { CacheStatus, ApiError } from './types';

export class CacheService {
  private readonly http: typeof httpClient;
  private readonly localCacheKey = 'momentum_rider_cache';
  private readonly localCacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Get data from cache with localStorage fallback
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      // Try localStorage first for quick access
      const localData = this.getFromLocalCache<T>(key);
      if (localData) {
        console.debug(`[CacheService] Found cached data in localStorage for ${key}:`, localData);
        return localData;
      }

      // Try to get from backend cache - backend returns { success: true, key, data }
      const response = await this.http.get<{ success: boolean; key: string; data: T }>(`/cache/${key}`);
      console.debug(`[CacheService] Found cached data in backend for ${key}:`, response);
      
      // Extract the actual data from the response wrapper
      const cachedData = response.data || response;
      this.saveToLocalCache(key, cachedData);
      return cachedData;
    } catch (error) {
      console.warn(`[CacheService] Error getting cached data for ${key}, using localStorage fallback:`, error);
      const fallbackData = this.getFromLocalCache<T>(key);
      console.debug(`[CacheService] Fallback data for ${key}:`, fallbackData);
      return fallbackData;
    }
  }

  /**
   * Save data to cache with localStorage fallback
   */
  async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      // Try to save to backend cache - backend expects { data: any, ttlSeconds?: number }
      await this.http.post(`/cache/${key}`, { data });
    } catch (error) {
      console.warn('Backend cache unavailable, using localStorage fallback:', error);
    } finally {
      // Always save to localStorage as backup
      this.saveToLocalCache(key, data);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.http.delete('/cache');
    } catch (error) {
      console.warn('Error clearing backend cache:', error);
    } finally {
      // Always clear localStorage cache
      this.clearLocalCache();
    }
  }

  /**
   * Get cache status and statistics
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      const backendStatus = await this.http.get<CacheStatus>('/cache/stats');

      // Try to get localStorage statistics
      const localStats = this.getLocalCacheStats();
      return {
        ...backendStatus,
        size: backendStatus.size + localStats.size
      };
    } catch (error) {
      console.warn('Error fetching cache status:', error);

      // Return localStorage statistics as fallback
      const localStats = this.getLocalCacheStats();
      return {
        size: localStats.size,
        hits: localStats.hits,
        misses: localStats.misses,
        hitRate: localStats.hitRate
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
      console.log('Pre-warming cache for tickers:', tickers);

      for (const ticker of tickers) {
        try {
          // Try to fetch from backend
          await this.http.get(`/quote/${ticker}`);
          // Save to localStorage as backup
          // This would be done by the quote service
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

  /**
   * Get data from localStorage cache
   */
  private getFromLocalCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${this.localCacheKey}_${key}`);
      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() - timestamp > this.localCacheTtl) {
        localStorage.removeItem(`${this.localCacheKey}_${key}`);
        return null;
      }

      // Update hit counter (simplified)
      const stats = this.getLocalCacheStats();
      stats.hits++;
      this.saveLocalCacheStats(stats);

      return data as T;
    } catch (error) {
      console.warn('Error reading from localStorage cache:', error);
      return null;
    }
  }

  /**
   * Save data to localStorage cache
   */
  private saveToLocalCache<T>(key: string, data: T): void {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${this.localCacheKey}_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Error saving to localStorage cache:', error);
    }
  }

  /**
   * Clear localStorage cache
   */
  private clearLocalCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localCacheKey)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing localStorage cache:', error);
    }
  }

  /**
   * Get localStorage cache statistics
   */
  private getLocalCacheStats(): Omit<CacheStatus, 'size'> & { size: number } {
    try {
      const stats = localStorage.getItem(`${this.localCacheKey}_stats`);
      if (stats) {
        return JSON.parse(stats);
      }

      return { size: 0, hits: 0, misses: 0, hitRate: 0 };
    } catch (error) {
      return { size: 0, hits: 0, misses: 0, hitRate: 0 };
    }
  }

  /**
   * Save localStorage cache statistics
   */
  private saveLocalCacheStats(stats: { size: number; hits: number; misses: number; hitRate: number }): void {
    try {
      stats.hitRate = stats.hits / (stats.hits + stats.misses) || 0;
      localStorage.setItem(`${this.localCacheKey}_stats`, JSON.stringify(stats));
    } catch (error) {
      console.warn('Error saving localStorage cache stats:', error);
    }
  }
}

// Create a default instance for convenience
export const cacheService = new CacheService();