---
name: ember-concurrency
description: ember-concurrency reference — task definitions, async patterns, cancellation, debouncing, and A3 usage patterns for form saves, data loading, and background operations
version: 0.1.0
---

# ember-concurrency Reference

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

## Task Modifiers — Exhaustive Detail

Task modifiers control what happens when `.perform()` is called while a previous instance is still running. Without a modifier, tasks are **concurrent** — every call runs simultaneously with no limit.

### default (no modifier) — Concurrent

All instances run simultaneously with no limit. Every `.perform()` creates a new TaskInstance that starts immediately.

```
Timeline: perform() called 3 times rapidly
─────────────────────────────────────────────
Instance 1: |==========|
Instance 2:   |==========|
Instance 3:     |==========|
─────────────────────────────────────────────
All three run in parallel. No instances are dropped or cancelled.
```

```typescript
// Every call runs — no concurrency management
concurrentTask = task(async (item: Item) => {
  await processItem(item);
});
```

**When to use:** Fire-and-forget operations where every call matters and order does not. Rare in practice — most tasks benefit from a modifier.

---

### .drop() — Ignores new performs while running

When a task instance is already running, any new `.perform()` calls are **immediately dropped**. The dropped TaskInstance has `isDropped: true` and never executes. Once the running instance completes, the next `.perform()` will start normally.

```
Timeline: perform() called 4 times; first is still running when 2-4 arrive
─────────────────────────────────────────────
Instance 1: |==============|              (runs to completion)
Instance 2:    X                          (dropped — ignored)
Instance 3:       X                       (dropped — ignored)
Instance 4:              X                (dropped — ignored)
Instance 5:                  |==========| (runs — instance 1 finished)
─────────────────────────────────────────────
```

```typescript
// Prevents double-submit on forms
saveTask = task(async () => {
  await this.args.model.save();
}).drop();
```

**When to use:** Form submissions, delete operations, any action where the user clicking multiple times should not trigger multiple server calls. This is the most common modifier in A3.

---

### .restartable() — Cancels running, starts new

When a new `.perform()` is called while an instance is running, the running instance is **cancelled** and the new one starts immediately. Only the most recent call ever runs to completion.

```
Timeline: perform() called 3 times; each cancels the previous
─────────────────────────────────────────────
Instance 1: |=====X                       (cancelled by instance 2)
Instance 2:       |=====X                 (cancelled by instance 3)
Instance 3:             |=============|   (runs to completion)
─────────────────────────────────────────────
X = cancelled at this point
```

```typescript
// Only the latest search matters — previous requests are cancelled
searchTask = task(async (query: string) => {
  await timeout(300); // Debounce
  return this.store.query('client', { filter: { search: query } });
}).restartable();
```

**When to use:** Search/autocomplete, typeahead, filtering, polling, or any scenario where only the most recent invocation matters. The 300ms `timeout()` debounce is a critical pattern — if the user types again within 300ms, the task restarts and the timeout resets, so the network request never fires until the user pauses.

---

### .enqueue() — Queues calls sequentially

When a new `.perform()` is called while an instance is running, the new instance is **queued** and waits. Once the running instance completes, the next queued instance starts. All calls eventually run, in order.

```
Timeline: perform() called 3 times rapidly
─────────────────────────────────────────────
Instance 1: |==========|                        (runs first)
Instance 2: [  queued  ]|==========|            (waits, then runs)
Instance 3: [     queued          ]|==========| (waits, then runs)
─────────────────────────────────────────────
All instances eventually execute, strictly in order.
```

```typescript
// Operations that must happen in sequence
processTask = task(async (item: Item) => {
  await processItem(item);
}).enqueue();
```

**When to use:** Sequential operations where order matters and every call must execute — file processing pipelines, ordered API calls, animation sequences.

---

### .keepLatest() — Keeps running + latest queued, drops middle

A hybrid of `.drop()` and `.enqueue()`. The currently running instance continues. If new `.perform()` calls arrive, only the **most recent** one is kept in the queue. Any calls between the running instance and the latest are dropped.

```
Timeline: perform() called 4 times; instance 1 is running
─────────────────────────────────────────────
Instance 1: |==============|                  (runs to completion)
Instance 2:    X                              (dropped)
Instance 3:       X                           (dropped)
Instance 4: [    queued    ]|=============|   (latest — kept and runs next)
─────────────────────────────────────────────
```

```typescript
// Polling: always finishes current fetch, then does one more with latest params
pollTask = task(async () => {
  const data = await fetchData();
  this.results = data;
}).keepLatest();
```

**When to use:** When you want to guarantee the running instance completes (unlike `.restartable()` which cancels it), but you only care about the latest queued call (unlike `.enqueue()` which runs all of them). Common for polling and refresh patterns.

---

### .maxConcurrency(n) — Limit concurrent instances

Limits the number of task instances that can run simultaneously. Can be combined with any other modifier to control what happens to instances beyond the limit.

