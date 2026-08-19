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
