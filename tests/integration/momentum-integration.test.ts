/**
 * Comprehensive Integration Tests for Momentum Rider
 *
 * Tests all critical endpoints and functionality:
 * - Backend API endpoints (health, momentum, optimization, cache)
 * - Frontend-backend integration
 * - Error handling and fallback mechanisms
 * - TypeScript type consistency
 * - Batch momentum calculations
 * - Portfolio optimization
 * - Cache functionality
 * - Store integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpClient, HttpClient } from '../../src/services/http-client';
import { momentumService } from '../../src/services/momentum-service';
import { healthCheckService } from '../../src/services/health-check-service';
import { cacheService } from '../../src/services/cache-service';
import type {
  MomentumResult,
  BatchMomentumRequest,
  OptimizationInput,
  OptimizationOutput,
  HealthStatus,
  CacheStatus
} from '../../src/services/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
global.localStorage = localStorageMock as any;

describe('Momentum Rider Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Backend API Endpoints', () => {
    describe('Health Endpoint', () => {
      it('should successfully connect to health endpoint', async () => {
        const mockHealthResponse = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          checks: {
            redis: { status: 'pass' },
            cache: { status: 'pass', size: 100 },
            memory: { status: 'pass', heapUsed: 50000000, heapTotal: 100000000 }
          }
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockHealthResponse), { status: 200 })
        );

        const result = await httpClient.get('/health');

        expect(result).toEqual(mockHealthResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/health'),
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should handle health endpoint errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(httpClient.get('/health')).rejects.toThrow();
      });
    });

    describe('Momentum Endpoint', () => {
      it('should calculate momentum for a single ticker', async () => {
        const mockMomentumResponse: MomentumResult = {
          ticker: 'AAPL',
          periods: {
            '3month': 5.2,
            '6month': 8.7,
            '9month': 12.3,
            '12month': 15.8
          },
          average: 10.5,
          absoluteMomentum: true
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockMomentumResponse), { status: 200 })
        );

        const result = await momentumService.calculateMomentum('AAPL');

        expect(result).toEqual(mockMomentumResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/momentum/AAPL'),
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should handle momentum calculation errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Failed to fetch historical data'));

        const result = await momentumService.calculateMomentum('INVALID');

        expect(result.error).toBeDefined();
        expect(result.ticker).toBe('INVALID');
        expect(result.absoluteMomentum).toBe(false);
      });
    });

    describe('Batch Momentum Endpoint', () => {
      it('should calculate momentum for multiple tickers', async () => {
        const mockBatchResponse = {
          success: true,
          count: 2,
          results: [
            {
              ticker: 'AAPL',
              periods: { '3month': 5.2, '6month': 8.7, '9month': 12.3, '12month': 15.8 },
              average: 10.5,
              absoluteMomentum: true
            },
            {
              ticker: 'MSFT',
              periods: { '3month': 3.1, '6month': 6.5, '9month': 9.8, '12month': 13.2 },
              average: 8.15,
              absoluteMomentum: true
            }
          ],
          timestamp: expect.any(String)
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockBatchResponse), { status: 200 })
        );

        const result = await momentumService.calculateBatchMomentum(['AAPL', 'MSFT']);

        expect(result).toHaveLength(2);
        expect(result[0].ticker).toBe('AAPL');
        expect(result[1].ticker).toBe('MSFT');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/batch/momentum'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ tickers: ['AAPL', 'MSFT'] })
          })
        );
      });

      it('should handle batch momentum errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Batch calculation failed'));

        const result = await momentumService.calculateBatchMomentum(['AAPL', 'MSFT']);

        expect(result).toHaveLength(2);
        expect(result[0].ticker).toBe('AAPL');
        expect(result[1].ticker).toBe('MSFT');
      });
    });

    describe('Optimization Endpoint', () => {
      it('should optimize portfolio allocation', async () => {
        const mockOptimizationResponse: OptimizationOutput = {
          solverStatus: 'optimal',
          allocations: [
            { ticker: 'AAPL', allocation: 0.25 },
            { ticker: 'MSFT', allocation: 0.35 },
            { ticker: 'GOOGL', allocation: 0.40 }
          ],
          holdingsToSell: [],
          optimizationMetrics: {
            totalBudgetUsed: 10000,
            unusedBudget: 0,
            unusedPercentage: 0,
            optimizationTime: 0.5
          }
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockOptimizationResponse), { status: 200 })
        );

        const optimizationInput: OptimizationInput = {
          tickers: ['AAPL', 'MSFT', 'GOOGL'],
          currentHoldings: {},
          extraCash: 10000,
          maxPositions: 5,
          allocationStrategy: 'equal-weight'
        };

        const result = await momentumService.optimizePortfolio(optimizationInput);

        expect(result.solverStatus).toBe('optimal');
        expect(result.allocations).toHaveLength(3);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/optimization/rebalance'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(optimizationInput)
          })
        );
      });

      it('should handle optimization errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Optimization service unavailable'));

        const optimizationInput: OptimizationInput = {
          tickers: ['AAPL', 'MSFT'],
          currentHoldings: {},
          extraCash: 5000,
          maxPositions: 3,
          allocationStrategy: 'equal-weight'
        };

        const result = await momentumService.optimizePortfolio(optimizationInput);

        expect(result.solverStatus).toBe('error');
        expect(result.error).toBeDefined();
      });
    });

    describe('Cache Endpoints', () => {
      it('should get cached data successfully', async () => {
        const mockCacheData = {
          ticker: 'AAPL',
          periods: { '3month': 5.2, '6month': 8.7, '9month': 12.3, '12month': 15.8 },
          average: 10.5,
          absoluteMomentum: true
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockCacheData), { status: 200 })
        );

        const result = await cacheService.getCachedData<MomentumResult>('momentum_AAPL_false');

        expect(result).toEqual(mockCacheData);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cache/data/momentum_AAPL_false'),
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should set cached data successfully', async () => {
        const cacheData = {
          ticker: 'AAPL',
          periods: { '3month': 5.2, '6month': 8.7, '9month': 12.3, '12month': 15.8 },
          average: 10.5,
          absoluteMomentum: true
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        );

        await cacheService.setCachedData('momentum_AAPL_false', cacheData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cache/data/momentum_AAPL_false'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(cacheData)
          })
        );
      });

      it('should get cache status', async () => {
        const mockCacheStatus: CacheStatus = {
          size: 150,
          hits: 1200,
          misses: 300,
          hitRate: 0.8
        };

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockCacheStatus), { status: 200 })
        );

        const result = await cacheService.getCacheStatus();

        expect(result.size).toBe(150);
        expect(result.hitRate).toBe(0.8);
      });
    });
  });

  describe('2. Frontend-Backend Integration', () => {
    it('should maintain consistent TypeScript types between frontend and backend', () => {
      // Test that frontend types match expected backend responses
      const momentumResult: MomentumResult = {
        ticker: 'TEST',
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false
      };

      const optimizationOutput: OptimizationOutput = {
        solverStatus: 'optimal',
        allocations: [],
        holdingsToSell: [],
        optimizationMetrics: {
          totalBudgetUsed: 0,
          unusedBudget: 0,
          unusedPercentage: 0,
          optimizationTime: 0
        }
      };

      // These should compile without type errors
      expect(momentumResult).toBeDefined();
      expect(optimizationOutput).toBeDefined();
    });

    it('should handle backend unavailability with graceful degradation', async () => {
      // Simulate backend being offline
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Test that services provide fallback data
      const momentumResult = await momentumService.calculateMomentum('AAPL');
      expect(momentumResult.ticker).toBe('AAPL');
      expect(momentumResult.error).toBeDefined();

      const healthStatus = await healthCheckService.checkHealth();
      expect(healthStatus.status).toBe('unhealthy');
    });

    it('should maintain connection state correctly', async () => {
      const client = new HttpClient();

      // Test connection status tracking
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
      );

      const connectionResult = await client.testConnection();
      expect(connectionResult.isConnected).toBe(true);
      expect(client.getConnectionStatus()).toBe(true);

      // Simulate disconnection
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await client.testConnection();
      expect(client.getConnectionStatus()).toBe(false);
    });
  });

  describe('3. Error Handling and Fallback Mechanisms', () => {
    it('should handle network errors with retry logic', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return new Response(JSON.stringify({ data: 'success' }), { status: 200 });
      });

      const result = await httpClient.get('/api/test');
      expect(result).toEqual({ data: 'success' });
      expect(callCount).toBe(3);
    });

    it('should provide fallback data when backend is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Backend unavailable'));

      const momentumResult = await momentumService.calculateMomentum('AAPL');
      expect(momentumResult.ticker).toBe('AAPL');
      expect(momentumResult.periods).toBeDefined();
      expect(momentumResult.error).toBeDefined();

      const batchResult = await momentumService.calculateBatchMomentum(['AAPL', 'MSFT']);
      expect(batchResult).toHaveLength(2);
      expect(batchResult[0].ticker).toBe('AAPL');
      expect(batchResult[1].ticker).toBe('MSFT');
    });

    it('should handle localStorage fallback for cache', async () => {
      // Simulate backend cache unavailable
      mockFetch.mockRejectedValue(new Error('Cache service unavailable'));

      // Setup localStorage mock
      const cachedData = {
        data: {
          ticker: 'AAPL',
          periods: { '3month': 5.2, '6month': 8.7, '9month': 12.3, '12month': 15.8 },
          average: 10.5,
          absoluteMomentum: true
        },
        timestamp: Date.now()
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cachedData));

      const result = await cacheService.getCachedData<MomentumResult>('momentum_AAPL_false');
      expect(result).toEqual(cachedData.data);
    });

    it('should handle timeout scenarios correctly', async () => {
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => {
          const error = new Error('The operation was aborted');
          (error as any).name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      await expect(httpClient.get('/api/test')).rejects.toThrow('Request timeout');
    });
  });

  describe('4. Performance and Batch Operations', () => {
    it('should handle large batch momentum calculations efficiently', async () => {
      const tickers = Array.from({ length: 50 }, (_, i) => `TICKER${i + 1}`);

      const mockBatchResponse = {
        success: true,
        count: tickers.length,
        results: tickers.map(ticker => ({
          ticker,
          periods: { '3month': 1.0, '6month': 2.0, '9month': 3.0, '12month': 4.0 },
          average: 2.5,
          absoluteMomentum: true
        })),
        timestamp: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockBatchResponse), { status: 200 })
      );

      const results = await momentumService.calculateBatchMomentum(tickers);

      expect(results).toHaveLength(50);
      expect(results[0].ticker).toBe('TICKER1');
      expect(results[49].ticker).toBe('TICKER50');
    });

    it('should cache batch results for performance', async () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL'];

      // First call - should hit backend
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          success: true,
          count: 3,
          results: tickers.map(ticker => ({
            ticker,
            periods: { '3month': 1.0, '6month': 2.0, '9month': 3.0, '12month': 4.0 },
            average: 2.5,
            absoluteMomentum: true
          }))
        }), { status: 200 })
      );

      await momentumService.calculateBatchMomentum(tickers);

      // Second call - should use cache (no additional fetch calls)
      const cachedResults = await momentumService.calculateBatchMomentum(tickers);

      expect(cachedResults).toHaveLength(3);
      // Only one fetch call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Health Check Service Integration', () => {
    it('should provide comprehensive health status', async () => {
      const mockApiHealth = { status: 'online', latency: 50 };
      const mockCacheHealth = { status: 'online' };
      const mockMomentumHealth = { status: 'online' };

      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ size: 100 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }));

      const healthStatus = await healthCheckService.checkHealth();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.services.api.status).toBe('online');
      expect(healthStatus.services.cache.status).toBe('online');
      expect(healthStatus.services.momentum.status).toBe('online');
    });

    it('should detect degraded service status', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }))
        .mockRejectedValueOnce(new Error('Cache unavailable'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }));

      const healthStatus = await healthCheckService.checkHealth();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.services.cache.status).toBe('offline');
    });

    it('should detect complete service failure', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const healthStatus = await healthCheckService.checkHealth();

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.services.api.status).toBe('offline');
    });
  });

  describe('6. Cache Service Integration', () => {
    it('should manage cache lifecycle correctly', async () => {
      const testData = { ticker: 'AAPL', value: 150.25 };

      // Test setting cache
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      await cacheService.setCachedData('test_key', testData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cache/data/test_key'),
        expect.objectContaining({ method: 'POST' })
      );

      // Test getting cache
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(testData), { status: 200 })
      );

      const retrievedData = await cacheService.getCachedData<typeof testData>('test_key');
      expect(retrievedData).toEqual(testData);

      // Test clearing cache
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      await cacheService.clearCache();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cache'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle cache service unavailability', async () => {
      mockFetch.mockRejectedValue(new Error('Cache service unavailable'));

      // Should not throw, should use localStorage fallback
      await expect(cacheService.getCachedData('test_key')).resolves.not.toThrow();
      await expect(cacheService.setCachedData('test_key', { data: 'test' })).resolves.not.toThrow();
      await expect(cacheService.clearCache()).resolves.not.toThrow();
    });
  });

  describe('7. TypeScript Type Consistency', () => {
    it('should maintain consistent types across all services', () => {
      // Test MomentumResult type
      const momentumResult: MomentumResult = {
        ticker: 'TEST',
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false
      };

      // Test BatchMomentumRequest type
      const batchRequest: BatchMomentumRequest = {
        tickers: ['AAPL', 'MSFT']
      };

      // Test OptimizationInput type
      const optimizationInput: OptimizationInput = {
        tickers: ['AAPL', 'MSFT'],
        currentHoldings: {},
        extraCash: 10000,
        maxPositions: 5,
        allocationStrategy: 'equal-weight'
      };

      // Test OptimizationOutput type
      const optimizationOutput: OptimizationOutput = {
        solverStatus: 'optimal',
        allocations: [],
        holdingsToSell: [],
        optimizationMetrics: {
          totalBudgetUsed: 0,
          unusedBudget: 0,
          unusedPercentage: 0,
          optimizationTime: 0
        }
      };

      // Test HealthStatus type
      const healthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          api: { status: 'online' },
          cache: { status: 'online' },
          momentum: { status: 'online' }
        },
        lastChecked: Date.now()
      };

      // Test CacheStatus type
      const cacheStatus: CacheStatus = {
        size: 100,
        hits: 500,
        misses: 100,
        hitRate: 0.83
      };

      // All types should be valid and compile without errors
      expect(momentumResult).toBeDefined();
      expect(batchRequest).toBeDefined();
      expect(optimizationInput).toBeDefined();
      expect(optimizationOutput).toBeDefined();
      expect(healthStatus).toBeDefined();
      expect(cacheStatus).toBeDefined();
    });

    it('should enforce type safety in service methods', () => {
      // These should compile without type errors
      const momentumServiceMethods = {
        calculateMomentum: momentumService.calculateMomentum,
        calculateBatchMomentum: momentumService.calculateBatchMomentum,
        optimizePortfolio: momentumService.optimizePortfolio,
        checkServiceHealth: momentumService.checkServiceHealth
      };

      const cacheServiceMethods = {
        getCachedData: cacheService.getCachedData,
        setCachedData: cacheService.setCachedData,
        clearCache: cacheService.clearCache,
        getCacheStatus: cacheService.getCacheStatus
      };

      const healthCheckServiceMethods = {
        checkHealth: healthCheckService.checkHealth,
        ping: healthCheckService.ping,
        shouldUseFallback: healthCheckService.shouldUseFallback
      };

      expect(Object.keys(momentumServiceMethods)).toHaveLength(4);
      expect(Object.keys(cacheServiceMethods)).toHaveLength(4);
      expect(Object.keys(healthCheckServiceMethods)).toHaveLength(3);
    });
  });
});