```
Timeline: maxConcurrency(2) with .enqueue(); perform() called 4 times
─────────────────────────────────────────────
Instance 1: |==========|                       (runs — slot 1)
Instance 2: |==========|                       (runs — slot 2)
Instance 3: [  queued  ]|==========|           (waits for a slot, then runs)
Instance 4: [  queued  ]|==========|           (waits for a slot, then runs)
─────────────────────────────────────────────
```

```typescript
// Allow up to 3 concurrent uploads, queue the rest
uploadTask = task(async (file: File) => {
  await uploadFile(file);
}).enqueue().maxConcurrency(3);

// Allow up to 2 concurrent fetches, drop extras
fetchTask = task(async (id: string) => {
  return await this.store.findRecord('model', id);
}).drop().maxConcurrency(2);
```

**Combining with modifiers:**

| Combination | Behavior when at max |
|---|---|
| `.maxConcurrency(n)` (no modifier) | Queues excess (same as `.enqueue()`) |
| `.drop().maxConcurrency(n)` | Drops excess |
| `.enqueue().maxConcurrency(n)` | Queues excess |
| `.restartable().maxConcurrency(n)` | Cancels oldest running to make room |
| `.keepLatest().maxConcurrency(n)` | Keeps only latest in queue, drops middle |

---

## Task API — Complete Reference

Every task object created with `task(async () => { ... })` exposes these properties and methods.

### Methods

#### `perform(...args): TaskInstance`

Starts a new instance of the task. Returns a `TaskInstance` that can be awaited. Arguments are passed through to the task function.

```typescript
// Perform with no args
this.saveTask.perform();

// Perform with args
this.searchTask.perform('query string');

// Await the result
const result = await this.fetchTask.perform(id);
```

#### `cancelAll({ resetState?: boolean }): void`

Cancels all running and queued task instances. Optionally resets derived state (`isRunning`, `last`, etc.) back to initial values.

```typescript
// Cancel everything
this.saveTask.cancelAll();

// Cancel and reset state — isRunning becomes false, last becomes null, etc.
this.saveTask.cancelAll({ resetState: true });
```

### Properties — Derived State

All of these are reactive/tracked and can be used in templates or computed properties.

#### `isRunning: boolean`

`true` if any task instance is currently running. Use this for loading spinners and disabled states.

```typescript
this.saveTask.isRunning; // true while any instance is executing
```

#### `isQueued: boolean`

`true` if any task instance is queued (waiting to run). Only relevant when using `.enqueue()`, `.keepLatest()`, or `.maxConcurrency()`.

```typescript
this.uploadTask.isQueued; // true if instances are waiting for a concurrency slot
```

#### `isIdle: boolean`

`true` when no instances are running or queued. The inverse of `isRunning || isQueued`.

```typescript
this.saveTask.isIdle; // true when the task has nothing to do
```

#### `state: 'running' | 'queued' | 'idle'`

String representation of the current task state. Useful for switch statements or data-test attributes.

```typescript
this.saveTask.state; // 'idle', 'running', or 'queued'
```

#### `performCount: number`

The total number of times `.perform()` has been called on this task. Includes dropped, cancelled, and completed instances.

```typescript
this.saveTask.performCount; // e.g. 5
```

#### `last: TaskInstance | null`

The most recently created TaskInstance, regardless of its state. Could be running, finished, errored, or cancelled.

```typescript
this.saveTask.last;         // The most recent TaskInstance
this.saveTask.last?.value;  // The resolved value (if finished successfully)
this.saveTask.last?.error;  // The error (if errored)
```

#### `lastRunning: TaskInstance | null`

The most recent TaskInstance that is currently in a running state. Becomes `null` when that instance finishes.

```typescript
this.saveTask.lastRunning; // Currently running instance, or null
```

#### `lastPerformed: TaskInstance | null`

The most recent TaskInstance that was performed (started execution). Unlike `last`, this does not include dropped instances.

```typescript
this.saveTask.lastPerformed; // Most recent instance that actually started
```

#### `lastSuccessful: TaskInstance | null`

The most recent TaskInstance that completed successfully (resolved without error or cancellation). Extremely useful for displaying the last known good data.

```typescript
// Show last successful result while a new fetch is in progress
{{#if this.fetchTask.isRunning}}
  Loading... (showing stale data below)
{{/if}}
{{#if this.fetchTask.lastSuccessful}}
  {{this.fetchTask.lastSuccessful.value}}
{{/if}}
```

#### `lastComplete: TaskInstance | null`

The most recent TaskInstance that finished execution — either successfully or with an error. Does not include cancelled instances.

```typescript
this.saveTask.lastComplete; // Most recent finished instance (success OR error)
```

#### `lastErrored: TaskInstance | null`

The most recent TaskInstance that finished with an error (rejected). Use this to display error messages.

```typescript
{{#if this.saveTask.lastErrored}}
  <div class="alert alert-danger">
    Error: {{this.saveTask.lastErrored.error.message}}
  </div>
{{/if}}
```

#### `lastCanceled: TaskInstance | null`

