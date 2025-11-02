/**
 * Rate Limiting Middleware
 * Provides IP-based and user-based rate limiting with custom headers
 */

const rateLimit = require('express-rate-limit');

// Configuration with environment variables
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes default
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100; // 100 requests default

/**
 * IP-based rate limiter
 * Limits each IP address to 100 requests per 15 minutes (default)
 */
const ipRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * User-based rate limiter for authenticated users
 * Limits each authenticated user to 1000 requests per hour (default)
 * More lenient than IP-based since authenticated users are trusted
 */
const userRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 1000, // 1000 requests per hour for authenticated users
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for authenticated user. Please try again later.',
    code: 'USER_RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => {
    // Only use user ID if authenticated, otherwise use default IP handling
    const userId = req.user?.id || req.user?._id || req.headers['x-user-id'];
    return userId;
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 * Lower limits for authentication, payment, or other sensitive operations
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 requests per 15 minutes for sensitive endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. This endpoint has strict rate limiting.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Combined rate limiter middleware
 * Applies user-based rate limiting if authenticated, otherwise IP-based
 */
const combinedRateLimiter = (req, res, next) => {
  // Check if user is authenticated
  const isAuthenticated = req.user || req.headers['x-user-id'];

  if (isAuthenticated) {
    // Use user-based rate limiter for authenticated users
    return userRateLimiter(req, res, next);
  } else {
    // Use IP-based rate limiter for non-authenticated users
    return ipRateLimiter(req, res, next);
  }
};

module.exports = {
  ipRateLimiter,
  userRateLimiter,
  strictRateLimiter,
  combinedRateLimiter,
};
