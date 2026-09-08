---
description: Standalone Glimmer GTS component specialist — create, modify, or get expert advice on A3 components
argument-hint: <component-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /component Command

Standalone entry point for the component-writer specialist. Use this when working on an isolated component task.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: Parse what the user needs — new component, modify existing, or advice
2. **Investigate A3**: Locate 1-2 similar existing components with `grep -n`, then read only the relevant range
3. **Ask clarifying questions** if the request is ambiguous:
   - What data does this component receive?
   - Where does it live in the component hierarchy?
   - Are there existing components to reuse or extend?
   - Does it need loading/error/empty states?
4. **Spawn component-writer agent** with full context
5. **Optional: spawn other agents for help** if the component needs:
   - A new model → spawn model-writer
   - New test coverage → spawn test-writer
   - Integration verification → spawn integration-specialist
6. **Self-review**: The component-writer reviews its own output against A3 conventions
7. **Deliver**: Present the component code to the user

## When to Escalate

If the component task reveals that more is needed (new route, new model, backend changes), suggest the user run `/orchestrate` instead for full coordination.

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
