---
description: Standalone model specialist — create Ember Data models, adapters, serializers, and Firestore document schemas for A3
argument-hint: <model-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /model Command

Standalone entry point for the model-writer specialist. Use this for data layer tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New model, modify existing, or data layer advice
2. **Read base.ts**: Understand the base model pattern
3. **Investigate A3**: `grep -n` for 1-2 similar models and read only the relevant range
4. **Ask clarifying questions**:
   - What Firestore collection name?
   - What fields and types?
   - What relationships to existing models?
   - Does it need -file and -note sub-models?
   - Does it need a custom adapter (Cloud Function data source)?
   - Does it need a custom serializer?
5. **Spawn model-writer agent** with full context
6. **Self-review**: Verify Firestore document structure is sensible
7. **Deliver**: Present model, adapter (if needed), serializer (if needed)

## When to Escalate

If the model needs Firestore rules, Cloud Function triggers, or new routes, suggest `/orchestrate`.

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
