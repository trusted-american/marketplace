---
name: ember-concurrency
description: ember-concurrency reference — task definitions, async patterns, cancellation, debouncing, and A3 usage patterns for form saves, data loading, and background operations
version: 0.1.0
---


# ember-concurrency Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/03-task-modifiers-exhaustive-detail.md` | Task Modifiers — Exhaustive Detail |
| `reference/04-task-api-complete-reference.md` | Task API — Complete Reference |
| `reference/05-taskinstance-api-complete-reference.md` | TaskInstance API — Complete Reference |
| `reference/07-taskgroup-coordinating-multiple-tasks.md` | TaskGroup — Coordinating Multiple Tasks |
| `reference/08-utility-functions.md` | Utility Functions |
| `reference/09-cancellation-semantics-in-detail.md` | Cancellation Semantics — In Detail |
| `reference/10-error-handling-patterns.md` | Error Handling Patterns |
| `reference/11-testing-tasks.md` | Testing Tasks |
| `reference/12-common-a3-patterns-expanded.md` | Common A3 Patterns — Expanded |
| `reference/13-performance-considerations.md` | Performance Considerations |
| `reference/14-migration-from-async-await.md` | Migration from async/await |

## Overview

ember-concurrency provides structured async primitives for Ember. A3 uses it extensively for form saves, data loading, and any async operation in components. Version: 5.x

Tasks are generator-like async functions that provide:

- **Derived state** — `isRunning`, `isIdle`, `last`, etc. automatically track task lifecycle
- **Concurrency control** — `.drop()`, `.restartable()`, `.enqueue()`, `.keepLatest()` manage overlapping calls
- **Structured cancellation** — tasks cancel when their host component is destroyed, preventing "set on destroyed object" errors
- **Composability** — tasks can call other tasks, and cancellation propagates through the chain

---
## Basic Task Definition

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';

export default class MyComponent extends Component {
  @service declare store: StoreService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  saveTask = task(async () => {
    try {
      await this.args.model.save();
      this.flashMessages.success('Saved successfully');
    } catch (error) {
      this.flashMessages.danger('Failed to save');
    }
  });
}
```

Tasks accept arguments just like regular functions:

```typescript
fetchRecordTask = task(async (id: string) => {
  return await this.store.findRecord('client', id);
});

// Perform with arguments
this.fetchRecordTask.perform('abc-123');
```

---
## Using Tasks in Templates

### Performing Tasks

Use `{{perform}}` helper or call `.perform` directly with the `{{on}}` modifier:

```gts
<template>
  {{! Direct .perform reference — works with {{on}} modifier }}
  <button
    type="button"
    disabled={{this.saveTask.isRunning}}
    {{on "click" this.saveTask.perform}}
    data-test-save-button
  >
    {{#if this.saveTask.isRunning}}
      <span class="spinner-border spinner-border-sm"></span>
      Saving...
    {{else}}
      Save
    {{/if}}
  </button>
</template>
```

### Displaying Last Result

```gts
<template>
  {{#if this.fetchTask.isRunning}}
    <LoadingSpinner />
  {{/if}}

  {{#if this.fetchTask.lastSuccessful}}
    <ResultsList @results={{this.fetchTask.lastSuccessful.value}} />
  {{/if}}

  {{#if this.fetchTask.lastErrored}}
    <div class="alert alert-danger">
      {{this.fetchTask.lastErrored.error.message}}
    </div>
  {{/if}}
</template>
```

### Showing Last Value While Loading New Data

A powerful pattern: show the last successful result while a new fetch is in progress, avoiding blank-screen flickers.

```gts
<template>
  {{#let this.fetchTask.lastSuccessful.value as |data|}}
    {{#if data}}
      <div class={{if this.fetchTask.isRunning "opacity-50"}}>
        <ResultsList @results={{data}} />
      </div>
    {{/if}}
  {{/let}}

  {{#if this.fetchTask.isRunning}}
    <div class="text-center">
      <LoadingSpinner @small={{true}} />
    </div>
  {{/if}}
</template>
```

---
## Further Investigation

- **ember-concurrency Docs**: https://ember-concurrency.com/docs/introduction
- **Task Modifiers**: https://ember-concurrency.com/docs/task-concurrency
- **API Reference**: https://ember-concurrency.com/api/
- **TaskGroup Docs**: https://ember-concurrency.com/docs/task-groups
- **Testing Guide**: https://ember-concurrency.com/docs/testing-debugging
