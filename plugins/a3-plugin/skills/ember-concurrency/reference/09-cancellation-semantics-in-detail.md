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
