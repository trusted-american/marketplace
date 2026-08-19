# A3 Plugin

Fullstack development agent for the A3 insurance platform. Orchestrates feature implementation
across Ember.js, Firebase/Firestore, and GCP Cloud Functions with deep codebase knowledge and a
targeted multi-agent review pass.

## Requirements

- Authenticated GitHub access to `trusted-american/a3` (private repo)
- Run `gh auth login` if not already authenticated
- A3 workspace available locally

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
| `/review [files]` | Review the diff with the specialists whose domains it actually touches |

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

- After writing code, agents run `pnpm lint` **once** and ignore its output.
- Tests, builds, type-checks, and emulators are **never** run locally — no `ember test`,
  `ember-tsc`, `pnpm build`, `firebase emulators:*`.
- Tests are written, not run. To verify them: push a branch, open a PR, and read CI with
  `gh pr checks` / `gh run view`.

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
