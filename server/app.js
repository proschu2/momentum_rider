/**
 * Main Express app configuration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import logger
const logger = require('./config/logger');
const { requestLogger } = require('./middleware/logger');

// Import validation middleware
const { sanitizeOutput } = require('./middleware/validation');

// Import rate limiter middleware
const { combinedRateLimiter } = require('./middleware/rateLimiter');

// Import authentication middleware
const { verifyToken } = require('./middleware/auth');

// Import Redis configuration
const { getRedisClient, checkRedisHealth, isRedisConfigured } = require('./config/redis');

// Import cache service for initialization
const cacheService = require('./services/cacheService');

// Import route handlers
const quoteRoutes = require('./routes/quote');
const momentumRoutes = require('./routes/momentum');
const pricesRoutes = require('./routes/prices');
const batchRoutes = require('./routes/batch');
const cacheRoutes = require('./routes/cache');
const healthRoutes = require('./routes/health');
const optimizationRoutes = require('./routes/optimization');
const authRoutes = require('./routes/auth');
const customETFRoutes = require('./routes/customETFs');
const strategyRoutes = require('./routes/strategies');
const smaRoutes = require('./routes/sma');

// Import error handlers
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Redis initialization flag
let redisInitialized = false;

/**
 * Initialize Redis connection and cache
 */
async function initializeRedis() {
  try {
    // Check if Redis is configured before attempting connection
    if (!isRedisConfigured()) {
      logger.logInfo('Redis not configured, using in-memory cache only');
      redisInitialized = false;
      return false;
    }

    logger.logInfo('Initializing Redis connection');
    const redis = getRedisClient();

    // Check Redis health
    const health = await checkRedisHealth();

    if (health.status === 'healthy') {
      logger.logInfo('Redis connection established');

      // Warm up cache with frequently accessed data
      await cacheService.warmCache();
      logger.logInfo('Cache warmed successfully');

      redisInitialized = true;
      return true;
    } else {
      logger.logWarn('Redis unavailable, falling back to in-memory cache', {
        error: health.error,
      });
      redisInitialized = false;
      return false;
    }
  } catch (error) {
    logger.logError(error, null);
    logger.logInfo('Falling back to in-memory cache');
    redisInitialized = false;
    return false;
  }
}

/**
 * Get Redis initialization status
 */
function isRedisInitialized() {
  return redisInitialized;
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://frontend:5173',
            'http://backend:3001'
          ];
      
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);
app.use(express.json());

// Request logging middleware (should be early in the middleware stack)
app.use(requestLogger);

// Note: sanitizeOutput middleware removed - JSON responses don't need HTML escaping
// Output sanitization is only needed for HTML responses, not JSON APIs

// Apply rate limiting to all API routes
app.use('/api', combinedRateLimiter);

// Mount API routes BEFORE static file serving
app.use('/api/auth', authRoutes);
// Note: Authentication disabled for single-user access
app.use('/api/quote', quoteRoutes);
app.use('/api/momentum', momentumRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/etfs', customETFRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/strategies/sma', smaRoutes);
app.use('/health', healthRoutes);

// Serve static files from frontend build directory in production mode
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, 'frontend/dist');
  
  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(frontendBuildPath, {
    maxAge: '1y', // Cache static assets for 1 year
    etag: false   // Disable etag for better performance
  }));
  
  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
module.exports.initializeRedis = initializeRedis;
module.exports.isRedisInitialized = isRedisInitialized;
