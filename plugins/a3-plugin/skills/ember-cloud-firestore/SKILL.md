---
name: ember-cloud-firestore
description: Deep ember-cloud-firestore-adapter reference — how A3 bridges Ember Data/WarpDrive with Cloud Firestore for real-time document access
version: 0.2.0
---

# ember-cloud-firestore-adapter Reference

## Overview

`ember-cloud-firestore-adapter` is the bridge between Ember Data (WarpDrive) and Cloud Firestore. It allows A3 to use Ember Data's store API while reading/writing directly to Firestore. Every model in A3 that persists to Firestore flows through this adapter and serializer pair.

**Package**: `ember-cloud-firestore-adapter` v4.3.2
**Repo**: https://github.com/nickersk/ember-cloud-firestore-adapter

---

## Architecture

```
┌─────────────┐     ┌──────────────────────────┐     ┌───────────────┐     ┌─────────────────┐
│ Ember Store  │────▶│ CloudFirestoreAdapter    │────▶│ Firebase SDK  │────▶│ Cloud Firestore │
│ (WarpDrive)  │◀────│ (app/adapters/application)│◀────│ (Web v9+)     │◀────│ (NoSQL DB)      │
└─────────────┘     └──────────────────────────┘     └───────────────┘     └─────────────────┘
       │                       │
       ▼                       ▼
┌─────────────┐     ┌──────────────────────────┐
│ JSON:API     │◀────│ CloudFirestoreSerializer │
│ Cache        │     │ (app/serializers/app.)   │
└─────────────┘     └──────────────────────────┘
```

---

## Adapter Layer — Complete Method Reference

The adapter translates every Ember Data store operation into one or more Firestore SDK calls. Below is an exhaustive mapping.

### findRecord — Single Document Fetch

```typescript
// Store call:
const client = await this.store.findRecord('client', 'client_abc123');

// Adapter internally calls:
// 1. Resolves the collection name from the model name (dasherized → pluralized)
//    'client' → 'clients'
// 2. Constructs a Firestore document reference:
//    doc(db, 'clients', 'client_abc123')
// 3. Calls getDoc(docRef) to fetch the document snapshot
// 4. If real-time is configured, instead calls onSnapshot(docRef, callback)
// 5. Passes the DocumentSnapshot to the serializer for normalization
```

**Options supported:**
```typescript
// Force re-fetch from server (skip local cache)
await this.store.findRecord('client', 'client_abc123', { reload: true });

// Return cached version immediately, fetch in background
await this.store.findRecord('client', 'client_abc123', { backgroundReload: true });

// Adapteroptions for Firestore-specific behavior
await this.store.findRecord('client', 'client_abc123', {
  adapterOptions: {
    isRealtime: true,  // Attach onSnapshot listener for live updates
  },
});
```

### findAll — Full Collection Fetch

```typescript
// Store call:
const allClients = await this.store.findAll('client');

// Adapter internally calls:
// 1. Resolves collection name: 'client' → 'clients'
// 2. Constructs a collection reference: collection(db, 'clients')
// 3. Calls getDocs(collectionRef) to fetch all documents
// 4. Iterates over QuerySnapshot, normalizing each DocumentSnapshot
// 5. Returns an array of normalized records to the store
```

**WARNING**: `findAll` fetches EVERY document in a collection. For large collections (clients, enrollments), always use `query` with filters and pagination instead. Using `findAll` on a collection with thousands of documents will be slow, expensive, and may hit Firestore transfer limits.

### query — Filtered Collection Queries

```typescript
// Store call:
const results = await this.store.query('enrollment', {
  filter: { status: 'active', agencyId: 'agency_abc' },
  sort: '-createdAt',
  page: { limit: 25, offset: 0 },
});

// Adapter internally:
// 1. Resolves collection: 'enrollment' → 'enrollments'
// 2. Constructs a Firestore query by chaining constraints:
//    query(collectionRef,
//      where('status', '==', 'active'),
//      where('agencyId', '==', 'agency_abc'),
//      orderBy('createdAt', 'desc'),
//      limit(26)    // ← n+1 pattern: requests 26 to detect hasMore
//    )
// 3. Calls getDocs(firestoreQuery)
// 4. Passes results to the serializer which extracts meta.hasMore
// 5. Returns normalized records with meta object attached
```

### createRecord — New Document Creation

