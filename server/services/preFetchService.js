/**
 * Price Pre-fetch Service
 * Implements Redis-first caching with memory fallback
 * Fetches multiple ticker prices and caches them efficiently
 */

const financeService = require('./financeService');
const cacheService = require('./cacheService');
const logger = require('../config/logger');

// In-memory cache for instant access (fallback when Redis unavailable)
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

class PreFetchService {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
  }

  /**
   * Pre-fetch prices for multiple tickers with intelligent caching
   * Priority: Redis → Memory → Yahoo Finance → Fallback
   */
  async preFetchPrices(tickers) {
    const startTime = Date.now();
    const results = {
      tickersProcessed: 0,
      successfulFetches: 0,
      cacheHits: 0,
      apiCalls: 0,
      prices: {},
      failedTickers: [],
      sources: {}
    };

    logger.logInfo('Starting price pre-fetch', {
      totalTickers: tickers.length,
      timestamp: new Date().toISOString()
    });

    for (const ticker of tickers) {
      try {
        const priceResult = await this.fetchTickerPrice(ticker);

        if (priceResult.success) {
          results.prices[ticker] = priceResult.price;
          results.successfulFetches++;
          results.sources[ticker] = priceResult.source;

          if (priceResult.fromCache) {
            results.cacheHits++;
          }
        } else {
          results.failedTickers.push(ticker);
          logger.logWarn(`Failed to fetch price for ${ticker}: ${priceResult.error}`);
        }

        results.tickersProcessed++;

        // Rate limiting protection - delay between API calls (increased from 100ms)
        if (!priceResult.fromCache) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }

      } catch (error) {
        logger.logError(error, { ticker });
        results.failedTickers.push(ticker);
        results.tickersProcessed++;
      }
    }

    const duration = Date.now() - startTime;

    logger.logInfo('Price pre-fetch completed', {
      duration: `${duration}ms`,
      processed: results.tickersProcessed,
      successful: results.successfulFetches,
      cacheHits: results.cacheHits,
      apiCalls: results.apiCalls,
      cacheHitRate: `${((results.cacheHits / results.tickersProcessed) * 100).toFixed(1)}%`,
      failed: results.failedTickers.length
    });

    return {
      ...results,
      processingTime: duration,
      cacheHitRate: (results.cacheHits / results.tickersProcessed) * 100
    };
  }

  /**
   * Fetch single ticker price with tiered caching strategy
   */
  async fetchTickerPrice(ticker) {
    const cacheKey = `price_${ticker}`;

    // 1. Check Redis cache first (priority 1)
    try {
      const cached = await cacheService.getCachedData(cacheKey);
      if (cached && this.isValidPriceData(cached)) {
        this.cacheHits++;
        return {
          success: true,
          price: cached,
          fromCache: true,
          source: 'redis_cache'
        };
      }
    } catch (redisError) {
      logger.logDebug('Redis cache unavailable, trying memory cache', {
        ticker,
        error: redisError.message
      });
    }

    // 2. Check memory cache (priority 2 - fallback)
    const memCached = memoryCache.get(ticker);
    if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL) {
      this.cacheHits++;

      // Backfill Redis for consistency
      try {
        await cacheService.setCachedData(cacheKey, memCached.price, 14400);
      } catch (backfillError) {
        logger.logDebug('Redis backfill failed', { ticker, error: backfillError.message });
      }

      return {
        success: true,
        price: memCached.price,
        fromCache: true,
        source: 'memory_cache'
      };
    }

    // 3. Fetch from Yahoo Finance (priority 3)
    try {
      this.apiCalls++;
      this.cacheMisses++;

      const priceData = await financeService.getCurrentPrice(ticker);

      if (!this.isValidPriceData(priceData)) {
        throw new Error(`Invalid price data received: ${JSON.stringify(priceData)}`);
      }

      // 4. Cache in all layers
      await this.cachePriceData(ticker, priceData);

      return {
        success: true,
        price: priceData,
        fromCache: false,
        source: 'yahoo_finance'
      };

    } catch (apiError) {
      logger.logWarn(`API fetch failed for ${ticker}, using fallback`, {
        ticker,
        error: apiError.message
      });

      // 5. Use fallback price
      const fallbackPrice = financeService.getFallbackPrice(ticker);
      const fallbackData = {
        price: fallbackPrice,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: 'fallback'
      };

      // Cache fallback for 1 hour to avoid repeated failures
      await this.cachePriceData(ticker, fallbackData, 3600);

      return {
        success: true,
        price: fallbackData,
        fromCache: false,
        source: 'fallback'
      };
    }
  }

  /**
   * Cache price data in both Redis and memory
   */
  async cachePriceData(ticker, priceData, ttl = 14400) {
    const cacheKey = `price_${ticker}`;

    try {
      // Cache in Redis with TTL
      await cacheService.setCachedData(cacheKey, priceData, ttl);
    } catch (redisError) {
      logger.logDebug('Redis caching failed, using memory only', {
        ticker,
        error: redisError.message
      });
    }

    // Always cache in memory for instant access
    memoryCache.set(ticker, {
      price: priceData,
      timestamp: Date.now()
    });
  }

  /**
   * Validate price data structure
   */
  isValidPriceData(data) {
    if (!data) return false;

    const price = typeof data === 'object' ? data.price : data;
    return typeof price === 'number' && price > 0 && price < 1000000; // Sanity check
  }

  /**
   * Get cached price for a single ticker
   */
  async getCachedPrice(ticker) {
    const result = await this.fetchTickerPrice(ticker);
    return result.success ? result.price : null;
  }

  /**
   * Check if ticker is already cached
   */
  async isTickerCached(ticker) {
    try {
      const cached = await cacheService.getCachedData(`price_${ticker}`);
      if (cached) return true;
    } catch (error) {
      // Redis unavailable, check memory
    }

    const memCached = memoryCache.get(ticker);
    return memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL;
  }

  /**
   * Clear expired memory cache entries
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [ticker, data] of memoryCache.entries()) {
      if (now - data.timestamp > MEMORY_CACHE_TTL) {
        memoryCache.delete(ticker);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      memoryCacheSize: memoryCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      apiCalls: this.apiCalls,
      cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

module.exports = new PreFetchService();