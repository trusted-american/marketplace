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