The most recent TaskInstance that was cancelled (either explicitly or by a modifier like `.restartable()`).

```typescript
this.searchTask.lastCanceled; // Most recent cancelled instance
```

#### `lastIncomplete: TaskInstance | null`

The most recent TaskInstance that did not complete successfully — includes errored and cancelled instances.

```typescript
this.saveTask.lastIncomplete; // Most recent instance that failed or was cancelled
```

---

## TaskInstance API — Complete Reference

A `TaskInstance` is returned by `.perform()` and represents a single execution of a task. It implements a promise-like interface and can be awaited.

### Properties — State Flags

#### `value: T | null`

The resolved value of the task instance after it completes successfully. `null` before completion or if the task errored/was cancelled.

```typescript
const instance = this.fetchTask.perform(id);
await instance;
console.log(instance.value); // The return value of the task function
```

#### `error: Error | null`

The error thrown by the task instance, if it errored. `null` if the task succeeded, was cancelled, or is still running.

```typescript
const instance = this.saveTask.perform();
await instance.catch(() => {});
if (instance.error) {
  console.error('Save failed:', instance.error.message);
}
```

#### `isRunning: boolean`

`true` while the task instance is executing (has started but not finished, errored, or been cancelled).

#### `isFinished: boolean`

`true` after the task instance has completed in any way — success, error, or cancellation.

#### `isSuccessful: boolean`

`true` if the task instance completed successfully (resolved without error).

#### `isError: boolean`

`true` if the task instance finished with an error (the async function threw).

#### `isCanceled: boolean`

`true` if the task instance was cancelled — either explicitly via `.cancel()`, by a modifier (`.drop()`, `.restartable()`), or by component destruction.

#### `isDropped: boolean`

`true` if the task instance was dropped by the `.drop()` modifier before it ever started executing. A dropped instance has `isCanceled: true` and `hasStarted: false`.

```typescript
const instance = this.saveTask.perform(); // saveTask uses .drop()
if (instance.isDropped) {
  // This perform was ignored because another instance was already running
}
```

#### `hasStarted: boolean`

`true` after the task instance has begun execution (after the first line of the async function runs). `false` for queued or dropped instances that never started.

### Methods

#### `cancel(): void`

Cancels this specific task instance. The task function will stop at the next `await` point. Any `finally` blocks will run.

```typescript
const instance = this.longRunningTask.perform();
// Later...
instance.cancel();
```

#### `then(onFulfilled, onRejected): Promise`

TaskInstance implements the Thenable interface, so it can be awaited or chained with `.then()`.

```typescript
// Await syntax (preferred)
const result = await this.fetchTask.perform(id);

// Promise chain syntax
this.fetchTask.perform(id).then(
  (result) => console.log('Success:', result),
  (error) => console.log('Error:', error)
);
```

#### `catch(onRejected): Promise`

Catches errors from the task instance, just like `Promise.catch()`.

```typescript
await this.saveTask.perform().catch((error) => {
  if (!didCancel(error)) {
    // Only handle real errors, not cancellations
    this.handleError(error);
  }
});
```

#### `finally(onFinally): Promise`

Runs a callback when the task instance finishes, regardless of outcome. Like `Promise.finally()`.

```typescript
await this.saveTask.perform().finally(() => {
  this.isProcessing = false;
});
```

#### `retry(): TaskInstance`

Retries the task instance with the same arguments that were originally passed to `.perform()`. Returns a new TaskInstance.

```typescript
{{#if this.fetchTask.lastErrored}}
  <button {{on "click" this.fetchTask.lastErrored.retry}}>
    Retry
  </button>
{{/if}}
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

## TaskGroup — Coordinating Multiple Tasks

TaskGroups let multiple tasks share a single concurrency constraint. When tasks are in a group, the group's modifier and `maxConcurrency` apply across all tasks collectively.

### Defining a Task Group

```typescript
import Component from '@glimmer/component';
import { task, taskGroup } from 'ember-concurrency';

export default class MyComponent extends Component {
  // Define the group with a modifier
  operations = taskGroup().drop();

  // Tasks that belong to the group
  saveTask = task({ group: 'operations' }, async () => {
    await this.args.model.save();
  });

  deleteTask = task({ group: 'operations' }, async () => {
    this.args.model.deleteRecord();
    await this.args.model.save();
  });

  archiveTask = task({ group: 'operations' }, async () => {
    this.args.model.set('isArchived', true);
    await this.args.model.save();
  });
}
```

In the above example, if `saveTask` is running and the user clicks delete, the `deleteTask.perform()` will be dropped because the group uses `.drop()`. This prevents conflicting operations from running simultaneously.

### TaskGroup Properties

TaskGroups expose the same derived state as tasks:

```typescript
this.operations.isRunning;     // true if ANY task in the group is running
this.operations.isIdle;        // true if NO tasks in the group are running
this.operations.isQueued;      // true if any tasks are queued in the group
```

### When to Use TaskGroups

- **Multiple mutually exclusive actions** — save, delete, and archive buttons that should not overlap
- **Shared concurrency pools** — multiple upload tasks sharing a `maxConcurrency(3)` limit
- **Unified loading state** — a single `isRunning` check covers all related operations

```gts
<template>
  {{! Disable ALL action buttons when ANY operation is in progress }}
  <button disabled={{this.operations.isRunning}} {{on "click" this.saveTask.perform}}>
    Save
  </button>
  <button disabled={{this.operations.isRunning}} {{on "click" this.deleteTask.perform}}>
    Delete
  </button>
  <button disabled={{this.operations.isRunning}} {{on "click" this.archiveTask.perform}}>
    Archive
  </button>
