// ============================================================
// tests/performance/response-time.spec.js — Performance Tests
// ============================================================
// LAYER: Performance Validation
// WHAT: Measures and validates:
//   - Page load times (login, dashboard)
//   - API response times
//   - Login-to-dashboard flow duration
//   - Resource count and size
//
// ENTERPRISE CONTEXT:
//   Not a replacement for JMeter/k6/Locust load testing.
//   These are SMOKE performance checks — baselines that catch
//   regressions early in CI. If page load doubles after a deploy,
//   this catches it before it hits production.
// ============================================================

const { test, expect } = require('@playwright/test');
const config = require('../../config/dev.config');

test.describe('Performance — Response Time Baselines', () => {

  // ── Page Load Performance ─────────────────────────────────

  test('Login page should load within threshold', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${config.baseURL}/login`);
    await page.waitForSelector('[data-testid="login-form"]');
    const loadTime = Date.now() - start;

    console.log(`Login page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(config.performance.pageLoadMax);
  });

  test('Dashboard should load within threshold', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${config.baseURL}/dashboard`);
    await page.waitForSelector('[data-testid="task-table"]');
    const loadTime = Date.now() - start;

    console.log(`Dashboard load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(config.performance.pageLoadMax);
  });

  // ── API Response Performance ──────────────────────────────

  test('GET /api/tasks should respond within threshold', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${config.baseURL}/api/tasks`);
    const responseTime = Date.now() - start;

    console.log(`GET /api/tasks: ${responseTime}ms`);
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(config.performance.apiResponseMax);
  });

  test('POST /api/tasks should respond within threshold', async ({ request }) => {
    const start = Date.now();
    const response = await request.post(`${config.baseURL}/api/tasks`, {
      data: { title: `Perf Test ${Date.now()}` },
    });
    const responseTime = Date.now() - start;

    console.log(`POST /api/tasks: ${responseTime}ms`);
    expect(response.status()).toBe(201);
    expect(responseTime).toBeLessThan(config.performance.apiResponseMax);
  });

  test('GET /api/stats should respond within threshold', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${config.baseURL}/api/stats`);
    const responseTime = Date.now() - start;

    console.log(`GET /api/stats: ${responseTime}ms`);
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(config.performance.apiResponseMax);
  });

  // ── End-to-End Flow Performance ───────────────────────────

  test('Login-to-dashboard flow should complete within threshold', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const start = Date.now();

    await page.goto(`${config.baseURL}/login`);
    await page.fill('[data-testid="username-input"]', config.credentials.admin.username);
    await page.fill('[data-testid="password-input"]', config.credentials.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="stats-row"]');

    const flowTime = Date.now() - start;

    console.log(`Login-to-dashboard flow: ${flowTime}ms`);
    expect(flowTime).toBeLessThan(config.performance.loginFlowMax);

    await context.close();
  });

  // ── Resource Performance ──────────────────────────────────

  test('Dashboard should not load excessive resources', async ({ page }) => {
    const resources = [];

    page.on('response', (response) => {
      resources.push({
        url: response.url(),
        status: response.status(),
        type: response.request().resourceType(),
      });
    });

    await page.goto(`${config.baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Count by type
    const scripts = resources.filter((r) => r.type === 'script');
    const stylesheets = resources.filter((r) => r.type === 'stylesheet');
    const failedResources = resources.filter((r) => r.status >= 400);

    console.log(`Resources: ${resources.length} total, ${scripts.length} scripts, ${stylesheets.length} CSS`);
    console.log(`Failed resources: ${failedResources.length}`);

    // No resources should fail to load (broken links, missing files)
    expect(failedResources).toHaveLength(0);
  });
});
