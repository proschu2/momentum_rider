// Quote service for getting ETF and stock quotes

import { apiClient } from './api-client';
import type { Quote, ApiError } from './types';

export class QuoteService {
  private readonly http: typeof apiClient;

  constructor(apiClientInstance?: typeof apiClient) {
    this.http = apiClientInstance || apiClient;
  }

  /**
   * Get quote for a single ticker
   */
  async getQuote(ticker: string): Promise<Quote> {
    try {
      const endpoint = `/quote/${ticker}`;
      return await this.http.get<Quote>(endpoint);
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      throw new Error(`Failed to fetch quote for ${ticker}: ${(error as ApiError).message}`);
    }
  }

  /**
   * Get quotes for multiple tickers in batch
   */
  async getBatchQuotes(tickers: string[]): Promise<Quote[]> {
    try {
      const endpoint = '/quote/batch';
      const request = { tickers };
      return await this.http.post<Quote[]>(endpoint, request);
    } catch (error) {
      console.error('Error fetching batch quotes:', error);

      // Fallback to individual calls
      const results: Quote[] = [];
      for (const ticker of tickers) {
        try {
          const quote = await this.getQuote(ticker);
          results.push(quote);
        } catch (err) {
          console.warn(`Failed to fetch quote for ${ticker}:`, err);
        }
        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return results;
    }
  }

  /**
   * Get historical price data for a ticker
   */
  async getHistoricalPrices(ticker: string, period: string = '1y'): Promise<any> {
    try {
      const endpoint = `/prices/${ticker}?period=${period}`;
      return await this.http.get(endpoint);
    } catch (error) {
      console.error(`Error fetching historical prices for ${ticker}:`, error);
      throw new Error(`Failed to fetch historical prices: ${(error as ApiError).message}`);
    }
  }
}

// Create a default instance for convenience
export const quoteService = new QuoteService();
