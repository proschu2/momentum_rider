/**
 * Momentum endpoint tests
 */

const request = require('supertest');
const app = require('../app');

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'test-user', email: 'test@example.com' };
    next();
  },
}));

describe('Momentum Endpoints', () => {
  describe('GET /api/momentum/:ticker', () => {
    it('should return momentum data for a ticker', async () => {
      const response = await request(app)
        .get('/api/momentum/AAPL')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('ticker');
      expect(response.body).toHaveProperty('periods');
      expect(response.body.periods).toHaveProperty('3month');
      expect(response.body.periods).toHaveProperty('6month');
      expect(response.body.periods).toHaveProperty('9month');
      expect(response.body.periods).toHaveProperty('12month');
    });

    it('should validate ticker parameter', async () => {
      const response = await request(app)
        .get('/api/momentum/INVALID_TICKER_12345')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/momentum/AAPL').expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
