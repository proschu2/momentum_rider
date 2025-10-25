// Financial API service for ETF data
// Using backend API to avoid CORS issues and leverage yahoo-finance2

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface MomentumResult {
  ticker: string;
  periods: {
    '3month': number;
    '6month': number;
    '9month': number;
    '12month': number;
  };
  average: number;
  absoluteMomentum: boolean;
  error?: string;
}

class FinanceAPIService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  /**
   * Fetch data from backend API with error handling
   */
  private async fetchBackendData(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  }

  /**
   * Calculate momentum for a ticker across different periods using backend API
   */
  async calculateMomentum(ticker: string, includeName: boolean = false): Promise<MomentumResult> {
    try {
      const url = `${this.API_BASE_URL}/momentum/${ticker}?includeName=${includeName}`;
      const result = await this.fetchBackendData(url);
      return result;
    } catch (error) {
      console.error(`Error calculating momentum for ${ticker}:`, error);
      return {
        ticker,
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false,
        error: error instanceof Error ? error.message : 'Failed to calculate momentum',
      };
    }
  }

  /**
   * Get current quote for a ticker
   */
  async getCurrentQuote(ticker: string) {
    try {
      const url = `${this.API_BASE_URL}/quote/${ticker}`;
      return await this.fetchBackendData(url);
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      throw new Error(`Failed to fetch quote for ${ticker}`);
    }
  }

  /**
   * Batch momentum calculation for multiple tickers
   */
  async calculateBatchMomentum(tickers: string[]): Promise<MomentumResult[]> {
    try {
      const url = `${this.API_BASE_URL}/momentum/batch`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickers }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in batch momentum calculation:', error);
      // Fallback to individual calls
      const results: MomentumResult[] = [];
      for (const ticker of tickers) {
        const result = await this.calculateMomentum(ticker);
        results.push(result);
        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return results;
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      const url = `${this.API_BASE_URL}/cache`;
      await fetch(url, { method: 'DELETE' });
    } catch (error) {
      console.warn('Error clearing backend cache:', error);
    }
  }
}

export const financeAPI = new FinanceAPIService();