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
