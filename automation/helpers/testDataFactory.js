// ============================================================
// helpers/testDataFactory.js — Test Data Generator
// ============================================================
// WHY a factory?
//   Parallel tests MUST use unique data. If two tests create a task
//   called "Test Task", they'll collide. The factory adds timestamps
//   and random suffixes to guarantee uniqueness.
//
// RULE: Every test owns its data from creation to cleanup.
// ============================================================

class TestDataFactory {
  static uniqueId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  // ── Task Data ─────────────────────────────────────────────
  static createTask(overrides = {}) {
    const id = this.uniqueId();
    return {
      title: `Auto Task ${id}`,
      description: `Automated test task created at ${new Date().toISOString()}`,
      priority: 'medium',
      status: 'todo',
      assigned_to: null,
      due_date: this.futureDate(7),
      ...overrides,
    };
  }

  static createHighPriorityTask(overrides = {}) {
    return this.createTask({ priority: 'critical', ...overrides });
  }

  // ── User Data ─────────────────────────────────────────────
  static createUser(overrides = {}) {
    const id = this.uniqueId();
    return {
      username: `user_${id}`,
      email: `user_${id}@test.com`,
      password: 'Test@123456',
      confirmPassword: 'Test@123456',
      ...overrides,
    };
  }

  // ── Date Helpers ──────────────────────────────────────────
  static futureDate(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  static pastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  // ── XSS / Security Test Data ──────────────────────────────
  static xssPayloads() {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert(1)</script>',
      "'; DROP TABLE tasks; --",
      '<svg onload=alert("XSS")>',
    ];
  }

  static sqlInjectionPayloads() {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1 UNION SELECT * FROM users",
      "admin'--",
    ];
  }
}

module.exports = TestDataFactory;
