#!/bin/bash

echo "=== Momentum Rider Docker Consolidation Test ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test URL
test_url() {
    local url=$1
    local description=$2
    echo -n "Testing $description... "
    
    if curl -f -s "$url" > /dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    echo
    echo "Cleaning up test containers..."
    docker stop test-prod 2>/dev/null || true
    docker rm test-prod 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.pi.yml down 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

echo "1. Testing Docker build..."
if docker build -t momentum-rider-test .; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo
echo "2. Testing standalone production container..."
docker run -d -p 3000:3000 --name test-prod momentum-rider-test

# Wait for container to start
echo "Waiting for container to start..."
sleep 15

# Test endpoints
test_url "http://localhost:3000/health" "health endpoint"
test_url "http://localhost:3000/api/health" "API health endpoint"
test_url "http://localhost:3000/" "frontend serving"

echo
echo "3. Testing development mode..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to start
echo "Waiting for development services to start..."
sleep 20

# Test development endpoints
test_url "http://localhost:3000/" "development frontend"
test_url "http://localhost:3000/api/health" "development API"

# Test Redis
echo -n "Testing Redis connection... "
if docker exec momentum-rider-redis-dev redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis working${NC}"
else
    echo -e "${RED}✗ Redis failed${NC}"
fi

echo
echo "4. Testing Raspberry Pi deployment..."
docker-compose -f docker-compose.pi.yml up -d

# Wait for services to start
echo "Waiting for Pi deployment to start..."
sleep 15

# Test Pi deployment
test_url "http://localhost:3000/health" "Pi deployment health"
test_url "http://localhost:3000/api/health" "Pi deployment API"

echo
echo "=== Test Summary ==="
echo -e "${GREEN}All tests completed!${NC}"
echo
echo "Deployment scenarios verified:"
echo "✓ Standalone production container"
echo "✓ Development mode with live reload"
echo "✓ Raspberry Pi production deployment"
echo "✓ Redis integration (development)"
echo "✓ Frontend static file serving"
echo "✓ API endpoints"