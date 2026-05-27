// ============================================================
// tests/api/auth-api.spec.js — Authentication API Tests
// ============================================================
// LAYER: API Automation
// WHAT: Tests REST API authentication endpoints directly.
//       No browser needed — pure HTTP request/response validation.
// ============================================================

const { test, expect } = require('@playwright/test');
const config = require('../../config/dev.config');

// API tests don't need browser storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth API — /api/login', () => {

  test('should login successfully with valid credentials', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: {
        username: config.credentials.admin.username,
        password: config.credentials.admin.password,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe('admin');
    expect(body.user.role).toBe('admin');
    expect(body.user.email).toBeDefined();

    // SECURITY: Password should NOT be in response
    expect(body.user.password).toBeUndefined();
    expect(body.user.password_hash).toBeUndefined();
  });

  test('should return 401 for invalid credentials', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: { username: 'nonexistent', password: 'wrongpass' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  test('should return 400 for missing username', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: { password: 'admin123' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('should return 400 for missing password', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: { username: 'admin' },
    });

    expect(response.status()).toBe(400);
  });

  test('should return 400 for empty body', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test('should login with regular user credentials', async ({ request }) => {
    const response = await request.post(`${config.baseURL}/api/login`, {
      data: {
        username: config.credentials.user.username,
        password: config.credentials.user.password,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.role).toBe('user');
  });
});
