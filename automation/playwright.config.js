// ============================================================
// playwright.config.js — Master Configuration
// ============================================================
// ARCHITECTURE:
//   Project "setup"    → Runs FIRST: logs in, saves storageState
//   Project "chromium" → Runs AFTER: all tests use saved session
//
// MCP INTEGRATION:
//   Playwright MCP server is configured separately in mcp-config/
//   This config file handles the standard Playwright test runner.
//   MCP server can be started alongside: npm run mcp:start
// ============================================================

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  // ── Test discovery ────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.js',

  // ── Parallelism ───────────────────────────────────────────
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,

  // ── Retries ───────────────────────────────────────────────
  retries: process.env.CI ? 2 : 0,

  // ── Timeouts ──────────────────────────────────────────────
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },

  // ── Reporter ──────────────────────────────────────────────
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],

  // ── Shared settings ───────────────────────────────────────
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // ── Projects ──────────────────────────────────────────────
  projects: [
    // STEP 1: Login once and save session
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },

    // STEP 2: All tests run with saved session (admin)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'fixtures', 'auth', 'admin-state.json'),
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.js/,
    },
  ],

  // ── Output ────────────────────────────────────────────────
  outputDir: './test-results',
});
