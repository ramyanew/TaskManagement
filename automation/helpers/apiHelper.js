// ============================================================
// helpers/apiHelper.js — REST API Request Helper
// ============================================================
// PURPOSE:
//   Reusable wrapper for API calls using Playwright's request API.
//   Handles authentication, headers, and response parsing.
//
// WHY Playwright's request API (not axios/fetch)?
//   - Built into Playwright — no extra dependency
//   - Shares cookies/session with browser context
//   - Same timeout/retry config as UI tests
//   - Can mix API + UI actions in the same test
// ============================================================

const config = require('../config/dev.config');

class ApiHelper {
  /**
   * @param {import('@playwright/test').APIRequestContext} request
   */
  constructor(request) {
    this.request = request;
    this.baseURL = config.apiBaseURL;
  }

  // ── Auth ──────────────────────────────────────────────────

  async login(username, password) {
    const response = await this.request.post(`${this.baseURL}/login`, {
      data: { username, password },
    });
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  // ── Tasks CRUD ────────────────────────────────────────────

  async getTasks(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `${this.baseURL}/tasks?${params}` : `${this.baseURL}/tasks`;
    const response = await this.request.get(url);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async getTask(id) {
    const response = await this.request.get(`${this.baseURL}/tasks/${id}`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async createTask(taskData) {
    const response = await this.request.post(`${this.baseURL}/tasks`, {
      data: taskData,
    });
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async updateTask(id, updateData) {
    const response = await this.request.put(`${this.baseURL}/tasks/${id}`, {
      data: updateData,
    });
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async deleteTask(id) {
    const response = await this.request.delete(`${this.baseURL}/tasks/${id}`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats() {
    const response = await this.request.get(`${this.baseURL}/stats`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  // ── Generic request (for edge cases) ──────────────────────

  async get(path) {
    const response = await this.request.get(`${this.baseURL}${path}`);
    return { status: response.status(), body: await response.json() };
  }

  async post(path, data) {
    const response = await this.request.post(`${this.baseURL}${path}`, { data });
    return { status: response.status(), body: await response.json() };
  }
}

module.exports = ApiHelper;
