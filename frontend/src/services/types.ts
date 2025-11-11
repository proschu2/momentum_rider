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
  details?: any;
}

export interface HttpClientErrorData {
  message: string;
  code: string;
  status?: number;
}

export interface CacheStatus {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  success?: boolean;
  error?: string;
}

export interface ConnectionTestResult {
  isConnected: boolean;
  latency?: number;
  error?: string;
}

// Re-export store types for convenience
export {
  type Holding,
  type MomentumData,
  type IBITMomentumData,
  type RebalancingOrder,
  type ETFPrice,
  type ETFUniverse,
  type EnabledCategories,
  type RebalancingFrequency,
  type AllocationMethod,
  type AllocationStrategy,
  type AllocationStrategyConfig,
  type BudgetAllocationResult,
  type BuyOrderData,
  type PromotionStrategy,
  type OptimizationInput,
  type OptimizationOutput
} from '../stores/types';

// Additional API types
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface BatchMomentumResponse {
  success: boolean;
  count: number;
  results: MomentumResult[];
  timestamp: string;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  timestamp: string;
  uptime?: number;
  version?: string;
  testResult?: {
    solverStatus: string;
    budgetUtilization: number;
    optimizationTime: number;
  };
  error?: string;
  checks?: {
    [serviceName: string]: {
      status: 'pass' | 'fail' | 'warn';
      duration?: number;
      message?: string;
    };
  };
}

export interface BatchQuoteRequest {
  tickers: string[];
}

export interface BatchQuoteResponse {
  quotes: QuoteData[];
  errors?: {
    ticker: string;
    error: string;
  }[];
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

export interface OptimizationHealthCheck {
  status: 'healthy' | 'unhealthy';
  service: string;
  testResult?: {
    solverStatus: string;
    budgetUtilization: number;
    optimizationTime: number;
  };
  timestamp: string;
  error?: string;
}