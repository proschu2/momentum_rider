# Momentum Rider - Consolidated Docker Setup Guide

## Executive Summary

This document outlines the strategy and implementation steps for consolidating the Momentum Rider backend and frontend into a single Docker container that can run efficiently on both Linux/Windows laptops and Raspberry Pi 4 devices. The consolidation simplifies deployment, reduces resource overhead, and enables seamless cross-platform operation.

### Key Benefits
- **Simplified Deployment**: Single container instead of 3+ containers
- **Reduced Resource Usage**: Eliminates network overhead between containers
- **Cross-Platform Compatibility**: Works on x86_64 and ARM64 architectures
- **Production Ready**: Optimized for both development and production environments
- **Redis Integration**: Maintains caching capabilities with graceful fallback

## Current Architecture Analysis

### Multi-Container Setup (Current)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │    Redis    │
│  (Vue.js)   │    │ (Node.js)   │    │ (Cache)     │
│ Port: 3000  │◄──►│ Port: 3001  │◄──►│ Port: 6379  │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Current Components:**
- **Frontend**: Vue.js SPA served via nginx (port 3000)
- **Backend**: Node.js/Express API (port 3001)
- **Redis**: Cache and session storage (port 6379)
- **Network**: Docker bridge network for inter-container communication

### Target Single-Container Setup
```
┌─────────────────────────────────────────────────┐
│              Consolidated Container             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │   Frontend  │ │   Backend   │ │  In-Memory  │ │
│ │  (Static)   │ │ (Node.js)   │ │   Cache     │ │
│ │             │ │ Port: 3000  │ │ (Fallback)  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────┘
```

**Consolidated Components:**
- **Frontend**: Static files served by Express
- **Backend**: Node.js/Express serving both API and static files
- **Cache**: Redis (external) with in-memory fallback
- **Single Port**: Unified access on port 3000

## Required Changes

### 1. Backend Express Static File Serving

**File: [`server/app.js`](server/app.js)**

Add static file serving middleware to serve the built frontend:

```javascript
// Add after CORS middleware and before API routes
const path = require('path');

// Serve static files from frontend build directory
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  
  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(frontendBuildPath, {
    maxAge: '1y', // Cache static assets for 1 year
    etag: false   // Disable etag for better performance
  }));
  
  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}
```

### 2. Frontend API Client URL Resolution

**File: [`frontend/src/services/api-client.ts`](frontend/src/services/api-client.ts:13)**

Update API URL resolution for consolidated deployment:

```typescript
constructor(baseUrl?: string) {
  // Use environment variable if available, otherwise use relative path
  if (baseUrl) {
    this.baseUrl = baseUrl;
  } else if (import.meta.env.VITE_API_URL) {
    this.baseUrl = import.meta.env.VITE_API_URL;
  } else {
    // For consolidated deployment, use relative path
    this.baseUrl = '/api';
  }
}
```

**File: [`frontend/src/services/http-client.ts`](frontend/src/services/http-client.ts:30)**

Update HTTP client configuration:

```typescript
function parseBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // For consolidated deployment, use relative path
  return '/api';
}
```

### 3. Consolidated Docker Configuration

**New File: [`Dockerfile`](Dockerfile)**

Create a multi-stage Dockerfile that builds both frontend and backend:

```dockerfile
# Multi-stage build for consolidated Momentum Rider
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build frontend
RUN npm run build

# Backend stage
FROM node:22-alpine AS backend

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY server/ .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S momentum -u 1001

# Change ownership to non-root user
RUN chown -R momentum:nodejs /app

# Switch to non-root user
USER momentum

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]
```

### 4. Environment Variables Strategy

**New File: [`.env.example`](.env.example)**

Create consolidated environment configuration:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# CORS Configuration
ALLOWED_ORIGINS=

# Redis Configuration (Optional - falls back to in-memory cache)
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_TTL_SECONDS=86400

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h

# Logging
LOG_LEVEL=info
LOG_REQUESTS=true
```

### 5. Redis Handling Strategy

The consolidated setup maintains Redis support with graceful fallback:

- **With Redis**: Full caching capabilities for production
- **Without Redis**: In-memory cache fallback for development/Pi deployment
- **Configuration**: Redis connection is optional - app works without it

## Implementation Steps

### Step 1: Update Backend for Static File Serving

1. **Modify [`server/app.js`](server/app.js)** to serve static files
2. **Update CORS configuration** to handle same-origin requests
3. **Add SPA routing fallback** for client-side routing

### Step 2: Update Frontend API Configuration

1. **Modify [`frontend/src/services/api-client.ts`](frontend/src/services/api-client.ts)** to use relative paths
2. **Update [`frontend/src/services/http-client.ts`](frontend/src/services/http-client.ts)** for consolidated deployment
3. **Create production build configuration** in [`frontend/vite.config.ts`](frontend/vite.config.ts)

### Step 3: Create Consolidated Docker Configuration

1. **Create root-level [`Dockerfile`](Dockerfile)** with multi-stage build
2. **Update [`docker-compose.yml`](frontend/docker-compose.yml)** for consolidated deployment
3. **Create production deployment scripts**

### Step 4: Environment Configuration

1. **Create [`.env.example`](.env.example)** with consolidated variables
2. **Update server configuration** to handle unified environment
3. **Document deployment variables**

## Deployment Scenarios

### Development Deployment

**File: [`docker-compose.dev.yml`](docker-compose.dev.yml)**

```yaml
services:
  momentum-rider:
    build:
      context: .
      target: development
    container_name: momentum-rider-dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./server:/app/server
      - ./frontend:/app/frontend
      - /app/node_modules
    depends_on:
      - redis
    networks:
      - momentum-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "description=Momentum Rider Development"
      - "version=1.0.0"

  redis:
    image: redis:8.2.2-alpine
    container_name: momentum-rider-redis-dev
    ports:
      - "6379:6379"
    networks:
      - momentum-network
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    labels:
      - "description=Redis Cache for Momentum Rider Development"
      - "version=1.0.0"

