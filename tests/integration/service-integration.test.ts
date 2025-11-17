// Service integration tests for Momentum Rider

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { momentumService } from '../../src/services/momentum-service';
import { quoteService } from '../../src/services/quote-service';
import { cacheService } from '../../src/services/cache-service';
import { httpClient } from '../../src/services/http-client';
import type { MomentumResult, OptimizationInput, OptimizationOutput } from '../../src/services/types';

// Test configuration
const TEST_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];
const TEST_TIMEOUT = 30000;

describe('Service Integration Tests', () => {
  let isBackendAvailable = false;

  beforeAll(async () => {
    // Test backend connection before running tests
    try {
      const connectionResult = await httpClient.testConnection();
      isBackendAvailable = connectionResult.isConnected;
      console.log(`Backend connection status: ${isBackendAvailable ? 'Connected' : 'Disconnected'}`);
    } catch (error) {
      console.warn('Backend connection test failed:', error);
      isBackendAvailable = false;
    }
  });

  describe('Momentum Service Integration', () => {
    it('should calculate momentum with retry mechanism', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const result = await momentumService.calculateMomentumWithRetry('AAPL', 2);
      expect(result).toHaveProperty('ticker', 'AAPL');
      expect(result).toHaveProperty('periods');
      expect(result.periods).toHaveProperty('3month');
      expect(result.periods).toHaveProperty('6month');
      expect(result.periods).toHaveProperty('9month');
      expect(result.periods).toHaveProperty('12month');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('absoluteMomentum');
    }, TEST_TIMEOUT);

    it('should handle batch momentum with mixed tickers', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const mixedTickers = ['AAPL', 'INVALID_TICKER_12345', 'MSFT', 'INVALID_XYZ'];
      const results = await momentumService.calculateBatchMomentum(mixedTickers);

      expect(results.length).toBe(mixedTickers.length);

      // Check valid tickers
      const validResults = results.filter(r => !r.error);
      const invalidResults = results.filter(r => r.error);

      expect(validResults.length).toBeGreaterThan(0);
      expect(invalidResults.length).toBeGreaterThan(0);

      // Each result should have the expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('ticker');
        expect(result).toHaveProperty('periods');
        expect(result).toHaveProperty('average');
        expect(result).toHaveProperty('absoluteMomentum');
      });
    }, TEST_TIMEOUT);

    it('should check service health status', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const health = await momentumService.checkServiceHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('isOffline');
      expect(health).toHaveProperty('message');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    }, TEST_TIMEOUT);
  });

  describe('Cache Service Integration', () => {
    it('should manage cache lifecycle correctly', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const testKey = 'integration_test_cache_key';
      const testData = { test: 'data', timestamp: Date.now(), nested: { value: 42 } };

      // Test set
      await cacheService.setCachedData(testKey, testData);

      // Test get
      const retrievedData = await cacheService.getCachedData<typeof testData>(testKey);
      expect(retrievedData).toEqual(testData);

      // Test clear specific key
      await cacheService.clearTickerCache(testKey);

      // Test get after clear (should be null)
      const clearedData = await cacheService.getCachedData<typeof testData>(testKey);
      expect(clearedData).toBeNull();
    }, TEST_TIMEOUT);

    it('should handle batch cache operations', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const tickers = ['AAPL', 'MSFT', 'GOOGL'];

      // Set cache for multiple tickers
      for (const ticker of tickers) {
        await cacheService.setCachedData(`momentum_${ticker}_false`, {
          ticker,
          periods: { '3month': 5, '6month': 10, '9month': 15, '12month': 20 },
          average: 12.5,
          absoluteMomentum: true
        });
      }

      // Test batch clear
      await cacheService.clearBatchCache(tickers);

      // Verify cache is cleared
      for (const ticker of tickers) {
        const cachedData = await cacheService.getCachedData(`momentum_${ticker}_false`);
        expect(cachedData).toBeNull();
      }
    }, TEST_TIMEOUT);

    it('should provide cache statistics', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const stats = await cacheService.getCacheStatus();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    }, TEST_TIMEOUT);
  });

  describe('Optimization Service Integration', () => {
    it('should optimize portfolio with valid input', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const input: OptimizationInput = {
        currentHoldings: [
          { name: 'VTI', shares: 10, price: 250 },
          { name: 'VXUS', shares: 20, price: 60 }
        ],
        targetETFs: [
          { name: 'VTI', targetPercentage: 60, pricePerShare: 250 },
          { name: 'VXUS', targetPercentage: 30, pricePerShare: 60 },
          { name: 'BND', targetPercentage: 10, pricePerShare: 80 }
        ],
        extraCash: 5000,
        optimizationStrategy: 'minimize-leftover'
      };

      const result = await momentumService.optimizePortfolio(input);
      expect(result).toHaveProperty('solverStatus');
      expect(result).toHaveProperty('allocations');
      expect(result).toHaveProperty('holdingsToSell');
      expect(result).toHaveProperty('optimizationMetrics');
      expect(Array.isArray(result.allocations)).toBe(true);
      expect(Array.isArray(result.holdingsToSell)).toBe(true);
      expect(result.optimizationMetrics).toHaveProperty('totalBudgetUsed');
      expect(result.optimizationMetrics).toHaveProperty('unusedBudget');
      expect(result.optimizationMetrics).toHaveProperty('unusedPercentage');
      expect(result.optimizationMetrics).toHaveProperty('optimizationTime');
    }, TEST_TIMEOUT);

    it('should check optimization health', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const health = await momentumService.checkOptimizationHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('service', 'portfolio-optimization');
      expect(['healthy', 'unhealthy']).toContain(health.status);

      if (health.status === 'healthy') {
        expect(health).toHaveProperty('testResult');
        expect(health.testResult).toHaveProperty('solverStatus');
        expect(health.testResult).toHaveProperty('budgetUtilization');
        expect(health.testResult).toHaveProperty('optimizationTime');
      }
    }, TEST_TIMEOUT);
  });

  describe('Cross-Service Integration', () => {
    it('should coordinate momentum, cache, and quote services', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const ticker = 'AAPL';

      // Get momentum data
      const momentumResult = await momentumService.calculateMomentum(ticker);
      expect(momentumResult.ticker).toBe(ticker);

      // Get quote data
      const quoteResult = await quoteService.getQuote(ticker);
      expect(quoteResult.symbol).toBe(ticker);

      // Check cache status
      const cacheStatus = await cacheService.getCacheStatus();
      expect(cacheStatus).toHaveProperty('hitRate');

      // Verify momentum data structure
      expect(momentumResult).toHaveProperty('periods');
      expect(momentumResult.periods).toHaveProperty('3month');
      expect(momentumResult.periods).toHaveProperty('6month');
      expect(momentumResult.periods).toHaveProperty('9month');
      expect(momentumResult.periods).toHaveProperty('12month');

      // Verify quote data structure
      expect(quoteResult).toHaveProperty('price');
      expect(typeof quoteResult.price).toBe('number');
      expect(quoteResult.price).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should handle service failures gracefully', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      // Test with invalid ticker that should trigger fallback
      const invalidTicker = 'INVALID_TICKER_XYZ_123';

      const momentumResult = await momentumService.calculateMomentum(invalidTicker);
      expect(momentumResult.ticker).toBe(invalidTicker);
      expect(momentumResult.error).toBeDefined();
      expect(momentumResult.periods['3month']).toBe(0);
      expect(momentumResult.periods['6month']).toBe(0);
      expect(momentumResult.periods['9month']).toBe(0);
      expect(momentumResult.periods['12month']).toBe(0);
      expect(momentumResult.average).toBe(0);
      expect(momentumResult.absoluteMomentum).toBe(false);
    }, TEST_TIMEOUT);
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch requests efficiently', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const largeBatch = Array.from({ length: 20 }, (_, i) => `TEST${i}`);
      const startTime = Date.now();

      const results = await momentumService.calculateBatchMomentum(largeBatch);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(largeBatch.length);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Each result should have expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('ticker');
        expect(result).toHaveProperty('periods');
        expect(result).toHaveProperty('average');
        expect(result).toHaveProperty('absoluteMomentum');
      });
    }, 45000); // Extended timeout for large batch

    it('should maintain performance under concurrent load', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const concurrentRequests = [
        momentumService.calculateMomentum('AAPL'),
        momentumService.calculateMomentum('MSFT'),
        quoteService.getQuote('GOOGL'),
        cacheService.getCacheStatus(),
        momentumService.checkServiceHealth()
      ];

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    }, TEST_TIMEOUT);
  });
});

