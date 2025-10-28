// Quote service for fetching current price data

import { httpClient } from './http-client';
import type { QuoteData, ApiError } from './types';

export class QuoteService {
  private readonly http: typeof httpClient;

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Get current quote for a ticker
   */
  async getCurrentQuote(ticker: string): Promise<QuoteData> {
    try {
      const endpoint = `/quote/${ticker}`;
      return await this.http.get<QuoteData>(endpoint);
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      throw new Error(`Failed to fetch quote for ${ticker}: ${(error as ApiError).message}`);
    }
  }

  /**
   * Get current quotes for multiple tickers
   */
  async getBatchQuotes(tickers: string[]): Promise<QuoteData[]> {
    try {
      const results: QuoteData[] = [];
      
      for (const ticker of tickers) {
        try {
          const quote = await this.getCurrentQuote(ticker);
          results.push(quote);
        } catch (error) {
          console.warn(`Failed to fetch quote for ${ticker}:`, error);
          // Continue with other tickers even if one fails
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
    } catch (error) {
      console.error('Error in batch quote fetching:', error);
      throw new Error('Failed to fetch batch quotes');
    }
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
}

// Create a default instance for convenience
export const quoteService = new QuoteService();