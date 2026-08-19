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
