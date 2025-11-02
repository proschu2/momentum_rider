/**
 * Health endpoint tests
 */

const request = require('supertest');
const app = require('../app');

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
    });

    it('should include Redis health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks.redis).toHaveProperty('status');
    });

    it('should include cache health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.checks).toHaveProperty('cache');
      expect(response.body.checks.cache).toHaveProperty('backend');
      expect(response.body.checks.cache).toHaveProperty('size');
    });

    it('should include memory health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('heapUsed');
      expect(response.body.checks.memory).toHaveProperty('heapTotal');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body).toHaveProperty('status', 'READY');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/health/live').expect(200);

      expect(response.body).toHaveProperty('status', 'ALIVE');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