</template>
```

---

## Utility Functions

ember-concurrency provides several utility functions that are essential for building robust async patterns.

### `timeout(ms): Promise`

Creates a **cancelable** delay. When the parent task is cancelled, the timeout is also cancelled — no lingering timers. This is the foundation for debouncing in `.restartable()` tasks.

```typescript
import { timeout } from 'ember-concurrency';

debounceTask = task(async (query: string) => {
  await timeout(300); // If task restarts within 300ms, this is cancelled
  return this.store.query('model', { filter: { search: query } });
}).restartable();
```

**Important:** Always use `timeout()` from ember-concurrency instead of `new Promise(resolve => setTimeout(resolve, ms))`. The ember-concurrency version is cancelable; a native setTimeout is not.

### `waitForProperty(object, property, callback?): Promise`

Waits for a tracked property on an object to change to a specific value or satisfy a callback. Cancelable.

```typescript
import { waitForProperty } from 'ember-concurrency';

setupTask = task(async () => {
  // Wait for a property to become a specific value
  await waitForProperty(this, 'isReady', true);

  // Wait for a property to satisfy a condition
  await waitForProperty(this, 'items.length', (len: number) => len > 0);

  // Now proceed with setup
  this.doSetup();
});
```

### `waitForEvent(object, eventName): Promise`

Waits for a DOM event or Ember event to fire. Returns the event object. Cancelable.

```typescript
import { waitForEvent } from 'ember-concurrency';

listenTask = task(async () => {
  while (true) {
    const event = await waitForEvent(window, 'resize');
    this.handleResize(event);
  }
}).restartable();
```

### `waitForQueue(queueName): Promise`

Waits for a specific Ember run loop queue to flush. Useful when you need to ensure DOM updates have been applied.

```typescript
import { waitForQueue } from 'ember-concurrency';

measureTask = task(async () => {
  // Update the tracked property (triggers a re-render)
  this.showElement = true;

  // Wait for the DOM to update
  await waitForQueue('afterRender');

  // Now safe to measure the DOM
  const el = document.querySelector('.my-element');
  this.elementHeight = el?.offsetHeight ?? 0;
});
```

### `animationFrame(): Promise`

Waits for the next `requestAnimationFrame`. Cancelable. Useful for smooth animations in tasks.

```typescript
import { animationFrame } from 'ember-concurrency';

animateTask = task(async () => {
  while (this.progress < 100) {
    await animationFrame();
    this.progress += 1;
  }
}).restartable();
```

### `rawTimeout(ms): Promise`

A **non-cancelable** timeout. Unlike `timeout()`, cancelling the parent task will not cancel a `rawTimeout`. The task will remain "alive" (not garbage collected) until the timeout completes. **Rarely needed** — use `timeout()` in almost all cases.

```typescript
import { rawTimeout } from 'ember-concurrency';

// Only use this if you specifically need the delay to survive task cancellation
specialTask = task(async () => {
  await rawTimeout(5000); // Cannot be cancelled
});
```

### `didCancel(error): boolean`

Checks if an error is a TaskCancelation. Use this to distinguish between real errors and cancellations when catching errors outside of a task.

```typescript
import { didCancel } from 'ember-concurrency';

try {
  await this.saveTask.perform();
} catch (error) {
  if (!didCancel(error)) {
    // This is a REAL error, not a cancellation
    this.handleError(error);
  }
  // If didCancel(error) is true, the task was simply cancelled — do nothing
}
```

---

## Cancellation Semantics — In Detail

Cancellation is the core superpower of ember-concurrency. Understanding how it works is essential.

### Structured Concurrency: Component Lifecycle

When a component is destroyed (user navigates away), **all tasks on that component are automatically cancelled**. This prevents the classic "set on destroyed object" error.

```typescript
export default class MyComponent extends Component {
  loadTask = task(async () => {
    const data = await this.store.query('model', { /* ... */ });
    // If the component was destroyed during the await above,
    // this line NEVER executes. No error, no side effects.
    this.results = data;
  });
}
```

Without ember-concurrency, you would need manual cleanup:

```typescript
// BAD — vanilla async. Can throw "set on destroyed object" error.
async loadData() {
  const data = await this.store.query('model', { /* ... */ });
  this.results = data; // BOOM if component is destroyed
}
```

### Linked Tasks: Parent-Child Cancellation

When a task yields (awaits) another task's `.perform()`, they become **linked**. Cancelling the parent automatically cancels the child.

```typescript
parentTask = task(async () => {
  // If parentTask is cancelled, childTask is also cancelled
  const result = await this.childTask.perform();
  // This line won't run if parentTask was cancelled
  this.processResult(result);
});

