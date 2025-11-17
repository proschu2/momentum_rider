# Docker Development Guide for Momentum Rider

This guide explains the different Docker configurations available for development and production.

## Overview

Momentum Rider provides multiple Docker configurations to suit different development and deployment scenarios:

- **Development**: Separate frontend/backend services with hot reload
- **Production**: Consolidated setup with Express serving static frontend
- **Raspberry Pi**: Optimized for ARM architecture

## Development Setup (Recommended)

Use the new unified `docker-compose.yml` for development with separate services:

### Quick Start
```bash
# Start all services (frontend, backend, redis)
docker-compose up

# Or start specific services
docker-compose up frontend backend
```

### Services Available
- **Frontend**: http://localhost:5173 (Vue.js dev server with hot reload)
- **Backend**: http://localhost:3001 (Node.js API with nodemon)
- **Redis**: localhost:6379 (Cache service)

### Development Workflow
1. **Start development environment**:
   ```bash
   docker-compose up
   ```

2. **Frontend development**:
   - Access: http://localhost:5173
   - **Hot reload enabled** - changes to local `./frontend` folder trigger immediate browser updates
   - Vue DevTools available

3. **Backend development**:
   - Access: http://localhost:3001
   - **Auto-restart on changes** - nodemon restarts server when local `./server` files change
   - API endpoints available

4. **Real-time development**:
   - Edit files in `./frontend/src` - browser updates instantly
   - Edit files in `./server` - backend restarts automatically
   - No need to rebuild containers or restart services

5. **Stop services**:
   ```bash
   docker-compose down
   ```

### Environment Variables for Development
- `VITE_API_URL=http://localhost:3001/api` (Frontend API endpoint with /api prefix)
- `ALLOWED_ORIGINS` includes frontend development URLs
- Redis configured for development caching

## Production Setup

The production setup uses the root Dockerfile with Express serving the frontend statically:

### Quick Start
```bash
# Production build
docker-compose -f docker-compose.prod.yml up

# Or build and run
docker-compose -f docker-compose.prod.yml up --build
```

### Key Differences
- **Single container** serving both frontend and backend
- **Static frontend** built and served by Express
- **Port 3000** for consolidated application
- **No hot reload** - optimized for production

## Raspberry Pi Setup

Optimized for ARM architecture with the same consolidated approach:

```bash
docker-compose -f docker-compose.pi.yml up
```

## Configuration Files

| File | Purpose | Usage |
|------|---------|-------|
| `docker-compose.yml` | **Development** (new) | Separate frontend/backend services |
| `docker-compose.prod.yml` | **Production** | Consolidated Express app |
| `docker-compose.pi.yml` | **Raspberry Pi** | ARM-optimized production |
| `Dockerfile` | **Root build** | Production/consolidated builds |
| `frontend/Dockerfile` | **Frontend dev** | Vue.js development server |
| `server/Dockerfile` | **Backend dev** | Node.js API development |

## Development Benefits

### Separate Services Approach
- **Hot reload** for both frontend and backend
- **Independent development** - work on frontend or backend separately
- **Better debugging** - separate logs and processes
- **Flexible scaling** - scale services independently if needed

### Quick Commands

```bash
# Start only frontend
docker-compose up frontend

# Start only backend and redis
docker-compose up backend redis

# View logs for specific service
docker-compose logs frontend
docker-compose logs backend

# Rebuild specific service
docker-compose build frontend
docker-compose build backend

# Run in background
docker-compose up -d

# Stop all services
docker-compose down
```

## Troubleshooting

### Port Conflicts
- Frontend: 5173
- Backend: 3001  
- Redis: 6379

If ports are in use, modify the `ports` section in `docker-compose.yml`.

### Volume Mount Issues
Ensure file permissions allow Docker to mount local directories.

### Environment Variables
Check that `VITE_API_URL` matches your backend port in development.

## Migration Notes

The new development setup maintains backward compatibility:
- Production and Pi configurations remain unchanged
- Root Dockerfile still works for consolidated builds
- Existing workflows continue to function