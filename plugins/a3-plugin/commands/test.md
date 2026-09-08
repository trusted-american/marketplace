---
description: Standalone QUnit test specialist — create acceptance, integration, and unit tests for A3
argument-hint: <test-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /test Command

Standalone entry point for the test-writer specialist. Use this for testing tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New tests, improve coverage, or testing advice
2. **Read the code being tested**: Understand what needs test coverage
3. **Investigate A3**: Read similar test files for conventions
4. **Ask clarifying questions**:
   - What type of test? (acceptance, integration, unit)
   - What specific scenarios to cover?
   - Are there permission edge cases?
   - What data-test-* selectors exist on the components?
5. **Spawn test-writer agent** with full context
6. **Self-review**: Check test completeness and conventions
7. **Deliver**: Present test code to user

## Test Type Guide

| If testing... | Use this test type |
|--------------|-------------------|
| Full user flow (visit page, interact, verify) | Acceptance |
| Component rendering and interaction | Integration |
| Model computed properties | Unit |
| Ability permissions | Unit |
| Service logic | Unit |
| Utility functions | Unit |
| Route model hooks | Unit |
| Serializer transforms | Unit |

## Context Discipline

- Never read a whole file to learn a convention. `grep -n` for the symbol, then `sed -n 'A,Bp'`
  for the ~40 lines around it.
- Open at most **2** reference files. If two examples agree, stop looking.
- Load a skill only when the task needs it. Never preload.
- Spawn helper agents only when the task genuinely crosses into their layer.

## Verification Policy

- Lint is opt-in. Resolve in order: `--lint`/`--no-lint` → `lint:` in
  `.claude/a3-plugin.local.md` at the A3 repo root → default **off**.
  When enabled, run `pnpm lint` once and report failures; otherwise skip it.
- NEVER run tests, builds, type-checks, or emulators locally — no `ember test`, `ember-tsc`,
  `pnpm build`, `firebase emulators:*`, `tsc`.
- Tests are written, not run. To verify them, push a branch, open a PR, and read CI
  (`gh pr checks`, `gh run view`). Never verify locally.
