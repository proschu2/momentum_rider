# Momentum Rider Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the Momentum Rider ETF Portfolio Management System. We employ a multi-layered testing approach to ensure reliability, performance, and maintainability.

## Test Pyramid

```
    /\
   /  \    E2E Tests (5%)
  /____\   - Critical user workflows
 /      \  - Cross-system integration
/________\ - Performance under real conditions

    /\
   /  \    Integration Tests (15%)
  /____\   - API integration
 /      \  - Service integration
/________\ - Database integration

    /\
   /  \    Unit Tests (80%)
  /____\   - Component logic
 /      \  - Business rules
/________\ - Utility functions
```

## Test Suite Structure

### 1. Backend Unit Tests (`server/tests/`)

**Coverage**: JavaScript/Node.js backend services and API endpoints

**Key Test Files**:
- `api.test.js` - Comprehensive API endpoint testing
- Unit tests for individual services
- Database integration tests
- Cache layer testing

**Test Categories**:
```javascript
describe('Backend Tests', () => {
  describe('📊 ETF Universe Endpoints')
  describe('💰 Quote and Price Endpoints')
  describe('📈 Momentum Analysis Endpoints')
  describe('🎯 Portfolio Strategy Endpoints')
  describe('⚖️ Portfolio Optimization Endpoints')
  describe('📋 Portfolio Execution Endpoints')
  describe('📦 Portfolio CRUD Operations')
  describe('🔐 Error Handling and Validation')
  describe('📈 Performance and Load Testing')
  describe('🗂️ Data Consistency Tests')
})
```

