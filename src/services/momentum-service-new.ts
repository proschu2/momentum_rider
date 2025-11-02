// Momentum calculation service for ETF data

import { apiClient } from './api-client';
import type { MomentumResult, BatchMomentumRequest, ApiError } from './types';

// Optimization types for backend linear programming
export interface OptimizationInput {
  currentHoldings: Array<{
    name: string;
    shares: number;
    price: number;
  }>;
  targetETFs: Array<{
    name: string;
    targetPercentage: number;
    allowedDeviation?: number;
    pricePerShare: number;
  }>;
  extraCash: number;
  optimizationStrategy?: 'minimize-leftover' | 'maximize-shares' | 'momentum-weighted';
}

export interface OptimizationOutput {
  solverStatus: 'optimal' | 'infeasible' | 'heuristic' | 'error';
  allocations: Array<{
    etfName: string;
    currentShares: number;
    sharesToBuy: number;
    finalShares: number;
    costOfPurchase: number;
    finalValue: number;
    targetPercentage: number;
    actualPercentage: number;
    deviation: number;
  }>;
  holdingsToSell: Array<{
    name: string;
    shares: number;
    pricePerShare: number;
    totalValue: number;
  }>;
  optimizationMetrics: {
    totalBudgetUsed: number;
    unusedBudget: number;
    unusedPercentage: number;
    optimizationTime: number;
  };
  fallbackUsed?: boolean;
  cached?: boolean;
  error?: string;
}

export class MomentumService {
  private readonly http: typeof apiClient;

  constructor(apiClientInstance?: typeof apiClient) {
    this.http = apiClientInstance || apiClient;
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
      return await this.http.post<MomentumResult[]>('/batch/momentum', request);
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
  async checkOptimizationHealth(): Promise<{ status: string; service: string; testResult?: any }> {
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
}

// Create a default instance for convenience
export const momentumService = new MomentumService();
