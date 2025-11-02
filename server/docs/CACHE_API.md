# Cache API Documentation

## Overview

The Cache API provides endpoints for managing Redis cache operations, including warming the cache with real market data, retrieving statistics, and performing cache operations.

## Base URL

```
/api/cache
```

## Endpoints

### 1. Warm Cache
Warm up the cache with frequently accessed data.

**Endpoint:** `POST /api/cache/warm`

**Description:** Fetches and caches real data for market status, popular ETFs, and system configuration.

**Request Body:**
```json
{
  "keys": ["market_status", "popular_etfs", "system_config"]  // Optional: specific keys
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "key": "market_status",
      "status": "warmed",
      "dataType": "object"
    },
    {
      "key": "popular_etfs",
      "status": "warmed",
      "dataType": "object"
    },
    {
      "key": "system_config",
      "status": "warmed",
      "dataType": "object"
    }
  ],
  "summary": {
    "total": 3,
    "warmed": 3,
    "alreadyCached": 0,
    "errors": 0
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 2. Get Cache Statistics
Retrieve cache statistics and backend information.

**Endpoint:** `GET /api/cache/stats`

**Response:**
```json
{
  "backend": "redis",
  "memory": {
    "used": 0
  },
  "redis": {
    "connected": true,
    "info": "Available via Redis"
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 3. Get All Cache Keys
List all cached keys, optionally filtered by pattern.

**Endpoint:** `GET /api/cache/keys`

**Query Parameters:**
- `pattern` (string, optional) - Redis key pattern (default: `*`)

**Example:** `GET /api/cache/keys?pattern=quote_*`

**Response:**
```json
{
  "success": true,
  "pattern": "*",
  "count": 15,
  "keys": [
    "market_status",
    "popular_etfs",
    "system_config",
    "quote_AAPL",
    "quote_MSFT"
  ]
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 4. Get Specific Cache Key
Retrieve data for a specific cache key.

**Endpoint:** `GET /api/cache/:key`

**Parameters:**
- `key` (string, required) - The cache key to retrieve

**Example:** `GET /api/cache/market_status`

**Response:**
```json
{
  "success": true,
  "key": "market_status",
  "data": {
    "status": "open",
    "session": "market_hours",
    "timestamp": "2025-11-02T22:45:00.000Z",
    "timezone": "EST"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Key not found
- `500` - Server error

---

### 5. Set Cache Key
Set data for a specific cache key.

**Endpoint:** `POST /api/cache/:key`

**Parameters:**
- `key` (string, required) - The cache key to set

**Request Body:**
```json
{
  "data": {
    "custom": "value",
    "timestamp": "2025-11-02T22:45:00.000Z"
  },
  "ttlSeconds": 3600  // Optional: TTL in seconds
}
```

**Response:**
```json
{
  "success": true,
  "key": "custom_key",
  "ttlSeconds": 3600
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing data)
- `500` - Server error

---

### 6. Delete Specific Cache Key
Delete a specific cache key.

**Endpoint:** `DELETE /api/cache/:key`

**Parameters:**
- `key` (string, required) - The cache key to delete

**Example:** `DELETE /api/cache/quote_AAPL`

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 7. Clear All Cache
Clear all cached data.

**Endpoint:** `DELETE /api/cache`

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 8. Invalidate Cache by Pattern
Delete cache keys matching a pattern.

**Endpoint:** `POST /api/cache/invalidate`

**Request Body:**
```json
{
  "pattern": "quote_*"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invalidated cache pattern: quote_*"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing pattern)
- `500` - Server error

---

### 9. Get Market Status
Get current market open/closed status (also cached as `market_status`).

**Endpoint:** `GET /api/cache/market-status`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "open",
    "session": "market_hours",
    "timestamp": "2025-11-02T22:45:00.000Z",
    "timezone": "EST",
    "nextOpen": null,
    "nextClose": "2025-11-02T21:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 10. Get Popular ETFs
Get popular ETF data (also cached as `popular_etfs`).

**Endpoint:** `GET /api/cache/popular-etfs`

**Response:**
```json
{
  "success": true,
  "data": {
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
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### 11. Get System Configuration
Get system configuration (also cached as `system_config`).

**Endpoint:** `GET /api/cache/system-config`

**Response:**
```json
{
  "success": true,
  "data": {
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
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error scenarios:
- `500` - Redis connection error, API failure, or unexpected error
- `400` - Bad request (missing required parameters, invalid data)
- `404` - Cache key not found

## Usage Examples

### Warm Cache with cURL

```bash
curl -X POST http://localhost:3000/api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Get Cache Statistics

```bash
curl http://localhost:3000/api/cache/stats
```

### Get Specific Cache Key

```bash
curl http://localhost:3000/api/cache/market_status
```

### Clear All Cache

```bash
curl -X DELETE http://localhost:3000/api/cache
```

### Invalidate Cache Pattern

```bash
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "quote_*"}'
```

### Get Market Status

```bash
curl http://localhost:3000/api/cache/market-status
```

### Get Popular ETFs

```bash
curl http://localhost:3000/api/cache/popular-etfs
```

---

## Rate Limiting

By default, these endpoints are subject to the application's rate limiting (100 requests per minute by default).

Configure rate limiting via the `RATE_LIMIT` environment variable.

---

## Authentication

Currently, cache endpoints do not require authentication. Consider adding authentication middleware in production environments.

---

## Testing

Test the endpoints:

```bash
# Test all endpoints
npm test -- cacheService.test.js

# Manual testing with curl
curl http://localhost:3000/api/cache/stats
curl http://localhost:3000/api/cache/market-status
curl http://localhost:3000/api/cache/popular-etfs
```

---

**Note:** Make sure Redis is running and accessible before using these endpoints.
