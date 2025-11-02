/**
 * Logging Middleware
 * Provides request logging and error logging middleware
 */

const logger = require('../config/logger');

/**
 * Request Logging Middleware
 * Logs all HTTP requests with timing information
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request details
  logger.logInfo('Incoming Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || '',
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (data) {
    const responseTime = Date.now() - start;

    // Log response details
    logger.logRequest(req, res, responseTime);

    return originalJson.call(this, data);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - start;

    // Log response details for non-JSON responses
    if (!res.headersSent) {
      logger.logRequest(req, res, responseTime);
    }

    return originalSend.call(this, data);
  };

  // Handle response finish event
  res.on('finish', () => {
    const responseTime = Date.now() - start;

    // Ensure response is logged even if not intercepted
    if (!res.headersSent || res.statusCode >= 400) {
      logger.logRequest(req, res, responseTime);
    }
  });

  next();
};

/**
 * Error Logging Middleware
 * Logs all errors with context information
 */
const errorLogger = (err, req, res, next) => {
  logger.logError(err, req);
  next(err);
};

/**
 * Performance Logging Middleware
 * Logs slow requests for performance monitoring
 */
const performanceLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - start;

      if (responseTime > threshold) {
        logger.logWarn('Slow Request Detected', {
          method: req.method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode,
          threshold: `${threshold}ms`,
          ip: req.ip || req.connection.remoteAddress,
        });
      }
    });

    next();
  };
};

/**
 * API Endpoint Logging Middleware
 * Logs API endpoint access for monitoring
 */
const apiLogger = (req, res, next) => {
  // Log authenticated user if available
  if (req.user) {
    logger.logDebug('Authenticated API Access', {
      userId: req.user.id || req.user.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
  }

  next();
};

/**
 * Health Check Logging Middleware
 * Minimal logging for health check endpoints
 */
const healthLogger = (req, res, next) => {
  // Don't log health checks in production to reduce noise
  if (process.env.NODE_ENV !== 'production') {
    logger.logDebug('Health Check', {
      url: req.originalUrl,
      method: req.method,
    });
  }

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  performanceLogger,
  apiLogger,
  healthLogger,
};
