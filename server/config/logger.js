/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports and rotation
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Get environment variables with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_ROTATION_PERIOD = process.env.LOG_ROTATION_PERIOD || 'd';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Request logging format
const requestFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf((info) => {
    const { timestamp, method, url, status, responseTime, ip, userAgent } = info;
    return `${timestamp} ${method} ${url} ${status} ${responseTime}ms - ${ip} - ${userAgent}`;
  })
);

// Error stack trace format
const errorFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// File transports for production or when LOG_TO_FILE is enabled
if (LOG_TO_FILE || process.env.NODE_ENV === 'production') {
  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined/combined-%DATE%.log',
      datePattern: LOG_ROTATION_PERIOD,
      zippedArchive: true,
      maxSize: LOG_MAX_SIZE,
      maxFiles: '30d',
      level: LOG_LEVEL,
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error/error-%DATE%.log',
      datePattern: LOG_ROTATION_PERIOD,
      zippedArchive: true,
      maxSize: LOG_MAX_SIZE,
      maxFiles: '30d',
      level: 'error',
      format: errorFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Request log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/requests/requests-%DATE%.log',
      datePattern: LOG_ROTATION_PERIOD,
      zippedArchive: true,
      maxSize: LOG_MAX_SIZE,
      maxFiles: '30d',
      level: 'http',
      format: requestFormat,
      handleExceptions: false,
      handleRejections: false,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'momentum-rider-api' },
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP request logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add custom methods for different log types
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || '',
  };
  logger.http('HTTP Request', logData);
};

logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || '',
    };
  }

  logger.error('Application Error', errorData);
};

logger.logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

logger.logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

logger.logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

if (LOG_TO_FILE || process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new DailyRotateFile({
      filename: 'logs/error/exceptions-%DATE%.log',
      datePattern: LOG_ROTATION_PERIOD,
      zippedArchive: true,
      maxSize: LOG_MAX_SIZE,
      maxFiles: '30d',
      format: errorFormat,
    })
  );
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise,
  });
});

// Export the logger
module.exports = logger;