```typescript
// Store call:
const record = this.store.createRecord('client', {
  firstName: 'John',
  lastName: 'Doe',
  status: 'active',
});
await record.save();

// Adapter internally:
// 1. Calls generateIdForRecord() to create the document ID
//    → 'client_a1b2c3d4e5f6...' (A3's prefix pattern)
// 2. Serializes the record through the serializer's serialize() method
// 3. Constructs a document reference: doc(db, 'clients', 'client_a1b2c3d4...')
// 4. Calls setDoc(docRef, serializedData)
// 5. The serialized data includes serverTimestamp() sentinels for createdAt/modifiedAt
// 6. Returns the document snapshot for the store to cache
```

### updateRecord — Document Update

```typescript
// Store call:
record.firstName = 'Jane';
await record.save();

// Adapter internally:
// 1. Serializes only the changed attributes through the serializer
// 2. Constructs the document reference from the existing record ID
// 3. Calls updateDoc(docRef, serializedChanges)
//    - updateDoc only updates specified fields, unlike setDoc which overwrites
// 4. Includes serverTimestamp() for the modifiedAt field
// 5. Returns the updated snapshot
```

### deleteRecord — Document Deletion

```typescript
// Store call:
record.deleteRecord();
await record.save();

// Adapter internally:
// 1. Constructs the document reference
// 2. Calls deleteDoc(docRef)
// 3. The store removes the record from its cache
// NOTE: This does NOT cascade-delete subcollections. If the document has
//       subcollection data (notes, files), those documents persist as orphans.
//       A3 relies on Cloud Functions to clean up subcollections.
```

### queryRecord — Single Document from Query

```typescript
// Store call:
const result = await this.store.queryRecord('setting', {
  filter: { key: 'site-config' },
});

// Adapter internally:
// 1. Runs a query with limit(1) to fetch a single matching document
// 2. Returns the first result, or null if no match
```

---

## A3's Application Adapter — Full Implementation

```typescript
// app/adapters/application.ts
import CloudFirestoreAdapter from 'ember-cloud-firestore-adapter/adapters/cloud-firestore';
import type Store from '@ember-data/store';

export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // ──────────────────────────────────────────────────────
  // Custom ID Generation
  // ──────────────────────────────────────────────────────
  // A3 uses a prefix pattern: modelName_uuid (with hyphens stripped)
  // This makes IDs self-describing when seen in logs, URLs, and Firestore console.
  //
  // Examples:
  //   client_a1b2c3d4e5f6789012345678abcdef
  //   enrollment_f9e8d7c6b5a4321098765432fedcba
  //   agency_11223344556677889900aabbccddeeff
  //
  // The model name prefix allows you to identify the collection from the ID alone,
  // which is invaluable for debugging cross-collection references.
  generateIdForRecord(_store: Store, type: string): string {
    return `${type}_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  // ──────────────────────────────────────────────────────
  // n+1 Pagination
  // ──────────────────────────────────────────────────────
  // When the query includes a page.limit, the adapter actually fetches limit+1 records.
  // This is a deliberate pattern to determine if more pages exist WITHOUT running a
  // separate count query (which would be an extra Firestore read and added latency).
  //
  // How it works:
  // 1. User requests: page: { limit: 25 }
  // 2. Adapter sends: limit(26) to Firestore
  // 3. If 26 documents return → hasMore = true, adapter returns first 25
  // 4. If ≤25 documents return → hasMore = false, adapter returns all
  // 5. The serializer extracts this into results.meta.hasMore: boolean
  //
  // This pattern avoids Firestore's count aggregation (which still reads all docs
  // for billing purposes) and gives the UI a simple boolean to show/hide "Load More".
}
```

### How A3's ID Generation Pattern Works Internally

When `store.createRecord()` is called, Ember Data invokes the adapter's `generateIdForRecord()` before the record is sent to Firestore. The flow is:

1. `store.createRecord('enrollment', { ... })` is called
2. Ember Data calls `adapter.generateIdForRecord(store, 'enrollment')`
3. The adapter returns `enrollment_a1b2c3d4...`
4. This ID is set as the record's `id` property immediately (client-side)
5. When `record.save()` is called, the document is written to `enrollments/enrollment_a1b2c3d4...`
6. The ID is now permanent and referenced by other documents

**Why strip hyphens from UUID?** Firestore document IDs with hyphens work fine, but stripped UUIDs are more compact (32 chars vs 36) and avoid potential issues with URL encoding in deep links.

---

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

## Serializer Layer — Complete Method Reference

The serializer transforms data bidirectionally between Firestore's document format and Ember Data's JSON:API format.

### A3's Application Serializer

```typescript
// app/serializers/application.ts
import CloudFirestoreSerializer from 'ember-cloud-firestore-adapter/serializers/cloud-firestore';

