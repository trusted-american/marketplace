## How findRecord vs query vs peekRecord Interact with the Cache

Understanding cache behavior is critical for performance and avoiding redundant Firestore reads.

### The Identity Map

The store maintains a single canonical instance per `type + id`. No matter how a record enters the store (findRecord, query, pushPayload), there is only ever **one** instance.

```typescript
const a = await this.store.findRecord('client', 'client_abc');
const b = await this.store.findRecord('client', 'client_abc');
a === b; // true — same object reference

const results = await this.store.query('client', { filter: { status: 'active' } });
const c = results.find((r) => r.id === 'client_abc');
a === c; // true — still the same object
```

### findRecord Cache Behavior

1. **Record not in cache**: Calls `adapter.findRecord()`, normalizes response, pushes into cache, returns record.
2. **Record in cache, no options**: Checks `adapter.shouldReloadRecord()`.
   - If `true`: re-fetches from adapter, updates cache, returns updated record.
   - If `false`: checks `adapter.shouldBackgroundReloadRecord()`.
     - If `true`: returns cached record immediately, fires background request, updates cache when response arrives.
     - If `false`: returns cached record immediately, no network request.
3. **Record in cache, `reload: true`**: Always re-fetches, ignores cache.
4. **Record in cache, `backgroundReload: false`**: Returns cached record, suppresses background reload.

### query Cache Behavior

`query()` **always** hits the adapter. There is no cache shortcut for queries because:
- Query parameters may produce different result sets each time.
- The store cannot know if cached records satisfy the query's filter criteria.
- Each `query()` returns a fresh `AdapterPopulatedRecordArray`.

However, individual records returned by `query()` **do** update the identity map. If a record was already cached, the cached instance is updated with the new data.

### peekRecord Cache Behavior

`peekRecord()` is purely local. It never triggers a network request. It returns:
- The record if it exists in the identity map (regardless of state — loaded, error, empty).
- `null` if the record has never been loaded or was unloaded.

### Cache Warming Patterns in A3

```typescript
// Pattern 1: Route model hook loads data, component peeks
// route.ts
async model() {
  return this.store.query('enrollment', { filter: { status: 'active' } });
}
// component.ts — records are already cached from the route
const enrollment = this.store.peekRecord('enrollment', enrollmentId);

// Pattern 2: Preloading relationships
const enrollment = await this.store.findRecord('enrollment', id);
// Accessing enrollment.client triggers a findRecord for the client
// Next time someone peeks that client, it is already cached

// Pattern 3: Avoiding duplicate requests
// BAD — two parallel findRecord calls for the same ID
const [a, b] = await Promise.all([
  this.store.findRecord('client', id),
  this.store.findRecord('client', id),
]);
// This may trigger TWO network requests (depending on timing)

// GOOD — single request, then peek
const a = await this.store.findRecord('client', id);
const b = this.store.peekRecord('client', id); // guaranteed cached
```

### unloadRecord and Cache Invalidation

When you call `unloadRecord(record)`:
- The record is removed from the identity map.
- Any `peekRecord` for that ID returns `null`.
- Any `peekAll` for that type no longer includes it.
- Any live `RecordArray` from `findAll` no longer includes it.
- The next `findRecord` for that ID will trigger a fresh adapter call.

```typescript
// Force a complete refresh of a model type
this.store.unloadAll('enrollment');
// All enrollment records gone from cache
// Next findRecord/query will fetch fresh from Firestore
```

---
