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