export default class ApplicationSerializer extends CloudFirestoreSerializer {
  // Inherited behavior covers:
  // 1. normalizeResponse() — entry point for all serialization
  // 2. normalize() — single document normalization
  // 3. serialize() — Ember record → Firestore document
  // 4. extractMeta() — pulls pagination meta from adapter response
  // 5. extractRelationships() — resolves document references to relationship data
}
```

### normalizeResponse — Query/Find Response Normalization

Called by the store after the adapter fetches data. Dispatches to type-specific methods:

| Request Type | Method Called | Context |
|-------------|-------------|---------|
| `findRecord` | `normalizeFindRecordResponse` | Single document |
| `findAll` | `normalizeFindAllResponse` | All documents in collection |
| `query` | `normalizeQueryResponse` | Filtered query results |
| `queryRecord` | `normalizeQueryRecordResponse` | Single document from query |
| `createRecord` | `normalizeCreateRecordResponse` | After document creation |
| `updateRecord` | `normalizeUpdateRecordResponse` | After document update |
| `deleteRecord` | `normalizeDeleteRecordResponse` | After document deletion |

### normalize — Single Document Normalization

Transforms a Firestore DocumentSnapshot into a JSON:API resource object:

```
Firestore Document:                  JSON:API Resource:
{                                    {
  // doc.id = 'client_abc'              "type": "client",
  // doc.ref.path = 'clients/...'       "id": "client_abc",
  "firstName": "John",                  "attributes": {
  "lastName": "Doe",                      "firstName": "John",
  "status": "active",                     "lastName": "Doe",
  "agency": <DocumentReference>,          "status": "active",
  "createdAt": <Timestamp>,               "createdAt": "2024-01-15T...",
  "modifiedAt": <Timestamp>               "modifiedAt": "2024-03-20T..."
}                                        },
                                         "relationships": {
                                           "agency": {
                                             "data": { "type": "agency", "id": "agency_xyz" }
                                           }
                                         }
                                       }
```

Key transformations during normalization:

1. **Firestore Timestamps** → JavaScript Date objects (via transforms)
2. **DocumentReference fields** → JSON:API relationship data with type and id
3. **Firestore GeoPoint** → `{ latitude, longitude }` plain object
4. **Server timestamp sentinels** → `null` initially (resolved on next snapshot)
5. **Document ID** → extracted from `doc.id`, not from document data

### serialize — Record to Firestore Document

Transforms an Ember Data record into a Firestore-writable plain object:

```
Ember Record:                        Firestore Document:
{                                    {
  id: 'client_abc',                    // id NOT included in data
  firstName: 'John',                   "firstName": "John",
  lastName: 'Doe',                     "lastName": "Doe",
  status: 'active',                    "status": "active",
  agency: <AsyncBelongsTo>,            "agency": <DocumentReference>,
  createdAt: <Date>,                   "createdAt": serverTimestamp(),
  modifiedAt: <Date>                   "modifiedAt": serverTimestamp()
}                                    }
```

Key transformations during serialization:

1. **Document ID excluded** — Firestore stores the ID as the document key, not in the data
2. **Date objects** → Firestore `Timestamp.fromDate()` or `serverTimestamp()`
3. **BelongsTo relationships** → Firestore `DocumentReference` objects
4. **Null values** → Firestore `null` (field exists but empty)
5. **Undefined values** → omitted from the document entirely
6. **HasMany relationships** → NOT serialized into the parent document (they live in subcollections)

### extractMeta — Pagination Metadata

Pulls the `hasMore` flag from the adapter's n+1 response:

```typescript
// The serializer extracts:
{
  meta: {
    hasMore: boolean,  // true if the adapter received n+1 records
  }
}

// Available on the query result:
const results = await this.store.query('client', { ... });
results.meta.hasMore; // boolean
```

---

## Relationships in Firestore — Complete Guide

### belongsTo → Document Reference

When a model declares `@belongsTo('agency')`, the corresponding Firestore document stores a DocumentReference — not a string ID, but a native Firestore reference type.

```typescript
// Model definition:
@belongsTo('agency', { async: true, inverse: null })
declare agency: AsyncBelongsTo<Agency>;

