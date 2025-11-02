/**
 * Redis Connection Configuration
 */

const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Create and configure Redis client
 */
function createRedisClient() {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DATABASE || 0,
    connectTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT) || 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  const client = new Redis(redisConfig);

  // Event handlers
  client.on('connect', () => {
    logger.logInfo('Redis: Connecting to Redis server');
  });

  client.on('ready', () => {
    logger.logInfo('Redis: Connected successfully');
  });

  client.on('error', (err) => {
    logger.logError(err, null);
  });

  client.on('close', () => {
    logger.logWarn('Redis: Connection closed');
  });

  client.on('reconnecting', () => {
    logger.logInfo('Redis: Reconnecting...');
  });

  client.on('end', () => {
    logger.logInfo('Redis: Connection ended');
  });

  return client;
}

/**
 * Initialize and get Redis client
 */
let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Graceful Redis shutdown
 */
async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.logInfo('Redis: Connection closed gracefully');
    } catch (error) {
      logger.logError(error, null);
      redisClient.disconnect();
    }
  }
}

/**
 * Check Redis connection health
 */
async function checkRedisHealth() {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return { status: 'healthy', response: pong };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

module.exports = {
  createRedisClient,
  getRedisClient,
  closeRedisConnection,
  checkRedisHealth,
};
