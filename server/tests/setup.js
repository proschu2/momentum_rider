/**
 * Test setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BYPASS_ETF_VALIDATION = 'true';

// Make sure environment variables are properly set
console.log('Test environment setup:', {
  NODE_ENV: process.env.NODE_ENV,
  BYPASS_ETF_VALIDATION: process.env.BYPASS_ETF_VALIDATION
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress certain error messages in tests
  if (typeof args[0] === 'string' && args[0].includes('Application Error')) {
    return;
  }
  originalConsoleError(...args);
};

// Increase timeout for async operations
jest.setTimeout(10000);