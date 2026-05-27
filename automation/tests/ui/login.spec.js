// ============================================================
// tests/ui/login.spec.js — Login Page UI Tests
// ============================================================
// LAYER: UI Validation
// WHAT: Tests the login page renders correctly, form works,
//       error messages show, and navigation functions.
// ============================================================

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const config = require('../../config/dev.config');

// These tests DON'T use storageState — they test the login flow itself
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page — UI Validation', () => {

  test('should display login form with all required elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify page title
    const title = await loginPage.getTitle();
    expect(title).toBe('Task Manager');

    // Verify form elements are visible
    expect(await loginPage.isLoginFormVisible()).toBe(true);
    await expect(page.locator(loginPage.usernameInput)).toBeVisible();
    await expect(page.locator(loginPage.passwordInput)).toBeVisible();
    await expect(page.locator(loginPage.loginButton)).toBeVisible();
    await expect(page.locator(loginPage.registerLink)).toBeVisible();
  });

  test('should show demo credentials section', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    expect(await loginPage.isDemoCredentialsVisible()).toBe(true);
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(
      config.credentials.admin.username,
      config.credentials.admin.password
    );

    // Verify redirected to dashboard
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('[data-testid="stats-row"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wronguser', 'wrongpass');

    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Invalid username or password');
  });

  test('should show error for empty username', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try submitting with empty fields — HTML5 validation should block
    await page.click(loginPage.loginButton);

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });

  test('should navigate to register page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.goToRegister();

    expect(page.url()).toContain('/register');
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
  });

  test('should redirect authenticated user from login to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login first
    await loginPage.loginAndWaitForDashboard(
      config.credentials.admin.username,
      config.credentials.admin.password
    );

    // Try to go back to login
    await page.goto(`${config.baseURL}/login`);

    // Should redirect to dashboard
    expect(page.url()).toContain('/dashboard');
  });
});
