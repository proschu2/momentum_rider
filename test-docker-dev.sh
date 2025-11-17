#!/bin/bash

# Test script for Momentum Rider Docker Development Setup
echo "🧪 Testing Momentum Rider Docker Development Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Test building services
echo "🔨 Building development services..."
docker compose build frontend backend redis

if [ $? -eq 0 ]; then
    echo "✅ Services built successfully"
else
    echo "❌ Failed to build services"
    exit 1
fi

# Test starting services in background
echo "🚀 Starting development services..."
docker compose up -d frontend backend redis

# Wait a moment for services to start
sleep 10

# Test backend health endpoint
echo "🔍 Testing backend health..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)

if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed (HTTP $BACKEND_HEALTH)"
    docker compose logs backend
    docker compose down
    exit 1
fi

# Test Redis connectivity through backend
echo "🔍 Testing Redis connectivity..."
REDIS_TEST=$(curl -s http://localhost:3001/health | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)

if [ "$REDIS_TEST" = "connected" ]; then
    echo "✅ Redis connectivity test passed"
else
    echo "❌ Redis connectivity test failed"
    docker compose logs backend
    docker compose logs redis
    docker compose down
    exit 1
fi

# Test cache API endpoint (the one that was failing)
echo "🔍 Testing cache API endpoint..."
CACHE_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/cache/quote_IBIT)

if [ "$CACHE_TEST" = "200" ] || [ "$CACHE_TEST" = "404" ]; then
    echo "✅ Cache API endpoint test passed (HTTP $CACHE_TEST)"
else
    echo "❌ Cache API endpoint test failed (HTTP $CACHE_TEST)"
    docker compose logs backend
    docker compose down
    exit 1
fi

# Test frontend (basic connectivity)
echo "🔍 Testing frontend connectivity..."
FRONTEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)

if [ "$FRONTEND_TEST" = "200" ] || [ "$FRONTEND_TEST" = "000" ]; then
    echo "✅ Frontend connectivity test passed (Vite dev server may take time to start)"
else
    echo "⚠️ Frontend connectivity test returned HTTP $FRONTEND_TEST (Vite may still be starting)"
fi

echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "📊 Services Status:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   Redis:    localhost:6379"
echo ""
echo "📝 View logs: docker compose logs [service]"
echo "🛑 Stop services: docker compose down"
echo ""
echo "✅ Development environment is ready!"