// ============================================================
// pages/LoginPage.js — Login Page Object
// ============================================================

const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);

    // Locators — all use data-testid (most reliable strategy)
    this.appTitle = '[data-testid="app-title"]';
    this.usernameInput = '[data-testid="username-input"]';
    this.passwordInput = '[data-testid="password-input"]';
    this.loginButton = '[data-testid="login-button"]';
    this.registerLink = '[data-testid="register-link"]';
    this.loginForm = '[data-testid="login-form"]';
    this.demoCredentials = '[data-testid="demo-credentials"]';
  }

  // ── Actions ───────────────────────────────────────────────
  async goto() {
    await this.navigate('/login');
    await this.waitForElement(this.loginForm);
  }

  async login(username, password) {
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }

  async loginAndWaitForDashboard(username, password) {
    await this.login(username, password);
    await this.waitForUrlContains('/dashboard');
  }

  async getTitle() {
    return await this.getTextContent(this.appTitle);
  }

  async goToRegister() {
    await this.page.click(this.registerLink);
    await this.waitForUrlContains('/register');
  }

  // ── Assertions helpers ────────────────────────────────────
  async isLoginFormVisible() {
    return await this.isElementVisible(this.loginForm);
  }

  async isDemoCredentialsVisible() {
    return await this.isElementVisible(this.demoCredentials);
  }
}

module.exports = LoginPage;
