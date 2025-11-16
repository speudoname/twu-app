const winston = require('winston');
const path = require('path');

// ============================================================================
// Winston Logger Configuration
// ============================================================================
//
// This utility replaces 99+ console.log statements with structured logging.
// Provides different log levels, timestamps, and optional file logging.
//
// USAGE (drop-in replacement for console):
//   const logger = require('./utils/logger');
//   logger.info('User logged in', { userId: 123 });
//   logger.error('Database error', error);
//   logger.warn('Deprecated API called');
//   logger.debug('Debug info', { data });
//
// MIGRATION:
//   Replace: console.log('message')
//   With:    logger.info('message')
//
//   Replace: console.error('error', error)
//   With:    logger.error('error', error)
// ============================================================================

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Format for file output (JSON for easy parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel
  })
);

// File transports (only in production or when explicitly enabled)
if (!isDevelopment || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Combined log (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );

  // Error log (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  transports,
  // Don't exit on uncaught exceptions (let the app handle it)
  exitOnError: false
});

// Add convenience methods for common patterns

/**
 * Log HTTP request
 * @param {object} req - Express request object
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in ms
 */
logger.http = function(req, statusCode, duration) {
  const message = `${req.method} ${req.path} ${statusCode} ${duration}ms`;
  const meta = {
    method: req.method,
    path: req.path,
    statusCode,
    duration,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  if (statusCode >= 500) {
    logger.error(message, meta);
  } else if (statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.info(message, meta);
  }
};

/**
 * Log database query (for debugging)
 * @param {string} query - SQL query
 * @param {array} params - Query parameters
 * @param {number} duration - Query duration in ms
 */
logger.query = function(query, params = [], duration) {
  if (logLevel === 'debug') {
    logger.debug('Database query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: `${duration}ms`
    });
  }
};

/**
 * Log authentication event
 * @param {string} event - Auth event type (login, logout, register, etc.)
 * @param {object} data - Event data
 */
logger.auth = function(event, data) {
  logger.info(`Auth: ${event}`, data);
};

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {object} data - Event data
 */
logger.security = function(event, data) {
  logger.warn(`Security: ${event}`, data);
};

/**
 * Helper to create a child logger with default metadata
 * Useful for adding context to all logs in a module
 *
 * @param {object} meta - Default metadata
 * @returns {object} Child logger
 *
 * @example
 * const moduleLogger = logger.child({ module: 'auth' });
 * moduleLogger.info('User logged in', { userId: 123 });
 * // Logs: { message: 'User logged in', module: 'auth', userId: 123 }
 */
logger.child = function(meta) {
  return winston.createLogger({
    level: logLevel,
    levels: winston.config.npm.levels,
    defaultMeta: meta,
    transports
  });
};

// In development, also log unhandled rejections
if (isDevelopment) {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.stack || reason,
      promise
    });
  });
}

// Export logger
module.exports = logger;

// Also export a console-compatible interface for easy migration
module.exports.log = logger.info;
module.exports.error = logger.error;
module.exports.warn = logger.warn;
module.exports.debug = logger.debug;
