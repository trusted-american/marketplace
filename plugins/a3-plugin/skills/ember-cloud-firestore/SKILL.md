---
name: ember-cloud-firestore
description: Deep ember-cloud-firestore-adapter reference — how A3 bridges Ember Data/WarpDrive with Cloud Firestore for real-time document access
version: 0.1.0
---

# ember-cloud-firestore-adapter Reference

## Overview

`ember-cloud-firestore-adapter` is the bridge between Ember Data (WarpDrive) and Cloud Firestore. It allows A3 to use Ember Data's store API while reading/writing directly to Firestore.

**Package**: `ember-cloud-firestore-adapter` v4.3.2
**Repo**: https://github.com/nickersk/ember-cloud-firestore-adapter

## How It Works

### Adapter Layer
```
Ember Store → CloudFirestoreAdapter → Firebase SDK → Cloud Firestore
```

The adapter translates Ember Data operations to Firestore operations:

| Store Method | Firestore Operation |
|-------------|-------------------|
| `store.findRecord('model', id)` | `doc(collection, id).get()` |
| `store.findAll('model')` | `collection(name).get()` |
| `store.query('model', query)` | `collection(name).where(...).get()` |
| `record.save()` (new) | `doc(collection, id).set(data)` |
| `record.save()` (existing) | `doc(collection, id).update(data)` |
| `record.deleteRecord()` + `save()` | `doc(collection, id).delete()` |

### Serializer Layer
```
Firestore Document → CloudFirestoreSerializer → Ember Data Record
```

The serializer transforms Firestore document snapshots into JSON:API format that Ember Data understands.

## A3's Application Adapter

```typescript
// app/adapters/application.ts
import CloudFirestoreAdapter from 'ember-cloud-firestore-adapter/adapters/cloud-firestore';

export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // Custom ID generation
  // A3 uses a prefix pattern: modelName_uuid
  // e.g., client_abc123, enrollment_def456
  generateIdForRecord(store: Store, type: string): string {
    return `${type}_${crypto.randomUUID().replace(/-/g, '')}`;
  }
}
```

## Query Syntax

### Basic Filtering
```typescript
// Equality
this.store.query('enrollment', {
  filter: {
    status: 'active',
  },
});
// → Firestore: where('status', '==', 'active')

// Multiple filters (AND)
this.store.query('enrollment', {
  filter: {
    status: 'active',
    agencyId: 'agency_abc',
  },
});
// → Firestore: where('status', '==', 'active').where('agencyId', '==', 'agency_abc')
```

### Advanced Filtering
```typescript
// Inequality
this.store.query('enrollment', {
  filter: {
    createdAt: { $gte: new Date('2024-01-01') },
  },
});

// In array
this.store.query('enrollment', {
  filter: {
    status: { $in: ['active', 'pending'] },
  },
});

// Array contains
this.store.query('client', {
  filter: {
    tags: { $contains: 'vip' },
  },
});
```

### Pagination (A3's n+1 Pattern)
```typescript
const results = await this.store.query('client', {
  filter: { status: 'active' },
  page: {
    limit: 25,   // Requested page size
    offset: 0,   // Starting position
  },
});

// The adapter actually fetches 26 records (n+1)
// If 26 come back → hasMore = true, returns first 25
// If ≤25 come back → hasMore = false, returns all
console.log(results.meta.hasMore); // boolean
```

### Sorting
```typescript
this.store.query('client', {
  filter: { status: 'active' },
  sort: 'lastName',        // Ascending
  // sort: '-createdAt',   // Descending (prefix with -)
});
```

## Relationships in Firestore

### belongsTo → Document Reference
When a model has `@belongsTo('agency')`, the Firestore document stores a reference:
```json
{
  "name": "John Doe",
  "agency": "/agencies/agency_abc"  // Document reference
}
```

The adapter resolves this reference when the relationship is accessed.

### hasMany → Subcollection
When a model has `@hasMany('client-note')`, the adapter looks for a subcollection:
```
clients/
  client_abc/
    notes/            ← subcollection queried for hasMany
      note_001
      note_002
```

### hasMany → Reference Array
Alternatively, hasMany can use an array of references in the parent document:
```json
{
  "name": "John Doe",
  "tags": ["/tags/tag_001", "/tags/tag_002"]
}
```

## Real-Time Updates

The adapter can set up real-time listeners on Firestore documents:

```typescript
// When you call findRecord, the adapter can optionally listen for changes
const client = await this.store.findRecord('client', 'client_abc');
// If real-time is enabled, any server-side changes to this document
// will automatically update the Ember Data record and trigger re-renders
```

### How Real-Time Works
1. `findRecord()` or `query()` establishes a Firestore `onSnapshot` listener
2. When the document changes on the server, the listener fires
3. The adapter normalizes the new data through the serializer
4. The store updates the cached record
5. Tracked properties trigger Glimmer component re-renders

### Implications
- Components display live data without polling
- Multiple users editing the same record see changes in real-time
- Cloud Function triggers that modify documents are reflected immediately

## A3's Application Serializer

```typescript
// app/serializers/application.ts
import CloudFirestoreSerializer from 'ember-cloud-firestore-adapter/serializers/cloud-firestore';

export default class ApplicationSerializer extends CloudFirestoreSerializer {
  // Handles:
  // 1. Server timestamp resolution on new records
  //    (Firestore returns a sentinel value initially, then the real timestamp)
  // 2. Meta extraction for pagination (hasMore from n+1 pattern)
  // 3. Relationship reference normalization
}
```

## Common Pitfalls

### 1. Server Timestamps
When creating a new record with `createdAt`, Firestore initially returns a `null` or sentinel timestamp. The serializer's `null-timestamp` transform handles this:
```typescript
@attr('null-timestamp') declare completedAt: Date | null;
```

### 2. Offline Persistence
Firestore SDK has offline persistence built in. Records can be read from cache when offline. Writes queue locally and sync when online.

### 3. Security Rules
Every Firestore read/write goes through security rules. The adapter operates with the user's auth token, so rules like `request.auth.uid == resource.data.createdBy` are enforced.

### 4. Index Requirements
Complex queries (multiple where clauses + orderBy) require composite indexes. Missing indexes cause runtime errors with a helpful link to create the index.

### 5. Document Size Limit
Firestore documents max out at 1MB. If a model stores arrays or maps that could grow unbounded, consider moving to subcollections.

## Further Investigation

- **ember-cloud-firestore-adapter GitHub**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Querying**: https://firebase.google.com/docs/firestore/query-data/queries
- **Firestore Real-time**: https://firebase.google.com/docs/firestore/query-data/listen
- **Firestore Offline**: https://firebase.google.com/docs/firestore/manage-data/enable-offline
