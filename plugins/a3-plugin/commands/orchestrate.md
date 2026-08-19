---
description: Implement an A3 feature end-to-end — scopes fast, delegates to the minimum set of specialists, runs one review pass
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /orchestrate

Implements complete A3 features. Optimised for **speed and low context** — the fewest agents
and the fewest file reads that still produce correct code.

## Step 0: Access Gate (once, here only)

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
If this fails, STOP:
> "Access denied. This plugin requires authenticated GitHub access to trusted-american/a3. Run `gh auth login` and ensure you have repo access."

Spawned agents do NOT repeat this check — it is done here for the whole run.

## Step 1: Scope (one message, max 3 questions)

Ask only what a wrong guess would actually change. Everything else gets a stated assumption.
Batch all questions into a single message; never interrogate in rounds.

Typical must-asks (pick at most 3):
- New Firestore collection + fields, or reuse of an existing one?
- Who can access it (admin / all authenticated / owner-only)?
- Where it lives in the navigation.

Skip this step entirely when the task is single-layer or the description already answers it.

## Step 2: Targeted investigation (budget: 3 files)

Find the closest existing analogue and follow it. Use `grep -n` to locate, then a ranged
`sed -n 'A,Bp'` read of the relevant section — never a whole-file read, never a broad glob
dump. If two examples agree, stop looking. Delegate to `example-finder` only if two greps
fail to settle the convention.

Write findings into a **short brief** (paths + the pattern to copy). This brief is what
agents receive — not file contents.

## Step 3: Delegate to the minimum agent set

Spawn only the agents whose layer the task actually touches:

| Agent | Spawn when |
|-------|-----------|
| `model-writer` | New/changed Firestore model, adapter, serializer |
| `function-writer` | New/changed Cloud Function |
| `ability-writer` | Permission or `firestore.rules` change |
| `route-writer` | New route / route template / query-param controller |
| `component-writer` | New/changed Glimmer GTS component |
| `design-system-writer` | UI that needs design system component selection |
| `integration-specialist` | Change spans 3+ layers |
| `test-writer` | Tests explicitly in scope |

Order: models → (functions ∥ abilities) → (routes ∥ components ∥ design system) →
integration → tests. Parallel agents go out in **one** message.

A two-file change needs one or two agents. Nine agents is not a quality signal.

## Step 4: One review pass

Spawn `code-reviewer` **plus at most 2 domain reviewers** for the layers actually touched,
in parallel. Feed them `git diff` — not the full files.

Verdicts are **APPROVE** or **CHANGES** (file:line + concrete fix).

- On CHANGES: the responsible agent fixes it, then you verify the fix against the diff
  yourself. Do not re-spawn the panel.
- **Maximum 2 rounds.** Still contested after round 2 → present both positions to the user
  and let them decide.

## Step 5: Verification & Delivery

- Run `pnpm lint` **once**. Do not read, parse, or act on its output.
- NEVER run tests, builds, type-checks, or emulators locally — no `ember test`, `ember-tsc`,
  `pnpm build`, `firebase emulators:*`, `tsc`.
- Tests are written, not run. To verify: push a branch, open a PR, read CI
  (`gh pr checks`, `gh run view`).

Then deliver:
1. File manifest — every path created/modified, one line each.
2. Manual steps (Firestore indexes, env vars, router entry, translation keys).
3. Offer to push a branch and open a PR so CI verifies the change.

## Critical Rules

- Fewest agents, fewest reads. Fan-out costs the user real time.
- Never read a whole file to learn a convention.
- Prefer GTS route templates; controllers only for query params or page-level state.
- Frontend abilities and `firestore.rules` must always change together.
- Never verify locally — CI is the gate.
