# playwright

Multi-agent Playwright test generation. Given a page file and a description of edge cases to cover, it produces a production-ready `.spec.ts` file through a 5-phase pipeline: investigation, parallel test writing, parallel review, finalization, and reporting.

## Components

| Type | Name | Role |
|---|---|---|
| Command | `create-tests` | Entry point — orchestrates the full pipeline |
| Agent | `test-writer` | Writes tests for the user-specified edge cases |
| Agent | `test-discoverer` | Finds and writes tests for scenarios the user didn't specify |
| Agent | `frequency-reviewer` | Scores each test by real-world likelihood and impact |
| Agent | `flakiness-reviewer` | Audits for timing issues, shared state, and non-determinism |
| Agent | `final-reviewer` | Applies all review fixes, scores the suite, iterates until 80+ |
| Skill | `playwright-testing` | Reference material for selectors, waits, mocking, and assertions |
| Template | `spec-file` | Structural template for generated spec files |

## Usage

```
/playwright:create-tests src/pages/Dashboard.tsx "form validation, empty state, session timeout"
```

The first argument is the page file path. Everything after it is a free-text description of edge cases to cover.

### Pipeline

1. **Investigate** — Reads the target page and traces all imports (components, hooks, API calls, types, routes) to build a complete behavior map.
2. **Write** (parallel) — `test-writer` implements the specified edge cases. `test-discoverer` finds additional gaps (error states, loading states, accessibility, boundary conditions). Results are merged and deduplicated.
3. **Review** (parallel) — `frequency-reviewer` categorizes each test by value (essential / valuable / useful / questionable / remove). `flakiness-reviewer` checks for timing issues, selector fragility, test independence violations, and environment sensitivity.
4. **Finalize** — `final-reviewer` applies all fixes, removes low-value tests, and scores the suite across 5 dimensions (reliability, coverage, independence, code quality, assertions). Iterates up to 3 times to reach a score of 80/100.
5. **Report** — Outputs the spec file location, test counts by category, applied fixes, and the final quality score.

### Output

A single `.spec.ts` file. The command never modifies source code. If it finds bugs in the source during investigation, it documents them in the report.

## Configuration

Create `.claude/playwright.local.md` in your project root to override defaults:

```yaml
---
baseURL: "http://localhost:3000"
browsers: ["chromium"]
timeout: 30000
viewport: { width: 1280, height: 720 }
auth:
  setupFile: "tests/auth.setup.ts"
  storageState: "tests/.auth/user.json"
outputDir: "tests/e2e"
namingPattern: "{page-name}.spec.ts"
---
```

Add any project-specific context below the frontmatter (authentication flows, API patterns, component conventions) and the agents will incorporate it.

| Field | Default | Description |
|---|---|---|
| `baseURL` | `http://localhost:3000` | Base URL for `page.goto()` |
| `browsers` | `["chromium"]` | Target browsers |
| `timeout` | `30000` | Test timeout in ms |
| `viewport` | `1280x720` | Viewport dimensions |
| `auth.setupFile` | none | Path to auth setup file |
| `auth.storageState` | none | Path to stored auth state |
| `outputDir` | `tests/e2e` | Output directory for spec files |
| `namingPattern` | `{page-name}.spec.ts` | Spec file naming pattern |

## Install

```bash
claude plugin install playwright@marketplace
```
