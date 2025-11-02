# Cache Warming Documentation

## Overview

The Redis cache warming system has been enhanced to fetch and cache **real market data** instead of using fake placeholder data. This ensures that frequently accessed data is readily available to improve application performance.

## What is Cache Warming?

Cache warming is the process of pre-loading the cache with frequently accessed data before it's needed. This eliminates the latency of first-time data fetching and improves response times for users.

## What Data is Warmed?

The cache warming system now fetches three types of real data:

### 1. Market Status (`market_status`)
- **Real-time market open/close status**
- Current trading session (market_hours, pre_market, after_hours, closed)
- Next market open and close times
- Timezone information (EST)
- Calculated based on current date/time

**Sample Response:**
```json
{
  "status": "open",
  "session": "market_hours",
  "timestamp": "2025-11-02T22:45:00.000Z",
  "timezone": "EST",
  "nextOpen": null,
  "nextClose": "2025-11-02T21:00:00.000Z"
}
```

### 2. Popular ETFs (`popular_etfs`)
- **Real ETF data from Yahoo Finance API**
- Tracks major ETFs: SPY, QQQ, VTI, IWM, ARKK
- Includes current price, change, change percentage, volume, market cap
- Gracefully handles API errors with fallback data

**Sample Response:**
```json
{
  "etfs": [
    {
      "ticker": "SPY",
      "name": "SPDR S&P 500 ETF Trust",
      "price": 423.45,
      "change": 2.34,
      "changePercent": 0.56,
      "volume": 45234567,
      "marketCap": 380000000000,
      "timestamp": "2025-11-02T22:45:00.000Z"
    }
  ],
  "lastUpdated": "2025-11-02T22:45:00.000Z",
  "source": "yahoo-finance"
}
```

### 3. System Configuration (`system_config`)
- **Application and environment configuration**
- Version, environment (development/production)
- Cache configuration (backend, TTL, duration)
- Redis connection details
- API configuration (rate limit, timeout)
- Feature flags

**Sample Response:**
```json
{
  "version": "1.0.0",
  "environment": "development",
  "cache": {
    "backend": "redis",
    "ttl": 86400,
    "duration": 86400000
  },
  "redis": {
    "available": true,
    "host": "localhost",
    "port": 6379
  },
  "api": {
    "rateLimit": 100,
    "timeout": 30000
  },
  "features": {
    "cacheWarming": true,
    "metrics": true,
    "logging": true
  },
  "lastUpdated": "2025-11-02T22:45:00.000Z"
}
```

## How It Works

### 1. Automatic Warming
Cache warming is automatically triggered when:
- The application starts
- Cache is cleared
- Cache data expires

### 2. Manual Warming
You can manually trigger cache warming via:
- API endpoint: `POST /api/cache/warm`
- Programmatic call: `cacheService.warmCache()`

### 3. Smart Caching
- If data is already cached, it won't re-fetch (saves API calls)
- Data is cached for 1 hour (3600 seconds)
- Uses Redis with automatic fallback to in-memory cache

## Cache Keys Structure

All warmed cache data is stored under these keys:

| Key | Description | Data Type |
|-----|-------------|-----------|
| `market_status` | Market open/closed status | Object |
| `popular_etfs` | Popular ETF data | Object |
| `system_config` | System configuration | Object |

## TTL (Time to Live)

- **Cache Duration:** 24 hours (86400000 ms) for most data
- **Warmed Data TTL:** 1 hour (3600 seconds)
- **Environment Override:** Set via `REDIS_TTL_SECONDS` environment variable

## Error Handling

The cache warming system includes robust error handling:

1. **API Failures:** If Yahoo Finance API is unavailable, the system gracefully degrades to fallback data
2. **Redis Unavailable:** Automatically falls back to in-memory cache
3. **Individual Item Failures:** If one item fails to cache, others continue
4. **Comprehensive Logging:** All errors are logged for debugging

## Benefits

✅ **Real Data:** No more fake placeholder data
✅ **Performance:** Pre-loaded cache reduces API calls
✅ **Reliability:** Graceful degradation on failures
✅ **Monitoring:** Detailed statistics and logging
✅ **Flexibility:** Manual and automatic warming options
✅ **Efficiency:** Smart caching prevents redundant API calls

## Monitoring

Monitor cache warming through:
- Application logs
- Cache statistics endpoint: `GET /api/cache/stats`
- Cache keys listing: `GET /api/cache/keys`
- Individual cache inspection: `GET /api/cache/:key`

## Troubleshooting

### Cache Not Warming
1. Check Redis connectivity
2. Review application logs for errors
3. Verify cache warming is enabled in system config
4. Manually trigger: `POST /api/cache/warm`

### Stale Data
1. Cache TTL may be too long
2. Manually clear and re-warm cache
3. Check if Redis is properly expiring keys

### High Memory Usage
1. Monitor Redis memory usage
2. Adjust TTL values
3. Review cache keys: `GET /api/cache/keys`

## API Endpoints

See [CACHE_API.md](./CACHE_API.md) for complete API documentation.

## Configuration

Environment Variables:

```bash
REDIS_HOST=localhost              # Redis host (default: localhost)
REDIS_PORT=6379                   # Redis port (default: 6379)
REDIS_TTL_SECONDS=86400          # Default TTL in seconds
NODE_ENV=development              # Environment
RATE_LIMIT=100                    # API rate limit
API_TIMEOUT=30000                 # API timeout in ms
```

## Testing

Run the cache service tests:

```bash
cd server
npm test -- cacheService.test.js
```

## Code Location

- **Service:** `server/services/cacheService.js`
- **Routes:** `server/routes/cache.js`
- **Tests:** `server/tests/cacheService.test.js`

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
