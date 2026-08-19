## Query Syntax — Exhaustive Reference

### Filter Operators

#### Equality (`==`)
```typescript
// Implicit equality — just pass the value directly
this.store.query('enrollment', {
  filter: {
    status: 'active',
  },
});
// → where('status', '==', 'active')

// Multiple equality filters create compound AND queries
this.store.query('enrollment', {
  filter: {
    status: 'active',
    agencyId: 'agency_abc',
    type: 'individual',
  },
});
// → where('status', '==', 'active')
//   .where('agencyId', '==', 'agency_abc')
//   .where('type', '==', 'individual')
```

#### Not Equal (`$ne` / `!=`)
```typescript
this.store.query('enrollment', {
  filter: {
    status: { $ne: 'cancelled' },
  },
});
// → where('status', '!=', 'cancelled')
// NOTE: != queries exclude documents where the field does not exist
```

#### Less Than (`$lt` / `<`)
```typescript
this.store.query('enrollment', {
  filter: {
    premium: { $lt: 500 },
  },
});
// → where('premium', '<', 500)
```

#### Less Than or Equal (`$lte` / `<=`)
```typescript
this.store.query('enrollment', {
  filter: {
    premium: { $lte: 500 },
  },
});
// → where('premium', '<=', 500)
```

#### Greater Than (`$gt` / `>`)
```typescript
this.store.query('enrollment', {
  filter: {
    premium: { $gt: 100 },
  },
});
// → where('premium', '>', 100)
```

#### Greater Than or Equal (`$gte` / `>=`)
```typescript
this.store.query('enrollment', {
  filter: {
    createdAt: { $gte: new Date('2024-01-01') },
  },
});
// → where('createdAt', '>=', Timestamp.fromDate(new Date('2024-01-01')))
```

#### In Array (`$in`)
```typescript
// Match any of the provided values (up to 30 values max)
this.store.query('enrollment', {
  filter: {
    status: { $in: ['active', 'pending', 'review'] },
  },
});
// → where('status', 'in', ['active', 'pending', 'review'])
// LIMIT: Firestore allows a maximum of 30 values in an 'in' clause.
// If you need more, split into multiple queries and merge results.
```

#### Not In (`$nin`)
```typescript
this.store.query('enrollment', {
  filter: {
    status: { $nin: ['cancelled', 'expired'] },
  },
});
// → where('status', 'not-in', ['cancelled', 'expired'])
// LIMIT: Maximum 10 values. Also excludes docs where the field does not exist.
```

#### Array Contains (`$contains`)
```typescript
// For fields that are arrays — checks if the array CONTAINS the value
this.store.query('client', {
  filter: {
    tags: { $contains: 'vip' },
  },
});
// → where('tags', 'array-contains', 'vip')
// Only ONE array-contains filter per query is allowed.
```

#### Array Contains Any (`$containsAny`)
```typescript
this.store.query('client', {
  filter: {
    tags: { $containsAny: ['vip', 'priority', 'enterprise'] },
  },
});
// → where('tags', 'array-contains-any', ['vip', 'priority', 'enterprise'])
// LIMIT: Maximum 30 values. Only ONE array-contains-any per query.
// Cannot combine with 'in' or 'not-in' in the same query.
```

### Compound Query Limitations

Firestore imposes specific constraints on compound queries:

1. **Range filters on a single field only**: You cannot use `>`, `>=`, `<`, `<=`, `!=` on more than one field in the same query. This requires a composite index.
   ```typescript
   // INVALID — range on two different fields:
   this.store.query('enrollment', {
     filter: {
       premium: { $gte: 100 },
       createdAt: { $gte: someDate },  // ERROR: range on second field
     },
   });

   // VALID — range on one field, equality on others:
   this.store.query('enrollment', {
     filter: {
       status: 'active',              // equality — fine
       agencyId: 'agency_abc',        // equality — fine
       createdAt: { $gte: someDate }, // single range — fine
     },
   });
   ```

2. **Cannot combine `array-contains` with `array-contains-any`** in the same query.

3. **Cannot combine `in`, `not-in`, and `array-contains-any`** — only one of these disjunctive operators per query.

4. **`!=` and `not-in` count as range operators** for the purposes of the single-range-field restriction.

5. **orderBy must match inequality field**: If you filter with a range operator on field X, the first `orderBy` must also be on field X.

### Sorting

```typescript
// Ascending (default)
this.store.query('client', {
  filter: { status: 'active' },
  sort: 'lastName',
});
// → orderBy('lastName', 'asc')

// Descending (prefix with -)
this.store.query('client', {
  filter: { status: 'active' },
  sort: '-createdAt',
});
// → orderBy('createdAt', 'desc')

// Multiple sort fields — pass an array
this.store.query('enrollment', {
  filter: { status: 'active' },
  sort: ['-createdAt', 'clientName'],
});
// → orderBy('createdAt', 'desc').orderBy('clientName', 'asc')
// IMPORTANT: Multi-field sorts almost always require a composite index.
```

### Pagination — A3's n+1 Pattern in Detail

```typescript
// First page
const page1 = await this.store.query('client', {
  filter: { status: 'active' },
  sort: '-createdAt',
  page: {
    limit: 25,    // Requested page size
    offset: 0,    // Starting position (0 for first page)
  },
});
console.log(page1.meta.hasMore); // true if more pages exist

// Subsequent pages
const page2 = await this.store.query('client', {
  filter: { status: 'active' },
  sort: '-createdAt',
  page: {
    limit: 25,
    offset: 25,    // Skip first 25 records
  },
});
```

**Internal Mechanics of the n+1 Pattern:**

1. The adapter receives `page.limit = 25`
2. It sends `limit(26)` to Firestore (requests one extra)
3. Firestore returns up to 26 DocumentSnapshots
4. The serializer checks: did we get 26 back?
   - **YES (26 returned)**: Set `meta.hasMore = true`, discard the 26th record, return 25
   - **NO (25 or fewer returned)**: Set `meta.hasMore = false`, return all records
5. The store attaches `meta` to the RecordArray returned to the caller
6. Components can check `results.meta.hasMore` to show/hide a "Load More" button

**Why not use Firestore's cursor-based pagination?** Firestore natively supports `startAfter(lastDoc)` for cursor-based pagination. The n+1 pattern wraps this to provide offset-based pagination semantics that are simpler for UI components. The adapter translates `offset` values to cursor positions internally by tracking the last document snapshot.

**Why not use Firestore count aggregation?** Firestore's `countQuery` still reads every matching document for billing. The n+1 pattern uses only 1 extra read total (not per-page) to determine if another page exists.

---
