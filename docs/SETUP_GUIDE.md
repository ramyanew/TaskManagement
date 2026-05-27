# Setup Guide — Playwright MCP Automation Framework

Complete step-by-step installation and configuration guide.

---

## Prerequisites — What to Install

### 1. Node.js (v18 or higher)

Node.js is the runtime for both the demo app and Playwright.

- **Download**: https://nodejs.org/en/download (choose LTS version)
- **Verify**: Open Command Prompt and run:
  ```bash
  node -v     # Should show v18.x or higher
  npm -v      # Should show 9.x or higher
  ```

### 2. VS Code (Recommended IDE)

- **Download**: https://code.visualstudio.com/
- **Required Extensions**:
  - **Playwright Test for VS Code** — Run/debug tests from the editor, see locators
  - **ESLint** — Code quality
  - **GitLens** — Git integration
- **Optional Extensions**:
  - **GitHub Copilot** — AI-assisted test writing
  - **SQLite Viewer** — View the database file directly in VS Code

### 3. Git

- **Download**: https://git-scm.com/downloads
- **Verify**: `git --version`

### 4. Playwright Browsers

Playwright downloads its own browser binaries (Chromium, Firefox, WebKit). This happens automatically during setup but requires internet access.

---

## Step-by-Step Setup

### Step 1: Extract the Project

Extract the zip file to `C:\Projects\`:
```
C:\Projects\playwright-mcp-automation\
├── demo-app\
├── automation\
├── docs\
└── README.md
```

### Step 2: Install Demo App Dependencies

```bash
cd C:\Projects\playwright-mcp-automation\demo-app
npm install
```

This installs: Express, SQLite (better-sqlite3), EJS, bcryptjs, express-session, Winston logger.

**Note for Windows**: `better-sqlite3` is a native module. If you get build errors:
```bash
npm install --global windows-build-tools
# OR install Visual Studio Build Tools from:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### Step 3: Start the Demo App

```bash
cd C:\Projects\playwright-mcp-automation\demo-app
node server.js
```

You should see:
```
  ✅  Task Manager running at http://localhost:3000
  📋  Login: admin / admin123
  📋  Login: testuser / user123
  📋  Login: viewer / viewer123
```

Open `http://localhost:3000` in your browser to verify it works.

**Leave this terminal running** — the app must be running while tests execute.

### Step 4: Install Automation Framework Dependencies

Open a **new terminal**:
```bash
cd C:\Projects\playwright-mcp-automation\automation
npm install
```

This installs: @playwright/test, @playwright/mcp, @axe-core/playwright, better-sqlite3.

### Step 5: Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers (~400MB total). Takes 2-5 minutes depending on internet speed.

### Step 6: Run All Tests

```bash
npx playwright test
```

Expected output:
```
Running 40+ tests using 2 workers

  ✓ [setup] authenticate as admin
  ✓ [chromium] Login Page — should display login form
  ✓ [chromium] Dashboard — should display stats cards
  ✓ [chromium] Tasks API — GET /api/tasks — should return all tasks
  ✓ [chromium] DB Validation — DB should contain seeded users
  ✓ [chromium] Log Validation — App logs should be valid JSON
  ✓ [chromium] Security — Dashboard should redirect when not authenticated
  ✓ [chromium] Accessibility — Login page should have no critical violations
  ✓ [chromium] Performance — Login page should load within threshold
  ...

  40 passed
```

### Step 7: View HTML Report

```bash
npx playwright show-report
```

This opens a detailed HTML report in your browser showing pass/fail for every test.

---

## MCP Server Setup

### What is Playwright MCP?

MCP (Model Context Protocol) lets AI tools like Claude Desktop control a real browser. Instead of writing test code, you give natural language commands:

> "Open the login page, type admin/admin123, click Sign In, verify the dashboard loads"

The MCP server translates this into Playwright browser actions.

### Install MCP Server

```bash
npm install -g @playwright/mcp
```

### Configure Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Developer → Edit Config
3. Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

4. Restart Claude Desktop

### Configure VS Code (GitHub Copilot / Cursor)

