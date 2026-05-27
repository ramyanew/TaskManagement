// ============================================================
// tests/accessibility/a11y.spec.js — Accessibility Tests
// ============================================================
// LAYER: Accessibility (a11y) Validation
// WHAT: Automated WCAG 2.1 compliance checks using axe-core.
//       Checks: alt text, ARIA labels, color contrast, keyboard nav,
//       form labels, heading hierarchy, semantic HTML.
//
// WHY:
//   - Legal requirement (ADA in US, EAA in EU)
//   - Enterprise apps must be accessible
//   - axe-core catches ~57% of WCAG violations automatically
// ============================================================

const { test, expect } = require('@playwright/test');
const config = require('../../config/dev.config');

// NOTE: @axe-core/playwright must be installed
// If import fails, these tests skip gracefully.
let AxeBuilder;
try {
  AxeBuilder = require('@axe-core/playwright').default;
} catch {
  AxeBuilder = null;
}

test.describe('Accessibility — WCAG 2.1 Compliance', () => {

  test.skip(!AxeBuilder, 'axe-core not installed — run: npm install @axe-core/playwright');

  test('Login page should have no critical accessibility violations', async ({ page }) => {
    await page.goto(`${config.baseURL}/login`);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter for serious/critical violations only
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.log('Accessibility violations found:');
      criticalViolations.forEach((v) => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`    Help: ${v.helpUrl}`);
      });
    }

    expect(criticalViolations).toHaveLength(0);
  });

  test('Dashboard should have no critical accessibility violations', async ({ page }) => {
    await page.goto(`${config.baseURL}/dashboard`);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  // ── Manual a11y checks (no axe-core needed) ───────────────

  test('Login form inputs should have proper labels', async ({ page }) => {
    await page.goto(`${config.baseURL}/login`);

    // Check aria-label attributes
    const usernameInput = page.locator('[data-testid="username-input"]');
    await expect(usernameInput).toHaveAttribute('aria-label', 'Username');

    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toHaveAttribute('aria-label', 'Password');
  });

  test('Error messages should have role="alert" for screen readers', async ({ page }) => {
    // Trigger an error
    await page.goto(`${config.baseURL}/login`);
    await page.fill('[data-testid="username-input"]', 'wrong');
    await page.fill('[data-testid="password-input"]', 'wrong');
    await page.click('[data-testid="login-button"]');

    const errorEl = page.locator('[data-testid="error-message"]');
    if (await errorEl.isVisible()) {
      await expect(errorEl).toHaveAttribute('role', 'alert');
    }
  });

  test('Task table should have proper aria-label', async ({ page }) => {
    await page.goto(`${config.baseURL}/dashboard`);

    const table = page.locator('[data-testid="task-table"]');
    if (await table.isVisible()) {
      await expect(table).toHaveAttribute('aria-label', 'Task list');
    }
  });

  test('Login page should be keyboard navigable', async ({ page }) => {
    await page.goto(`${config.baseURL}/login`);

    // Tab through form elements
    await page.keyboard.press('Tab');
    const focused1 = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));

    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));

    // Form elements should be reachable via Tab
    expect([focused1, focused2]).toContain('username-input');
  });
});
