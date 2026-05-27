// ============================================================
// logger.js — Structured JSON Logging (Enterprise Pattern)
// ============================================================
// WHY structured logging?
//   - Enterprise orgs push logs to ELK Stack (Elasticsearch + Logstash + Kibana)
//     or Splunk. Both require JSON-formatted logs.
//   - Each log entry has: timestamp, level, message, metadata (userId, action, etc.)
//   - Our automation tests will PARSE these logs to validate:
//     1. Login events are logged
//     2. CRUD operations leave audit trails
//     3. Error logs contain correct context
//     4. No sensitive data (passwords) appears in logs
//
// In enterprise, replace file transport with:
//   - Logstash: winston-logstash transport
//   - Splunk: winston-splunk-httplogger transport
//   - CloudWatch: winston-cloudwatch transport
// ============================================================

const winston = require('winston');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');

// ── Custom format: JSON with all metadata ──────────────────
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ── Create logger instance ─────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: structuredFormat,
  defaultMeta: { service: 'task-manager-app' },
  transports: [
    // App logs — all levels
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      maxsize: 5242880,    // 5MB per file
      maxFiles: 5,
    }),
    // Error logs — errors only (separate file for quick triage)
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Audit logs — security-sensitive actions
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'audit.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// ── Convenience methods with structured metadata ───────────

/**
 * Log a user action (login, logout, CRUD)
 */
logger.logAction = function (action, userId, details = {}) {
  this.info({
    event: 'USER_ACTION',
    action,
    userId,
    ...details,
  });
};

/**
 * Log an API request
 */
logger.logApiRequest = function (method, path, statusCode, duration, userId = null) {
  this.info({
    event: 'API_REQUEST',
    method,
    path,
    statusCode,
    durationMs: duration,
    userId,
  });
};

/**
 * Log a security event (failed login, unauthorized access)
 */
logger.logSecurity = function (event, details = {}) {
  this.warn({
    event: 'SECURITY',
    securityEvent: event,
    ...details,
  });
};

/**
 * Log a database operation
 */
logger.logDb = function (operation, table, details = {}) {
  this.info({
    event: 'DB_OPERATION',
    operation,
    table,
    ...details,
  });
};

module.exports = logger;
