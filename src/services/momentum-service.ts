// Momentum calculation service for ETF data

import { httpClient } from './http-client';
import type { MomentumResult, BatchMomentumRequest, ApiError } from './types';

export class MomentumService {
  private readonly http: typeof httpClient;

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Calculate momentum for a ticker across different periods using backend API
   */
  async calculateMomentum(ticker: string, includeName: boolean = false): Promise<MomentumResult> {
    try {
      const endpoint = `/momentum/${ticker}?includeName=${includeName}`;
      return await this.http.get<MomentumResult>(endpoint);
    } catch (error) {
      console.error(`Error calculating momentum for ${ticker}:`, error);
      
      // Return fallback result with error
      return {
        ticker,
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false,
        error: (error as ApiError).message || 'Failed to calculate momentum',
      };
    }
  }

  /**
   * Batch momentum calculation for multiple tickers
   */
  async calculateBatchMomentum(tickers: string[]): Promise<MomentumResult[]> {
    try {
      const request: BatchMomentumRequest = { tickers };
      return await this.http.post<MomentumResult[]>('/momentum/batch', request);
    } catch (error) {
      console.error('Error in batch momentum calculation:', error);
      
      // Fallback to individual calls
      const results: MomentumResult[] = [];
      for (const ticker of tickers) {
        const result = await this.calculateMomentum(ticker);
        results.push(result);
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
}

// Create a default instance for convenience
export const momentumService = new MomentumService();