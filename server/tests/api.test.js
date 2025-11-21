/**
 * Comprehensive API Integration Tests
 * Tests all major endpoints with realistic scenarios
 */

const request = require('supertest');
const app = require('../app');
const { describe, it, before, after } = require('@jest/globals');

describe('Portfolio Management API Integration Tests', () => {
  let authToken;
  let testPortfolioId;

  beforeAll(async () => {
    // Setup any required authentication or initial data
    console.log('Setting up test environment...');
  });

  afterAll(async () => {
    // Cleanup any test data
    console.log('Cleaning up test environment...');
  });

  describe('📊 ETF Universe Endpoints', () => {
    it('GET /api/etfs/universe - should return available ETFs', async () => {
      const response = await request(app)
        .get('/api/etfs/universe')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('etfs');
      expect(Array.isArray(response.body.etfs)).toBe(true);
      expect(response.body.etfs.length).toBeGreaterThan(0);

      // Verify ETF structure
      const firstETF = response.body.etfs[0];
      expect(firstETF).toHaveProperty('ticker');
      expect(firstETF).toHaveProperty('name');
      expect(firstETF).toHaveProperty('category');
      expect(firstETF).toHaveProperty('isCustom');
    });

    it('GET /api/etfs/config - should return ETF configuration', async () => {
      const response = await request(app)
        .get('/api/etfs/config')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('etfs');
      expect(response.body).toHaveProperty('momentumScores');
    });
  });

  describe('💰 Quote and Price Endpoints', () => {
    const testTickers = ['VTI', 'VXUS', 'BND', 'QQQ'];

    testTickers.forEach(ticker => {
      it(`GET /api/quote/${ticker} - should return current quote data`, async () => {
        const response = await request(app)
          .get(`/api/quote/${ticker}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('ticker', ticker);
        expect(response.body).toHaveProperty('regularMarketPrice');
        expect(typeof response.body.regularMarketPrice).toBe('number');
        expect(response.body.regularMarketPrice).toBeGreaterThan(0);
      });
    });

    it('GET /api/quote/INVALID - should return 404 for invalid ticker', async () => {
      const response = await request(app)
        .get('/api/quote/INVALIDTICKER123')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('POST /api/quote/pre-fetch - should batch fetch multiple quotes', async () => {
      const response = await request(app)
        .post('/api/quote/pre-fetch')
        .send({
          tickers: ['VTI', 'VXUS', 'BND']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(response.body).toHaveProperty('cachedCount');
      expect(response.body).toHaveProperty('fetchedCount');
      expect(response.body).toHaveProperty('totalProcessed');
    });
  });

  describe('📈 Momentum Analysis Endpoints', () => {
    it('GET /api/momentum/VTI - should return momentum analysis', async () => {
      const response = await request(app)
        .get('/api/momentum/VTI')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('ticker', 'VTI');
      expect(response.body).toHaveProperty('momentum3m');
      expect(response.body).toHaveProperty('momentum6m');
      expect(response.body).toHaveProperty('momentum9m');
      expect(response.body).toHaveProperty('momentum12m');
      expect(response.body).toHaveProperty('weightedScore');
      expect(response.body).toHaveProperty('absoluteMomentum');
    });

    it('POST /api/momentum/compare - should compare multiple ETFs momentum', async () => {
      const response = await request(app)
        .post('/api/momentum/compare')
        .send({
          tickers: ['VTI', 'VXUS', 'BND', 'QQQ']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('comparison');
      expect(Array.isArray(response.body.comparison)).toBe(true);
      expect(response.body.comparison.length).toBe(4);
    });
  });

  describe('🎯 Portfolio Strategy Endpoints', () => {
    it('POST /api/portfolio/analyze - should analyze momentum strategy', async () => {
      const portfolioRequest = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND', 'QQQ', 'GLDM'],
        additionalCapital: 50000,
        currentHoldings: {
          'VTI': { shares: 100, avgCost: 250 },
          'BND': { shares: 50, avgCost: 75 }
        }
      };

      const response = await request(app)
        .post('/api/portfolio/analyze')
        .send(portfolioRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('strategy', 'momentum');
      expect(response.body).toHaveProperty('targetAllocations');
      expect(response.body).toHaveProperty('totalInvestment');
      expect(response.body).toHaveProperty('utilizationRate');

      // Verify momentum-specific data
      expect(response.body).toHaveProperty('momentumScores');
      expect(response.body).toHaveProperty('selectedETFs');
    });

    it('POST /api/portfolio/analyze - should analyze all-weather strategy', async () => {
      const portfolioRequest = {
        strategyType: 'allweather',
        selectedETFs: ['VTI', 'VXUS', 'BND', 'TLT', 'GLDM'],
        additionalCapital: 100000,
        currentHoldings: {}
      };

      const response = await request(app)
        .post('/api/portfolio/analyze')
        .send(portfolioRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('strategy', 'allweather');
      expect(response.body).toHaveProperty('targetAllocations');
      expect(response.body).toHaveProperty('smaSignals');
    });

    it('POST /api/portfolio/analyze - should handle custom strategy', async () => {
      const portfolioRequest = {
        strategyType: 'custom',
        selectedETFs: ['VTI', 'VXUS', 'BND'],
        additionalCapital: 75000,
        customAllocations: {
          'VTI': 0.5,
          'VXUS': 0.3,
          'BND': 0.2
        },
        currentHoldings: {}
      };

      const response = await request(app)
        .post('/api/portfolio/analyze')
        .send(portfolioRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('strategy', 'custom');
      expect(response.body.targetAllocations).toMatchObject({
        'VTI': 0.5,
        'VXUS': 0.3,
        'BND': 0.2
      });
    });
  });

  describe('⚖️ Portfolio Optimization Endpoints', () => {
    it('POST /api/optimization/rebalance - should optimize portfolio allocation', async () => {
      const optimizationRequest = {
        currentHoldings: [
          { name: 'VTI', shares: 100, price: 250 },
          { name: 'VXUS', shares: 50, price: 60 }
        ],
        targetETFs: [
          { name: 'VTI', targetPercentage: 0.6, allowedDeviation: 0.05, pricePerShare: 250 },
          { name: 'VXUS', targetPercentage: 0.3, allowedDeviation: 0.05, pricePerShare: 60 },
          { name: 'BND', targetPercentage: 0.1, allowedDeviation: 0.05, pricePerShare: 80 }
        ],
        extraCash: 5000,
        optimizationStrategy: 'minimize-leftover'
      };

      const response = await request(app)
        .post('/api/optimization/rebalance')
        .send(optimizationRequest)
        .expect(200);

      expect(response.body).toHaveProperty('solverStatus');
      expect(['optimal', 'infeasible', 'heuristic', 'error']).toContain(response.body.solverStatus);
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('optimizationMetrics');
      expect(response.body).toHaveProperty('holdingsToSell');
    });

    it('GET /api/optimization/health - should return optimization service health', async () => {
      const response = await request(app)
        .get('/api/optimization/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'portfolio-optimization');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('📋 Portfolio Execution Endpoints', () => {
    let executionPlanId;

    it('POST /api/portfolio/execution-plan - should create complete execution plan', async () => {
      const executionRequest = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND'],
        additionalCapital: 25000,
        currentHoldings: {
          'VTI': { shares: 50, avgCost: 245 },
          'BND': { shares: 25, avgCost: 72 }
        },
        optimizationStrategy: 'minimize-leftover'
      };

      const response = await request(app)
        .post('/api/portfolio/execution-plan')
        .send(executionRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('executionPlan');
      expect(response.body).toHaveProperty('analysisResults');
      expect(response.body).toHaveProperty('portfolioComparison');
      expect(Array.isArray(response.body.executionPlan)).toBe(true);

      executionPlanId = response.body.executionPlanId;
    });

    it('GET /api/portfolio/execution-plan/:id - should retrieve existing execution plan', async () => {
      // First create an execution plan
      const createResponse = await request(app)
        .post('/api/portfolio/execution-plan')
        .send({
          strategyType: 'allweather',
          selectedETFs: ['VTI', 'VXUS', 'BND'],
          additionalCapital: 15000
        });

      const planId = createResponse.body.executionPlanId;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/portfolio/execution-plan/${planId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('executionPlan');
      expect(response.body).toHaveProperty('executionPlanId', planId);
    });

    it('GET /api/portfolio/execution-plan/invalid-id - should return 404 for invalid plan', async () => {
      const response = await request(app)
        .get('/api/portfolio/execution-plan/invalid-plan-id-123')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });

  describe('📦 Portfolio CRUD Operations', () => {
    let createdPortfolioId;

    it('POST /api/portfolios - should create new portfolio', async () => {
      const portfolioData = {
        name: 'Test Retirement Portfolio',
        description: 'Test portfolio for API integration testing',
        strategy: 'momentum',
        holdings: {
          'VTI': { shares: 100, avgCost: 250 },
          'VXUS': { shares: 50, avgCost: 60 }
        },
        additionalCash: 10000,
        targetAllocations: {
          'VTI': 0.6,
          'VXUS': 0.3,
          'BND': 0.1
        }
      };

      const response = await request(app)
        .post('/api/portfolios')
        .send(portfolioData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('portfolio');
      expect(response.body.portfolio).toHaveProperty('id');
      expect(response.body.portfolio.name).toBe('Test Retirement Portfolio');
      expect(response.body.portfolio.holdings).toEqual(portfolioData.holdings);

      createdPortfolioId = response.body.portfolio.id;
    });

    it('GET /api/portfolios - should list all portfolios', async () => {
      const response = await request(app)
        .get('/api/portfolios')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('portfolios');
      expect(Array.isArray(response.body.portfolios)).toBe(true);
    });

    it('GET /api/portfolios/:id - should retrieve specific portfolio', async () => {
      const response = await request(app)
        .get(`/api/portfolios/${createdPortfolioId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('portfolio');
      expect(response.body.portfolio.id).toBe(createdPortfolioId);
      expect(response.body.portfolio.name).toBe('Test Retirement Portfolio');
    });

    it('PUT /api/portfolios/:id - should update portfolio', async () => {
      const updateData = {
        name: 'Updated Test Portfolio',
        additionalCash: 15000,
        targetAllocations: {
          'VTI': 0.5,
          'VXUS': 0.35,
          'BND': 0.15
        }
      };

      const response = await request(app)
        .put(`/api/portfolios/${createdPortfolioId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('portfolio');
      expect(response.body.portfolio.name).toBe('Updated Test Portfolio');
      expect(response.body.portfolio.additionalCash).toBe(15000);
    });

    it('DELETE /api/portfolios/:id - should delete portfolio', async () => {
      const response = await request(app)
        .delete(`/api/portfolios/${createdPortfolioId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Portfolio deleted successfully');

      // Verify deletion
      await request(app)
        .get(`/api/portfolios/${createdPortfolioId}`)
        .expect(404);
    });
  });

  describe('🔐 Error Handling and Validation', () => {
    it('should handle invalid portfolio data gracefully', async () => {
      const invalidData = {
        name: '', // Empty name
        strategy: 'invalid_strategy',
        holdings: {},
        additionalCash: -1000, // Negative cash
        targetAllocations: {
          'VTI': 1.5, // Over 100% allocation
          'VXUS': 0.8 // Total over 200%
        }
      };

      const response = await request(app)
        .post('/api/portfolios')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/portfolio/analyze')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/portfolio/analyze')
        .send({}) // Missing required strategyType
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('📈 Performance and Load Testing', () => {
    it('should handle concurrent quote requests', async () => {
      const tickers = ['VTI', 'VXUS', 'BND', 'QQQ', 'GLDM', 'IBIT'];
      const promises = tickers.map(ticker =>
        request(app).get(`/api/quote/${ticker}`).expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('regularMarketPrice');
        expect(response.body.regularMarketPrice).toBeGreaterThan(0);
      });
    }, 10000); // 10 second timeout

    it('should handle batch quote requests efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/quote/pre-fetch')
        .send({
          tickers: ['VTI', 'VXUS', 'BND', 'QQQ', 'GLDM', 'IBIT', 'VEA', 'VWO', 'TLT', 'BWX', 'PDBC', 'SGOV']
        })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.totalProcessed).toBe(12);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('🗂️ Data Consistency Tests', () => {
    it('should maintain consistency between quote and momentum data', async () => {
      const ticker = 'VTI';

      // Get quote data
      const quoteResponse = await request(app)
        .get(`/api/quote/${ticker}`)
        .expect(200);

      // Get momentum data
      const momentumResponse = await request(app)
        .get(`/api/momentum/${ticker}`)
        .expect(200);

      // Both should return same ticker
      expect(quoteResponse.body.ticker).toBe(ticker);
      expect(momentumResponse.body.ticker).toBe(ticker);

      // Momentum should have the current price
      expect(momentumResponse.body).toHaveProperty('currentPrice');
      expect(momentumResponse.body.currentPrice).toBe(quoteResponse.body.regularMarketPrice);
    });

    it('should maintain portfolio calculation consistency', async () => {
      const portfolioRequest = {
        strategyType: 'momentum',
        selectedETFs: ['VTI', 'VXUS', 'BND'],
        additionalCapital: 50000,
        currentHoldings: {
          'VTI': { shares: 100, avgCost: 250 },
          'VXUS': { shares: 50, avgCost: 60 }
        }
      };

      // Create execution plan
      const executionResponse = await request(app)
        .post('/api/portfolio/execution-plan')
        .send(portfolioRequest)
        .expect(200);

      const { analysisResults, portfolioComparison, executionPlan } = executionResponse.body;

      // Verify calculations are consistent
      expect(analysisResults.totalInvestment).toBeGreaterThan(0);
      expect(analysisResults.utilizedCapital).toBeLessThanOrEqual(analysisResults.totalInvestment);
      expect(analysisResults.uninvestedCash).toBeGreaterThanOrEqual(0);
      expect(analysisResults.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(analysisResults.utilizationRate).toBeLessThanOrEqual(100);

      // Portfolio comparison should match execution plan
      expect(portfolioComparison.length).toBeGreaterThan(0);
      expect(executionPlan.length).toBeGreaterThan(0);
    });
  });
});