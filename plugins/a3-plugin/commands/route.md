---
description: Standalone route specialist — create routes, GTS templates, and controllers (when needed) for A3
argument-hint: <route-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /route Command

Standalone entry point for the route-writer specialist. Use this for isolated route tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New route, modify existing, or routing advice
2. **Read router.ts**: Understand the current route map
3. **Investigate A3**: `grep -n` for 1-2 similar routes and read only the relevant range
4. **Ask clarifying questions**:
   - What route path? Where in the hierarchy? (admin, authenticated, public)
   - What data does the route load?
   - Does it need query params? (if so, controller is justified)
   - What components will the template render?
5. **Spawn route-writer agent** with full context
6. **CRITICAL**: Default to GTS route template. Only create a controller if query params or complex state is truly needed. Investigate similar routes first.
7. **Self-review**: Check route against A3 conventions
8. **Deliver**: Present route, template, and controller (if any) to user

## When to Escalate

If the route needs new models, components, or backend support, suggest `/orchestrate`.

## Context Discipline

- Never read a whole file to learn a convention. `grep -n` for the symbol, then `sed -n 'A,Bp'`
  for the ~40 lines around it.
- Open at most **2** reference files. If two examples agree, stop looking.
- Load a skill only when the task needs it. Never preload.
- Spawn helper agents only when the task genuinely crosses into their layer.

## Verification Policy

- After writing code, run `pnpm lint` **once**. Do not read, parse, or act on its output.
- NEVER run tests, builds, type-checks, or emulators locally — no `ember test`, `ember-tsc`,
  `pnpm build`, `firebase emulators:*`, `tsc`.
- Tests are written, not run. To verify them, push a branch, open a PR, and read CI
  (`gh pr checks`, `gh run view`). Never verify locally.
