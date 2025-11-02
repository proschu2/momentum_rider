/**
 * Global error handler middleware
 */

const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

/**
 * Handle async errors in route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.logError(err, req);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'ERR_CAST_001');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400, 'ERR_DUPLICATE_001');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error = new AppError(message, 400, 'ERR_VALIDATION_002');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, 'ERR_JWT_001');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401, 'ERR_JWT_002');
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'ERR_INTERNAL_001';
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404, 'ERR_NOT_FOUND_001');
  next(error);
};

module.exports = {
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
};
