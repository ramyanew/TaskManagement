// ============================================================
// tests/api/tasks-api.spec.js — Tasks CRUD API Tests
// ============================================================
// LAYER: API Automation
// WHAT: Full CRUD test coverage for /api/tasks endpoints.
//       Tests: GET, POST, PUT, DELETE + filters + error cases.
// NOTE: Uses admin session (storageState) for authenticated requests.
// ============================================================

const { test, expect } = require('@playwright/test');
const TestDataFactory = require('../../helpers/testDataFactory');
const ApiHelper = require('../../helpers/apiHelper');
const config = require('../../config/dev.config');

test.describe('Tasks API — CRUD Operations', () => {
  let api;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
  });

  // ── GET /api/tasks ────────────────────────────────────────

  test('GET /api/tasks — should return all tasks', async () => {
    const result = await api.getTasks();
    expect(result.status).toBe(200);
    expect(result.body.tasks).toBeDefined();
    expect(Array.isArray(result.body.tasks)).toBe(true);
    expect(result.body.count).toBeGreaterThan(0);
  });

  test('GET /api/tasks?status=todo — should filter by status', async () => {
    const result = await api.getTasks({ status: 'todo' });
    expect(result.status).toBe(200);
    result.body.tasks.forEach((task) => {
      expect(task.status).toBe('todo');
    });
  });

  test('GET /api/tasks?priority=critical — should filter by priority', async () => {
    const result = await api.getTasks({ priority: 'critical' });
    expect(result.status).toBe(200);
    result.body.tasks.forEach((task) => {
      expect(task.priority).toBe('critical');
    });
  });

  // ── GET /api/tasks/:id ────────────────────────────────────

  test('GET /api/tasks/:id — should return a single task', async () => {
    // First, get all tasks to find a valid ID
    const listResult = await api.getTasks();
    const firstTaskId = listResult.body.tasks[0].id;

    const result = await api.getTask(firstTaskId);
    expect(result.status).toBe(200);
    expect(result.body.task).toBeDefined();
    expect(result.body.task.id).toBe(firstTaskId);
    expect(result.body.task.title).toBeDefined();
  });

  test('GET /api/tasks/99999 — should return 404 for non-existent task', async () => {
    const result = await api.getTask(99999);
    expect(result.status).toBe(404);
    expect(result.body.error).toContain('not found');
  });

  // ── POST /api/tasks ───────────────────────────────────────

  test('POST /api/tasks — should create a new task', async () => {
    const taskData = TestDataFactory.createTask({ priority: 'high' });

    const result = await api.createTask(taskData);
    expect(result.status).toBe(201);
    expect(result.body.task).toBeDefined();
    expect(result.body.task.title).toBe(taskData.title);
    expect(result.body.task.priority).toBe('high');
    expect(result.body.task.status).toBe('todo'); // Default status
    expect(result.body.task.id).toBeDefined();
  });

  test('POST /api/tasks — should return 400 for missing title', async () => {
    const result = await api.createTask({ description: 'No title provided' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Title is required');
  });

  test('POST /api/tasks — should create with default priority', async () => {
    const result = await api.createTask({ title: `Default Priority ${TestDataFactory.uniqueId()}` });
    expect(result.status).toBe(201);
    expect(result.body.task.priority).toBe('medium'); // Default
  });

  // ── PUT /api/tasks/:id ────────────────────────────────────

  test('PUT /api/tasks/:id — should update task status', async () => {
    // Create a task first
    const createResult = await api.createTask(TestDataFactory.createTask());
    const taskId = createResult.body.task.id;

    // Update its status
    const updateResult = await api.updateTask(taskId, { status: 'in-progress' });
    expect(updateResult.status).toBe(200);
    expect(updateResult.body.task.status).toBe('in-progress');
  });

  test('PUT /api/tasks/:id — should update task title and priority', async () => {
    const createResult = await api.createTask(TestDataFactory.createTask());
    const taskId = createResult.body.task.id;

    const updateResult = await api.updateTask(taskId, {
      title: 'Updated Title',
      priority: 'critical',
    });
    expect(updateResult.status).toBe(200);
    expect(updateResult.body.task.title).toBe('Updated Title');
    expect(updateResult.body.task.priority).toBe('critical');
  });

  test('PUT /api/tasks/99999 — should return 404 for non-existent task', async () => {
    const result = await api.updateTask(99999, { status: 'done' });
    expect(result.status).toBe(404);
  });

  // ── DELETE /api/tasks/:id ─────────────────────────────────

  test('DELETE /api/tasks/:id — should delete a task (admin)', async () => {
    // Create a task to delete
    const createResult = await api.createTask(TestDataFactory.createTask());
    const taskId = createResult.body.task.id;

    // Delete it
    const deleteResult = await api.deleteTask(taskId);
    expect(deleteResult.status).toBe(200);
    expect(deleteResult.body.success).toBe(true);

    // Verify it's gone
    const getResult = await api.getTask(taskId);
    expect(getResult.status).toBe(404);
  });

  test('DELETE /api/tasks/99999 — should return 404 for non-existent task', async () => {
    const result = await api.deleteTask(99999);
    expect(result.status).toBe(404);
  });

  // ── GET /api/stats ────────────────────────────────────────

  test('GET /api/stats — should return dashboard statistics', async () => {
    const result = await api.getStats();
    expect(result.status).toBe(200);
    expect(result.body.total).toBeDefined();
    expect(result.body.byStatus).toBeDefined();
    expect(result.body.byPriority).toBeDefined();
    expect(Array.isArray(result.body.byStatus)).toBe(true);
  });
});
