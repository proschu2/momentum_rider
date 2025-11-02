/**
 * Custom error classes for standardized error handling
 */

class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errorCode = 'ERR_VALIDATION_001') {
    super(message, 400, errorCode);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message, errorCode = 'ERR_NOT_FOUND_001') {
    super(message, 404, errorCode);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message, errorCode = 'ERR_AUTH_001') {
    super(message, 401, errorCode);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message, errorCode = 'ERR_FORBIDDEN_001') {
    super(message, 403, errorCode);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message, errorCode = 'ERR_CONFLICT_001') {
    super(message, 409, errorCode);
    this.name = 'ConflictError';
  }
}

class InternalServerError extends AppError {
  constructor(message, errorCode = 'ERR_INTERNAL_001') {
    super(message, 500, errorCode);
    this.name = 'InternalServerError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
};
