/**
 * Redis-based cache management service
 * Provides backward compatibility with in-memory cache API
 */

const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// Fallback in-memory cache for development/testing when Redis is unavailable
const memoryCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cache warming configuration
const WARM_CACHE_KEYS = ['market_status', 'popular_etfs', 'system_config'];

// Popular ETFs for cache warming
const POPULAR_ETFS = ['SPY', 'QQQ', 'VTI', 'IWM', 'ARKK'];

/**
 * Check if Redis is available
 */
async function isRedisAvailable() {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get cached data from Redis or memory fallback
 */
async function getCachedData(key) {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      const cached = await client.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if data has expired (stored with timestamp)
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed.data;
        } else if (!parsed.timestamp) {
          // Backward compatibility: if no timestamp, this might be old format
          // Check if it has the 'data' property or if it's the raw data
          if (parsed.data !== undefined) {
            return parsed.data;
          } else {
            return parsed; // Raw data from old format
          }
        } else {
          // Data expired, remove it
          await client.del(key);
        }
      }
      return null;
    } else {
      // Fallback to memory cache
      const cached = memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
      return null;
    }
  } catch (error) {
    logger.logError(error, null);
    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
}

/**
 * Set cached data to Redis or memory fallback
 */
async function setCachedData(key, data, ttlSeconds = null) {
  try {
    const redisAvailable = await isRedisAvailable();
    const defaultTtl = parseInt(process.env.REDIS_TTL_SECONDS) || 86400;
    const ttl = ttlSeconds || defaultTtl;

    // Store data with timestamp for expiration checking
    const dataToStore = {
      data,
      timestamp: Date.now(),
    };

    if (redisAvailable) {
      const client = getRedisClient();
      await client.setex(key, ttl, JSON.stringify(dataToStore));
      return true;
    } else {
      // Fallback to memory cache - store same format as Redis
      memoryCache.set(key, dataToStore);
      return true;
    }
  } catch (error) {
    logger.logError(error, null);
    // Fallback to memory cache - store same format as Redis
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
    return false;
  }
}

/**
 * Clear all cached data
 */
async function clearCache() {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      // Get all keys with a pattern if needed, or clear all
      const keys = await client.keys('*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }

    // Also clear memory cache
    memoryCache.clear();

    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    logger.logError(error, null);
    memoryCache.clear();
    return { success: false, error: error.message };
  }
}

/**
 * Delete specific cached data
 */
async function deleteCachedData(key) {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      await client.del(key);
    }

    // Also remove from memory cache
    memoryCache.delete(key);

    return { success: true };
  } catch (error) {
    logger.logError(error, null);
    memoryCache.delete(key);
    return { success: false, error: error.message };
  }
}

/**
 * Get current market status (open/closed)
 */
