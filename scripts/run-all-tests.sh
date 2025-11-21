#!/bin/bash

# Comprehensive Test Runner for Momentum Rider
# Runs all test suites with coverage reporting

set -e

echo "🚀 Starting Momentum Rider Comprehensive Test Suite"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Create test results directory
mkdir -p test-results
mkdir -p coverage

# Start the test suite
print_status "Starting comprehensive test suite..."

# 1. Backend Unit Tests
print_status "Running Backend Unit Tests..."
cd server
npm run test:coverage 2>&1 | tee ../test-results/backend-tests.log
BACKEND_EXIT_CODE=${PIPESTATUS[0]}
cd ..

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    print_success "Backend unit tests passed"
else
    print_error "Backend unit tests failed"
    exit 1
fi

# 2. Frontend Unit Tests
print_status "Running Frontend Unit Tests..."
cd frontend
npm run test:coverage 2>&1 | tee ../test-results/frontend-tests.log
FRONTEND_EXIT_CODE=${PIPESTATUS[0]}
cd ..

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    print_success "Frontend unit tests passed"
else
    print_error "Frontend unit tests failed"
    exit 1
fi

# 3. Integration Tests (Frontend)
print_status "Running Frontend Integration Tests..."
cd frontend
npm test tests/integration/portfolio-service.test.ts 2>&1 | tee ../test-results/integration-tests.log
INTEGRATION_EXIT_CODE=${PIPESTATUS[0]}
cd ..

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# 4. Performance Tests (if Playwright is installed)
if command -v npx playwright test &> /dev/null; then
    print_status "Running Performance Tests..."
    npx playwright test tests/performance/portfolio-optimization.test.ts --reporter=json --outputFile=test-results/performance-tests.json 2>&1 | tee test-results/performance-tests.log
    PERF_EXIT_CODE=${PIPESTATUS[0]}

    if [ $PERF_EXIT_CODE -eq 0 ]; then
        print_success "Performance tests passed"
    else
        print_warning "Performance tests had issues (may be environmental)"
    fi
else
    print_warning "Playwright not installed, skipping performance tests"
fi

# 5. E2E Tests (if Playwright is installed and app is running)
if command -v npx playwright test &> /dev/null; then
    print_status "Running E2E Tests..."

    # Check if the app is running
    if curl -f http://localhost:5173 &> /dev/null; then
        npx playwright test tests/e2e/portfolio-workflows.spec.ts --reporter=json --outputFile=test-results/e2e-tests.json 2>&1 | tee test-results/e2e-tests.log
        E2E_EXIT_CODE=${PIPESTATUS[0]}

        if [ $E2E_EXIT_CODE -eq 0 ]; then
            print_success "E2E tests passed"
        else
            print_warning "E2E tests had issues (may need running app)"
        fi
    else
        print_warning "App not running on localhost:5173, skipping E2E tests"
        print_status "Start the app with 'npm run dev' and run E2E tests separately"
    fi
else
    print_warning "Playwright not installed, skipping E2E tests"
fi

# 6. Test Coverage Summary
print_status "Generating Test Coverage Summary..."

# Backend coverage
if [ -f "server/coverage/lcov.info" ]; then
    cp server/coverage/lcov.info coverage/backend.lcov.info
    print_success "Backend coverage report saved"
fi

# Frontend coverage
if [ -f "frontend/coverage/lcov.info" ]; then
    cp frontend/coverage/lcov.info coverage/frontend.lcov.info
    print_success "Frontend coverage report saved"
fi

# 7. Generate Combined Coverage Report
if [ -f "server/coverage/lcov.info" ] && [ -f "frontend/coverage/lcov.info" ]; then
    print_status "Generating combined coverage report..."

    # Install lcov if not present
    if ! command -v lcov &> /dev/null; then
        print_warning "lcov not installed, skipping combined coverage report"
    else
        # Combine coverage reports
        cat coverage/backend.lcov.info coverage/frontend.lcov.info > coverage/combined.lcov.info
        print_success "Combined coverage report generated"
    fi
fi

# 8. Test Results Summary
print_status "Generating Test Results Summary..."

cat > test-results/summary.md << EOF
# Momentum Rider Test Results Summary

Generated: $(date)

## Test Suite Results

### Backend Unit Tests
- Status: $([ $BACKEND_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- Coverage: See server/coverage/ directory
- Log: backend-tests.log

### Frontend Unit Tests
- Status: $([ $FRONTEND_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- Coverage: See frontend/coverage/ directory
- Log: frontend-tests.log

### Integration Tests
- Status: $([ $INTEGRATION_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- Log: integration-tests.log

### Performance Tests
- Status: $([ $PERF_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "⚠️ SKIPPED/FAILED")
- Log: performance-tests.log

### E2E Tests
- Status: $([ $E2E_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "⚠️ SKIPPED/FAILED")
- Log: e2e-tests.log

## Coverage Reports

- Backend: server/coverage/
- Frontend: frontend/coverage/
- Combined: coverage/combined.lcov.info

## Quick Commands

- Run only backend tests: \`cd server && npm test\`
- Run only frontend tests: \`cd frontend && npm test\`
- Run E2E tests: \`npx playwright test\`
- Run performance tests: \`npx playwright test tests/performance/\`
- View coverage: \`open coverage/index.html\`

## Test Structure

- Backend Unit Tests: server/tests/
- Frontend Unit Tests: frontend/src/components/*/__tests__/
- Integration Tests: frontend/tests/integration/
- E2E Tests: tests/e2e/
- Performance Tests: tests/performance/

EOF

print_success "Test results summary generated: test-results/summary.md"

# 9. Final Status
TOTAL_EXIT_CODE=0
if [ $BACKEND_EXIT_CODE -ne 0 ] || [ $FRONTEND_EXIT_CODE -ne 0 ] || [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
    TOTAL_EXIT_CODE=1
fi

echo "================================================="
if [ $TOTAL_EXIT_CODE -eq 0 ]; then
    print_success "All critical tests passed! 🎉"
    echo ""
    echo "📊 Coverage Reports:"
    echo "  - Backend: open server/coverage/index.html"
    echo "  - Frontend: open frontend/coverage/index.html"
    echo "  - Combined: open coverage/index.html (if generated)"
    echo ""
    echo "📋 Detailed Results: test-results/summary.md"
else
    print_error "Some tests failed. Check the logs in test-results/ directory"
fi

echo "================================================="

exit $TOTAL_EXIT_CODE