// Helper function to run service integration tests
export async function runServiceIntegrationTests(): Promise<{
  momentumService: boolean;
  cacheService: boolean;
  optimizationService: boolean;
  crossService: boolean;
  performance: boolean;
  errors: string[];
}> {
  const results = {
    momentumService: false,
    cacheService: false,
    optimizationService: false,
    crossService: false,
    performance: false,
    errors: [] as string[]
  };

  try {
    // Test momentum service
    const momentumResult = await momentumService.calculateMomentum('AAPL');
    results.momentumService = momentumResult.ticker === 'AAPL' &&
                              momentumResult.periods !== undefined;

    // Test cache service
    const cacheStats = await cacheService.getCacheStatus();
    results.cacheService = cacheStats.size !== undefined &&
                          cacheStats.hitRate !== undefined;

    // Test optimization service health
    const optimizationHealth = await momentumService.checkOptimizationHealth();
    results.optimizationService = optimizationHealth.status !== undefined;

    // Test cross-service coordination
    const quoteResult = await quoteService.getQuote('MSFT');
    results.crossService = quoteResult.symbol === 'MSFT' &&
                          quoteResult.price !== undefined;

    // Test performance with small batch
    const batchResults = await momentumService.calculateBatchMomentum(['AAPL', 'MSFT']);
    results.performance = batchResults.length === 2 &&
                         batchResults.every(r => r.ticker !== undefined);

  } catch (error) {
    results.errors.push(`Service integration test failed: ${error}`);
  }

  return results;
}