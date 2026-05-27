// ============================================================
// database.js — SQLite Database Setup + Seed Data
// ============================================================
// WHY SQLite?
//   - Zero installation (no MySQL/PostgreSQL server needed)
//   - Single file database (task-manager.db)
//   - Same SQL syntax — swap connection string for enterprise DB later
//   - Perfect for local dev + CI/CD pipelines
//
// In enterprise orgs, replace this with:
//   - MySQL: const mysql = require('mysql2/promise')
//   - PostgreSQL: const { Pool } = require('pg')
//   - Oracle: const oracledb = require('oracledb')
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'task-manager.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');       // Better concurrent read performance
    db.pragma('foreign_keys = ON');         // Enforce foreign key constraints
  }
  return db;
}

// ── Create Tables ──────────────────────────────────────────
function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user', 'viewer')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'done', 'blocked')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      assigned_to INTEGER,
      created_by INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('[DB] Tables initialized successfully');
  return database;
}

// ── Seed Data ──────────────────────────────────────────────
function seedDatabase() {
  const database = getDb();

  // Clear existing data
  database.exec('DELETE FROM audit_log; DELETE FROM tasks; DELETE FROM users;');

  // Seed users
  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);
  const viewerHash = bcrypt.hashSync('viewer123', 10);

  const insertUser = database.prepare(`
    INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin@taskmanager.com', adminHash, 'admin');
  insertUser.run('testuser', 'testuser@taskmanager.com', userHash, 'user');
  insertUser.run('viewer', 'viewer@taskmanager.com', viewerHash, 'viewer');

  // Seed tasks
  const insertTask = database.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run('Setup CI/CD Pipeline', 'Configure Jenkins pipeline for automated builds', 'in-progress', 'high', 1, 1, '2026-06-15');
  insertTask.run('Write API Tests', 'Create Playwright API tests for task endpoints', 'todo', 'critical', 2, 1, '2026-06-10');
  insertTask.run('Database Migration', 'Migrate from SQLite to PostgreSQL for production', 'todo', 'medium', 1, 1, '2026-07-01');
  insertTask.run('Fix Login Bug', 'Session expires too quickly on mobile browsers', 'blocked', 'high', 2, 2, '2026-06-05');
  insertTask.run('Update Documentation', 'Add API endpoint docs to README', 'done', 'low', 2, 1, '2026-05-20');
  insertTask.run('Security Audit', 'Run OWASP ZAP scan on all endpoints', 'todo', 'critical', 1, 1, '2026-06-20');

  console.log('[DB] Seed data inserted — 3 users, 6 tasks');
}

// ── Run seed if called directly ────────────────────────────
if (process.argv[2] === 'seed') {
  initializeDatabase();
  seedDatabase();
  console.log('[DB] Seeding complete.');
  process.exit(0);
}

module.exports = { getDb, initializeDatabase, seedDatabase };
