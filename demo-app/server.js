// ============================================================
// server.js — Express Server (Application Under Test)
// ============================================================
// This is the TARGET APPLICATION that our Playwright MCP tests
// will automate. It provides:
//   - UI pages (login, register, dashboard)
//   - REST API endpoints (/api/tasks, /api/login, etc.)
//   - SQLite database (queryable by DB validation tests)
//   - Structured JSON logs (parseable by log validation tests)
// ============================================================

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, seedDatabase } = require('./database');
const logger = require('./logger');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Ensure logs directory exists ───────────────────────────
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ── Initialize + seed database ─────────────────────────────
initializeDatabase();
seedDatabase();

// ── Middleware ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: 'playwright-mcp-demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000,   // 30 minutes
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/css') && !req.path.startsWith('/js')) {
      logger.logApiRequest(req.method, req.path, res.statusCode, duration, req.session?.userId);
    }
  });
  next();
});

// ── Routes ─────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));
app.use('/', authRoutes);
app.use('/', taskRoutes);

// ── Error page ─────────────────────────────────────────────
app.get('/error', (req, res) => {
  res.render('error', { message: req.query.message || 'An error occurred' });
});

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  logger.logSecurity('NOT_FOUND', { path: req.path, method: req.method });
  res.status(404).render('error', { message: 'Page not found' });
});

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).render('error', { message: 'Internal server error' });
});

// ── Start server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✅  Task Manager running at http://localhost:${PORT}`);
  console.log(`  📋  Login: admin / admin123`);
  console.log(`  📋  Login: testuser / user123`);
  console.log(`  📋  Login: viewer / viewer123\n`);
  logger.info('Server started', { port: PORT });
});

module.exports = app;
