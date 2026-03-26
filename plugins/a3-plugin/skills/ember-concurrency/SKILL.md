---
name: ember-concurrency
description: ember-concurrency reference — task definitions, async patterns, cancellation, debouncing, and A3 usage patterns for form saves, data loading, and background operations
version: 0.1.0
---

# ember-concurrency Reference

## Overview

ember-concurrency provides structured async primitives for Ember. A3 uses it extensively for form saves, data loading, and any async operation in components. Version: 5.x

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

## Task Properties

```typescript
this.saveTask.isRunning;     // true while task is executing
this.saveTask.isIdle;        // true when not running
this.saveTask.last;          // Last TaskInstance
this.saveTask.lastSuccessful; // Last successful TaskInstance
this.saveTask.performCount;  // Number of times performed
```

## Task Modifiers

### drop() — Ignores new calls while running
```typescript
// Great for form submits — prevents double-submit
saveTask = task(async () => {
  await this.args.model.save();
}).drop();
```

### restartable() — Cancels running, starts new
```typescript
// Great for search/autocomplete — only latest matters
searchTask = task(async (query: string) => {
  await timeout(300); // Debounce
  return this.store.query('client', { filter: { search: query } });
}).restartable();
```

### enqueue() — Queues calls sequentially
```typescript
// Great for operations that must run in order
processTask = task(async (item: Item) => {
  await processItem(item);
}).enqueue();
```

### keepLatest() — Keeps running + latest queued
```typescript
// Compromise between drop and restartable
pollTask = task(async () => {
  const data = await fetchData();
  this.results = data;
}).keepLatest();
```

## Using Tasks in Templates

```gts
<template>
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

## Common A3 Patterns

### Form Save Pattern
```typescript
saveTask = task(async () => {
  try {
    await this.args.model.save();
    this.flashMessages.success(this.intl.t('messages.saved'));
    this.args.onSave?.();
  } catch (error) {
    this.flashMessages.danger(this.intl.t('messages.saveFailed'));
  }
}).drop();
```

### Delete with Confirmation
```typescript
deleteTask = task(async () => {
  this.args.model.deleteRecord();
  try {
    await this.args.model.save();
    this.flashMessages.success(this.intl.t('messages.deleted'));
    this.router.transitionTo('authenticated.clients');
  } catch (error) {
    this.args.model.rollbackAttributes();
    this.flashMessages.danger(this.intl.t('messages.deleteFailed'));
  }
}).drop();
```

### Search/Autocomplete Pattern
```typescript
searchTask = task(async (event: Event) => {
  const query = (event.target as HTMLInputElement).value;
  if (query.length < 2) {
    this.results = [];
    return;
  }
  await timeout(300); // Debounce 300ms
  this.results = await this.store.query('client', {
    filter: { search: query },
    page: { limit: 10 },
  });
}).restartable();
```

### Load Data on Init
```typescript
import { task } from 'ember-concurrency';

export default class MyComponent extends Component {
  constructor(owner: unknown, args: Signature['Args']) {
    super(owner, args);
    this.loadTask.perform();
  }

  loadTask = task(async () => {
    this.data = await this.store.query('model', { ... });
  });
}
```

## Timeout Utility
```typescript
import { timeout } from 'ember-concurrency';

myTask = task(async () => {
  await timeout(1000); // Wait 1 second
  // Continue...
});
```

## Cancellation
Tasks are automatically cancelled when the component is destroyed. This prevents "set on destroyed object" errors.

```typescript
// This is safe — if user navigates away during save,
// the task is cancelled and no post-save logic runs
saveTask = task(async () => {
  await this.args.model.save();
  // This won't run if component was destroyed
  this.flashMessages.success('Saved!');
});
```

## Further Investigation

- **ember-concurrency Docs**: https://ember-concurrency.com/docs/introduction
- **Task Modifiers**: https://ember-concurrency.com/docs/task-concurrency
- **API Reference**: https://ember-concurrency.com/api/