volumes:
  redis_data:
    name: momentum-rider-redis-data-dev

networks:
  momentum-network:
    driver: bridge
    name: momentum-rider-network-dev
```

### Production Deployment (Raspberry Pi)

**File: [`docker-compose.pi.yml`](docker-compose.pi.yml)**

```yaml
services:
  momentum-rider:
    build:
      context: .
    container_name: momentum-rider-pi
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Optional Redis - falls back to in-memory cache
      - REDIS_HOST=${REDIS_HOST:-}
      - REDIS_PORT=${REDIS_PORT:-6379}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "description=Momentum Rider Consolidated"
      - "version=1.0.0"

  # Optional Redis for production caching
  redis:
    image: redis:8.2.2-alpine
    container_name: momentum-rider-redis-pi
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

### Standalone Deployment (No Docker Compose)

**Build and run directly:**

```bash
# Build the consolidated image
docker build -t momentum-rider:latest .

# Run with environment variables
docker run -d \
  --name momentum-rider \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  momentum-rider:latest
```

## Testing Strategy

### 1. Build Verification

```bash
# Test multi-stage build
docker build -t momentum-rider-test .

# Verify image layers
docker history momentum-rider-test

# Check image size (should be optimized)
docker images momentum-rider-test
```

### 2. Container Health Checks

```bash
# Start container
docker run -d -p 3000:3000 --name test-app momentum-rider-test

# Test health endpoint
curl http://localhost:3000/health

# Test frontend serving
curl http://localhost:3000/

# Test API endpoints
curl http://localhost:3000/api/health
```

### 3. Cross-Platform Testing

**ARM64 (Raspberry Pi):**
```bash
# Build for ARM64
docker buildx build --platform linux/arm64 -t momentum-rider:arm64 .

# Test on Pi
docker run -d -p 3000:3000 momentum-rider:arm64
```

**x86_64 (Linux/Windows):**
```bash
# Build for x86_64
docker buildx build --platform linux/amd64 -t momentum-rider:amd64 .

# Test on desktop
docker run -d -p 3000:3000 momentum-rider:amd64
```

### 4. Performance Testing

**Memory Usage:**
```bash
docker stats momentum-rider
```

**Response Time:**
```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Create curl-format.txt for detailed timing
cat > curl-format.txt << 'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
EOF
```

**Load Testing:**
```bash
# Simple load test with Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/health

# Or with hey (modern alternative)
hey -n 100 -c 10 http://localhost:3000/api/health
```

## File Structure After Consolidation

```
momentum_rider/
├── Dockerfile                    # Consolidated multi-stage build
├── docker-compose.dev.yml        # Development with Redis
├── docker-compose.pi.yml         # Production Pi deployment
├── .env.example                  # Consolidated environment variables
├── CONSOLIDATED_DOCKER_SETUP.md  # This document
├── frontend/                     # Frontend source (unchanged)
│   ├── src/
│   └── package.json
├── server/                       # Backend source (modified)
│   ├── app.js                    # Updated for static serving
│   └── package.json
└── README.md                     # Updated deployment instructions
```

## Migration Checklist

- [ ] Update backend to serve static files
- [ ] Modify frontend API clients for relative paths
- [ ] Create consolidated Dockerfile
- [ ] Update environment configuration
- [ ] Test build process
- [ ] Verify cross-platform compatibility
- [ ] Update deployment documentation
- [ ] Test Redis integration and fallback
- [ ] Performance testing on target platforms

## Troubleshooting

### Common Issues

1. **Static files not serving**
   - Check frontend build path in Express static middleware
   - Verify frontend build completed successfully
   - Ensure static middleware is placed before API routes
   - Check file permissions in the container

2. **API calls failing**
   - Ensure API client uses relative paths (`/api`)
   - Check CORS configuration for same-origin requests
   - Verify backend routes are mounted correctly
   - Check for network connectivity issues

3. **Redis connection issues**
   - Verify Redis is optional - app should work without it
   - Check environment variables for Redis configuration
   - Ensure Redis container is running and accessible
   - Test Redis connection with `redis-cli ping`

4. **Performance on Raspberry Pi**
   - Use Alpine Linux base images for smaller footprint
   - Enable build caching for faster rebuilds
   - Monitor memory usage with `docker stats`
   - Consider using `--memory` limits for resource constraints
   - Use SSD storage for better I/O performance

5. **Build failures**
   - Check Node.js version compatibility
   - Verify all dependencies are properly installed
   - Clear Docker build cache: `docker builder prune`
   - Check for platform-specific build issues

6. **Container startup issues**
   - Verify port 3000 is available
   - Check environment variables are properly set
   - Review container logs: `docker logs momentum-rider`
   - Ensure health checks are passing

## Conclusion

The consolidated Docker setup provides a streamlined deployment experience while maintaining all functionality of the multi-container approach. The single-container strategy reduces complexity, improves resource utilization, and enables seamless deployment across different platforms including resource-constrained devices like Raspberry Pi 4.

The implementation maintains backward compatibility with existing Redis caching while providing graceful fallback for standalone deployments. This approach balances performance, simplicity, and cross-platform compatibility for the Momentum Rider application.