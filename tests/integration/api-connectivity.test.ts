// Integration tests for API connectivity and endpoint validation

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { httpClient } from '../../src/services/http-client';
import { momentumService } from '../../src/services/momentum-service';
import { quoteService } from '../../src/services/quote-service';
import { cacheService } from '../../src/services/cache-service';

// Test configuration
const TEST_TICKERS = ['AAPL', 'MSFT', 'GOOGL'];
const TEST_TIMEOUT = 30000; // 30 seconds for API calls

describe('API Connectivity Integration Tests', () => {
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

  describe('Backend Endpoint Validation', () => {
    it('should connect to backend health endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const result = await httpClient.testConnection();
      expect(result.isConnected).toBe(true);
      expect(result.latency).toBeLessThan(5000); // Should respond within 5 seconds
    }, TEST_TIMEOUT);

    it('should access momentum endpoint for single ticker', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const result = await momentumService.calculateMomentum('AAPL');
      expect(result).toHaveProperty('ticker', 'AAPL');
      expect(result).toHaveProperty('periods');
      expect(result.periods).toHaveProperty('3month');
      expect(result.periods).toHaveProperty('6month');
      expect(result.periods).toHaveProperty('9month');
      expect(result.periods).toHaveProperty('12month');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('absoluteMomentum');
    }, TEST_TIMEOUT);

    it('should access batch momentum endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const results = await momentumService.calculateBatchMomentum(TEST_TICKERS);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(TEST_TICKERS.length);

      // Each result should have the expected structure
      results.forEach((result, index) => {
        expect(result).toHaveProperty('ticker', TEST_TICKERS[index]);
        expect(result).toHaveProperty('periods');
        expect(result).toHaveProperty('average');
        expect(result).toHaveProperty('absoluteMomentum');
      });
    }, TEST_TIMEOUT);

    it('should access quote endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const result = await quoteService.getQuote('AAPL');
      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('price');
      expect(typeof result.price).toBe('number');
      expect(result.price).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should access cache endpoints', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      // Test cache set/get
      const testKey = 'integration_test_key';
      const testData = { test: 'data', timestamp: Date.now() };

      await cacheService.setCachedData(testKey, testData);
      const retrievedData = await cacheService.getCachedData<typeof testData>(testKey);

      expect(retrievedData).toEqual(testData);

      // Test cache status
      const cacheStatus = await cacheService.getCacheStatus();
      expect(cacheStatus).toHaveProperty('size');
      expect(cacheStatus).toHaveProperty('hits');
      expect(cacheStatus).toHaveProperty('misses');
      expect(cacheStatus).toHaveProperty('hitRate');
    }, TEST_TIMEOUT);
  });

  describe('Error Handling Scenarios', () => {
    it('should handle invalid ticker gracefully', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const invalidTicker = 'INVALID_TICKER_12345';
      const result = await momentumService.calculateMomentum(invalidTicker);

      // Should return fallback data with error
      expect(result).toHaveProperty('ticker', invalidTicker);
      expect(result).toHaveProperty('error');
      expect(result.periods['3month']).toBe(0);
      expect(result.periods['6month']).toBe(0);
      expect(result.periods['9month']).toBe(0);
      expect(result.periods['12month']).toBe(0);
      expect(result.average).toBe(0);
      expect(result.absoluteMomentum).toBe(false);
    }, TEST_TIMEOUT);

    it('should handle batch with mixed valid/invalid tickers', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const mixedTickers = ['AAPL', 'INVALID_TICKER_12345', 'MSFT'];
      const results = await momentumService.calculateBatchMomentum(mixedTickers);

      expect(results.length).toBe(mixedTickers.length);

      // Check valid tickers
      const aaplResult = results.find(r => r.ticker === 'AAPL');
      expect(aaplResult).toBeDefined();
      expect(aaplResult?.error).toBeUndefined();

      // Check invalid ticker
      const invalidResult = results.find(r => r.ticker === 'INVALID_TICKER_12345');
      expect(invalidResult).toBeDefined();
      expect(invalidResult?.error).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const concurrentRequests = [
        momentumService.calculateMomentum('AAPL'),
        momentumService.calculateMomentum('MSFT'),
        quoteService.getQuote('GOOGL'),
        cacheService.getCacheStatus()
      ];

      const results = await Promise.all(concurrentRequests);
      expect(results.length).toBe(4);

      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    }, TEST_TIMEOUT);

    it('should complete batch requests within reasonable time', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping test - backend unavailable');
        return;
      }

      const startTime = Date.now();
      const results = await momentumService.calculateBatchMomentum(TEST_TICKERS);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(TEST_TICKERS.length);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, TEST_TIMEOUT);
  });

  describe('Fallback Mechanisms', () => {
    it('should use fallback data when backend is unavailable', async () => {
      // Temporarily force offline mode
      const originalIsOffline = momentumService.isBackendOffline();
      momentumService.resetOfflineStatus();

      // Mock backend as unavailable
      const mockError = new Error('Network error');
      jest.spyOn(httpClient, 'get').mockRejectedValue(mockError);

      const result = await momentumService.calculateMomentum('AAPL');

      // Should return fallback data
      expect(result).toHaveProperty('ticker', 'AAPL');
      expect(result).toHaveProperty('error');
      expect(result.periods['3month']).toBe(0);
      expect(result.periods['6month']).toBe(0);
      expect(result.periods['9month']).toBe(0);
      expect(result.periods['12month']).toBe(0);
      expect(result.average).toBe(0);
      expect(result.absoluteMomentum).toBe(false);

      // Restore
      jest.restoreAllMocks();
      if (originalIsOffline) {
        // If it was originally offline, we can't reset it to offline state
        // The service should handle this automatically
      }
    }, TEST_TIMEOUT);
  });
});

// Helper function to run connectivity tests
export async function runConnectivityTests(): Promise<{
  isConnected: boolean;
  endpoints: { [key: string]: boolean };
  errors: string[];
}> {
  const results = {
    isConnected: false,
    endpoints: {} as { [key: string]: boolean },
    errors: [] as string[]
  };

  try {
    // Test basic connectivity
    const connectionResult = await httpClient.testConnection();
    results.isConnected = connectionResult.isConnected;

    if (results.isConnected) {
      // Test individual endpoints
      const endpoints = [
        { name: 'momentum', test: () => momentumService.calculateMomentum('AAPL') },
        { name: 'batch', test: () => momentumService.calculateBatchMomentum(['AAPL']) },
        { name: 'quote', test: () => quoteService.getQuote('AAPL') },
        { name: 'cache', test: () => cacheService.getCacheStatus() }
      ];

      for (const endpoint of endpoints) {
        try {
          await endpoint.test();
          results.endpoints[endpoint.name] = true;
        } catch (error) {
          results.endpoints[endpoint.name] = false;
          results.errors.push(`${endpoint.name} endpoint failed: ${error}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Connectivity test failed: ${error}`);
  }

  return results;
}