childTask = task(async () => {
  await timeout(5000);
  return await this.store.findAll('model');
});
```

### How Yield Points Work

Cancellation is **checked at each `await` point**. Between await points, the code runs synchronously and cannot be interrupted.

```typescript
myTask = task(async () => {
  console.log('1 - always runs');
  // <-- cancellation can happen here (await point)
  await timeout(100);
  console.log('2 - only runs if not cancelled during timeout');
  // <-- cancellation can happen here (await point)
  await this.store.findAll('model');
  console.log('3 - only runs if not cancelled during findAll');

  // Synchronous code between awaits cannot be interrupted:
  this.a = 1;
  this.b = 2; // If line above ran, this ALWAYS runs too
  this.c = 3; // Same — no cancellation between synchronous statements
});
```

### try/finally for Cleanup on Cancellation

Use `try/finally` to run cleanup code even when a task is cancelled. The `finally` block always runs.

```typescript
lockTask = task(async () => {
  this.isLocked = true;
  try {
    await this.performOperation();
  } finally {
    // This runs whether the task succeeded, errored, OR was cancelled
    this.isLocked = false;
  }
});
```

**Warning:** Do not `await` anything inside a `finally` block of a cancelled task. The task is already cancelled, so any new `await` will immediately throw a cancellation error.

```typescript
cleanupTask = task(async () => {
  try {
    await this.doWork();
  } finally {
    // WRONG — this await will fail if the task was cancelled
    // await this.cleanupOnServer();

    // RIGHT — use synchronous cleanup or fire-and-forget
    this.localCleanup();
  }
});
```

### Using didCancel() for External Error Handling

When you call `.perform()` from outside a task (e.g., in a route or test), cancellation errors propagate as rejections. Use `didCancel()` to filter them out.

```typescript
import { didCancel } from 'ember-concurrency';

