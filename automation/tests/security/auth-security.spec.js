// ============================================================
// tests/security/auth-security.spec.js — Security Tests
// ============================================================
// LAYER: Security Validation
// WHAT: Tests for common security vulnerabilities:
//   - XSS (Cross-Site Scripting)
//   - SQL Injection
//   - Unauthorized access (broken access control)
//   - Session management
//   - CSRF protection basics
//
// ENTERPRISE CONTEXT:
//   OWASP Top 10 coverage. These are the minimum security tests
//   every enterprise app must pass before production deployment.
// ============================================================

const { test, expect } = require('@playwright/test');
const TestDataFactory = require('../../helpers/testDataFactory');
const config = require('../../config/dev.config');

test.describe('Security — Authentication & Authorization', () => {

  // ── Unauthenticated Access ────────────────────────────────

  test('Dashboard should redirect to login when not authenticated', async ({ browser }) => {
    // Create a fresh context with NO cookies
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${config.baseURL}/dashboard`);

    // Should redirect to login
    expect(page.url()).toContain('/login');
    await context.close();
  });

  test('API endpoints should return 401 when not authenticated', async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;

    const response = await request.get(`${config.baseURL}/api/tasks`);
    expect(response.status()).toBe(401);

    await context.close();
  });

  // ── Role-Based Access Control ─────────────────────────────

  test('Non-admin user should not be able to delete tasks via API', async ({ browser }) => {
    // Login as regular user
    const context = await browser.newContext();
    const request = context.request;

    // Login as testuser (role: user)
    await request.post(`${config.baseURL}/api/login`, {
      data: {
        username: config.credentials.user.username,
        password: config.credentials.user.password,
      },
    });

    // Try to delete a task — should get 403
    const deleteResponse = await request.delete(`${config.baseURL}/api/tasks/1`);
    expect(deleteResponse.status()).toBe(403);

    await context.close();
  });

  test('Viewer should not be able to delete tasks', async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;

    await request.post(`${config.baseURL}/api/login`, {
      data: {
        username: config.credentials.viewer.username,
        password: config.credentials.viewer.password,
      },
    });

    const deleteResponse = await request.delete(`${config.baseURL}/api/tasks/1`);
    expect(deleteResponse.status()).toBe(403);

    await context.close();
  });

  // ── Session Management ────────────────────────────────────

  test('Logout should invalidate session', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const request = context.request;

    // Login
    await request.post(`${config.baseURL}/api/login`, {
      data: {
        username: config.credentials.admin.username,
        password: config.credentials.admin.password,
      },
    });

    // Verify authenticated
    const beforeLogout = await request.get(`${config.baseURL}/api/tasks`);
    expect(beforeLogout.status()).toBe(200);

    // Logout via POST
    await request.post(`${config.baseURL}/logout`);

    // Session should be invalidated — API should return 401
    const afterLogout = await request.get(`${config.baseURL}/api/tasks`);
    expect(afterLogout.status()).toBe(401);

    await context.close();
  });
});

test.describe('Security — XSS Protection', () => {

  test('XSS payloads in task title should be escaped in UI', async ({ page, request }) => {
    const xssPayloads = TestDataFactory.xssPayloads();

    for (const payload of xssPayloads.slice(0, 2)) { // Test first 2 payloads
      const result = await request.post(`${config.baseURL}/api/tasks`, {
        data: { title: payload, description: 'XSS test' },
      });

      expect(result.status()).toBe(201);
    }

    // Navigate to dashboard and verify no script execution
    await page.goto(`${config.baseURL}/dashboard`);

    // If XSS executed, there would be a dialog — no dialog means safe
    let dialogTriggered = false;
    page.on('dialog', () => { dialogTriggered = true; });

    await page.waitForTimeout(1000); // Wait for any script execution
    expect(dialogTriggered).toBe(false);
  });

  test('XSS in search/filter should not execute scripts', async ({ page }) => {
    // Navigate with XSS in URL parameter
    await page.goto(`${config.baseURL}/dashboard?error=<script>alert('xss')</script>`);

    let dialogTriggered = false;
    page.on('dialog', () => { dialogTriggered = true; });

    await page.waitForTimeout(1000);
    expect(dialogTriggered).toBe(false);
  });
});

test.describe('Security — SQL Injection Protection', () => {

  test('SQL injection in login should not bypass authentication', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${config.baseURL}/login`);
    await page.fill('[data-testid="username-input"]', "admin'--");
    await page.fill('[data-testid="password-input"]', "anything");
    await page.click('[data-testid="login-button"]');

    // Should NOT reach dashboard
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/dashboard');

    await context.close();
  });

  test('SQL injection in API should not return unauthorized data', async ({ request }) => {
    const payloads = TestDataFactory.sqlInjectionPayloads();

    for (const payload of payloads) {
      const response = await request.post(`${config.baseURL}/api/login`, {
        data: { username: payload, password: payload },
      });

      // Should get 400 or 401, never 200
      expect(response.status()).not.toBe(200);
    }
  });
});
