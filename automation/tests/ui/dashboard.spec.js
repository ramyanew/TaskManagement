// ============================================================
// tests/ui/dashboard.spec.js — Dashboard UI Tests
// ============================================================
// LAYER: UI Validation
// WHAT: Tests dashboard rendering, stats display, task CRUD via UI,
//       status updates, and user-specific views.
// NOTE: Uses storageState (admin session) — no login needed.
// ============================================================

const { test, expect } = require('@playwright/test');
const DashboardPage = require('../../pages/DashboardPage');
const TestDataFactory = require('../../helpers/testDataFactory');

test.describe('Dashboard — UI Validation', () => {

  test('should display dashboard with stats cards', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Verify all stat cards are visible
    await expect(page.locator(dashboard.statsRow)).toBeVisible();
    await expect(page.locator(dashboard.statTotal)).toBeVisible();
    await expect(page.locator(dashboard.statTodo)).toBeVisible();
    await expect(page.locator(dashboard.statDone)).toBeVisible();

    // Stats should have valid numbers
    const stats = await dashboard.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.total).toBe(stats.todo + stats.inProgress + stats.done + stats.blocked);
  });

  test('should display task table with seeded data', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(page.locator(dashboard.taskTable)).toBeVisible();
    const count = await dashboard.getTaskCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new task via UI', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const beforeCount = await dashboard.getTaskCount();
    const taskData = TestDataFactory.createTask({ priority: 'high' });

    await dashboard.createTask(taskData);

    // Verify task count increased
    const afterCount = await dashboard.getTaskCount();
    expect(afterCount).toBe(beforeCount + 1);

    // Verify the new task title appears in the list
    const titles = await dashboard.getAllTaskTitles();
    expect(titles).toContain(taskData.title);
  });

  test('should update task status from todo to in-progress', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Create a task first
    const taskData = TestDataFactory.createTask();
    await dashboard.createTask(taskData);

    // Find the latest task and get its ID
    await dashboard.goto(); // Refresh to get updated data
    const latestRow = page.locator('.task-row').first();
    const taskId = await latestRow.locator('[data-testid="task-id"]').textContent();

    // Update status
    await dashboard.updateTaskStatus(taskId.trim(), 'in-progress');

    // Verify status changed
    const statusSelect = page.locator(`[data-testid="task-status-${taskId.trim()}"]`);
    await expect(statusSelect).toHaveValue('in-progress');
  });

  test('should display current username and role in navbar', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const userText = await dashboard.getCurrentUsername();
    expect(userText).toContain('admin');
    expect(userText).toContain('admin'); // role
  });

  test('should show create task form with all fields', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(page.locator(dashboard.createTaskForm)).toBeVisible();
    await expect(page.locator(dashboard.taskTitleInput)).toBeVisible();
    await expect(page.locator(dashboard.taskDescriptionInput)).toBeVisible();
    await expect(page.locator(dashboard.taskPrioritySelect)).toBeVisible();
    await expect(page.locator(dashboard.taskAssigneeSelect)).toBeVisible();
    await expect(page.locator(dashboard.taskDueDateInput)).toBeVisible();
    await expect(page.locator(dashboard.createTaskButton)).toBeVisible();
  });

  test('should logout and redirect to login page', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.logout();

    expect(page.url()).toContain('/login');
  });
});
