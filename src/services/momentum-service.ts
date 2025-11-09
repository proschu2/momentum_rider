// Momentum calculation service for ETF data

import { httpClient } from './http-client';
import { cacheService } from './cache-service';
import { healthCheckService } from './health-check-service';
import type {
  MomentumResult,
  BatchMomentumRequest,
  BatchMomentumResponse,
  ApiError,
  OptimizationInput,
  OptimizationOutput
} from './types';

export class MomentumService {
  private readonly http: typeof httpClient;
  private isOffline: boolean = false;

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Calculate momentum for a ticker across different periods using backend API
   */
  async calculateMomentum(ticker: string, includeName: boolean = false): Promise<MomentumResult> {
    const cacheKey = `momentum_${ticker}_${includeName}`;

    // Try to get from cache first
    try {
      const cachedResult = await cacheService.getCachedData<MomentumResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }

    // Check if backend is available
    if (this.isOffline) {
      console.warn('Backend is offline, using fallback data');
      return this.getFallbackMomentumData(ticker);
    }

    try {
      const endpoint = `/momentum/${ticker}?includeName=${includeName}`;
      const result = await this.http.get<MomentumResult>(endpoint);

      // Save to cache
      try {
        await cacheService.setCachedData(cacheKey, result);
      } catch (cacheError) {
        console.warn('Cache save failed:', cacheError);
      }

      return result;
    } catch (error) {
      console.error(`Error calculating momentum for ${ticker}:`, error);

      // Mark as offline if multiple failures occur
      this.updateOfflineStatus(error);

      // Try to get from cache as last resort
      try {
        const cachedResult = await cacheService.getCachedData<MomentumResult>(cacheKey);
        if (cachedResult) {
          console.warn('Using cached momentum data as fallback');
          return {
            ...cachedResult,
            error: 'Using cached data - backend unavailable'
          };
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }

      // Return fallback result
      return this.getFallbackMomentumData(ticker, (error as ApiError).message);
    }
  }

  /**
   * Batch momentum calculation for multiple tickers
   */
  async calculateBatchMomentum(tickers: string[]): Promise<MomentumResult[]> {
    // Try cache first for all tickers
    const results: MomentumResult[] = [];
    const uncachedTickers: string[] = [];

    for (const ticker of tickers) {
      try {
        const cachedResult = await cacheService.getCachedData<MomentumResult>(`momentum_${ticker}_false`);
        if (cachedResult) {
          results.push(cachedResult);
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
        results.push(this.getFallbackMomentumData(ticker));
      }
      return results;
    }

    // Try batch endpoint first
    try {
      const request: BatchMomentumRequest = { tickers: uncachedTickers };
      const batchResponse = await this.http.post<BatchMomentumResponse>('/momentum/batch', request);
      const batchResults = batchResponse.results;

      // Merge with cached results
      for (const result of batchResults) {
        results.push(result);
        // Save to cache
        try {
          await cacheService.setCachedData(`momentum_${result.ticker}_false`, result);
        } catch (cacheError) {
          console.warn('Cache save failed:', cacheError);
        }
      }

      return results;
    } catch (error) {
      console.warn('Batch momentum endpoint unavailable, falling back to individual calls:', error);

      // Mark as offline if multiple failures occur
      this.updateOfflineStatus(error);

      // Fallback to individual calls for uncached tickers
      for (const ticker of uncachedTickers) {
        try {
          const result = await this.calculateMomentum(ticker);
          results.push(result);
        } catch (individualError) {
          console.warn(`Failed to calculate momentum for ${ticker}:`, individualError);
          results.push(this.getFallbackMomentumData(ticker, (individualError as ApiError).message));
        }

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return results;
    }
  }

  /**
   * Calculate momentum for a single ticker with custom error handling
   */
  async calculateMomentumWithRetry(
    ticker: string, 
    maxRetries: number = 3
  ): Promise<MomentumResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.calculateMomentum(ticker);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for ${ticker}:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error(`Failed to calculate momentum for ${ticker} after ${maxRetries} attempts`);
  }

  /**
   * Optimize portfolio allocation using backend linear programming
   */
  async optimizePortfolio(input: OptimizationInput): Promise<OptimizationOutput> {
    try {
      return await this.http.post<OptimizationOutput>('/optimization/rebalance', input);
    } catch (error) {
      console.error('Backend optimization failed:', error);
      
      // Return fallback result with error
      return {
        solverStatus: 'error',
        allocations: [],
        holdingsToSell: [],
        optimizationMetrics: {
          totalBudgetUsed: 0,
          unusedBudget: input.extraCash,
          unusedPercentage: 100,
          optimizationTime: 0
        },
        error: (error as ApiError).message || 'Backend optimization service unavailable'
      };
    }
  }

  /**
   * Test optimization service health
   */
  async checkOptimizationHealth(): Promise<{ status: string; service: string; testResult?: any; error?: string }> {
    try {
      return await this.http.get('/optimization/health');
    } catch (error) {
      console.error('Optimization health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'portfolio-optimization',
        error: (error as ApiError).message
      };
    }
  }

  /**
   * Get fallback momentum data when backend is unavailable
   */
  private getFallbackMomentumData(ticker: string, errorMessage?: string): MomentumResult {
    return {
      ticker,
      periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
      average: 0,
      absoluteMomentum: false,
      error: errorMessage || 'Backend unavailable - using fallback data'
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
   * Health check for momentum service
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
        message: 'Momentum service is healthy'
      };
    }

    return {
      status: 'degraded',
      isOffline: false,
      message: 'Some services are degraded, but momentum calculation is available'
    };
  }
}

// Create a default instance for convenience
export const momentumService = new MomentumService();