// In a route or service (outside a task)
async performSave() {
  try {
    await this.component.saveTask.perform();
    this.flashMessages.success('Saved!');
  } catch (error) {
    if (!didCancel(error)) {
      // Real error — handle it
      this.flashMessages.danger('Save failed');
    }
    // Cancellation — ignore silently
  }
}
```

---

## Error Handling Patterns

### try/catch Inside Tasks

The most common pattern. Catch errors inside the task function itself.

```typescript
saveTask = task(async () => {
  try {
    await this.args.model.save();
    this.flashMessages.success('Saved');
    this.args.onSave?.();
  } catch (error) {
    this.flashMessages.danger('Save failed');
    // Optionally re-throw if you want lastErrored to be set
    throw error;
  }
}).drop();
```

**Note:** If you catch the error and do NOT re-throw it, the task instance is considered **successful** (`isSuccessful: true`). If you want `lastErrored` to reflect the failure, you must re-throw.

### Using .lastErrored for Displaying Errors

```typescript
saveTask = task(async () => {
  // No try/catch — let errors propagate
  await this.args.model.save();
  this.flashMessages.success('Saved');
}).drop();
```

```gts
<template>
  {{#if this.saveTask.lastErrored}}
    <div class="alert alert-danger" data-test-save-error>
      {{this.saveTask.lastErrored.error.message}}
    </div>
  {{/if}}

  <button
    {{on "click" this.saveTask.perform}}
    disabled={{this.saveTask.isRunning}}
  >
    {{#if this.saveTask.lastErrored}}
      Retry Save
    {{else}}
      Save
    {{/if}}
  </button>
</template>
```

### Difference Between Task Errors and Cancellation

Not all "rejections" are errors. Cancellation also causes rejection. Always distinguish them.

```typescript
import { didCancel } from 'ember-concurrency';

// Inside a task — cancellation does NOT hit catch blocks
myTask = task(async () => {
  try {
    await this.doWork();
  } catch (error) {
    // Cancellation does NOT arrive here inside a task.
    // Only real errors hit this catch block.
    this.handleError(error);
  }
});

// Outside a task — cancellation DOES hit catch blocks
async externalCaller() {
  try {
    await this.myTask.perform();
  } catch (error) {
    if (didCancel(error)) {
      // Task was cancelled — usually ignore
      return;
    }
    // Real error
    this.handleError(error);
  }
}
```

### Error Propagation to Parent Tasks

When a child task errors, the error propagates to the parent task (just like awaiting a rejected promise).

```typescript
parentTask = task(async () => {
  try {
    await this.childTask.perform(); // If child throws, error propagates here
  } catch (error) {
    // Handle error from child task
    this.flashMessages.danger('Child operation failed');
  }
});

childTask = task(async () => {
  throw new Error('Something went wrong');
});
```

### onError Callback

For tasks where you want a centralized error handler without try/catch:

```typescript
import { task } from 'ember-concurrency';

export default class MyComponent extends Component {
  saveTask = task(async () => {
    await this.args.model.save();
  }).drop();

  // Handle errors from any task perform
  handleSaveError = async () => {
    try {
      await this.saveTask.perform();
    } catch (error) {
      if (!didCancel(error)) {
        this.errorReporter.captureException(error);
        this.flashMessages.danger('An unexpected error occurred');
      }
    }
  };
}
```

---

## Testing Tasks

### Awaiting Task Completion with `settled()`

In tests, use `await settled()` from `@ember/test-helpers` to wait for all tasks to complete.

```typescript
import { settled, click, render } from '@ember/test-helpers';
import { module, test } from 'qunit';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it saves the model', async function (assert) {
    await render(hbs`<MyComponent @model={{this.model}} />`);

    await click('[data-test-save-button]');
    await settled(); // Waits for all tasks to finish

    assert.true(this.model.isSaved);
  });
});
```

### Testing .drop() Behavior

Verify that rapid clicks do not trigger multiple saves.

```typescript
test('.drop() prevents double submit', async function (assert) {
  let saveCount = 0;
  this.model.save = async () => {
    saveCount++;
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  await render(hbs`<MyComponent @model={{this.model}} />`);

  // Click rapidly 3 times
  await click('[data-test-save-button]');
  await click('[data-test-save-button]');
  await click('[data-test-save-button]');
  await settled();

  assert.strictEqual(saveCount, 1, 'Save was only called once despite 3 clicks');
});
```

### Testing .restartable() Behavior

Verify that only the last search executes.

```typescript
test('.restartable() cancels previous searches', async function (assert) {
  let queryLog: string[] = [];
  this.owner.lookup('service:store').query = async (_: string, opts: any) => {
    queryLog.push(opts.filter.search);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  };

  await render(hbs`<SearchComponent />`);

  await fillIn('[data-test-search-input]', 'ab');
  await fillIn('[data-test-search-input]', 'abc');
  await fillIn('[data-test-search-input]', 'abcd');
  await settled();

  // Only the last query should have completed
  // (previous ones were cancelled by .restartable())
  assert.strictEqual(queryLog.length, 1);
  assert.strictEqual(queryLog[0], 'abcd');
});
```

### Testing Cancellation

Verify that tasks clean up properly when the component is destroyed.

```typescript
test('tasks are cancelled on component destroy', async function (assert) {
  let wasCleanedUp = false;

  this.set('showComponent', true);

  // Component with a task that sets a flag in finally
  await render(hbs`
    {{#if this.showComponent}}
      <LongRunningComponent @onCleanup={{fn (mut this.cleanedUp) true}} />
    {{/if}}
  `);

  // Trigger the long-running task
  await click('[data-test-start-button]');

  // Destroy the component while the task is running
  this.set('showComponent', false);
  await settled();

  // The task's finally block should have run
  assert.true(this.cleanedUp);
});
```

### Controlling Timing with Timeout Stubs

For tests that use `timeout()`, you can control timing to avoid slow tests.

```typescript
import { timeout } from 'ember-concurrency';

test('debounced search waits for timeout', async function (assert) {
  // In test environment, timeouts resolve quickly via settled()
  await render(hbs`<SearchComponent />`);

  await fillIn('[data-test-search-input]', 'test query');
  await settled(); // settled() resolves pending timeouts in test mode

  assert.dom('[data-test-result]').exists();
});
```

---

## Common A3 Patterns — Expanded

### Form Save with .drop() — Prevent Double Submit

The most common pattern in A3. Prevents multiple submissions, shows loading state, handles errors with flash messages.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';
import type IntlService from 'ember-intl/services/intl';

interface Signature {
  Args: {
    model: Model;
    onSave?: () => void;
  };
}

export default class FormComponent extends Component<Signature> {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;

  saveTask = task(async () => {
    try {
      await this.args.model.save();
      this.flashMessages.success(this.intl.t('messages.saved'));
      this.args.onSave?.();
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.saveFailed'));
    }
  }).drop();
}
```

```gts
<template>
  <form {{on "submit" (prevent-default this.saveTask.perform)}}>
    {{! ...form fields... }}

    <button
      type="submit"
      disabled={{this.saveTask.isRunning}}
      class="btn btn-primary"
      data-test-save-button
    >
      {{#if this.saveTask.isRunning}}
        <span class="spinner-border spinner-border-sm" role="status"></span>
        {{t "buttons.saving"}}
      {{else}}
        {{t "buttons.save"}}
      {{/if}}
    </button>
  </form>
</template>
```

### Search with .restartable() + Timeout Debounce

Autocomplete/search pattern. Each keystroke restarts the task. The `timeout(300)` acts as a debounce — if the user types again within 300ms, the task restarts and the timeout resets, so no network request fires until the user pauses.

```typescript
import Component from '@glimmer/component';
import { task, timeout } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class SearchComponent extends Component {
  @service declare store: StoreService;
  @tracked results: Client[] = [];
  @tracked searchQuery = '';

  searchTask = task(async (event: Event) => {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;

    if (query.length < 2) {
      this.results = [];
      return;
    }

    await timeout(300); // Debounce — cancelled if task restarts

    this.results = await this.store.query('client', {
      filter: { search: query },
      page: { limit: 10 },
    });
  }).restartable();
}
```

```gts
<template>
  <input
    type="search"
    placeholder={{t "placeholders.search"}}
    value={{this.searchQuery}}
    {{on "input" this.searchTask.perform}}
    data-test-search-input
  />

  {{#if this.searchTask.isRunning}}
    <LoadingSpinner @small={{true}} />
  {{/if}}

  {{#each this.results as |client|}}
    <ClientCard @client={{client}} />
  {{/each}}

  {{#if (and this.searchTask.lastSuccessful (eq this.results.length 0))}}
    <p class="text-muted">{{t "messages.noResults"}}</p>
  {{/if}}
</template>
```

### Delete with Confirmation and Rollback

Delete pattern with soft-delete (deleteRecord + save) and rollback on error.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';

interface Signature {
  Args: {
    model: Model;
    returnRoute: string;
  };
}

export default class DeleteButtonComponent extends Component<Signature> {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;
  @service declare router: RouterService;

  deleteTask = task(async () => {
    this.args.model.deleteRecord();
    try {
      await this.args.model.save();
      this.flashMessages.success(this.intl.t('messages.deleted'));
      this.router.transitionTo(this.args.returnRoute);
    } catch (error) {
      this.args.model.rollbackAttributes();
      this.flashMessages.danger(this.intl.t('messages.deleteFailed'));
    }
  }).drop();
}
```

```gts
<template>
  <button
    type="button"
    class="btn btn-danger"
    disabled={{this.deleteTask.isRunning}}
    {{on "click" this.deleteTask.perform}}
    data-test-delete-button
  >
    {{#if this.deleteTask.isRunning}}
      <span class="spinner-border spinner-border-sm"></span>
      {{t "buttons.deleting"}}
    {{else}}
      {{t "buttons.delete"}}
    {{/if}}
  </button>
</template>
```

### Load Data on Component Init

Load data when a component is inserted. The task provides loading/error states for free.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';

interface Signature {
  Args: {
    clientId: string;
  };
}

export default class ClientDetailComponent extends Component<Signature> {
  @service declare store: StoreService;

  constructor(owner: unknown, args: Signature['Args']) {
    super(owner, args);
    this.loadTask.perform();
  }

  loadTask = task(async () => {
    return await this.store.findRecord('client', this.args.clientId, {
      include: 'contacts,addresses',
    });
  });
}
```

```gts
<template>
  {{#if this.loadTask.isRunning}}
    <LoadingSkeleton />
  {{else if this.loadTask.lastErrored}}
    <ErrorState
      @error={{this.loadTask.lastErrored.error}}
      @onRetry={{this.loadTask.perform}}
    />
  {{else if this.loadTask.lastSuccessful}}
    <ClientProfile @client={{this.loadTask.lastSuccessful.value}} />
  {{/if}}
</template>
```

### Polling with .restartable()

Periodically fetch fresh data. The `.restartable()` modifier ensures that if the component is re-rendered or the user triggers a manual refresh, the old polling loop is cancelled and a new one starts.

```typescript
import Component from '@glimmer/component';
import { task, timeout } from 'ember-concurrency';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class LiveDashboardComponent extends Component {
  @service declare store: StoreService;
  @tracked dashboardData: DashboardData | null = null;

  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.pollTask.perform();
  }

  pollTask = task(async () => {
    while (true) {
      try {
        this.dashboardData = await this.store.queryRecord('dashboard', {});
      } catch (error) {
        // Log but don't break the loop — keep polling
        console.error('Poll failed:', error);
      }
      await timeout(30000); // Poll every 30 seconds
    }
  }).restartable();

  // Manual refresh restarts the polling loop
  refreshTask = task(async () => {
    // Cancel the current poll loop and restart it
    this.pollTask.cancelAll();
    await this.pollTask.perform();
  }).drop();
}
```

### File Upload with Progress Tracking

Upload files with concurrency control and progress tracking.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

export default class FileUploadComponent extends Component {
  @tracked uploads: UploadFile[] = [];

  uploadFileTask = task(async (uploadFile: UploadFile) => {
    uploadFile.status = 'uploading';
    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadFile.progress = Math.round((event.loaded / event.total) * 100);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', '/api/uploads');
        xhr.send(formData);
      });

      uploadFile.status = 'complete';
      uploadFile.progress = 100;
    } catch (error) {
      uploadFile.status = 'error';
      throw error;
    }
  }).enqueue().maxConcurrency(3); // Upload up to 3 files at once, queue the rest
}
```

### Chained Tasks (Task A Calls Task B)

Tasks can call other tasks. Cancellation propagates through the chain.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';

export default class OrderComponent extends Component {
  @service declare store: StoreService;

  // High-level orchestration task
  submitOrderTask = task(async () => {
    const order = await this.validateOrderTask.perform();
    const payment = await this.processPaymentTask.perform(order);
    await this.confirmOrderTask.perform(order, payment);
    this.flashMessages.success('Order submitted!');
  }).drop();

  // If submitOrderTask is cancelled, all child tasks are also cancelled
  validateOrderTask = task(async () => {
    const errors = await this.args.order.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return this.args.order;
  });

  processPaymentTask = task(async (order: Order) => {
    return await this.store.createRecord('payment', {
      order,
      amount: order.total,
    }).save();
  });

  confirmOrderTask = task(async (order: Order, payment: Payment) => {
    order.set('payment', payment);
    order.set('status', 'confirmed');
    await order.save();
  });
}
```

