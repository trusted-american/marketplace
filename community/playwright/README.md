# playwright

Multi-agent Playwright test generation system that creates thorough, production-ready test suites one page at a time.

> Forked from [DPasionClaudePlugins](https://github.com/DanielPasion/DPasionClaudePlugins)

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

Create `.claude/playwright.local.md` in your project for per-project defaults (base URL, browsers, auth, output directory). See `preference/defaults.md` for the full template.

## Installation

```bash
claude plugin install playwright@marketplace
```
