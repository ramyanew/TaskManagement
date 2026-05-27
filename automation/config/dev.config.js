// ============================================================
// config/dev.config.js — Environment Configuration
// ============================================================
// WHY separate config?
//   In enterprise, you have dev / staging / UAT / prod.
//   Each environment has different URLs, DB paths, credentials.
//   Tests pick the right config via: ENV=staging npx playwright test
// ============================================================

module.exports = {
  // Application URLs
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiBaseURL: process.env.API_URL || 'http://localhost:3000/api',

  // Database path (relative to demo-app/)
  dbPath: process.env.DB_PATH || '../demo-app/task-manager.db',

  // Log file paths (relative to demo-app/)
  logPaths: {
    app: process.env.APP_LOG || '../demo-app/logs/app.log',
    error: process.env.ERROR_LOG || '../demo-app/logs/error.log',
    audit: process.env.AUDIT_LOG || '../demo-app/logs/audit.log',
  },

  // Test credentials
  credentials: {
    admin: { username: 'admin', password: 'admin123' },
    user: { username: 'testuser', password: 'user123' },
    viewer: { username: 'viewer', password: 'viewer123' },
  },

  // Timeouts
  timeouts: {
    api: 10000,
    page: 30000,
    element: 10000,
  },

  // Performance thresholds (milliseconds)
  performance: {
    pageLoadMax: 3000,        // Max page load time
    apiResponseMax: 1000,     // Max API response time
    loginFlowMax: 5000,       // Max login-to-dashboard time
  },
};
