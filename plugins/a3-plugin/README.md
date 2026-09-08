# A3 Plugin

Fullstack development agent for the A3 insurance platform. Orchestrates feature implementation
across Ember.js, Firebase/Firestore, and GCP Cloud Functions with deep codebase knowledge and a
targeted multi-agent review pass.

## Requirements

- Authenticated GitHub access to `trusted-american/a3` (private repo)
- Run `gh auth login` if not already authenticated
- A3 workspace available locally
- Optional: `CONTEXT7_API_KEY` for higher Context7 rate limits (see Documentation Sources)

## Configuration

Optional per-project settings, read from `.claude/a3-plugin.local.md` in the **A3 repo**
(not this one):

```markdown
---
lint: true
lint_command: pnpm lint
---
```

| Setting | Default | Effect |
|---------|---------|--------|
| `lint` | `false` | Whether `/review` runs the linter at all |
| `lint_command` | `pnpm lint` | Command used when lint is enabled |

Precedence, first match wins: `--lint`/`--no-lint` on the command → this file → default off.

Add `.claude/*.local.md` to the A3 repo's `.gitignore` — these settings are per-developer.

## Commands

| Command | Description |
|---------|------------|
| `/orchestrate <task>` | Full-ticket implementation — scopes fast, delegates to the specialists the task needs, one review pass |
| `/component <description>` | Standalone Glimmer GTS component specialist |
| `/route <description>` | Standalone route + GTS template specialist |
| `/model <description>` | Standalone Ember Data model + adapter + serializer specialist |
| `/function <description>` | Standalone Cloud Function specialist |
| `/test <description>` | Standalone QUnit test specialist |
| `/ability <description>` | Standalone permissions + Firestore rules specialist |
| `/integration <description>` | Cross-concern integration analysis and wiring |
| `/design-system <description>` | TAIA design system component specialist |
| `/example <what-to-find>` | Find real examples and conventions in the A3 codebase |
| `/review [files] [--lint]` | Review the diff with the specialists whose domains it actually touches |

## Agents

| Agent | Color | Role |
|-------|-------|------|
| `orchestrator` | Blue | Master coordinator — requirements, delegation, review orchestration |
| `component-writer` | Green | Glimmer GTS components, modifiers, helpers |
| `route-writer` | Cyan | Routes, GTS templates, controllers (when needed) |
| `model-writer` | Yellow | Ember Data models, adapters, serializers, transforms |
| `function-writer` | Magenta | Cloud Functions (triggers, HTTPS, PubSub) |
| `test-writer` | Red | QUnit acceptance, integration, and unit tests |
| `ability-writer` | Yellow | ember-can abilities + Firestore security rules |
| `integration-specialist` | Blue | Cross-concern wiring and data flow verification |
| `design-system-writer` | Green | TAIA design system compliance, component selection |
| `example-finder` | Cyan | Finds real A3 examples, verifies convention compliance with evidence |
| `code-reviewer` | Red | Final quality gate — conventions, security, performance |

## Pipeline

```
1. SCOPE           At most 3 questions, batched — skipped entirely for single-layer tasks
2. INVESTIGATE     Targeted grep + ranged reads, budget of 3 files
3. DELEGATE        Only the specialists whose layer the task touches:
                     Models → Functions + Abilities → Routes + Components + Design System → Integration → Tests
4. REVIEW          code-reviewer + at most 2 domain reviewers, reviewing the diff
5. ITERATE         2 rounds maximum, then the user decides
6. DELIVER         File manifest, manual steps, offer to open a PR
```

## Performance & Context Budget

The plugin is tuned to stay fast and cheap:

- **Skills are indexes, not dumps.** Oversized `SKILL.md` files were split into a small index
  plus `reference/` sections, so invoking a skill loads ~5KB instead of up to 69KB. Read the
  one reference file you need — never the directory.
- **Fan-out is bounded.** `/orchestrate` spawns only the layers the task touches and reviews
  with at most 3 agents; `/review` routes reviewers by changed path and caps the panel at 4.
- **Reviews read `git diff`, not whole files.** Agents use `grep -n` plus ranged `sed -n`
  reads and open at most 2 reference files per task.
- **One access check per run.** The GitHub gate lives in the command, not in every agent.

## Verification Policy

CI verifies; the plugin does not.

