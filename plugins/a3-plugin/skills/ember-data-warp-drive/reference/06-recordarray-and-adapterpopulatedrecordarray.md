## RecordArray and AdapterPopulatedRecordArray

### RecordArray

Returned by `findAll()` and `peekAll()`. It is a **live** array that auto-updates as records enter or leave the store.

```typescript
const allClients = this.store.peekAll('client');
// allClients.length updates automatically

// Iterating
allClients.forEach((client) => { /* ... */ });

// Filtering locally
const activeClients = allClients.filter((c) => c.status === 'active');

// It is iterable
for (const client of allClients) { /* ... */ }
```

Properties:
- `length` — number of records
- `isUpdating` — `true` while a background reload is in flight
- `isLoaded` — `true` once the initial load has completed

### AdapterPopulatedRecordArray

Returned by `query()`. Unlike `RecordArray`, it is **not** live. It represents the snapshot of records returned by that specific query.

```typescript
const results = await this.store.query('enrollment', {
  filter: { status: 'active' },
  page: { limit: 25 },
});
```

Properties:
- `length` — number of records in this page
- `meta` — metadata object from the adapter/serializer response
- `isLoaded` — always `true` after the promise resolves
- `links` — links object (for pagination URLs if applicable)

### Pagination with meta

A3 uses the **n+1 pattern**: the adapter requests `limit + 1` records. If it gets more than `limit` back, `meta.hasMore` is `true` and the extra record is discarded from the result set.

```typescript
const page1 = await this.store.query('enrollment', {
  filter: { status: 'active' },
  page: { limit: 25, offset: 0 },
});

if (page1.meta.hasMore) {
  const page2 = await this.store.query('enrollment', {
    filter: { status: 'active' },
    page: { limit: 25, offset: 25 },
  });
}
```

The `meta` property can carry any data the serializer injects:
```typescript
// Accessing meta
results.meta.hasMore;   // boolean
results.meta.total;     // number (if provided by adapter)
```

---
