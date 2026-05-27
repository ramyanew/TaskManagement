// ============================================================
// helpers/dbHelper.js — Database Validation Helper
// ============================================================
// PURPOSE:
//   After a UI or API action, we query the database DIRECTLY
//   to verify the data was actually saved correctly.
//
// ENTERPRISE PATTERN:
//   - QA tests ALWAYS validate beyond the UI
//   - UI might show "Task Created" but DB insert might have failed
//   - This catches: silent failures, data corruption, constraint violations
//
// SWAP FOR ENTERPRISE:
//   Replace better-sqlite3 with mysql2, pg, or oracledb.
//   The query patterns remain the same — only the connection changes.
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/dev.config');

class DbHelper {
  constructor() {
    this.dbPath = path.resolve(__dirname, '..', config.dbPath);
    this.db = null;
  }

  // ── Connect / Disconnect ──────────────────────────────────
  connect() {
    this.db = new Database(this.dbPath, { readonly: true }); // Read-only for safety
    return this;
  }

  disconnect() {
    if (this.db) this.db.close();
  }

  // ── User Queries ──────────────────────────────────────────
  getUserByUsername(username) {
    return this.db.prepare('SELECT id, username, email, role, is_active, created_at FROM users WHERE username = ?').get(username);
  }

  getUserById(id) {
    return this.db.prepare('SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
  }

  getUserCount() {
    return this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  }

  getActiveUsers() {
    return this.db.prepare('SELECT id, username, email, role FROM users WHERE is_active = 1').all();
  }

  // ── Task Queries ──────────────────────────────────────────
  getTaskById(id) {
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  }

  getTaskByTitle(title) {
    return this.db.prepare('SELECT * FROM tasks WHERE title = ?').get(title);
  }

  getTasksByStatus(status) {
    return this.db.prepare('SELECT * FROM tasks WHERE status = ?').all(status);
  }

  getTasksByPriority(priority) {
    return this.db.prepare('SELECT * FROM tasks WHERE priority = ?').all(priority);
  }

  getTaskCount() {
    return this.db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  }

  getTasksByUser(userId) {
    return this.db.prepare('SELECT * FROM tasks WHERE assigned_to = ? OR created_by = ?').all(userId, userId);
  }

  getLatestTask() {
    return this.db.prepare('SELECT * FROM tasks ORDER BY id DESC LIMIT 1').get();
  }

  // ── Audit Log Queries ─────────────────────────────────────
  getAuditLogs(limit = 10) {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  getAuditLogsByAction(action) {
    return this.db.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').all(action);
  }

  getAuditLogsByUser(userId) {
    return this.db.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }

  getLatestAuditLog() {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').get();
  }

  // ── Aggregate Queries (for dashboard validation) ──────────
  getTaskStats() {
    const total = this.getTaskCount();
    const byStatus = this.db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
    const byPriority = this.db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all();
    return { total, byStatus, byPriority };
  }
}

module.exports = DbHelper;
