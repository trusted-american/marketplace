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
