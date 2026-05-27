// ============================================================
// routes/auth.js — Authentication Routes
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const logger = require('../logger');

const router = express.Router();

// ── GET /login — Show login page ───────────────────────────
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

// ── POST /login — Authenticate user ───────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();

  // Input validation
  if (!username || !password) {
    logger.logSecurity('LOGIN_VALIDATION_FAILED', { username, reason: 'Missing credentials' });
    return res.status(400).render('login', { error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.logSecurity('LOGIN_FAILED', { username, ip: req.ip });
    return res.status(401).render('login', { error: 'Invalid username or password' });
  }

  // Set session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  logger.logAction('LOGIN_SUCCESS', user.id, { username: user.username, role: user.role, ip: req.ip });

  // Log to audit table
  db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, 'LOGIN', 'user', user.id, JSON.stringify({ method: 'password' }), req.ip);

  res.redirect('/dashboard');
});

// ── GET /register — Show registration page ─────────────────
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// ── POST /register — Create new user ───────────────────────
router.post('/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const db = getDb();

  // Validation
  if (!username || !email || !password) {
    return res.status(400).render('register', { error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('register', { error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).render('register', { error: 'Password must be at least 6 characters' });
  }

  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).render('register', { error: 'Username or email already exists' });
  }

  // Create user
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email, hash, 'user');

  logger.logAction('USER_REGISTERED', result.lastInsertRowid, { username, email });
  logger.logDb('INSERT', 'users', { userId: result.lastInsertRowid });

  res.redirect('/login');
});

// ── POST /logout — Destroy session ─────────────────────────
router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  const username = req.session.username;

  logger.logAction('LOGOUT', userId, { username });

  req.session.destroy((err) => {
    if (err) logger.error('Session destroy error', { error: err.message });
    res.redirect('/login');
  });
});

// ── API: POST /api/login — JSON API for automation ─────────
router.post('/api/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  const db = getDb();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.logSecurity('API_LOGIN_FAILED', { username });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  logger.logAction('API_LOGIN_SUCCESS', user.id, { username: user.username });

  res.json({
    success: true,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

module.exports = router;