**Running Tests**:
```bash
cd server
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

### 2. Frontend Unit Tests (`frontend/src/components/*/__tests__/`)

**Coverage**: Vue 3 components, TypeScript services, business logic

**Key Test Files**:
- Component tests for StrategyHub, ETF selection, etc.
- Service tests for API integration
- Utility function tests
- State management tests (Pinia stores)

**Test Categories**:
```typescript
describe('Frontend Tests', () => {
  describe('Component Rendering')
  describe('User Interactions')
  describe('Data Binding')
  describe('State Management')
  describe('API Integration')
  describe('Error Handling')
})
```

**Running Tests**:
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:ui           # Visual UI
npm run test:coverage     # With coverage
```

### 3. Integration Tests (`frontend/tests/integration/`)

**Coverage**: Frontend-backend API integration with realistic scenarios

**Key Test File**: `portfolio-service.test.ts`

**Test Scenarios**:
- Realistic portfolio analysis requests
- Complete execution plan workflows
- CRUD operations with data validation
- Error handling and network failures
- Data consistency verification

**Running Tests**:
```bash
cd frontend
npm test tests/integration/
```

### 4. End-to-End (E2E) Tests (`tests/e2e/`)

**Coverage**: Complete user workflows from UI to backend

**Key Test File**: `portfolio-workflows.spec.ts`

**Test Scenarios**:
```typescript
describe('Portfolio Management E2E Tests', () => {
  describe('Momentum Strategy Workflow')
  describe('All Weather Strategy Workflow')
  describe('Custom Strategy Workflow')
  describe('Portfolio CRUD Operations')
  describe('Responsive Design Tests')
  describe('Data Consistency Tests')
  describe('Performance Tests')
})
```

**Test Features**:
- Multi-browser support (Chrome, Firefox, Safari, Edge)
- Mobile and tablet responsive testing
- Performance benchmarking
- Accessibility testing
- Visual regression testing

**Running Tests**:
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/portfolio-workflows.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Run tests in debug mode
npx playwright test --debug
```

### 5. Performance Tests (`tests/performance/`)

**Coverage**: Application performance under various conditions

**Key Test File**: `portfolio-optimization.test.ts`

**Performance Thresholds**:
```typescript
const performanceThresholds = {
  portfolioAnalysis: 5000,      // 5 seconds
  executionPlan: 10000,         // 10 seconds
  batchQuoteFetch: 3000,        // 3 seconds
  momentumCalculation: 2000,    // 2 seconds
  linearProgramming: 8000       // 8 seconds
}
```

**Test Categories**:
- Response time testing
- Memory usage monitoring
- Concurrent request handling
- Network latency resilience
- Performance regression detection

**Running Tests**:
```bash
npx playwright test tests/performance/
```

## Test Environment Setup

### Prerequisites

1. **Node.js** 18+ installed
2. **Docker** and **Docker Compose** for integration testing
3. **Redis** server for caching tests
4. **Playwright browsers** for E2E testing

### Environment Configuration

```bash
# Development environment
cp .env.example .env

# Configure test environment variables
TEST_API_URL=http://localhost:3001
TEST_MOCK_DATA=true
REDIS_TEST_URL=redis://localhost:6379
```

### Docker Testing Setup

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests against test environment
npm run test:e2e

# Cleanup test environment
docker-compose -f docker-compose.test.yml down
```

## Continuous Integration (CI/CD)

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd server && npm install
      - run: cd server && npm run test:coverage
      - uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm run test:coverage

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: npm run dev &
      - run: npx playwright test
```

## Test Data Management

### Mock Data Strategy

1. **Static Mock Data**: For consistent unit testing
2. **Dynamic Mock Data**: For integration testing
3. **Real-time Data**: For performance testing

### Test Data Files

```
tests/
├── fixtures/
│   ├── etf-universe.json      # Mock ETF data
│   ├── market-data.json       # Historical price data
│   └── portfolio-examples.json # Sample portfolios
└── mocks/
    ├── api-responses.ts       # API response mocks
    └── market-data.ts         # Market data mocks
```

### Database Testing

```javascript
// Test database setup
beforeAll(async () => {
  // Setup test database
  await setupTestDatabase()
})

afterAll(async () => {
  // Cleanup test database
  await cleanupTestDatabase()
})

beforeEach(async () => {
  // Reset database state
  await resetTestData()
})
```

## Coverage Requirements

### Minimum Coverage Targets

- **Backend**: 85% line coverage, 80% branch coverage
- **Frontend**: 80% line coverage, 75% branch coverage
- **Integration**: 70% line coverage
- **E2E**: 60% code path coverage

### Coverage Reports

- **HTML Reports**: Generated in `coverage/` directory
- **LCOV Reports**: For CI/CD integration
- **JSON Reports**: For programmatic analysis
- **Console Output**: Summary during test runs

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# View detailed coverage
open coverage/index.html

# Check coverage thresholds
npm run test:coverage:check
```

## Performance Testing Strategy

### Load Testing Scenarios

1. **Single User**: Optimal response times
2. **Concurrent Users**: 10-50 simultaneous users
3. **Stress Testing**: System limits and degradation
4. **Volume Testing**: Large portfolio optimizations

### Performance Metrics

- **Response Time**: < 5 seconds for portfolio analysis
- **Throughput**: 100+ requests/second
- **Memory Usage**: < 500MB for typical usage
- **Error Rate**: < 1% under normal load

### Monitoring

```javascript
// Performance monitoring in tests
const performanceMetrics = {
  responseTime: measureResponseTime(),
  memoryUsage: measureMemoryUsage(),
  cpuUsage: measureCPUUsage(),
  errorRate: calculateErrorRate()
}
```

## Quality Gates

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test:unit",
      "pre-push": "npm run test:coverage && npm run test:e2e"
    }
  }
}
```

### Pull Request Requirements

1. **All tests pass** across all categories
2. **Coverage thresholds met** for changed files
3. **Performance tests pass** with no regressions
4. **Code quality checks pass** (ESLint, TypeScript)
5. **Security scans pass** (dependabot, npm audit)

### Release Criteria

1. **100% test pass rate** across all environments
2. **Performance benchmarks met**
3. **Security vulnerabilities resolved**
4. **Documentation updated**
5. **Manual QA approval**

## Test Maintenance

### Test Review Process

1. **Monthly**: Review test coverage gaps
2. **Quarterly**: Update performance benchmarks
3. **Annually**: Comprehensive test suite review

### Test Data Updates

- **Market Data**: Update quarterly with realistic scenarios
- **ETF Universe**: Sync with actual available ETFs
- **Test Portfolios**: Reflect real user scenarios

### Test Environment Updates

- **Node.js Versions**: Test against supported LTS versions
- **Browser Versions**: Update Playwright browsers quarterly
- **Dependencies**: Regular security updates

## Running All Tests

### Quick Start

```bash
# Run comprehensive test suite
./scripts/run-all-tests.sh

# View results
open test-results/summary.md
```

### Individual Test Suites

```bash
# Backend tests only
cd server && npm test

# Frontend tests only
cd frontend && npm test

# Integration tests only
cd frontend && npm test tests/integration/

# E2E tests only
npx playwright test

# Performance tests only
npx playwright test tests/performance/
```

### CI/CD Integration

```bash
# Full test suite (as in CI)
npm run test:ci

# Pre-deployment checks
npm run test:pre-deploy
```

## Best Practices

### Test Writing

1. **Arrange-Act-Assert Pattern**: Clear test structure
2. **Descriptive Test Names**: Self-documenting tests
3. **Independent Tests**: No test dependencies
4. **Mock External Dependencies**: Consistent test environment
5. **Test Edge Cases**: Boundary conditions and error scenarios

### Test Data

1. **Realistic Data**: Use actual ETF symbols and market data
2. **Edge Cases**: Empty portfolios, large portfolios, etc.
3. **Error Scenarios**: Network failures, invalid data
4. **Performance Data**: Large datasets for stress testing

### Continuous Improvement

1. **Monitor Test Flakiness**: Identify unstable tests
2. **Optimize Slow Tests**: Improve test performance
3. **Add Missing Tests**: Fill coverage gaps
4. **Update Test Data**: Keep current with application changes

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Investigate timing issues and async handling
2. **Environment Dependencies**: Ensure test environment consistency
3. **Data Inconsistencies**: Verify test data setup and cleanup
4. **Performance Regressions**: Benchmark and profile slow tests

### Debug Commands

```bash
# Debug failing test
npm test -- --grep "test name" --debug

# Run tests with verbose output
npm test -- --verbose

# Generate detailed test report
npm test -- --reporter=json > test-report.json
```

This comprehensive testing strategy ensures the Momentum Rider application maintains high quality, performance, and reliability throughout development and deployment cycles.