// Firestore document data:
{
  "firstName": "John",
  "agency": /agencies/agency_abc    // ← Firestore DocumentReference type
}

// When the relationship is accessed:
const agency = await client.agency;
// 1. The serializer extracts the reference path: '/agencies/agency_abc'
// 2. It parses the collection name ('agencies') and ID ('agency_abc')
// 3. It maps collection name back to model type ('agency')
// 4. It creates a JSON:API relationship: { type: 'agency', id: 'agency_abc' }
// 5. When accessed, the store calls findRecord('agency', 'agency_abc')
// 6. This triggers another adapter.findRecord() → getDoc() call to Firestore
```

**Important behavior:**
- BelongsTo relationships are lazy-loaded by default (`async: true`)
- Accessing `client.agency` in a template auto-resolves (shows empty then fills in)
- Accessing in JS requires `await`: `const agency = await client.agency`
- The DocumentReference is a Firestore native type, not a string path
- If the referenced document does not exist, the relationship resolves to `null`

### hasMany → Subcollection Pattern

When a model declares `@hasMany`, the adapter looks for documents in a Firestore subcollection beneath the parent document.

```typescript
// Model definition:
@hasMany('client-note', { async: true, inverse: 'client' })
declare notes: AsyncHasMany<ClientNote>;

// Firestore structure:
clients/
  client_abc/
    ← parent document fields (firstName, lastName, etc.)
    notes/                    ← subcollection
      client-note_001/        ← subcollection document
        { body: "Called client...", createdBy: "user_xyz" }
      client-note_002/
        { body: "Follow up on...", createdBy: "user_xyz" }

// When the relationship is accessed:
const notes = await client.notes;
// 1. The adapter constructs a subcollection path:
//    collection(db, 'clients', 'client_abc', 'notes')
// 2. Calls getDocs() on the subcollection reference
// 3. Each document is normalized as a 'client-note' record
// 4. Results are returned as an AsyncHasMany array
```

**Subcollection naming convention:**
- The subcollection name is derived from the hasMany relationship model name
- `client-note` model → subcollection named `client-notes` (pluralized, dasherized)
- The adapter handles this mapping automatically

### hasMany → Reference Array Pattern

Alternatively, hasMany can store an array of DocumentReferences directly in the parent document. This is used when the related records are NOT subcollection documents.

```typescript
// Firestore document with reference array:
{
  "name": "Gold Plan",
  "carriers": [
    /carriers/carrier_001,   // DocumentReference
    /carriers/carrier_002,   // DocumentReference
    /carriers/carrier_003    // DocumentReference
  ]
}

// When accessed, the adapter:
// 1. Reads the array of DocumentReferences from the parent document
// 2. Resolves each reference individually via getDoc()
// 3. Or batches them if the adapter supports batch resolution
// 4. Returns all resolved documents as the hasMany array
```

**When to use subcollections vs reference arrays:**

| Criterion | Subcollection | Reference Array |
|-----------|--------------|-----------------|
| Related records "belong to" parent | Yes | No |
| Related records are shared across parents | No | Yes |
| Need to query related records independently | Subcollection | Top-level collection |
| Number of related records | Unlimited | Limited by 1MB doc size |
| Delete parent cascades to related | Manual (Cloud Function) | No (references just dangle) |
| Examples in A3 | notes, files, activities | carriers, tags |

---

## Real-Time Updates — Complete Guide

### How Real-Time Listeners Work

The adapter can attach Firestore `onSnapshot` listeners to documents and queries, enabling live data that updates automatically when the database changes.

#### Document-Level Real-Time

```typescript
// When isRealtime is enabled (via adapter config or adapterOptions):
const client = await this.store.findRecord('client', 'client_abc', {
  adapterOptions: { isRealtime: true },
});

// Internally:
// 1. Instead of getDoc(), the adapter calls:
//    onSnapshot(docRef, (snapshot) => { ... })
//
// 2. The initial snapshot resolves the findRecord promise
//
// 3. On subsequent server-side changes:
//    a. Firestore pushes a new DocumentSnapshot to the callback
//    b. The adapter normalizes the new data through the serializer
//    c. The store's cache is updated with the normalized record
//    d. Glimmer's tracking system detects the changed attributes
//    e. Any component rendering this record's tracked properties re-renders
//
// 4. The listener remains active until:
//    a. The record is unloaded from the store
//    b. The adapter explicitly detaches the listener
//    c. The application is destroyed (all listeners cleaned up)
```

#### Query-Level Real-Time

```typescript
// Real-time queries listen for changes to any document matching the query
const activeEnrollments = await this.store.query('enrollment', {
  filter: { status: 'active' },
  adapterOptions: { isRealtime: true },
});

