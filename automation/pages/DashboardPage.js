// ============================================================
// pages/DashboardPage.js — Dashboard Page Object
// ============================================================

const BasePage = require('./BasePage');

class DashboardPage extends BasePage {
  constructor(page) {
    super(page);

    // Stats
    this.statsRow = '[data-testid="stats-row"]';
    this.statTotal = '[data-testid="stat-total"]';
    this.statTodo = '[data-testid="stat-todo"]';
    this.statInProgress = '[data-testid="stat-in-progress"]';
    this.statDone = '[data-testid="stat-done"]';
    this.statBlocked = '[data-testid="stat-blocked"]';

    // Create task form
    this.createTaskSection = '[data-testid="create-task-section"]';
    this.createTaskForm = '[data-testid="create-task-form"]';
    this.taskTitleInput = '[data-testid="task-title-input"]';
    this.taskDescriptionInput = '[data-testid="task-description-input"]';
    this.taskPrioritySelect = '[data-testid="task-priority-select"]';
    this.taskAssigneeSelect = '[data-testid="task-assignee-select"]';
    this.taskDueDateInput = '[data-testid="task-duedate-input"]';
    this.createTaskButton = '[data-testid="create-task-button"]';

    // Task list
    this.taskListSection = '[data-testid="task-list-section"]';
    this.taskTable = '[data-testid="task-table"]';
    this.taskCount = '[data-testid="task-count"]';
    this.emptyState = '[data-testid="empty-state"]';
  }

  // ── Navigation ────────────────────────────────────────────
  async goto() {
    await this.navigate('/dashboard');
    await this.waitForElement(this.statsRow);
  }

  // ── Stats ─────────────────────────────────────────────────
  async getStats() {
    const getText = async (sel) => {
      const el = await this.page.$(sel);
      const numEl = await el.$('.stat-number');
      return parseInt(await numEl.textContent(), 10);
    };

    return {
      total: await getText(this.statTotal),
      todo: await getText(this.statTodo),
      inProgress: await getText(this.statInProgress),
      done: await getText(this.statDone),
      blocked: await getText(this.statBlocked),
    };
  }

  // ── Create Task ───────────────────────────────────────────
  async createTask({ title, description = '', priority = 'medium', assignee = '', dueDate = '' }) {
    await this.page.fill(this.taskTitleInput, title);

    if (description) {
      await this.page.fill(this.taskDescriptionInput, description);
    }

    if (priority !== 'medium') {
      await this.page.selectOption(this.taskPrioritySelect, priority);
    }

    if (assignee) {
      await this.page.selectOption(this.taskAssigneeSelect, assignee);
    }

    if (dueDate) {
      await this.page.fill(this.taskDueDateInput, dueDate);
    }

    await this.page.click(this.createTaskButton);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Task List ─────────────────────────────────────────────
  async getTaskCount() {
    const text = await this.getTextContent(this.taskCount);
    return parseInt(text, 10);
  }

  async getTaskRowData(taskId) {
    const row = `[data-testid="task-row-${taskId}"]`;
    await this.waitForElement(row);
    return {
      id: await this.getTextContent(`${row} [data-testid="task-id"]`),
      title: await this.getTextContent(`${row} [data-testid="task-title"]`),
    };
  }

  async updateTaskStatus(taskId, newStatus) {
    const selector = `[data-testid="task-status-${taskId}"]`;
    await this.page.selectOption(selector, newStatus);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async deleteTask(taskId) {
    // Handle the confirmation dialog
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.click(`[data-testid="delete-task-${taskId}"]`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isTaskVisible(taskId) {
    return await this.isElementVisible(`[data-testid="task-row-${taskId}"]`);
  }

  async getAllTaskTitles() {
    const titles = await this.page.$$eval('[data-testid^="task-row-"] [data-testid="task-title"]', (els) =>
      els.map((el) => el.textContent.trim())
    );
    return titles;
  }
}

module.exports = DashboardPage;