---

## Performance Considerations

### Task Instance Memory

Tasks keep references to `last`, `lastSuccessful`, `lastErrored`, and other derived state. In long-lived components (e.g., a dashboard that polls every 30 seconds), old TaskInstances accumulate.

```typescript
// If this polls for hours, lastSuccessful, lastComplete, etc. all hold references
pollTask = task(async () => {
  while (true) {
    const data = await this.fetchData();
    this.results = data;
    await timeout(30000);
  }
}).restartable();
```

In practice, each derived state property only holds the **most recent** matching instance, so memory is bounded. However, if you are storing large payloads in task return values, consider extracting them to tracked properties instead:

```typescript
// BETTER — don't return large data from the task
@tracked results: Model[] = [];

loadTask = task(async () => {
  this.results = await this.store.findAll('model');
  // Return value is small or void
});
```

### Cleanup with cancelAll in willDestroy

Components with tasks are automatically cleaned up. However, if you use tasks on services or other long-lived objects, you need manual cleanup:

```typescript
import { registerDestructor } from '@ember/destroyable';

export default class MyService extends Service {
  constructor(owner: unknown) {
    super(owner);
    registerDestructor(this, () => {
      this.pollTask.cancelAll();
    });
  }

  pollTask = task(async () => {
    while (true) {
      await this.fetchData();
      await timeout(60000);
    }
  }).restartable();
}
```

