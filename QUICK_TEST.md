# Quick Testing Guide

## Simple Test Commands

### Test 1: Basic Production Build
```bash
# Build the image
docker build -t momentum-rider .

# Run standalone container (no Redis needed)
docker run -d -p 3000:3000 --name test-app momentum-rider

# Wait 10 seconds for startup
sleep 10

# Test if it's working
curl http://localhost:3000/health
curl http://localhost:3000/api/health

# Check logs (ignore Redis errors - they're expected)
docker logs test-app

# Clean up
docker stop test-app && docker rm test-app
```

### Test 2: Development Mode (with Redis)
```bash
# Start development with Redis
docker-compose -f docker-compose.dev.yml up -d

# Wait 15 seconds
sleep 15

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/health

# Check if Redis is working
docker exec momentum-rider-redis-dev redis-cli ping

# Clean up
docker-compose -f docker-compose.dev.yml down
```

## What to Expect

### ✅ Normal Behavior:
- **Redis connection errors**: Expected when Redis isn't available
- **"Redis unavailable, falling back to in-memory cache"**: This is GOOD - means fallback works
- **Server starts successfully**: Should see "Server started" message
- **Health endpoints return 200**: Both `/health` and `/api/health` should work

### ❌ Problem Signs:
- Container exits immediately
- No "Server started" message in logs
- Health endpoints don't respond

## Quick Verification

Run this one-liner to test the basic functionality:

```bash
docker build -t momentum-rider . && docker run -d -p 3000:3000 --name quick-test momentum-rider && sleep 10 && curl -f http://localhost:3000/health && echo "✅ Basic test passed!" && docker stop quick-test && docker rm quick-test
```

## Understanding the Redis Behavior

The Redis reconnection messages are **normal** and indicate:
1. Application tries to connect to Redis
2. When unavailable, it falls back to in-memory cache
3. It continues trying to reconnect in the background
4. **The application still works perfectly** without Redis

This is a feature, not a bug - it ensures the app works in both development (with Redis) and production (without Redis) environments.