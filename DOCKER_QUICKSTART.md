# Docker Quick Start Guide

## Prerequisites
- Docker installed
- Docker Compose installed

## Quick Start

### 1. Start All Services
```bash
docker-compose up -d
```

This starts:
- ✅ Frontend (Vue.js) - http://localhost:3000
- ✅ Backend (Node.js/Express) - http://localhost:3001
- ✅ Redis Cache - http://localhost:6379

### 2. Verify Services

Check Redis:
```bash
docker-compose exec redis redis-cli
# Then run: ping
# Expected: PONG
```

Check Backend Health:
```bash
curl http://localhost:3001/health
```

Check Redis in Health Check:
```bash
curl http://localhost:3001/health | grep redis
```

### 3. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f redis
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Stop Services
```bash
docker-compose down
```

### 5. Clean Everything
```bash
docker-compose down -v --remove-orphans
docker-compose down -v  # Remove volumes too
```

## Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis container is running
docker-compose ps redis

# View Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Backend Can't Connect to Redis
```bash
# Check backend logs
docker-compose logs backend | grep -i redis

# Verify REDIS_HOST environment variable
docker-compose exec backend env | grep REDIS
```

### Reset Everything
```bash
docker-compose down -v
docker system prune -af
docker-compose up -d
```

## Architecture

```
┌─────────────┐
│   Frontend  │  Port 3000
│  (Vue.js)   │
└──────┬──────┘
       │
       │ API Calls
       ↓
┌─────────────┐
│   Backend   │  Port 3001
│ (Node.js)   │
└──────┬──────┘
       │
       │ Redis Commands
       ↓
┌─────────────┐
│    Redis    │  Port 6379
│ (Cache/Session)
└─────────────┘
```

All services communicate via `momentum-network` Docker network.

## Development

### Hot Reload
All services support hot reload:
- Frontend: Changes auto-reload
- Backend: Changes auto-reload
- Redis: Persistent storage

### Environment Variables

Backend Redis Config:
- `REDIS_HOST=redis` (Docker service name)
- `REDIS_PORT=6379`
- `REDIS_DATABASE=0`
- `REDIS_TTL_SECONDS=86400`

These are set in docker-compose.yml environment section.
