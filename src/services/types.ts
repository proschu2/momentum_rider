// Type definitions for finance API services

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

export interface QuoteData {
  symbol: string;
  regularMarketPrice?: number;
  price?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  longName?: string;
  shortName?: string;
  currency?: string;
  marketState?: string;
  [key: string]: any; // Allow additional properties from API
}

export interface BatchMomentumRequest {
  tickers: string[];
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface CacheStatus {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}