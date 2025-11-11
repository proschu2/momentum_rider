// Cache service for API response caching

import { apiClient } from './api-client';

export class CacheService {
  private readonly http: typeof apiClient;

  constructor(apiClientInstance?: typeof apiClient) {
    this.http = apiClientInstance || apiClient;
  }

  /**
   * Clear application cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.http.delete('/cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      return await this.http.get('/cache/stats');
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a specific pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.http.post('/cache/invalidate', { pattern });
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
      throw error;
    }
  }
}

// Create a default instance for convenience
export const cacheService = new CacheService();
