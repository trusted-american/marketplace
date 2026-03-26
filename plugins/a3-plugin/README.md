# A3 Plugin

Fullstack development agent for the A3 insurance platform. Orchestrates feature implementation across Ember.js, Firebase/Firestore, and GCP Cloud Functions with deep codebase knowledge and round-robin multi-agent review.

## Requirements

- Authenticated GitHub access to `trusted-american/a3` (private repo)
- Run `gh auth login` if not already authenticated
- A3 workspace available locally

## Commands

| Command | Description |
|---------|------------|
| `/orchestrate <task>` | Full-ticket implementation — asks questions, delegates to specialists, round-robin review |
| `/component <description>` | Standalone Glimmer GTS component specialist |
| `/route <description>` | Standalone route + GTS template specialist |
| `/model <description>` | Standalone Ember Data model + adapter + serializer specialist |
| `/function <description>` | Standalone Cloud Function specialist |
| `/test <description>` | Standalone QUnit test specialist |
| `/ability <description>` | Standalone permissions + Firestore rules specialist |
| `/integration <description>` | Cross-concern integration analysis and wiring |
| `/design-system <description>` | TAIA design system component specialist |
| `/example <what-to-find>` | Find real examples and conventions in the A3 codebase |
| `/review [files]` | Round-robin review of all changes by every specialist agent |

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
1. REQUIREMENTS    User describes task → orchestrator asks deep questions
2. DISCOVERY       example-finder searches A3 for similar patterns, counts conventions
3. DECOMPOSITION   Break task into work items per specialist
4. IMPLEMENTATION  Agents write code in dependency order (grounded in real examples):
                     Models → Functions + Abilities → Routes + Components + Design System → Integration → Tests
5. ROUND-ROBIN     Every agent reviews every other agent's output
6. ITERATION       Fix issues until ALL agents vote APPROVE
7. DELIVERY        Present file manifest, write to repo
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

This plugin requires authenticated GitHub access to the private `trusted-american/a3` repository. Every command verifies access before proceeding:

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
