/**
 * Main server entry point
 */

const app = require('./app');
const logger = require('./config/logger');
const { closeRedisConnection } = require('./config/redis');

const PORT = process.env.PORT || 3001;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.logInfo(`Received ${signal}. Starting graceful shutdown`);

  try {
    // Close Redis connection
    await closeRedisConnection();
    logger.logInfo('Redis connection closed');

    // Give some time for ongoing requests to complete
    setTimeout(() => {
      logger.logInfo('Shutting down server');
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.logError(error, null);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Initialize Redis before starting the server
    await app.initializeRedis();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.logInfo('Server started', {
        message: `Backend server running on http://localhost:${PORT}`,
        environment: process.env.NODE_ENV || 'development',
        cacheBackend: app.isRedisInitialized() ? 'Redis' : 'In-Memory',
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.logError(new Error(`Port ${PORT} is already in use`), null);
      } else {
        logger.logError(error, null);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.logError(error, null);
    process.exit(1);
  }
}

startServer();
