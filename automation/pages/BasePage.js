// ============================================================
// pages/BasePage.js — Base Page Object (all pages inherit this)
// ============================================================
// WHY BasePage?
//   Every page shares: navigation, waiting, screenshot, logout.
//   Instead of duplicating this in every page, we put it here.
//   LoginPage, DashboardPage etc. extend BasePage.
//
// SMART WAITING:
//   Never use page.waitForTimeout() (hardcoded sleep).
//   Always wait for a specific condition: element visible, URL change, etc.
// ============================================================

class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common elements across pages
    this.navbar = '[data-testid="navbar"]';
    this.logoutButton = '[data-testid="logout-button"]';
    this.currentUser = '[data-testid="current-user"]';
    this.errorMessage = '[data-testid="error-message"]';
  }

  // ── Navigation ────────────────────────────────────────────
  async navigate(path) {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getCurrentUrl() {
    return this.page.url();
  }

  // ── Smart Waiting ─────────────────────────────────────────
  async waitForElement(selector, options = {}) {
    const { state = 'visible', timeout = 10000 } = options;
    await this.page.waitForSelector(selector, { state, timeout });
  }

  async waitForUrlContains(text, timeout = 10000) {
    await this.page.waitForURL(`**/*${text}*`, { timeout });
  }

  // ── Common Actions ────────────────────────────────────────
  async getTextContent(selector) {
    await this.waitForElement(selector);
    return await this.page.textContent(selector);
  }

  async isElementVisible(selector) {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getErrorMessage() {
    if (await this.isElementVisible(this.errorMessage)) {
      return await this.getTextContent(this.errorMessage);
    }
    return null;
  }

  // ── Auth Actions ──────────────────────────────────────────
  async logout() {
    await this.page.click(this.logoutButton);
    await this.waitForUrlContains('/login');
  }

  async getCurrentUsername() {
    return await this.getTextContent(this.currentUser);
  }

  // ── Screenshots ───────────────────────────────────────────
  async takeScreenshot(name) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  // ── Console Log Capture (for log validation) ──────────────
  captureConsoleLogs() {
    const logs = [];
    this.page.on('console', (msg) => {
      logs.push({ type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() });
    });
    return logs;
  }

  // ── Network Request Capture (for performance) ─────────────
  captureNetworkRequests() {
    const requests = [];
    this.page.on('response', (response) => {
      requests.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing ? response.timing() : null,
      });
    });
    return requests;
  }
}

module.exports = BasePage;
