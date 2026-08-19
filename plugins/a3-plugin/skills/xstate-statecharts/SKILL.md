---
name: xstate-statecharts
description: XState 5 and ember-statechart-component reference — state machine patterns for complex UI workflows in A3
version: 0.1.0
---


# XState & Statecharts Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-xstate-5-core-concepts.md` | 1. XState 5 Core Concepts |
| `reference/03-actions.md` | 2. Actions |
| `reference/04-guards-conditional-transitions.md` | 3. Guards (Conditional Transitions) |
| `reference/05-invoked-actors-and-services.md` | 4. Invoked Actors and Services |
| `reference/06-delayed-transitions.md` | 5. Delayed Transitions |
| `reference/07-parallel-states.md` | 6. Parallel States |
| `reference/08-history-states.md` | 7. History States |
| `reference/09-ember-statechart-component-integration.md` | 8. ember-statechart-component Integration |
| `reference/10-a3-use-cases.md` | 9. A3 Use Cases |
| `reference/11-testing-statecharts.md` | 10. Testing Statecharts |
| `reference/12-stately-ai-visual-editor.md` | 11. Stately.ai Visual Editor |
| `reference/13-typescript-typing.md` | 12. TypeScript Typing |

## Overview

A3 uses XState 5 with ember-statechart-component for managing complex UI state machines. This is used for multi-step workflows, form wizards, and complex interaction patterns. Statecharts are an extension of finite state machines that add hierarchy (nested states), orthogonality (parallel states), and history, making them suitable for modeling real-world application behavior that would be unwieldy with simple boolean flags or enum-based state tracking.

This reference covers the full XState 5 API surface, integration with Ember/Glimmer via ember-statechart-component, A3-specific patterns, testing strategies, and TypeScript typing.

---
## Further Reading

- **XState v5 Docs**: https://stately.ai/docs
- **ember-statechart-component**: https://github.com/NullVoxPopuli/ember-statechart-component
- **Stately Visual Editor**: https://stately.ai/editor
- **XState TypeScript Guide**: https://stately.ai/docs/typescript
- **Statecharts (original paper concept)**: https://statecharts.dev
- **@statelyai/inspect**: https://stately.ai/docs/inspector