async function getMarketStatus() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    // Market is open Mon-Fri, 9:30 AM - 4:00 PM EST
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    // For simplicity, assuming EST (in production, use timezone conversion)
    const isMarketOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose;

    // Determine market session
    let session = 'closed';
    if (isMarketOpen) {
      session = 'market_hours';
    } else if (isWeekday && currentTime > marketClose) {
      session = 'after_hours';
    } else if (isWeekday && currentTime < marketOpen) {
      session = 'pre_market';
    }

    return {
      status: isMarketOpen ? 'open' : 'closed',
      session,
      timestamp: now.toISOString(),
      timezone: 'EST',
      nextOpen: isMarketOpen ? null : getNextOpenTime(now),
      nextClose: isMarketOpen ? getNextCloseTime(now) : null,
    };
  } catch (error) {
    logger.logError(error, null);
    return {
      status: 'unknown',
      session: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Get next market open time
 */
function getNextOpenTime(now) {
  const next = new Date(now);
  // Move to next day if past market hours
  next.setDate(next.getDate() + 1);
  next.setHours(9, 30, 0, 0);
  return next.toISOString();
}

/**
 * Get next market close time
 */
function getNextCloseTime(now) {
  const next = new Date(now);
  next.setHours(16, 0, 0, 0);
  return next.toISOString();
}

/**
 * Get popular ETFs data
 */
async function getPopularETFs() {
  try {
    const ETFData = [];

    // Try to import finance service dynamically
    let financeService = null;
    try {
      financeService = require('./financeService');
    } catch (e) {
      logger.logInfo('Finance service not available, using fallback ETF data');
    }

    for (const ticker of POPULAR_ETFS) {
      try {
        let data = {
          ticker,
          name: ticker,
          price: null,
          change: null,
          changePercent: null,
          timestamp: new Date().toISOString(),
        };

        // Try to get real data from finance service
        if (financeService && financeService.getQuote) {
          try {
            const quote = await financeService.getQuote(ticker);
            data = {
              ticker: quote.symbol || ticker,
              name: quote.longName || quote.shortName || ticker,
              price: quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice,
              change: quote.regularMarketChange,
              changePercent: quote.regularMarketChangePercent,
              volume: quote.regularMarketVolume,
              marketCap: quote.marketCap,
              timestamp: new Date().toISOString(),
            };
          } catch (e) {
            logger.logWarn(`Failed to fetch quote for ${ticker}: ${e.message}`);
            // Use fallback data
            data.fallback = true;
          }
        }

        ETFData.push(data);
      } catch (error) {
        logger.logError(error, null);
        ETFData.push({
          ticker,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      etfs: ETFData,
      lastUpdated: new Date().toISOString(),
      source: 'yahoo-finance',
    };
  } catch (error) {
    logger.logError(error, null);
    return {
      etfs: POPULAR_ETFS.map(ticker => ({ ticker, error: error.message })),
      lastUpdated: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Get system configuration
 */
function getSystemConfig() {
  try {
    const config = {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cache: {
        backend: 'redis',
        ttl: parseInt(process.env.REDIS_TTL_SECONDS) || 86400,
        duration: CACHE_DURATION,
      },
      redis: {
        available: null, // Will be populated dynamically
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      api: {
        rateLimit: process.env.RATE_LIMIT || 100,
        timeout: parseInt(process.env.API_TIMEOUT) || 30000,
      },
      features: {
        cacheWarming: true,
        metrics: true,
        logging: true,
      },
      lastUpdated: new Date().toISOString(),
    };

    return config;
  } catch (error) {
    logger.logError(error, null);
    return {
      error: error.message,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Warm up cache with frequently accessed data
 */
async function warmCache() {
  try {
    logger.logInfo('Starting cache warming with real data');
    const results = [];

    for (const key of WARM_CACHE_KEYS) {
      try {
        // Check if data is already cached
        const cached = await getCachedData(key);
        if (!cached) {
          let warmData = null;

          // Fetch real data based on key type
          switch (key) {
            case 'market_status':
              warmData = await getMarketStatus();
              break;

            case 'popular_etfs':
              warmData = await getPopularETFs();
              break;

            case 'system_config':
              warmData = getSystemConfig();
              break;

            default:
              logger.logWarn(`Unknown cache key for warming: ${key}`);
              warmData = {
                key,
                timestamp: new Date().toISOString(),
                message: 'Unknown cache key',
              };
          }

          await setCachedData(key, warmData, 3600); // 1 hour TTL for warmed data
          results.push({ key, status: 'warmed', dataType: typeof warmData });
          logger.logInfo(`Cache warmed for ${key}`, { dataType: typeof warmData });
        } else {
          results.push({ key, status: 'already_cached' });
        }
      } catch (error) {
        logger.logError(error, { key });
        results.push({ key, status: 'error', error: error.message });
      }
    }

    const successCount = results.filter(r => r.status === 'warmed').length;
    const alreadyCachedCount = results.filter(r => r.status === 'already_cached').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    logger.logInfo('Cache warming completed', {
      total: results.length,
      warmed: successCount,
      alreadyCached: alreadyCachedCount,
      errors: errorCount,
    });

    return {
      success: true,
      results,
      summary: {
        total: results.length,
        warmed: successCount,
        alreadyCached: alreadyCachedCount,
        errors: errorCount,
      },
    };
  } catch (error) {
    logger.logError(error, null);
    return { success: false, error: error.message };
  }
}

/**
 * Invalidate cache based on pattern
 */
async function invalidateCachePattern(pattern) {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }

    // Also clear matching keys from memory cache
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        memoryCache.delete(key);
      }
    }

    return { success: true, message: `Invalidated cache pattern: ${pattern}` };
  } catch (error) {
    logger.logError(error, null);
    return { success: false, error: error.message };
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      const info = await client.info('stats');

      return {
        backend: 'redis',
        memory: {
          used: memoryCache.size,
        },
        redis: {
          connected: true,
          info: 'Available via Redis',
        },
      };
    } else {
      return {
        backend: 'memory',
        memory: {
          size: memoryCache.size,
          keys: Array.from(memoryCache.keys()),
        },
        redis: {
          connected: false,
          fallback: 'Using in-memory cache',
        },
      };
    }
  } catch (error) {
    return {
      backend: 'memory',
      memory: {
        size: memoryCache.size,
      },
      error: error.message,
    };
  }
}

/**
 * Get all cached keys (for debugging/monitoring)
 */
async function getCachedKeys(pattern = '*') {
  try {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      return keys;
    } else {
      return Array.from(memoryCache.keys());
    }
  } catch (error) {
    return Array.from(memoryCache.keys());
  }
}

module.exports = {
  getCachedData,
  setCachedData,
  clearCache,
  deleteCachedData,
  invalidateCachePattern,
  getCacheStats,
  getCachedKeys,
  warmCache,
  getMarketStatus,
  getPopularETFs,
  getSystemConfig,
};