// Internally uses onSnapshot on the entire query:
// onSnapshot(queryRef, (querySnapshot) => {
//   querySnapshot.docChanges().forEach((change) => {
//     if (change.type === 'added') { /* new doc matches query */ }
//     if (change.type === 'modified') { /* existing doc updated */ }
//     if (change.type === 'removed') { /* doc no longer matches query */ }
//   });
// });
```

#### Listener Lifecycle

```
Component renders → findRecord/query (isRealtime: true)
  → Adapter attaches onSnapshot listener
    → Initial data returned, component renders
      → Server-side change occurs (another user, Cloud Function, etc.)
        → onSnapshot callback fires with new data
          → Serializer normalizes the update
            → Store cache updated
              → Tracked properties invalidated
                → Component re-renders with new data
                  ...repeats for every change...
User navigates away → Component destroyed
  → Adapter detaches onSnapshot listener
    → No more callbacks, no memory leaks
```

#### Implications for A3

- **Multi-user collaboration**: When User A edits a client, User B sees the change immediately
- **Cloud Function side effects**: When a Cloud Function updates a document (e.g., after Stripe webhook), the frontend reflects the change without polling
- **Offline-to-online sync**: When a device reconnects, pending writes sync and the listener fires with the server-reconciled state
- **Billing impact**: Every document delivered via onSnapshot counts as a read. Busy documents can accumulate significant read counts.

### Teardown and Cleanup

```typescript
// Listeners are automatically cleaned up when:
// 1. The component that initiated the query is destroyed
// 2. store.unloadAll('model') is called
// 3. store.unloadRecord(record) is called
// 4. The Ember application is destroyed

// Manual cleanup is rarely needed, but if required:
// The adapter tracks active listeners and provides cleanup hooks
```

---

## Offline Persistence

Firestore SDK includes built-in offline persistence. This affects how the adapter behaves:

### How Offline Works

1. **Reads**: When offline, `getDoc()` and `getDocs()` return data from the local IndexedDB cache. The adapter and serializer process this identically to online data.

2. **Writes**: When offline, `setDoc()`, `updateDoc()`, and `deleteDoc()` write to the local cache immediately. The SDK queues these operations and syncs when connectivity returns.

3. **Real-time listeners**: `onSnapshot` listeners fire for local cache changes even when offline. When connectivity returns, they fire again with the server-reconciled state.

4. **Metadata**: The SDK provides `fromCache` metadata on snapshots. The adapter can use this to inform the UI that data may be stale.

### Offline Implications for A3

```typescript
// Offline write queuing:
// 1. User is offline
// 2. User saves a record: record.save()
// 3. Adapter calls setDoc() → write goes to local cache
// 4. The promise resolves immediately (local write succeeded)
// 5. The user sees "Saved successfully" even though the server hasn't received it
// 6. When connectivity returns, the SDK syncs the write to the server
// 7. If the write fails server-side (e.g., security rules deny), the local cache
//    is reverted, but the user has already seen the success message
//
// This is a known trade-off. A3 prioritizes responsiveness over strict consistency.
```

---

## Error Handling

### Missing Composite Index

```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/...

// This happens when a query combines filters + sort that require a composite index.
// The error message includes a direct link to create the index in the Firebase console.
// After clicking the link and creating the index, the query works within a few minutes.
//
// Prevention: Define indexes in firestore.indexes.json and deploy with:
//   firebase deploy --only firestore:indexes
```

### Permission Denied

```
FirebaseError: Missing or insufficient permissions.

// This means Firestore security rules rejected the operation.
// Common causes:
// 1. User is not authenticated (request.auth == null)
// 2. User lacks required role/permission for this collection
// 3. Data validation in rules failed (e.g., missing required field)
// 4. Trying to modify a field that rules protect (e.g., createdBy)
//
// Debug by checking:
// - firestore.rules for the matching match statement
// - The Firebase Emulator's rules evaluation logs
// - The user's auth token claims and permissions document
```

### Document Not Found

```
// When findRecord() is called for a non-existent document:
// - getDoc() returns a snapshot where snapshot.exists() === false
// - The adapter typically throws a 404-equivalent error
// - The store propagates this as a rejected promise
//
// Handle in routes:
model(params) {
  return this.store.findRecord('client', params.client_id).catch(() => {
    this.router.transitionTo('not-found');
  });
}
```

### Quota Exceeded

```
FirebaseError: Quota exceeded.

