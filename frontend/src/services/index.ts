// Main exports for finance API services

export * from './types';

export { httpClient, HttpClient } from './http-client';
export { momentumService, MomentumService } from './momentum-service';
export { quoteService, QuoteService } from './quote-service';
export { cacheService, CacheService } from './cache-service';
export { healthCheckService, HealthCheckService, type HealthStatus } from './health-check-service';
export { etfService, ETFService } from './etf-service';
export type {
  ETFUniverseResponse,
  CustomETFsResponse,
  ETFValidationResponse,
  AddCustomETFRequest,
  UpdateCustomETFRequest,
  AddCustomETFResponse
} from './etf-service';

// Re-export for backward compatibility
export { momentumService as financeAPI } from './momentum-service';