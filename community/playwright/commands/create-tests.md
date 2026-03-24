---
description: Generate a thorough Playwright test suite for a single page with multi-agent review
argument-hint: <page-path> <edge-cases-description>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

You are orchestrating a multi-agent Playwright test generation workflow. The user has provided a page file and edge cases to cover.

**Input parsing:**
- `$1` is the page file path
- `$ARGUMENTS` after the file path contains the edge cases the user wants covered

---

## Phase 1: Deep Investigation

Thoroughly investigate the target page before any test writing begins.

1. **Read the target page file** at `$1` completely
2. **Trace all dependencies** — find and read every file referenced by the page:
   - Imported components, hooks, utilities, helpers
   - API calls, service functions, data fetchers
   - Shared state, context providers, stores
   - Type definitions and interfaces
   - Route definitions and navigation targets
   - CSS modules, styled components, or theme files
3. **Map the page's behavior**:
   - All user interactions (clicks, inputs, navigation, form submissions)
   - All conditional renders (loading, error, empty, success states)
   - All side effects (API calls, localStorage, cookies, redirects)
   - All dynamic content (pagination, infinite scroll, modals, tooltips)
   - Authentication/authorization gates
   - Responsive behavior differences
4. **Document your findings** as a structured summary before proceeding

---

## Phase 2: Parallel Test Writing

Spawn exactly 2 agents in parallel using the Agent tool:

### Agent A: test-writer
Provide this agent with:
- The complete page investigation findings from Phase 1
- The user's specified edge cases from `$ARGUMENTS`
- The target spec file path (derive from page path, e.g., `page-name.spec.ts`)
- The preference settings if a `.claude/playwright.local.md` file exists in the project

This agent writes the user's required edge case tests ONLY.

### Agent B: test-discoverer
Provide this agent with:
- The complete page investigation findings from Phase 1
- The user's specified edge cases (so it does NOT duplicate them)
- The same target spec file path

This agent discovers and writes additional critical tests the user did not specify.

**Wait for both agents to complete.** Merge their outputs into a single spec file. The user's specified tests (from test-writer) go FIRST, followed by the discovered tests (from test-discoverer) in a clearly separated describe block.

---

## Phase 3: Parallel Review

After the merged spec file is written, spawn exactly 2 review agents in parallel:

### Agent C: frequency-reviewer
Provide this agent with:
- The complete spec file
- The page investigation findings

This agent evaluates every test for real-world frequency and usefulness.

### Agent D: flakiness-reviewer
Provide this agent with:
- The complete spec file
- The page investigation findings

This agent checks every test for flakiness, concurrency issues, and independence.

**Wait for both review agents to complete.** Collect their findings.

---

## Phase 4: Final Review

After both review agents report back, spawn the final-reviewer agent:

### Agent E: final-reviewer
Provide this agent with:
- The complete spec file
- The frequency-reviewer's findings and recommendations
- The flakiness-reviewer's findings and recommendations
- The page investigation findings

This agent implements all recommended fixes, ensures the suite is production-ready, and returns a 1-100 quality score. If the score is below 80, the agent must iterate until it reaches 80+.

---

## Phase 5: Report

After the final-reviewer completes, present the user with:
1. The spec file location
2. Total number of tests written
3. Tests by category (user-specified vs discovered)
4. Any flagged low-frequency tests that were removed or noted
5. Any flakiness fixes that were applied
6. The final quality score (1-100)
7. Any breaking bugs found in source code (if applicable)

---

## Critical Rules

- **Only create the `.spec.ts` file** — NEVER modify source code UNLESS a breaking bug is found that prevents the feature from working at all
- If a breaking bug IS found, clearly document what was changed and why before modifying source
- All tests must use standard Playwright conventions: `test.describe`, `test()`, `page` fixture
- All tests must be independently runnable — no shared state between tests
- Use `test.beforeEach` for common setup, never rely on test execution order
- Respect any preferences from `.claude/playwright.local.md` if it exists in the project
