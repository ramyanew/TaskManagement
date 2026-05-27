# Playwright MCP Automation Framework

A full-stack test automation framework built with **Playwright + JavaScript + MCP (Model Context Protocol)** covering 7 validation layers.

## Architecture

```
playwright-mcp-automation/
│
├── demo-app/                    ← Target Application (Express + SQLite + EJS)
│   ├── server.js                   Main server
│   ├── database.js                 SQLite setup + seed data
│   ├── logger.js                   Structured JSON logging (Winston)
│   ├── routes/
│   │   ├── auth.js                 Login, Register, Logout
│   │   └── tasks.js                Task CRUD (UI + REST API)
│   ├── views/                      EJS templates (login, register, dashboard)
│   ├── public/css/                 Styles
│   └── logs/                       Generated log files (app.log, error.log, audit.log)
│
├── automation/                  ← Playwright MCP Test Framework
│   ├── playwright.config.js        Master configuration
│   ├── mcp-config/                 MCP server configuration for AI tools
│   ├── pages/                      Page Object Model
│   │   ├── BasePage.js                Smart waiting, common actions
│   │   ├── LoginPage.js               Login page interactions
│   │   └── DashboardPage.js           Dashboard + task management
│   ├── helpers/
│   │   ├── dbHelper.js                Direct database queries (SQLite)
│   │   ├── logHelper.js               Log file parser + validators
│   │   ├── apiHelper.js               REST API request wrapper
│   │   └── testDataFactory.js         Unique test data generator
│   ├── fixtures/
│   │   └── auth/                      StorageState session files
│   ├── config/
│   │   └── dev.config.js              Environment configuration
│   └── tests/
│       ├── auth.setup.js              One-time login (storageState)
│       ├── ui/                        UI Validation tests
│       ├── api/                       API Automation tests
│       ├── db/                        Database Validation tests
│       ├── logs/                      Log Validation tests
│       ├── security/                  Security tests (XSS, SQLi, RBAC)
│       ├── accessibility/             WCAG 2.1 a11y tests
│       └── performance/               Response time baselines
│
└── docs/
    └── SETUP_GUIDE.md              Step-by-step installation guide
```

## 7 Validation Layers

| Layer | Folder | What It Tests |
|-------|--------|--------------|
| UI Validation | `tests/ui/` | Page rendering, form interactions, navigation, POM |
| API Automation | `tests/api/` | REST CRUD endpoints, status codes, response schemas |
| Database Validation | `tests/db/` | Data integrity after UI/API actions, foreign keys, audits |
| Log Validation | `tests/logs/` | Structured log entries, security events, no password leaks |
| Security | `tests/security/` | XSS, SQL injection, RBAC, session management |
| Accessibility | `tests/accessibility/` | WCAG 2.1 compliance via axe-core |
| Performance | `tests/performance/` | Page load times, API response times, resource checks |

## Quick Start

```bash
# 1. Start the demo app
cd demo-app
npm install
node server.js

# 2. Run tests (in a new terminal)
cd automation
npm install
npx playwright install
npx playwright test

# 3. View report
npx playwright show-report
```

## Demo App Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| User | testuser | user123 |
| Viewer | viewer | viewer123 |

## MCP Integration

The Playwright MCP server lets AI tools (Claude Desktop, VS Code Copilot, Cursor) control the browser via natural language commands. See `automation/mcp-config/mcp-server-config.json` for setup instructions.

```bash
# Start MCP server
npx @playwright/mcp@latest
```

Then give commands like: "Navigate to localhost:3000, login as admin, create a task called 'MCP Test', take a screenshot"

## Run Specific Test Layers

```bash
npm run test:ui          # UI tests only
npm run test:api         # API tests only
npm run test:db          # Database validation only
npm run test:logs        # Log validation only
npm run test:security    # Security tests only
npm run test:a11y        # Accessibility tests only
npm run test:perf        # Performance tests only
```
