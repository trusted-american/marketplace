---
description: Review A3 changes with the specialist agents whose domains the diff actually touches
argument-hint: [files-or-branch-to-review]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /review

Reviews A3 code changes. Reviewers are **selected by what the diff touches** — not everyone,
every time.

## Step 0: Access Gate (once, here only)

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — the user needs GitHub access to trusted-american/a3.

## Step 1: Get the diff (not the files)

```bash
git diff --stat && git diff
```
Use `git diff main...HEAD` if the user named a branch, or `git diff -- <paths>` if they named
files. **Review the diff.** Only open a full file when a hunk is genuinely unreadable without
its surrounding context, and then read just that range with `sed -n 'A,Bp'`.

## Step 2: Route to reviewers by changed path

| Changed paths | Reviewer |
|---------------|----------|
| `app/models/`, `app/adapters/`, `app/serializers/`, `app/transforms/` | `model-writer` |
| `app/routes/`, `app/templates/`, `app/controllers/` | `route-writer` |
| `app/components/`, `app/helpers/`, `app/modifiers/` | `component-writer` |
| `functions/src/` | `function-writer` |
| `app/abilities/`, `firestore.rules`, `database.rules.json` | `ability-writer` |
| Any `.gts` with markup | `design-system-writer` |
| `tests/` | `test-writer` |

Then add:
- `integration-specialist` — only when the diff spans **3 or more** of the rows above.
- `code-reviewer` — always, final gate.

**Cap the panel at 4 agents.** If routing selects more, keep the 3 with the most changed
lines plus `code-reviewer`, and say in your summary which domains you did not fan out to.

Spawn the selected agents in **one** message so they run in parallel. Give each the diff and
the specific paths in their domain.

## Step 3: Report

Aggregate into one list, most severe first:

```
BLOCK      app/abilities/referral.ts:22 — ability allows read for any authenticated user;
                                          firestore.rules restricts to owner. They disagree.
CHANGES    app/components/referral-card.gts:14 — raw <button class="btn btn-primary">;
                                                 use <Button @color="primary">.
```

State verdicts honestly — do not minimise. Then ask once whether to apply the fixes.

If the user says yes: apply them, then **re-review only the changed hunks yourself**. Do not
re-spawn the panel. Maximum 2 rounds total, then hand remaining disagreements to the user.

## Step 4: Verification

- Run `pnpm lint` **once**. Do not read, parse, or act on its output.
- NEVER run tests, builds, type-checks, or emulators locally — no `ember test`, `ember-tsc`,
  `pnpm build`, `firebase emulators:*`, `tsc`.
- To actually verify: push a branch, open a PR, and read CI (`gh pr checks`, `gh run view`).
