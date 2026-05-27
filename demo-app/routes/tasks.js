// ============================================================
// routes/tasks.js — Task CRUD Routes (UI + REST API)
// ============================================================

const express = require('express');
const { getDb } = require('../database');
const logger = require('../logger');

const router = express.Router();

// ── Middleware: Require authentication ──────────────────────
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
}

// ── Middleware: Require admin role ──────────────────────────
function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') {
    logger.logSecurity('UNAUTHORIZED_ACCESS', {
      userId: req.session.userId,
      attemptedPath: req.originalUrl,
      role: req.session.role,
    });
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.status(403).render('error', { message: 'Access denied. Admin role required.' });
  }
  next();
}

// ── GET /dashboard — Main task dashboard ───────────────────
router.get('/dashboard', requireAuth, (req, res) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, u.username as assigned_username, c.username as creator_username
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id
    ORDER BY 
      CASE t.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.created_at DESC
  `).all();

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  const users = db.prepare('SELECT id, username FROM users WHERE is_active = 1').all();

  logger.logAction('VIEW_DASHBOARD', req.session.userId, { taskCount: tasks.length });

  res.render('dashboard', {
    tasks,
    stats,
    users,
    user: { id: req.session.userId, username: req.session.username, role: req.session.role },
  });
});

// ── POST /tasks — Create a new task (form) ─────────────────
router.post('/tasks', requireAuth, (req, res) => {
  const { title, description, priority, assigned_to, due_date } = req.body;
  const db = getDb();

  if (!title || title.trim().length === 0) {
    return res.redirect('/dashboard?error=Title is required');
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date)
    VALUES (?, ?, 'todo', ?, ?, ?, ?)
  `).run(title.trim(), description || '', priority || 'medium', assigned_to || null, req.session.userId, due_date || null);

  logger.logAction('TASK_CREATED', req.session.userId, { taskId: result.lastInsertRowid, title });
  logger.logDb('INSERT', 'tasks', { taskId: result.lastInsertRowid });

  // Audit trail
  db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.userId, 'CREATE', 'task', result.lastInsertRowid, JSON.stringify({ title, priority }));

  res.redirect('/dashboard');
});

// ── POST /tasks/:id/status — Update task status ────────────
router.post('/tasks/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const db = getDb();
  const validStatuses = ['todo', 'in-progress', 'done', 'blocked'];

  if (!validStatuses.includes(status)) {
    return res.redirect('/dashboard?error=Invalid status');
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.redirect('/dashboard?error=Task not found');
  }

  db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);

  logger.logAction('TASK_STATUS_UPDATED', req.session.userId, {
    taskId: req.params.id,
    oldStatus: task.status,
    newStatus: status,
  });

  res.redirect('/dashboard');
});

// ── POST /tasks/:id/delete — Delete a task (admin only) ────
router.post('/tasks/:id/delete', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.redirect('/dashboard?error=Task not found');
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

  logger.logAction('TASK_DELETED', req.session.userId, { taskId: req.params.id, title: task.title });
  logger.logDb('DELETE', 'tasks', { taskId: req.params.id });

  res.redirect('/dashboard');
});

// ================================================================
// REST API ENDPOINTS (for API automation tests)
// ================================================================

// ── GET /api/tasks — List all tasks ────────────────────────
router.get('/api/tasks', requireAuth, (req, res) => {
  const start = Date.now();
  const db = getDb();

  let query = `
    SELECT t.*, u.username as assigned_username
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
  `;
  const params = [];

  // Filter by status
  if (req.query.status) {
    query += ' WHERE t.status = ?';
    params.push(req.query.status);
  }

  // Filter by priority
  if (req.query.priority) {
    query += params.length ? ' AND' : ' WHERE';
    query += ' t.priority = ?';
    params.push(req.query.priority);
  }

  query += ' ORDER BY t.created_at DESC';
  const tasks = db.prepare(query).all(...params);

  const duration = Date.now() - start;
  logger.logApiRequest('GET', '/api/tasks', 200, duration, req.session.userId);

  res.json({ tasks, count: tasks.length });
});

// ── GET /api/tasks/:id — Get single task ───────────────────
router.get('/api/tasks/:id', requireAuth, (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u.username as assigned_username
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ task });
});

// ── POST /api/tasks — Create task via API ──────────────────
router.post('/api/tasks', requireAuth, express.json(), (req, res) => {
  const start = Date.now();
  const { title, description, priority, assigned_to, due_date } = req.body;
  const db = getDb();

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date)
    VALUES (?, ?, 'todo', ?, ?, ?, ?)
  `).run(title.trim(), description || '', priority || 'medium', assigned_to || null, req.session.userId, due_date || null);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  const duration = Date.now() - start;
  logger.logAction('API_TASK_CREATED', req.session.userId, { taskId: task.id, title });
  logger.logApiRequest('POST', '/api/tasks', 201, duration, req.session.userId);
  logger.logDb('INSERT', 'tasks', { taskId: task.id });

  res.status(201).json({ task });
});

// ── PUT /api/tasks/:id — Update task via API ───────────────
router.put('/api/tasks/:id', requireAuth, express.json(), (req, res) => {
  const { title, description, status, priority, assigned_to, due_date } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assigned_to = COALESCE(?, assigned_to),
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, status, priority, assigned_to, due_date, req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  logger.logAction('API_TASK_UPDATED', req.session.userId, {
    taskId: req.params.id,
    changes: { title, status, priority },
  });

  res.json({ task });
});

// ── DELETE /api/tasks/:id — Delete task via API ────────────
router.delete('/api/tasks/:id', requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

  logger.logAction('API_TASK_DELETED', req.session.userId, { taskId: req.params.id, title: task.title });
  logger.logDb('DELETE', 'tasks', { taskId: req.params.id });

  res.json({ success: true, message: `Task "${task.title}" deleted` });
});

// ── GET /api/stats — Dashboard statistics ──────────────────
router.get('/api/stats', requireAuth, (req, res) => {
  const db = getDb();

  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
    byStatus: db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all(),
    byPriority: db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all(),
    recentActivity: db.prepare(`
      SELECT a.*, u.username 
      FROM audit_log a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC LIMIT 10
    `).all(),
  };

  res.json(stats);
});

module.exports = router;
