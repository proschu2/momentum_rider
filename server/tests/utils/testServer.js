const request = require('supertest');

/**
 * Create a test server instance
 */
function testServer() {
  const app = require('../../app');
  return request(app);
}

module.exports = testServer;
