/**
 * Cache management service
 */

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map();

/**
 * Get cached data
 */
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached data
 */
function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear all cached data
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

module.exports = {
  getCachedData,
  setCachedData,
  clearCache,
  getCacheStats
};