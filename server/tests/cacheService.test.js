/**
 * Cache Service Test Suite
 * Tests for Redis cache management with real data
 */

const cacheService = require('../services/cacheService');

describe('Cache Service', () => {
  beforeEach(async () => {
    // Clear cache before each test
    try {
      await cacheService.clearCache();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await cacheService.clearCache();
    } catch (e) {
      // Ignore errors
    }
  });

  describe('getCachedData & setCachedData', () => {
    test('should store and retrieve data', async () => {
      const testData = { test: 'value', timestamp: Date.now() };
      const key = 'test_key';

      const setResult = await cacheService.setCachedData(key, testData);
      expect(setResult).toBe(true);

      const cached = await cacheService.getCachedData(key);
      expect(cached).toEqual(testData);
    });

    test('should return null for non-existent key', async () => {
      const cached = await cacheService.getCachedData('non_existent_key');
      expect(cached).toBeNull();
    });

    test('should handle data expiration', async () => {
      const testData = { test: 'value', timestamp: Date.now() };
      const key = 'expiry_test';

      await cacheService.setCachedData(key, testData, 1); // 1 second TTL
      expect(await cacheService.getCachedData(key)).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const cached = await cacheService.getCachedData(key);
      expect(cached).toBeNull();
    });
  });

  describe('deleteCachedData', () => {
    test('should delete cached data', async () => {
      const testData = { test: 'value' };
      const key = 'delete_test';

      await cacheService.setCachedData(key, testData);
      expect(await cacheService.getCachedData(key)).toEqual(testData);

      const result = await cacheService.deleteCachedData(key);
      expect(result.success).toBe(true);
      expect(await cacheService.getCachedData(key)).toBeNull();
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', async () => {
      await cacheService.setCachedData('key1', { data: 'value1' });
      await cacheService.setCachedData('key2', { data: 'value2' });

      const result = await cacheService.clearCache();
      expect(result.success).toBe(true);

      expect(await cacheService.getCachedData('key1')).toBeNull();
      expect(await cacheService.getCachedData('key2')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    test('should return cache statistics', async () => {
      await cacheService.setCachedData('stat_test', { data: 'value' });

      const stats = await cacheService.getCacheStats();
      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('memory');
    });
  });

  describe('getCachedKeys', () => {
    test('should return list of cached keys', async () => {
      await cacheService.setCachedData('key1', { data: 'value1' });
      await cacheService.setCachedData('key2', { data: 'value2' });

      const keys = await cacheService.getCachedKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter keys by pattern', async () => {
      await cacheService.setCachedData('test_1', { data: 'value1' });
      await cacheService.setCachedData('prod_1', { data: 'value2' });

      const testKeys = await cacheService.getCachedKeys('test_*');
      expect(testKeys).toContain('test_1');
      expect(testKeys).not.toContain('prod_1');
    });
  });

  describe('invalidateCachePattern', () => {
    test('should invalidate cache by pattern', async () => {
      await cacheService.setCachedData('pattern_test_1', { data: 'value1' });
      await cacheService.setCachedData('pattern_test_2', { data: 'value2' });
      await cacheService.setCachedData('pattern_other', { data: 'value3' });

      const result = await cacheService.invalidateCachePattern('pattern_test_*');
      expect(result.success).toBe(true);

      expect(await cacheService.getCachedData('pattern_test_1')).toBeNull();
      expect(await cacheService.getCachedData('pattern_test_2')).toBeNull();
      expect(await cacheService.getCachedData('pattern_other')).not.toBeNull();
    });
  });
});

describe('Cache Warming with Real Data', () => {
  beforeEach(async () => {
    try {
      await cacheService.clearCache();
    } catch (e) {
      // Ignore errors
    }
  });

  afterAll(async () => {
    try {
      await cacheService.clearCache();
    } catch (e) {
      // Ignore errors
    }
  });

  describe('warmCache()', () => {
    test('should warm cache with real market status', async () => {
      const result = await cacheService.warmCache();

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.summary).toBeDefined();

      const marketStatusResult = result.results.find(r => r.key === 'market_status');
      expect(marketStatusResult).toBeDefined();
      expect(marketStatusResult.status).toBe('warmed');

      // Verify cached data is real (not placeholder)
      const cachedMarketStatus = await cacheService.getCachedData('market_status');
      expect(cachedMarketStatus).toBeDefined();
      expect(cachedMarketStatus).toHaveProperty('status');
      expect(cachedMarketStatus).toHaveProperty('session');
      expect(cachedMarketStatus).toHaveProperty('timestamp');
      expect(cachedMarketStatus.status).not.toContain('Warmed cache for');
    });

    test('should warm cache with real popular ETFs data', async () => {
      const result = await cacheService.warmCache();

      expect(result.success).toBe(true);

      const etfResult = result.results.find(r => r.key === 'popular_etfs');
      expect(etfResult).toBeDefined();
      expect(etfResult.status).toBe('warmed');

      // Verify cached data contains ETF data
      const cachedETFs = await cacheService.getCachedData('popular_etfs');
      expect(cachedETFs).toBeDefined();
      expect(cachedETFs).toHaveProperty('etfs');
      expect(Array.isArray(cachedETFs.etfs)).toBe(true);
      expect(cachedETFs.etfs.length).toBeGreaterThan(0);

      // Check that ETF data is real (not placeholder)
      const firstETF = cachedETFs.etfs[0];
      expect(firstETF).toHaveProperty('ticker');
      expect(firstETF.ticker).not.toContain('Warmed cache for');
    });

    test('should warm cache with system config', async () => {
      const result = await cacheService.warmCache();

      expect(result.success).toBe(true);

      const configResult = result.results.find(r => r.key === 'system_config');
      expect(configResult).toBeDefined();
      expect(configResult.status).toBe('warmed');

      // Verify cached config is real
      const cachedConfig = await cacheService.getCachedData('system_config');
      expect(cachedConfig).toBeDefined();
      expect(cachedConfig).toHaveProperty('version');
      expect(cachedConfig).toHaveProperty('environment');
      expect(cachedConfig).toHaveProperty('cache');
      expect(cachedConfig).toHaveProperty('lastUpdated');
    });

    test('should not re-warm already cached data', async () => {
      // First warm
      const result1 = await cacheService.warmCache();
      expect(result1.success).toBe(true);

      const warmedCount1 = result1.results.filter(r => r.status === 'warmed').length;
      expect(warmedCount1).toBe(3); // market_status, popular_etfs, system_config

      // Second warm - should detect already cached
      const result2 = await cacheService.warmCache();
      expect(result2.success).toBe(true);

      const alreadyCachedCount = result2.results.filter(r => r.status === 'already_cached').length;
      expect(alreadyCachedCount).toBe(3);
    });

    test('should return detailed summary', async () => {
      const result = await cacheService.warmCache();

      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('warmed');
      expect(result.summary).toHaveProperty('alreadyCached');
      expect(result.summary).toHaveProperty('errors');

      expect(result.summary.total).toBe(3);
      expect(result.summary.warmed + result.summary.alreadyCached).toBe(3);
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid scenario by temporarily mocking
      const originalSetCachedData = cacheService.setCachedData;
      cacheService.setCachedData = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await cacheService.warmCache();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original function
      cacheService.setCachedData = originalSetCachedData;
    });
  });

  describe('getMarketStatus()', () => {
    test('should return valid market status', async () => {
      const status = await cacheService.getMarketStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('session');
      expect(status).toHaveProperty('timestamp');
      expect(['open', 'closed', 'unknown']).toContain(status.status);
      expect(['market_hours', 'pre_market', 'after_hours', 'closed', 'error']).toContain(status.session);
    });

    test('should return next open/close times when market is closed', async () => {
      const status = await cacheService.getMarketStatus();

      if (status.status === 'closed') {
        expect(status.nextOpen).toBeDefined();
        expect(status.nextClose).toBeDefined();
      }
    });
  });

  describe('getPopularETFs()', () => {
    test('should return ETF data', async () => {
      const etfs = await cacheService.getPopularETFs();

      expect(etfs).toBeDefined();
      expect(etfs).toHaveProperty('etfs');
      expect(etfs).toHaveProperty('lastUpdated');
      expect(Array.isArray(etfs.etfs)).toBe(true);
      expect(etfs.etfs.length).toBeGreaterThan(0);

      // Check at least one ETF has ticker
      const firstETF = etfs.etfs[0];
      expect(firstETF).toHaveProperty('ticker');
    });

    test('should handle finance service errors gracefully', async () => {
      // If finance service is not available, should still return ETF tickers
      const etfs = await cacheService.getPopularETFs();

      expect(etfs.etfs.length).toBeGreaterThan(0);
    });
  });

  describe('getSystemConfig()', () => {
    test('should return system configuration', () => {
      const config = cacheService.getSystemConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('api');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('lastUpdated');
    });

    test('should include cache configuration', () => {
      const config = cacheService.getSystemConfig();

      expect(config.cache).toHaveProperty('backend');
      expect(config.cache).toHaveProperty('ttl');
      expect(config.cache).toHaveProperty('duration');
      expect(config.cache.backend).toBe('redis');
    });

    test('should include API configuration', () => {
      const config = cacheService.getSystemConfig();

      expect(config.api).toHaveProperty('rateLimit');
      expect(config.api).toHaveProperty('timeout');
    });

    test('should include feature flags', () => {
      const config = cacheService.getSystemConfig();

      expect(config.features).toHaveProperty('cacheWarming');
      expect(config.features).toHaveProperty('metrics');
      expect(config.features).toHaveProperty('logging');
      expect(config.features.cacheWarming).toBe(true);
    });
  });
});
