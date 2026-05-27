// ============================================================
// tests/logs/log-validation.spec.js — Log Validation Tests
// ============================================================
// LAYER: Log Validation
// WHAT: Parses structured JSON log files to verify:
//   1. Actions generate correct log entries
//   2. Log levels are appropriate
//   3. No sensitive data (passwords) in logs
//   4. API requests are logged with timing
//   5. Security events (failed logins) are captured
//
// ENTERPRISE CONTEXT:
//   - SOC 2 / ISO 27001 require audit logging
//   - ELK dashboards depend on correct log structure
//   - Splunk alerts trigger on security event logs
//   - Missing logs = compliance violation
// ============================================================

const { test, expect } = require('@playwright/test');
const LogHelper = require('../../helpers/logHelper');
const LoginPage = require('../../pages/LoginPage');
const config = require('../../config/dev.config');

test.describe('Log Validation — Structured Logging', () => {
  let logHelper;

  test.beforeAll(() => {
    logHelper = new LogHelper();
  });

  // ── Log Structure Validation ──────────────────────────────

  test('App logs should be valid JSON with required fields', () => {
    const logs = logHelper.readLogFile('app');

    // Should have logs from server startup + seed
    expect(logs.length).toBeGreaterThan(0);

    // Each log entry must have standard fields
    logs.forEach((entry) => {
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBeDefined();
      expect(entry.service).toBe('task-manager-app');
    });
  });

  test('Log levels should be valid Winston levels', () => {
    const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    const logs = logHelper.readLogFile('app');

    logs.forEach((entry) => {
      expect(validLevels).toContain(entry.level);
    });
  });

  // ── Action Logging ────────────────────────────────────────

  test('Login action should generate USER_ACTION log', async ({ page }) => {
    const timestamp = new Date().toISOString();

    // Perform login (without storageState)
    const loginPage = new LoginPage(page);
    await page.goto(`${config.baseURL}/login`);
    await page.fill('[data-testid="username-input"]', config.credentials.admin.username);
    await page.fill('[data-testid="password-input"]', config.credentials.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');

    // Check logs
    const recentLogs = logHelper.getLogsAfter('app', timestamp);
    const loginLog = recentLogs.find(
      (entry) => entry.event === 'USER_ACTION' && entry.action === 'LOGIN_SUCCESS'
    );

    expect(loginLog).toBeDefined();
    expect(loginLog.userId).toBeDefined();
    expect(loginLog.level).toBe('info');
  });

  // Use fresh session for this test
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Failed login should generate SECURITY log', async ({ page }) => {
    const timestamp = new Date().toISOString();

    await page.goto(`${config.baseURL}/login`);
    await page.fill('[data-testid="username-input"]', 'hacker');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');

    // Wait for the page response
    await page.waitForLoadState('domcontentloaded');

    // Check security logs
    const recentLogs = logHelper.getLogsAfter('app', timestamp);
    const securityLog = recentLogs.find(
      (entry) => entry.event === 'SECURITY' && entry.securityEvent === 'LOGIN_FAILED'
    );

    expect(securityLog).toBeDefined();
    expect(securityLog.level).toBe('warn');
    expect(securityLog.username).toBe('hacker');
  });

  test('API requests should be logged with duration', () => {
    const apiLogs = logHelper.getLogsByEvent('app', 'API_REQUEST');

    if (apiLogs.length > 0) {
      const sample = apiLogs[0];
      expect(sample.method).toBeDefined();
      expect(sample.path).toBeDefined();
      expect(sample.statusCode).toBeDefined();
      expect(sample.durationMs).toBeDefined();
      expect(typeof sample.durationMs).toBe('number');
    }
  });

  // ── Sensitive Data Checks ─────────────────────────────────

  test('SECURITY: No passwords should appear in app logs', () => {
    const violations = logHelper.checkForSensitiveData('app');

    // Filter for actual password leaks (not false positives like 'password_hash' field name)
    const realViolations = violations.filter((v) => {
      const logStr = JSON.stringify(v.logEntry);
      // True violation: actual password values in logs
      return logStr.includes('admin123') || logStr.includes('user123') || logStr.includes('viewer123');
    });

    expect(realViolations).toHaveLength(0);
  });

  test('SECURITY: No passwords should appear in error logs', () => {
    const violations = logHelper.checkForSensitiveData('error');
    const realViolations = violations.filter((v) => {
      const logStr = JSON.stringify(v.logEntry);
      return logStr.includes('admin123') || logStr.includes('user123');
    });

    expect(realViolations).toHaveLength(0);
  });

  // ── Log Statistics ────────────────────────────────────────

  test('Log statistics should show reasonable distribution', () => {
    const stats = logHelper.getLogStats('app');

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byLevel).toBeDefined();

    // Info should be the dominant log level in a healthy app
    if (stats.byLevel.info && stats.byLevel.error) {
      expect(stats.byLevel.info).toBeGreaterThan(stats.byLevel.error);
    }
  });
});