### When NOT to Use Tasks

Not every async operation needs to be a task. Use plain `async/await` when:

- **One-off operations in routes** — Route model hooks already manage their own lifecycle
- **Simple service methods** — If you do not need derived state (isRunning, last, etc.) and the service outlives any UI concerns
- **Event handlers that cannot overlap** — If the function is called once and never again, a task adds overhead without benefit

```typescript
// FINE as a plain async method — no UI state needed
async validateEmail(email: string): Promise<boolean> {
  const response = await fetch(`/api/validate-email?email=${email}`);
  return response.ok;
}
```

Use a task when you need ANY of: cancellation, derived state, or concurrency control.

---

## Migration from async/await

### When to Use Task vs Plain Async Method

| Criterion | Use Task | Use async/await |
|---|---|---|
| Tied to component lifecycle | Yes | No |
| Need loading/error state in UI | Yes | No |
| Need to prevent double-submit | Yes | No |
| Need debouncing | Yes | No |
| Need to cancel on navigate | Yes | No |
| Simple one-off in a service | No | Yes |
| Route model hook | No | Yes |

### Converting Existing Async Methods to Tasks

**Before (plain async):**

```typescript
export default class MyComponent extends Component {
  @tracked isLoading = false;
  @tracked data: Model[] | null = null;
  @tracked error: Error | null = null;

  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.error = null;
    try {
      this.data = await this.store.findAll('model');
    } catch (e) {
      this.error = e as Error;
    } finally {
      this.isLoading = false; // BUG: can throw if component is destroyed
    }
  }
}
```

**After (task):**

```typescript
export default class MyComponent extends Component {
  @service declare store: StoreService;

  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.loadTask.perform();
  }

  loadTask = task(async () => {
    return await this.store.findAll('model');
  });

  // In template:
  // this.loadTask.isRunning      replaces this.isLoading
  // this.loadTask.lastSuccessful.value  replaces this.data
  // this.loadTask.lastErrored.error     replaces this.error
}
```

**Benefits of the conversion:**

1. **No manual isLoading state** — `loadTask.isRunning` is derived automatically
2. **No "set on destroyed object" error** — task cancels when component destroys
3. **No manual error tracking** — `loadTask.lastErrored` is derived automatically
4. **Free retry capability** — `loadTask.perform()` or `loadTask.lastErrored.retry()`
5. **Concurrency control available** — add `.restartable()` if the component's args change and you need to re-fetch

---

## Further Investigation

- **ember-concurrency Docs**: https://ember-concurrency.com/docs/introduction
- **Task Modifiers**: https://ember-concurrency.com/docs/task-concurrency
- **API Reference**: https://ember-concurrency.com/api/
- **TaskGroup Docs**: https://ember-concurrency.com/docs/task-groups
- **Testing Guide**: https://ember-concurrency.com/docs/testing-debugging
