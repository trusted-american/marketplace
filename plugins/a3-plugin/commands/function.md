---
description: Standalone Cloud Function specialist — create Firebase/GCP Cloud Functions for A3
argument-hint: <function-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /function Command

Standalone entry point for the function-writer specialist. Use this for backend Cloud Function tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New function, modify existing, or backend advice
2. **Investigate A3**: Read similar functions in `functions/src/`
3. **Ask clarifying questions**:
   - What type? (Firestore trigger, HTTPS endpoint, PubSub, Storage, Auth)
   - What Firestore collection/document path?
   - What side effects? (email, Algolia sync, audit trail, external API)
   - What third-party services? (Stripe, Mailgun, PandaDoc, HubSpot, OpenAI)
   - Does it need to be idempotent? (Firestore triggers can fire multiple times)
4. **Spawn function-writer agent** with full context
5. **Self-review**: Check for error handling, idempotency, security
6. **Deliver**: Present function code to user

## When to Escalate

If the function needs frontend changes, new models, or permission updates, suggest `/orchestrate`.

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
