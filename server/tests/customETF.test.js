/**
 * Custom ETF API endpoints tests
 */

const request = require('supertest');
const app = require('../app');
const fs = require('fs').promises;
const path = require('path');

const CUSTOM_ETF_FILE = path.join(__dirname, '../local_data/customETFs.json');

// Helper function to clear custom ETFs file before tests
async function clearCustomETFs() {
  try {
    await fs.writeFile(CUSTOM_ETF_FILE, JSON.stringify([], null, 2));
  } catch (error) {
    console.error('Failed to clear custom ETFs file:', error);
  }
}

describe('Custom ETF API Endpoints', () => {
  beforeEach(async () => {
    await clearCustomETFs();
  });

  afterAll(async () => {
    await clearCustomETFs();
  });

  describe('POST /api/etfs/custom', () => {
    it('should add a new custom ETF with valid data', async () => {
      const validETF = {
        ticker: 'VGT',
        category: 'STOCKS',
        expenseRatio: 0.0004,
        inceptionDate: '2004-01-26',
        notes: 'Vanguard Technology ETF',
        bypassValidation: true
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(validETF)
        .expect(201);

      expect(response.body.message).toBe('Custom ETF added successfully');
      expect(response.body.etf.ticker).toBe('VGT');
      expect(response.body.etf.category).toBe('STOCKS');
      expect(response.body.etf.expenseRatio).toBe(0.0004);
    });

    it('should reject invalid ticker format', async () => {
      const invalidETF = {
        ticker: 'INVALID@TICKER',
        category: 'STOCKS'
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing required ticker', async () => {
      const invalidETF = {
        category: 'STOCKS'
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid category', async () => {
      const invalidETF = {
        ticker: 'TEST',
        category: 'INVALID_CATEGORY'
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject negative expense ratio', async () => {
      const invalidETF = {
        ticker: 'TEST',
        expenseRatio: -0.01
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject expense ratio greater than 1', async () => {
      const invalidETF = {
        ticker: 'TEST',
        expenseRatio: 1.5
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject future inception date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidETF = {
        ticker: 'TEST',
        inceptionDate: futureDate.toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/etfs/custom')
        .send(invalidETF)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/etfs/custom', () => {
    it('should return empty array when no custom ETFs exist', async () => {
      const response = await request(app)
        .get('/api/etfs/custom')
        .expect(200);

      expect(response.body.etfs).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return all custom ETFs when they exist', async () => {
      // First, add a custom ETF
      await request(app)
        .post('/api/etfs/custom')
        .send({
          ticker: 'VGT',
          category: 'STOCKS',
          bypassValidation: true
        });

      const response = await request(app)
        .get('/api/etfs/custom')
        .expect(200);

      expect(response.body.etfs).toHaveLength(1);
      expect(response.body.etfs[0].ticker).toBe('VGT');
      expect(response.body.count).toBe(1);
    });
  });

  describe('PUT /api/etfs/custom/:ticker', () => {
    beforeEach(async () => {
      // Add a test ETF to update
      await request(app)
        .post('/api/etfs/custom')
        .send({
          ticker: 'VGT',
          category: 'STOCKS',
          expenseRatio: 0.0004,
          notes: 'Original notes',
          bypassValidation: true
        });
    });

    it('should update custom ETF with valid data', async () => {
      const updates = {
        category: 'ALTERNATIVES',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put('/api/etfs/custom/VGT')
        .send(updates)
        .expect(200);

      expect(response.body.message).toBe('ETF VGT updated successfully');
      expect(response.body.etf.category).toBe('ALTERNATIVES');
      expect(response.body.etf.notes).toBe('Updated notes');
      expect(response.body.etf.updatedDate).toBeDefined();
    });

    it('should reject updates for non-existent ETF', async () => {
      const updates = {
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put('/api/etfs/custom/NOTFOUND')
        .send(updates)
        .expect(400);

      expect(response.body.error).toBe('ETF NOTFOUND not found');
    });

    it('should reject empty update request', async () => {
      const response = await request(app)
        .put('/api/etfs/custom/VGT')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid ticker parameter', async () => {
      const updates = {
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put('/api/etfs/custom/INVALID@TICKER')
        .send(updates)
        .expect(400);

      expect(response.body.error).toBe('Parameter validation failed');
    });
  });

  describe('DELETE /api/etfs/custom/:ticker', () => {
    beforeEach(async () => {
      // Add a test ETF to delete
      await request(app)
        .post('/api/etfs/custom')
        .send({
          ticker: 'VGT',
          category: 'STOCKS',
          bypassValidation: true
        });
    });

    it('should delete existing custom ETF', async () => {
      const response = await request(app)
        .delete('/api/etfs/custom/VGT')
        .expect(200);

      expect(response.body.message).toBe('ETF VGT removed successfully');

      // Verify ETF is deleted
      const getResponse = await request(app)
        .get('/api/etfs/custom')
        .expect(200);

      expect(getResponse.body.etfs).toHaveLength(0);
    });

    it('should reject delete for non-existent ETF', async () => {
      const response = await request(app)
        .delete('/api/etfs/custom/NOTFOUND')
        .expect(400);

      expect(response.body.error).toBe('ETF NOTFOUND not found');
    });

    it('should reject invalid ticker parameter', async () => {
      const response = await request(app)
        .delete('/api/etfs/custom/INVALID@TICKER')
        .expect(400);

      expect(response.body.error).toBe('Parameter validation failed');
    });
  });

  describe('GET /api/etfs/validate/:ticker', () => {
    it('should validate ticker with valid format', async () => {
      const response = await request(app)
        .get('/api/etfs/validate/VGT')
        .expect(200);

      expect(response.body.ticker).toBe('VGT');
      // Response may have nested data structure or direct properties
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('valid');
      } else {
        expect(response.body).toHaveProperty('valid');
      }
    });

    it('should reject invalid ticker parameter', async () => {
      const response = await request(app)
        .get('/api/etfs/validate/INVALID@TICKER')
        .expect(400);

      expect(response.body.error).toBe('Parameter validation failed');
    });
  });

  describe('GET /api/etfs/universe', () => {
    it('should return combined ETF universe', async () => {
      // Add a custom ETF first
      await request(app)
        .post('/api/etfs/custom')
        .send({
          ticker: 'VGT',
          category: 'STOCKS',
          bypassValidation: true
        });

      const response = await request(app)
        .get('/api/etfs/universe')
        .expect(200);

      expect(response.body.universe).toHaveProperty('STOCKS');
      expect(response.body.universe).toHaveProperty('BONDS');
      expect(response.body.universe).toHaveProperty('COMMODITIES');
      expect(response.body.universe).toHaveProperty('ALTERNATIVES');
      expect(response.body.categories).toBeInstanceOf(Array);
      expect(response.body.categories).toContain('STOCKS');
    });
  });
});