- Lint is **opt-in and off by default**. When enabled it is actually read, and failures
  are reported as a `LINT` tier below `CHANGES` — never as a blocker. See Configuration.
- Tests, builds, type-checks, and emulators are **never** run locally — no `ember test`,
  `ember-tsc`, `pnpm build`, `firebase emulators:*`.
- Tests are written, not run. To verify them: push a branch, open a PR, and read CI with
  `gh pr checks` / `gh run view`.

## Documentation Sources (MCP)

The plugin bundles two read-only documentation servers, used **only by `code-reviewer`**
during review. Writer agents do not get them — a stale doc answer costs a review comment,
not generated code.

| Server | Transport | Auth |
|--------|-----------|------|
| `context7` | Hosted HTTP (`mcp.context7.com`) | None. Set `CONTEXT7_API_KEY` for higher rate limits |
| `ember` | stdio (`npx -y ember-mcp`) | None |

Both are **optional**: if a server is unreachable the review completes using the plugin's
own skills and says so on its status line. Nothing prompts, blocks, or retries.

**A3 is not on latest.** Ember MCP answers for the current Ember release (7.x) while A3
runs 6.9, so `code-reviewer` is required to pin every lookup to the version in A3's
`package.json`, and the codebase outranks upstream "best practice" on any style question.
This guard is the point of the integration — without it, live docs make review worse.

The plugin never stores a secret. `CONTEXT7_API_KEY` is read from the environment via
`${CONTEXT7_API_KEY:-}` interpolation in `.mcp.json`:

```bash
# Windows
setx CONTEXT7_API_KEY "ctx7sk-..."
# macOS / Linux
export CONTEXT7_API_KEY="ctx7sk-..."
```

## Skills (Deep Knowledge)

| Skill | Depth |
|-------|-------|
| `a3-architecture` | Full A3 repo map, data flow, conventions |
| `ember-core` | Ember.js Octane — routing, services, reactivity, lifecycle |
| `glimmer-gts` | Glimmer components, GTS format, signatures, patterns |
| `ember-data-warp-drive` | WarpDrive store, models, adapters, serializers, relationships |
| `ember-cloud-firestore` | ember-cloud-firestore-adapter — queries, real-time, pagination |
| `firebase-gcp` | Firestore, Auth, Storage, Realtime DB, Admin SDK |
| `cloud-functions` | Cloud Functions v2 — all trigger types, integrations |
| `firestore-rules` | Security rules syntax, A3 helper functions, patterns |
| `auth-permissions` | Firebase Auth + ember-simple-auth + ember-can flow |
| `ember-concurrency` | Async tasks, debouncing, cancellation |
| `ember-intl` | Internationalization, ICU format, translation conventions |
| `xstate-statecharts` | XState 5 state machines for complex workflows |
| `tailwind-bootstrap` | Tailwind CSS 4 + Bootstrap 5 styling patterns |
| `qunit-testing` | QUnit, ember-qunit, qunit-dom, test helpers |
| `ember-addons` | All Ember addons used in A3 |
| `third-party-integrations` | Stripe, Mailgun, PandaDoc, Algolia, HubSpot, OpenAI |
| `ui-addons` | PDF, CSV, Excel, signatures, document preview |
| `taia-design-system` | All 88+ Ember GTS components, tokens, helpers, modifiers |
| `build-system` | Embroider, Vite, TypeScript, PWA |

## Templates

| Template | Purpose |
|----------|---------|
| `glimmer-component` | GTS component scaffold |
| `route-template` | Route + GTS template scaffold |
| `model` | Model + file/note variants scaffold |
| `cloud-function` | Firestore trigger / HTTPS endpoint scaffold |
| `qunit-test` | Acceptance / integration / unit test scaffold |
| `ability` | Ability + Firestore rules scaffold |
| `controller` | Controller scaffold (only when truly needed) |

## Access Control

This plugin requires authenticated GitHub access to the private `trusted-american/a3` repository. Commands verify access once at entry (spawned agents do not repeat the check):

```bash
gh api repos/trusted-american/a3 --jq '.full_name'
```

If you don't have access, contact your team lead for repository permissions.

## Install

Add to your Claude Code plugin configuration:

```json
{
  "plugins": ["./plugins/a3-plugin"]
}
```
