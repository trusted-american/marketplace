# playwright

Multi-agent Playwright test generation system that creates thorough, production-ready test suites one page at a time.

## Components

| Type | Name | Description |
|------|------|-------------|
| Command | `create-tests` | Generate a Playwright test suite for a page with multi-agent review |
| Agent | `test-writer` | Writes tests for user-specified edge cases |
| Agent | `test-discoverer` | Discovers additional critical tests beyond what was specified |
| Agent | `frequency-reviewer` | Evaluates test value and CI time impact |
| Agent | `flakiness-reviewer` | Audits for flakiness, concurrency issues, and independence |
| Agent | `final-reviewer` | Implements fixes and certifies production readiness (80+ score) |
| Skill | `playwright-testing` | Best practices for selectors, waits, mocking, and assertions |
| Template | `spec-file` | Output template for generated Playwright spec files |

## Usage

Generate tests for a page:

```
/playwright:create-tests src/pages/Dashboard.tsx "form validation, empty state, session timeout"
```

The command orchestrates a 5-phase workflow:

1. **Investigate** the page and all its dependencies
2. **Write** user-specified tests + discover additional coverage (parallel)
3. **Review** for frequency value + flakiness risks (parallel)
4. **Finalize** — apply fixes, score, iterate until 80+
5. **Report** — summary with quality score

## Configuration

Create `.claude/playwright.local.md` in your project root to customize defaults:

```markdown
---
baseURL: "http://localhost:3000"
browsers:
  - chromium
timeout: 30000
viewport:
  width: 1280
  height: 720
auth:
  setupFile: "tests/auth.setup.ts"
  storageState: "tests/.auth/user.json"
outputDir: "tests/e2e"
namingPattern: "{page-name}.spec.ts"
---

## Project-Specific Testing Notes

Add any project-specific context here that the test generator should know about:
- Authentication flow details
- API endpoint patterns
- Custom component naming conventions
- Known limitations or quirks
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseURL` | string | `http://localhost:3000` | Base URL for `page.goto()` |
| `browsers` | string[] | `["chromium"]` | Browsers to target |
| `timeout` | number | `30000` | Default test timeout (ms) |
| `viewport.width` | number | `1280` | Viewport width |
| `viewport.height` | number | `720` | Viewport height |
| `auth.setupFile` | string | — | Path to auth setup file |
| `auth.storageState` | string | — | Path to stored auth state |
| `outputDir` | string | `tests/e2e` | Where spec files are created |
| `namingPattern` | string | `{page-name}.spec.ts` | Spec file naming pattern |

## Installation

```bash
claude plugin install playwright@marketplace
```