// Firestore has per-project limits:
// - 1 million concurrent connections
// - 10,000 writes/second per database
// - 1MB maximum document size
// - 20,000 composite indexes per database
//
// In practice, A3 hits document size limits before connection limits.
// If a document approaches 1MB (e.g., a field with a massive array),
// the solution is to move data to a subcollection.
```

### Unavailable / Deadline Exceeded

```
FirebaseError: UNAVAILABLE / DEADLINE_EXCEEDED

// Firestore is temporarily unreachable. The SDK automatically retries
// with exponential backoff. If offline persistence is enabled, reads
// fall back to the local cache. Writes queue locally and sync on reconnect.
```

---

## Configuration

### Adapter Configuration

```typescript
// The CloudFirestoreAdapter accepts configuration via:

// 1. Adapter properties
export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // Enable real-time listeners for all findRecord calls
  isRealtime = true;

  // Reference to the Firestore database instance
  // (typically injected or resolved from the Firebase app config)
}

// 2. Per-request adapterOptions
await this.store.findRecord('client', 'client_abc', {
  adapterOptions: {
    isRealtime: true,           // Override real-time setting for this request
    buildReference(db) {        // Custom collection/document reference builder
      return doc(db, 'clients', 'client_abc');
    },
  },
});

// 3. Per-query adapterOptions for subcollection queries
await this.store.query('client-note', {
  adapterOptions: {
    buildReference(db) {
      return collection(db, 'clients', 'client_abc', 'notes');
    },
  },
});
```

### Firebase App Configuration

```typescript
// config/environment.js (relevant section)
firebase: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
  measurementId: '...',
},

// The adapter uses the initialized Firebase app to get the Firestore instance.
// In A3, the Firebase app is initialized in an instance initializer.
```

---

## Common Pitfalls and Solutions

### 1. Server Timestamps Return Null Initially

When creating a record with `serverTimestamp()`, Firestore returns a pending sentinel value until the server confirms the write. The `null-timestamp` transform handles this:

```typescript
// Model:
@attr('null-timestamp') declare completedAt: Date | null;

// Without null-timestamp, a newly created record shows:
// createdAt = null (sentinel not yet resolved)
// This causes "Cannot read property of null" errors in templates

// With null-timestamp transform:
// createdAt = null (explicitly null, templates handle it gracefully)
// After server confirms: createdAt = Date object
```

### 2. Subcollection Orphans After Parent Deletion

Deleting a parent document does NOT delete its subcollections. A3 addresses this with Cloud Function triggers that cascade-delete subcollection documents:

```typescript
// functions/src/firestore/onDeleteClient.ts
// When a client document is deleted, this trigger:
// 1. Queries all subcollections (notes, files, activities)
// 2. Batch-deletes all subcollection documents
// 3. Cleans up related Cloud Storage files
```

### 3. 1MB Document Size Limit

If a model stores arrays or maps that grow unbounded, it can exceed Firestore's 1MB document limit. Solutions:
- Move the growing data to a subcollection
- Paginate array fields
- Store large blobs in Cloud Storage, keep only URLs in Firestore

### 4. Query Requires Index

Any query combining multiple `where()` clauses with `orderBy()` requires a composite index. Missing indexes cause runtime errors with a link to create them. Keep `firestore.indexes.json` up to date.

### 5. Security Rules Apply to Adapter

The adapter operates with the current user's Firebase Auth token. Every read/write passes through Firestore security rules. The adapter does not bypass rules — it is subject to the same permissions as direct SDK calls.

---

## Further Investigation

- **ember-cloud-firestore-adapter GitHub**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Querying**: https://firebase.google.com/docs/firestore/query-data/queries
- **Firestore Real-time**: https://firebase.google.com/docs/firestore/query-data/listen
- **Firestore Offline**: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- **Firestore Data Model**: https://firebase.google.com/docs/firestore/data-model
- **Firestore Index Management**: https://firebase.google.com/docs/firestore/query-data/indexing
- **Firestore Quotas/Limits**: https://firebase.google.com/docs/firestore/quotas