Create `.vscode/mcp.json` in the automation folder:
```json
{
  "mcp": {
    "servers": {
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
      }
    }
  }
}
```

### Test MCP

Start the MCP server:
```bash
npx @playwright/mcp@latest
```

Then in Claude Desktop or VS Code Copilot, try:
```
Navigate to http://localhost:3000/login
Type "admin" in the username field
Type "admin123" in the password field
Click the Sign In button
Take a screenshot
```

---

## Run Specific Test Layers

```bash
# Run by layer
npx playwright test tests/ui/              # UI tests only
npx playwright test tests/api/             # API tests only
npx playwright test tests/db/              # Database validation only
npx playwright test tests/logs/            # Log validation only
npx playwright test tests/security/        # Security tests only
npx playwright test tests/accessibility/   # Accessibility tests only
npx playwright test tests/performance/     # Performance tests only

# Run a single test file
npx playwright test tests/ui/login.spec.js

# Run in headed mode (see the browser)
npx playwright test --headed

# Run in debug mode (step through tests)
npx playwright test --debug

# Run with specific grep pattern
npx playwright test -g "should login successfully"

# Generate JUnit XML (for Jenkins)
npx playwright test --reporter=junit
```

---

## Project Configuration

### Environment Variables

```bash
# Run against a different environment
BASE_URL=https://staging.example.com npx playwright test

# Run with more workers (CI)
CI=true npx playwright test
```

### Key Files to Customize

| File | What to Change |
|------|---------------|
| `automation/config/dev.config.js` | URLs, credentials, thresholds |
| `automation/playwright.config.js` | Browsers, workers, timeouts, reporters |
| `automation/mcp-config/mcp-server-config.json` | MCP server setup for your AI tool |

---

## Troubleshooting

### "better-sqlite3 build error" on Windows
```bash
npm install --global windows-build-tools
# Then retry: npm install
```

### "ECONNREFUSED localhost:3000"
The demo app isn't running. Open a new terminal:
```bash
cd C:\Projects\playwright-mcp-automation\demo-app
node server.js
```

### "browser not found"
Run: `npx playwright install`

### Tests pass locally but fail in CI
- Ensure `CI=true` is set (enables retries, more workers)
- Check that the demo app starts before tests in your CI script
- Use `--reporter=junit` for CI-friendly output

### MCP server not connecting
- Restart Claude Desktop / VS Code after editing config
- Run `npx @playwright/mcp@latest --help` to verify installation
- Check that Node.js v18+ is in your system PATH

---

## Folder Reference

```
automation/
├── pages/             Page Object Model — one file per page
├── helpers/           Reusable utilities (DB, Log, API, TestData)
├── fixtures/          Auth session files, custom fixtures
├── config/            Environment-specific settings
├── tests/
│   ├── auth.setup.js  LOGIN ONCE → save session (runs first)
│   ├── ui/            Browser-based UI tests
│   ├── api/           HTTP-only API tests
│   ├── db/            Direct database queries after actions
│   ├── logs/          Parse + validate structured log files
│   ├── security/      XSS, SQLi, RBAC, session tests
│   ├── accessibility/ WCAG compliance (axe-core)
│   └── performance/   Response time + resource baselines
└── mcp-config/        Playwright MCP server configuration
```

---

## Enterprise Upgrade Path

This framework is designed to scale. Here's how each layer maps to enterprise tools:

| This Demo | Enterprise Equivalent |
|-----------|----------------------|
| SQLite | MySQL / PostgreSQL / Oracle |
| Winston file logs | ELK Stack (Elasticsearch + Logstash + Kibana) or Splunk |
| `node server.js` | Docker container with health checks |
| `npx playwright test` | Jenkins / GitHub Actions / GitLab CI pipeline |
| Local HTML report | Allure Report / TestRail integration |
| Manual MCP start | CI-triggered MCP agent (Level 3 agentic pipeline) |
| axe-core | Deque axe DevTools Pro / WAVE |
| Inline perf checks | k6 / JMeter / Locust for load testing |
