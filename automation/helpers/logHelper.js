// ============================================================
// helpers/logHelper.js — Log Validation Helper
// ============================================================
// PURPOSE:
//   Parse and validate application logs generated during tests.
//   Checks that:
//   1. Actions generate correct log entries
//   2. Log levels are appropriate (info vs warn vs error)
//   3. No sensitive data (passwords, tokens) leaks into logs
//   4. Audit trail is complete for compliance
//
// ENTERPRISE PATTERN:
//   In production, logs go to ELK Stack or Splunk.
//   This helper reads local log files — same JSON format.
//   For ELK: replace fs.readFileSync with Elasticsearch query.
//   For Splunk: replace with Splunk REST API call.
// ============================================================

const fs = require('fs');
const path = require('path');
const config = require('../config/dev.config');

class LogHelper {
  constructor() {
    this.logPaths = {
      app: path.resolve(__dirname, '..', config.logPaths.app),
      error: path.resolve(__dirname, '..', config.logPaths.error),
      audit: path.resolve(__dirname, '..', config.logPaths.audit),
    };
  }

  // ── Read Logs ─────────────────────────────────────────────

  /**
   * Read and parse all log entries from a log file.
   * Each line is a JSON object (NDJSON format — standard for Winston/ELK).
   */
  readLogFile(logType = 'app') {
    const filePath = this.logPaths[logType];
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return [];

    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  // ── Filter Logs ───────────────────────────────────────────

  /**
   * Get log entries matching specific criteria.
   * Example: getLogsByEvent('app', 'USER_ACTION') → all user action logs
   */
  getLogsByEvent(logType, eventName) {
    return this.readLogFile(logType).filter((entry) => entry.event === eventName);
  }

  getLogsByLevel(logType, level) {
    return this.readLogFile(logType).filter((entry) => entry.level === level);
  }

  getLogsByAction(logType, action) {
    return this.readLogFile(logType).filter((entry) => entry.action === action);
  }

  /**
   * Get logs generated AFTER a specific timestamp.
   * Useful for: "after I performed action X, check what was logged"
   */
  getLogsAfter(logType, timestamp) {
    return this.readLogFile(logType).filter((entry) => new Date(entry.timestamp) > new Date(timestamp));
  }

  /**
   * Get the most recent N log entries.
   */
  getRecentLogs(logType, count = 5) {
    const logs = this.readLogFile(logType);
    return logs.slice(-count);
  }

  // ── Validation Methods ────────────────────────────────────

  /**
   * Check if a specific action was logged.
   * Returns the matching log entry or null.
   */
  findLogEntry(logType, criteria) {
    const logs = this.readLogFile(logType);
    return logs.find((entry) => {
      return Object.entries(criteria).every(([key, value]) => entry[key] === value);
    });
  }

  /**
   * SECURITY CHECK: Ensure no sensitive data appears in logs.
   * Scans all log files for patterns like passwords, tokens, SSNs.
   */
  checkForSensitiveData(logType = 'app') {
    const logs = this.readLogFile(logType);
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token["\s:=]/i,
      /api[_-]?key/i,
      /ssn/i,
      /credit[_-]?card/i,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,  // Credit card pattern
      /admin123/i,                                        // Known test password
      /user123/i,                                         // Known test password
    ];

    const violations = [];
    logs.forEach((entry, index) => {
      const logString = JSON.stringify(entry);
      sensitivePatterns.forEach((pattern) => {
        if (pattern.test(logString)) {
          // Exclude known safe fields (like "password_hash" in DB operation logs)
          if (!logString.includes('password_hash') && !logString.includes('securityEvent')) {
            violations.push({
              lineIndex: index,
              pattern: pattern.toString(),
              logEntry: entry,
            });
          }
        }
      });
    });

    return violations;
  }

  /**
   * Verify that an audit trail exists for a user action.
   * Compliance requirement: every data-changing action must be logged.
   */
  verifyAuditTrail(userId, action) {
    const auditLogs = this.getLogsByEvent('audit', 'USER_ACTION');
    return auditLogs.some(
      (entry) => entry.userId === userId && entry.action === action
    );
  }

  // ── Log Statistics ────────────────────────────────────────

  getLogStats(logType = 'app') {
    const logs = this.readLogFile(logType);
    const stats = {
      total: logs.length,
      byLevel: {},
      byEvent: {},
    };

    logs.forEach((entry) => {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      if (entry.event) {
        stats.byEvent[entry.event] = (stats.byEvent[entry.event] || 0) + 1;
      }
    });

    return stats;
  }

  // ── Clear Logs (for test isolation) ───────────────────────

  clearLogs(logType = 'app') {
    const filePath = this.logPaths[logType];
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  }

  clearAllLogs() {
    Object.keys(this.logPaths).forEach((type) => this.clearLogs(type));
  }
}

module.exports = LogHelper;
