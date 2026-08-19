## 10. @ember/runloop — Complete API

The Ember run loop batches DOM updates and executes work in a specific queue
order. Understanding it is critical for integrating with non-Ember async
operations and third-party libraries.

### 10.1 Queue Order

Ember processes queues in this order on every run loop turn:
1. **`sync`** — Binding synchronization (legacy)
2. **`actions`** — General work, action handlers
3. **`routerTransitions`** — Route transition work
4. **`render`** — Template re-rendering
5. **`afterRender`** — Post-render DOM work
6. **`destroy`** — Object teardown

### 10.2 `schedule(queueName, target, method, ...args)`

Schedule work into a specific queue of the current run loop iteration.

```typescript
import { schedule } from '@ember/runloop';

// Schedule DOM measurement after render
schedule('afterRender', this, function () {
  const height = this.element.offsetHeight;
  this.reportHeight(height);
});

// Schedule general work
schedule('actions', this, this.processData, arg1, arg2);
```

**When to use:** When you need to guarantee work runs after rendering (e.g.,
measuring DOM dimensions, setting scroll position, focusing elements).

### 10.3 `next(target, method, ...args)`

Schedule work for the NEXT run loop turn (not the current one).

```typescript
import { next } from '@ember/runloop';

next(this, function () {
  // Runs in the next run loop iteration
  this.doSomethingAfterCurrentFlush();
});
```

**When to use:** When you need to defer work until after the current run loop
completely finishes (all queues processed).

### 10.4 `later(target, method, ...args, delay)`

Schedule work after a delay (like `setTimeout` but run-loop aware).

```typescript
import { later } from '@ember/runloop';

// Auto-dismiss a notification after 5 seconds
const timer = later(this, function () {
  this.dismissNotification();
}, 5000);
```

Returns a timer handle that can be passed to `cancel()`.

### 10.5 `cancel(timer)`

Cancel a scheduled timer from `later`, `debounce`, `throttle`, or `next`.

```typescript
import { later, cancel } from '@ember/runloop';

export default class NotificationService extends Service {
  #dismissTimer: ReturnType<typeof later> | null = null;

  showNotification(message: string): void {
    // Cancel any existing timer
    if (this.#dismissTimer) {
      cancel(this.#dismissTimer);
    }
    this.message = message;
    this.#dismissTimer = later(this, this.dismiss, 5000);
  }

  dismiss(): void {
    this.message = null;
    this.#dismissTimer = null;
  }

  willDestroy(): void {
    super.willDestroy();
    if (this.#dismissTimer) {
      cancel(this.#dismissTimer);
    }
  }
}
```

### 10.6 `debounce(target, method, ...args, wait, immediate?)`

Coalesce rapid calls. Only the last invocation fires after `wait` ms of inactivity.

```typescript
import { debounce } from '@ember/runloop';

export default class SearchComponent extends Component {
  @action
  handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // Wait 300ms after the user stops typing before searching
    debounce(this, this.performSearch, value, 300);
  }

  performSearch(query: string): void {
    this.args.onSearch?.(query);
  }
}
```

**`immediate` flag:** If `true`, fires on the leading edge (first call) and
then ignores subsequent calls within the wait period.

### 10.7 `throttle(target, method, ...args, spacing, immediate?)`

Rate-limit calls. Fires at most once every `spacing` ms.

```typescript
import { throttle } from '@ember/runloop';

export default class ScrollTrackerComponent extends Component {
  @action
  handleScroll(event: Event): void {
    // Fire at most once every 100ms during scrolling
    throttle(this, this.reportScrollPosition, event, 100);
  }

  reportScrollPosition(event: Event): void {
    const target = event.target as HTMLElement;
    this.args.onScroll?.(target.scrollTop);
  }
}
```

### 10.8 `join(target, method, ...args)`

If a run loop is already active, schedule into it. If not, create a new one.

```typescript
import { join } from '@ember/runloop';

// Safe to call from non-Ember callbacks (e.g., WebSocket, third-party libraries)
websocket.onmessage = (event) => {
  join(this, function () {
    this.handleMessage(JSON.parse(event.data));
  });
};
```

**When to use:** When integrating with external event sources (WebSockets,
Firebase listeners, ResizeObserver callbacks, etc.) that fire outside the
Ember run loop.

### 10.9 `begin()` / `end()`

Manually open and close a run loop. Rarely needed — prefer `join()`.

```typescript
import { begin, end } from '@ember/runloop';

begin();
try {
  // Work inside a run loop
  this.updateState();
  this.triggerRender();
} finally {
  end();
}
```

---
