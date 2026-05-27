// ============================================================
// tests/auth.setup.js — One-Time Login (StorageState Pattern)
// ============================================================
// This runs BEFORE all other tests (configured in playwright.config.js).
// It logs in as admin, saves the session cookies + localStorage to a JSON file.
// All subsequent tests load this file → skip login entirely.
//
// BENEFIT: 50+ tests × 3-second login = 150s saved per run.
// ============================================================

const { test: setup } = require('@playwright/test');
const path = require('path');
const config = require('../config/dev.config');

const ADMIN_STATE = path.join(__dirname, '..', 'fixtures', 'auth', 'admin-state.json');

setup('authenticate as admin', async ({ page }) => {
  // Step 1: Navigate to login
  await page.goto(`${config.baseURL}/login`);

  // Step 2: Fill credentials
  await page.fill('[data-testid="username-input"]', config.credentials.admin.username);
  await page.fill('[data-testid="password-input"]', config.credentials.admin.password);

  // Step 3: Click login
  await page.click('[data-testid="login-button"]');

  // Step 4: Wait for dashboard to confirm login succeeded
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('[data-testid="stats-row"]');

  // Step 5: Save session state to JSON file
  await page.context().storageState({ path: ADMIN_STATE });

  console.log(`[Setup] Admin session saved to ${ADMIN_STATE}`);
});
