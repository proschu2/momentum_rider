# Docker Setup Testing Guide

## Quick Test Commands

### 1. Test Production Build (Standalone)
```bash
# Build the image
docker build -t momentum-rider-test .

# Run the container
docker run -d -p 3000:3000 --name momentum-test momentum-rider-test

# Check if it's running
docker ps

# Check logs to verify Redis is not expected
docker logs momentum-test

# Test the application (in GitHub Codespaces, use the forwarded port)
# The application should be accessible at the forwarded port for port 3000
```

### 2. Test Development Environment
```bash
# Start development environment with Redis
docker-compose -f docker-compose.dev.yml up -d

# Check all services are running
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs

# Test API endpoints
curl http://localhost:3000/api/health
```

### 3. Test Raspberry Pi Production
```bash
# Build for ARM64 (if on Raspberry Pi)
docker-compose -f docker-compose.pi.yml build

# Deploy
docker-compose -f docker-compose.pi.yml up -d

# Check status
docker-compose -f docker-compose.pi.yml ps
```

## What to Verify

### ✅ Success Indicators

1. **Container Starts Successfully**
   - No errors in `docker logs`
   - "Server started" message appears
   - "Redis not configured, using in-memory cache only" (when no Redis)

2. **Port Mapping Works**
   - Port 3000 is mapped and accessible
   - Health endpoint responds: `curl http://localhost:3000/api/health`

3. **Frontend Serves Correctly**
   - Vue.js application loads at root path `/`
   - Static assets (CSS, JS) load without 404 errors

4. **API Endpoints Work**
   - `/api/health` - returns health status
   - `/api/momentum` - momentum calculations
   - `/api/optimization` - portfolio optimization

### 🔧 Troubleshooting

**Port 3000 not accessible in Codespaces:**
- Check the "Ports" tab in VSCode
- Ensure port 3000 is forwarded
- Try accessing via the forwarded URL

**Redis connection issues:**
- Check `REDIS_HOST` environment variable
- Verify Redis container is running (development only)
- Look for "Redis not configured" message in logs

**Build failures:**
- Check Dockerfile syntax
- Verify all required files exist
- Ensure sufficient disk space

## Automated Testing Script

Run the automated test script:
```bash
chmod +x test-docker-setup.sh
./test-docker-setup.sh
```

This script will:
1. Build the Docker image
2. Run the container
3. Test basic functionality
4. Clean up resources

## Manual Verification Steps

1. **Build Verification:**
   ```bash
   docker build -t test-build .
   ```

2. **Run Verification:**
   ```bash
   docker run -d -p 3000:3000 --name verify test-build
   docker logs verify
   ```

3. **Functionality Test:**
   ```bash
   # Wait a few seconds for startup, then:
   curl -s http://localhost:3000/api/health | grep -q "status" && echo "✅ Health check passed" || echo "❌ Health check failed"
   ```

4. **Cleanup:**
   ```bash
   docker stop verify && docker rm verify
   docker rmi test-build
   ```

## Expected Results

When testing without Redis configuration, you should see:
- ✅ Container starts without errors
- ✅ "Redis not configured" message in logs
- ✅ Application serves frontend at `/`
- ✅ API endpoints respond at `/api/*`
- ✅ No Redis connection attempts or errors

The Docker setup is now working correctly and can be deployed in both development and production environments.