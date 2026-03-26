---
name: ember-data-warp-drive
description: Deep WarpDrive (next-gen Ember Data) reference — Store, models, adapters, serializers, relationships, caching, pagination, and A3-specific data layer patterns
version: 0.1.0
---

# WarpDrive / Ember Data Reference

## Overview

A3 uses WarpDrive, the next generation of Ember Data. With 823+ file imports, this is the single most-used package in the A3 codebase. It provides the entire data layer: identity map, caching, request lifecycle, relationships, serialization, and reactivity.

Key packages:
- `@warp-drive/core` — Core primitives (identifiers, request management, cache)
- `@warp-drive/ember` — Ember integration (`<Request>` component, reactive documents)
- `@warp-drive/json-api` — JSON:API cache implementation
- `@warp-drive/legacy` — Legacy compatibility layer for classic Ember Data APIs
- `@warp-drive/utilities` — Utility functions
- `@ember-data/adapter` — Adapter interface (how data reaches the persistence layer)
- `@ember-data/serializer` — Serializer interface (how raw payloads become normalized records)
- `@ember-data/model` — Model class, `@attr`, `@belongsTo`, `@hasMany`
- `@ember-data/graph` — Relationship graph (tracks all relationship state)
- `@ember-data/store` — The Store service itself

---

## Store Service — Exhaustive API

The Store is the central hub. Every record in the app flows through it. It acts as an identity map (one canonical instance per `type + id`), a request coordinator, and a cache gateway.

### A3's Extended Store

```typescript
// app/services/store.ts
import Store from '@ember-data/store';
import { service } from '@ember/service';

export default class StoreService extends Store {
  // Custom aggregation methods for Firestore
  async getCount(modelName: string, query?: object): Promise<number> {
    // Returns count via Firestore aggregation query
  }

  async getSum(modelName: string, field: string, query?: object): Promise<number> {
    // Returns sum via Firestore aggregation query
  }
}
```

### Store Methods — Complete Reference

#### findRecord

```typescript
findRecord(
  modelName: string,
  id: string | number,
  options?: {
    reload?: boolean;
    backgroundReload?: boolean;
    include?: string;
    adapterOptions?: Record<string, unknown>;
    preload?: Record<string, unknown>;
  }
): Promise<Model>
```

Fetches a single record by type and ID. This is the **primary** way to load a record in A3.

- **Default behavior**: Returns a cached record if available. If not cached, fetches from the adapter (Firestore). If cached but stale, may trigger a background reload depending on adapter settings.
- `reload: true` — Ignores the cache entirely and forces a fresh fetch from Firestore. Use when you **must** have the latest server state (e.g., after a known external mutation).
- `backgroundReload: true` — Returns the cached record immediately but fires off a background request. When the response returns, the record auto-updates and any tracked templates re-render.
- `backgroundReload: false` — Suppresses the background reload. Returns the cached record as-is. Use when you know the cache is fresh (e.g., just loaded moments ago).
- `include` — Tells the adapter to sideload related records. Less common in A3's Firestore adapter but used with REST adapters.
- `adapterOptions` — Arbitrary hash passed straight to the adapter. A3 uses this for subcollection context, e.g., `{ buildReference: (ref) => ref.collection('clients').doc(clientId).collection('notes') }`.
- `preload` — Pre-populates relationship IDs so that `belongsTo` references resolve instantly from cache without a separate request.

```typescript
// Basic usage
const client = await this.store.findRecord('client', 'client_abc123');

// Force fresh fetch
const client = await this.store.findRecord('client', 'client_abc123', { reload: true });

// Return cached immediately, update in background
const client = await this.store.findRecord('client', 'client_abc123', { backgroundReload: true });

// With adapter options for subcollection context
const note = await this.store.findRecord('enrollment-note', 'note_xyz', {
  adapterOptions: {
    buildReference: (ref) => ref.collection('enrollments').doc(enrollmentId).collection('notes'),
  },
});
```

#### findAll

```typescript
findAll(
  modelName: string,
  options?: {
    reload?: boolean;
    backgroundReload?: boolean;
    adapterOptions?: Record<string, unknown>;
  }
): Promise<RecordArray<Model>>
```

Fetches **all** records of a given type. Returns a live `RecordArray` that auto-updates as records are added/removed from the store.

- **Warning**: In A3, avoid `findAll` for large collections (clients, enrollments). Use `query` with filters and pagination instead. Firestore charges per document read.
- Useful for small reference collections like statuses, carrier lists, or configuration records.
- The returned `RecordArray` is **live** — if you later push new records of this type into the store, they appear in the array automatically.

```typescript
const carriers = await this.store.findAll('carrier');
// carriers.length — total count
// carriers is live, auto-updates
```

#### query

```typescript
query(
  modelName: string,
  query: {
    filter?: Record<string, unknown>;
    sort?: string;
    page?: { limit?: number; offset?: number };
    [key: string]: unknown;
  },
  options?: {
    adapterOptions?: Record<string, unknown>;
  }
): Promise<AdapterPopulatedRecordArray<Model>>
```

The **workhorse** of A3 data loading. Sends a query to the adapter, which translates it into a Firestore query. Returns an `AdapterPopulatedRecordArray`.

- Unlike `findAll`, `query` always hits the adapter (no cache-only shortcut).
- The returned array is **not** live by default — it represents a snapshot of that query's results.
- The `meta` property on the returned array carries pagination metadata.

```typescript
// Basic filtered query
const records = await this.store.query('enrollment', {
  filter: { status: 'active', agencyId: 'agency_abc' },
});

// With pagination (A3's n+1 pattern)
const records = await this.store.query('enrollment', {
  filter: { status: 'active' },
  page: { limit: 25, offset: 0 },
});
// records.meta.hasMore — boolean, true if more pages exist

// With sorting
const records = await this.store.query('client', {
  filter: { status: 'active' },
  sort: '-createdAt', // prefix '-' means descending
});

// With adapter options
const notes = await this.store.query('enrollment-note', {
  filter: { enrollmentId: 'enr_abc' },
  adapterOptions: {
    buildReference: (ref) => ref.collection('enrollments').doc('enr_abc').collection('notes'),
  },
});
```

#### queryRecord

```typescript
queryRecord(
  modelName: string,
  query: Record<string, unknown>,
  options?: {
    adapterOptions?: Record<string, unknown>;
  }
): Promise<Model | null>
```

Like `query`, but expects a **single** record result. Useful when querying by a unique field that is not the document ID.

```typescript
// Find a user by email (unique field)
const user = await this.store.queryRecord('user', {
  filter: { email: 'john@example.com' },
});
```

#### peekRecord

```typescript
peekRecord(modelName: string, id: string | number): Model | null
```

Returns a record from the store's identity map **without** making any network request. Returns `null` if the record is not cached.

- **Synchronous** — no promise, no waiting.
- Use when you **know** the record has been loaded by a prior route or request.
- Perfect inside computed getters, component constructors, or synchronous helpers.

```typescript
const cachedClient = this.store.peekRecord('client', 'client_abc123');
if (cachedClient) {
  // Use it immediately
} else {
  // Need to fetch it
}
```

#### peekAll

```typescript
peekAll(modelName: string): RecordArray<Model>
```

Returns a **live** `RecordArray` of all records of that type currently in the store. Never triggers a network request.

- The array is live — it updates as records are added/removed from the store.
- Useful for building local filters or aggregations over already-loaded data.

```typescript
const allCachedEnrollments = this.store.peekAll('enrollment');
const activeOnes = allCachedEnrollments.filter((e) => e.status === 'active');
```

#### createRecord

```typescript
createRecord(modelName: string, inputProperties?: Record<string, unknown>): Model
```

Creates a new record instance in the store. The record is **not** persisted until you call `.save()`. The record is immediately present in `peekAll` results.

- The returned record has `isNew === true` until saved.
- A3's adapter auto-generates IDs with the pattern `modelName_uuid`.
- You can set relationships by passing model instances or IDs.

```typescript
const record = this.store.createRecord('client', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'active',
});
// record.isNew === true
// record.id === null (until adapter assigns one) or pre-generated by generateIdForRecord

await record.save();
// record.isNew === false
// record.id === 'client_<uuid>'
```

#### pushPayload

```typescript
pushPayload(modelName: string, inputPayload: Record<string, unknown>): void
```

Pushes a raw payload into the store as if it came from the adapter. The payload goes through the serializer's `normalize` pipeline. Useful for injecting data from WebSocket events, Cloud Functions responses, or manual side-channel data.

```typescript
this.store.pushPayload('client', {
  client: {
    id: 'client_abc123',
    firstName: 'John',
    lastName: 'Doe',
  },
});
```

#### normalize

```typescript
normalize(modelName: string, payload: Record<string, unknown>): Record<string, unknown>
```

Runs the payload through the serializer's normalization without pushing into the store. Returns a JSON:API-formatted document. Useful for inspecting what the serializer would produce.

```typescript
const normalized = this.store.normalize('client', rawPayload);
// normalized is a JSON:API resource object: { data: { type, id, attributes, relationships } }
```

#### unloadRecord

```typescript
unloadRecord(record: Model): void
```

Removes a single record from the store's identity map. The record is no longer accessible via `peekRecord` or `peekAll`. Does **not** delete from the server.

- Use to free memory for records you no longer need.
- Any template references to this record will lose reactivity.

```typescript
this.store.unloadRecord(record);
```

#### unloadAll

```typescript
unloadAll(modelName?: string): void
```

Removes all records from the store, or all records of a specific type if `modelName` is provided.

```typescript
// Unload all enrollment records
this.store.unloadAll('enrollment');

// Nuclear option: unload everything
this.store.unloadAll();
```

#### modelFor

```typescript
modelFor(modelName: string): ModelClass
```

Returns the model class for a given type name. Used internally and occasionally in dynamic scenarios.

```typescript
const ClientModel = this.store.modelFor('client');
```

#### adapterFor

```typescript
adapterFor(modelName: string): Adapter
```

Returns the adapter instance for a given model type. Resolution order:
1. `app/adapters/<modelName>.ts` (e.g., `adapters/stripe/customer.ts`)
2. `app/adapters/application.ts` (the fallback)

```typescript
const adapter = this.store.adapterFor('client');
// Returns the CloudFirestoreAdapter instance
```

#### serializerFor

```typescript
serializerFor(modelName: string): Serializer
```

Returns the serializer instance for a given model type. Same resolution pattern as adapters.

```typescript
const serializer = this.store.serializerFor('client');
```

---

## Record Lifecycle States

Every Ember Data record has internal state flags. Understanding them is critical for building UIs that respond to data flow.

### State Flags

| Flag | Type | Description |
|------|------|-------------|
| `isNew` | `boolean` | `true` for records created via `createRecord()` that have not yet been saved. Becomes `false` after the first successful `save()`. |
| `hasDirtyAttributes` | `boolean` | `true` when any attribute has been changed since the last successful save or load. Does NOT track relationship changes. |
| `isDeleted` | `boolean` | `true` after `deleteRecord()` is called. The record is marked for deletion but not yet persisted. After `save()`, it remains `true`. |
| `isSaving` | `boolean` | `true` while a `save()` or `destroyRecord()` is in-flight. Goes back to `false` when the promise resolves or rejects. |
| `isValid` | `boolean` | `true` by default. Becomes `false` when the adapter returns validation errors (an `InvalidError`). |
| `isLoaded` | `boolean` | `true` once the record has been fully loaded from the server or pushed into the store. |
| `isEmpty` | `boolean` | `true` for records that exist in the identity map but have no data loaded yet (placeholder state). |
| `isError` | `boolean` | `true` when the last adapter operation (find, save, etc.) failed. |
| `isReloading` | `boolean` | `true` while a `reload()` is in progress. |
| `adapterError` | `AdapterError \| null` | The error object from the last failed adapter operation. `null` when no error. |

### State Transitions

```
[empty] --findRecord()--> [loading] --success--> [loaded.saved]
                                    --failure--> [error]

[loaded.saved] --set attribute--> [loaded.updated.uncommitted]
               --deleteRecord()--> [deleted.uncommitted]
               --reload()--> [loaded.saved] (isReloading: true)

[loaded.updated.uncommitted] --save()--> [loaded.updated.inFlight] (isSaving: true)
                             --rollbackAttributes()--> [loaded.saved]

[loaded.updated.inFlight] --success--> [loaded.saved]
                          --failure--> [loaded.updated.uncommitted] (isError: true)

[deleted.uncommitted] --save()--> [deleted.inFlight] (isSaving: true)
                      --rollbackAttributes()--> [loaded.saved] (undeletes!)

[deleted.inFlight] --success--> [deleted.saved]
                   --failure--> [deleted.uncommitted] (isError: true)

createRecord() --> [loaded.created.uncommitted] (isNew: true)
  --save()--> [loaded.created.inFlight] (isSaving: true)
  --success--> [loaded.saved] (isNew: false)
  --failure--> [loaded.created.uncommitted] (isError: true)
```

### Using State in Templates

```handlebars
{{#if @record.isSaving}}
  <Spinner />
{{/if}}

{{#if @record.hasDirtyAttributes}}
  <button {{on "click" this.save}}>Save Changes</button>
  <button {{on "click" this.rollback}}>Discard</button>
{{/if}}

{{#if @record.isError}}
  <ErrorBanner @error={{@record.adapterError}} />
{{/if}}

{{#if @record.isNew}}
  <span class="badge">New</span>
{{/if}}
```

---

## Record Operations — Complete Reference

### save

```typescript
save(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Persists the record. Behavior depends on state:
- **isNew** — calls adapter's `createRecord()`
- **hasDirtyAttributes** — calls adapter's `updateRecord()`
- **isDeleted** — calls adapter's `deleteRecord()`

```typescript
await record.save();
// or with adapter options
await record.save({ adapterOptions: { merge: true } });
```

### destroyRecord

```typescript
destroyRecord(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Shorthand for `deleteRecord()` + `save()` + `unloadRecord()`. This is the preferred way to fully delete and clean up a record.

```typescript
await record.destroyRecord();
// Record is deleted on server AND removed from the store's identity map
```

### deleteRecord

```typescript
deleteRecord(): void
```

Marks the record for deletion. Does **not** persist until `save()` is called. You can undo this with `rollbackAttributes()`.

```typescript
record.deleteRecord();
// record.isDeleted === true
// Not yet persisted — can still rollback

await record.save();
// Now persisted to Firestore
```

### rollbackAttributes

```typescript
rollbackAttributes(): void
```

Reverts all dirty attributes to their last-known server state. Also cancels a pending deletion or undoes `createRecord` (removes the record from the store if it was never saved).

```typescript
record.firstName = 'Changed';
// record.hasDirtyAttributes === true

record.rollbackAttributes();
// record.firstName === 'OriginalValue'
// record.hasDirtyAttributes === false

// Also undoes deleteRecord:
record.deleteRecord();
record.rollbackAttributes();
// record.isDeleted === false
```

### reload

```typescript
reload(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Re-fetches the record from the server. The record's `isReloading` flag is `true` during the request.

```typescript
const freshRecord = await record.reload();
```

### changedAttributes

```typescript
changedAttributes(): Record<string, [unknown, unknown]>
```

Returns a hash of attributes that have changed. Each key maps to a tuple of `[oldValue, newValue]`.

```typescript
record.firstName = 'Jane';
record.changedAttributes();
// { firstName: ['John', 'Jane'] }
```

### eachAttribute

```typescript
eachAttribute(callback: (name: string, meta: { type: string; options: object }) => void): void
```

Iterates over every attribute defined on the model. Useful for building dynamic forms or serialization logic.

```typescript
record.eachAttribute((name, meta) => {
  console.log(name, meta.type); // e.g., 'firstName', 'string'
});
```

### eachRelationship

```typescript
eachRelationship(
  callback: (name: string, descriptor: { kind: 'belongsTo' | 'hasMany'; type: string; options: object }) => void
): void
```

Iterates over every relationship defined on the model.

```typescript
record.eachRelationship((name, descriptor) => {
  console.log(name, descriptor.kind, descriptor.type);
  // e.g., 'client', 'belongsTo', 'client'
  // e.g., 'files', 'hasMany', 'enrollment-file'
});
```

### serialize

```typescript
serialize(options?: { includeId?: boolean }): Record<string, unknown>
```

Serializes the record using its serializer. Returns a plain object suitable for sending to an API.

```typescript
const payload = record.serialize();
const payloadWithId = record.serialize({ includeId: true });
```

### toJSON (Deprecated)

```typescript
toJSON(): Record<string, unknown>
```

Legacy method. Prefer `serialize()`.

---

## Relationships — Deep Dive

### async vs sync

All A3 relationships are **async** (`async: true`). This means:
- Accessing a relationship returns a `PromiseProxy` (for `belongsTo`) or `PromiseManyArray` (for `hasMany`).
- In templates, async relationships auto-resolve. `{{@enrollment.client.name}}` works seamlessly.
- In JavaScript, you must `await` the relationship: `const client = await enrollment.client;`

Sync relationships (`async: false`) would return the record directly but require it to already be in the store. A3 does not use sync relationships because Firestore data is always loaded asynchronously.

### inverse Mapping

Every relationship can specify an `inverse` — the name of the corresponding relationship on the other model.

```typescript
// enrollment.ts
@belongsTo('client', { async: true, inverse: 'enrollments' })
declare client: AsyncBelongsTo<Client>;

// client.ts
@hasMany('enrollment', { async: true, inverse: 'client' })
declare enrollments: AsyncHasMany<Enrollment>;
```

When `inverse: null`, the relationship is **unidirectional**. The other model has no back-reference:

```typescript
@belongsTo('carrier', { async: true, inverse: null })
declare carrier: AsyncBelongsTo<Carrier>;
// Carrier model has no 'enrollments' relationship pointing back
```

### Polymorphic Relationships

Used when a relationship can point to multiple model types:

```typescript
// comment.ts
@belongsTo('commentable', { async: true, inverse: 'comments', polymorphic: true })
declare commentable: AsyncBelongsTo<Client | Enrollment>;

// client.ts
@hasMany('comment', { async: true, inverse: 'commentable', as: 'commentable' })
declare comments: AsyncHasMany<Comment>;

// enrollment.ts
@hasMany('comment', { async: true, inverse: 'commentable', as: 'commentable' })
declare comments: AsyncHasMany<Comment>;
```

The `polymorphic: true` flag tells Ember Data the relationship stores both a `type` and `id`. The `as` option on the inverse side declares which polymorphic interface the model fulfills.

### Self-Referential Relationships

A model can relate to itself:

```typescript
// category.ts
@belongsTo('category', { async: true, inverse: 'children' })
declare parent: AsyncBelongsTo<Category>;

@hasMany('category', { async: true, inverse: 'parent' })
declare children: AsyncHasMany<Category>;
```

### Relationship Links vs Sideloading

- **Sideloading**: Related records are included in the same API response. The serializer extracts and pushes them into the store automatically. Common with REST/JSON:API adapters.
- **Links**: The relationship payload contains a URL. Ember Data fetches that URL when the relationship is accessed. Less common in A3's Firestore adapter.
- **A3 pattern**: Firestore relationships use document references. The adapter resolves them by performing separate `getDoc()` calls.

### BelongsToReference API

Access the reference object for fine-grained control:

```typescript
const reference = record.belongsTo('client');
```

| Method | Return | Description |
|--------|--------|-------------|
| `reference.id()` | `string \| null` | The ID of the related record without loading it |
| `reference.value()` | `Model \| null` | The cached record, or `null` if not loaded |
| `reference.load()` | `Promise<Model>` | Fetches the related record (equivalent to `await record.client`) |
| `reference.reload()` | `Promise<Model>` | Forces a fresh fetch of the related record |
| `reference.meta()` | `object \| null` | Metadata from the relationship payload |
| `reference.link()` | `string \| null` | The link URL if provided |

```typescript
// Check if the relationship is loaded without triggering a fetch
const clientRef = enrollment.belongsTo('client');
if (clientRef.value()) {
  // Already in cache
  const client = clientRef.value();
} else {
  // Need to load
  const client = await clientRef.load();
}

// Get the ID without loading the full record
const clientId = enrollment.belongsTo('client').id();
```

### HasManyReference API

```typescript
const reference = record.hasMany('files');
```

| Method | Return | Description |
|--------|--------|-------------|
| `reference.ids()` | `string[]` | Array of IDs of related records |
| `reference.value()` | `Model[] \| null` | Cached records, or `null` if the relationship has never been loaded |
| `reference.load()` | `Promise<ManyArray>` | Fetches the related records |
| `reference.reload()` | `Promise<ManyArray>` | Forces a fresh fetch |
| `reference.meta()` | `object \| null` | Metadata from the relationship payload |
| `reference.links()` | `object \| null` | Links object if provided |

```typescript
const filesRef = enrollment.hasMany('files');
const fileIds = filesRef.ids(); // ['file_abc', 'file_def']

if (filesRef.value()) {
  // Already loaded
} else {
  const files = await filesRef.load();
}
```

---

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

## Adapter API — Full Reference

Adapters translate store operations into persistence-layer calls. A3 has two primary adapters:
1. **CloudFirestoreAdapter** — talks directly to Firestore SDK
2. **FirebaseAdapter (REST)** — calls Cloud Functions HTTP endpoints

### Adapter Hook Methods

Every method below is called by the store at the appropriate time. You override them in custom adapters.

#### findRecord

```typescript
findRecord(
  store: Store,
  type: ModelClass,
  id: string,
  snapshot: Snapshot
): Promise<object>
```

Called by `store.findRecord()`. Must return a promise that resolves with the raw record payload.

- `snapshot.adapterOptions` — access custom options passed from the store call
- `snapshot.attr(name)` — read current attribute values
- `snapshot.belongsTo(name)` — read relationship data

#### findAll

```typescript
findAll(
  store: Store,
  type: ModelClass,
  sinceToken: string | null,
  snapshotRecordArray: SnapshotRecordArray
): Promise<object>
```

Called by `store.findAll()`. Returns all records of this type.

#### query

```typescript
query(
  store: Store,
  type: ModelClass,
  query: Record<string, unknown>,
  recordArray: AdapterPopulatedRecordArray,
  options: { adapterOptions?: Record<string, unknown> }
): Promise<object>
```

Called by `store.query()`. The `query` parameter is whatever you passed to `store.query()`.

#### queryRecord

```typescript
queryRecord(
  store: Store,
  type: ModelClass,
  query: Record<string, unknown>,
  options: { adapterOptions?: Record<string, unknown> }
): Promise<object>
```

Called by `store.queryRecord()`. Must return a single record payload.

#### createRecord

```typescript
createRecord(
  store: Store,
  type: ModelClass,
  snapshot: Snapshot
): Promise<object>
```

Called by `record.save()` when `record.isNew === true`. Must persist the record and return the server response.

#### updateRecord

```typescript
updateRecord(
  store: Store,
  type: ModelClass,
  snapshot: Snapshot
): Promise<object>
```

Called by `record.save()` when the record has dirty attributes. Must persist the changes and return the updated payload.

#### deleteRecord

```typescript
deleteRecord(
  store: Store,
  type: ModelClass,
  snapshot: Snapshot
): Promise<void | object>
```

Called by `record.save()` when `record.isDeleted === true`. Must delete the record from the server.

### URL Building Methods (REST Adapters)

These are relevant for the `FirebaseAdapter` (REST-based):

```typescript
// Base URL construction
buildURL(modelName: string, id?: string, snapshot?: Snapshot, requestType?: string, query?: object): string

// Specific URL hooks
urlForFindRecord(id: string, modelName: string, snapshot: Snapshot): string
urlForFindAll(modelName: string, snapshot: SnapshotRecordArray): string
urlForQuery(query: object, modelName: string): string
urlForQueryRecord(query: object, modelName: string): string
urlForCreateRecord(modelName: string, snapshot: Snapshot): string
urlForUpdateRecord(id: string, modelName: string, snapshot: Snapshot): string
urlForDeleteRecord(id: string, modelName: string, snapshot: Snapshot): string
```

### Configuration Properties

```typescript
// Base URL path prefix
namespace: string; // e.g., 'api/stripe'

// API host
host: string; // e.g., 'https://us-central1-myproject.cloudfunctions.net'

// Custom headers
get headers(): Record<string, string> {
  return {
    'Authorization': `Bearer ${this.session.token}`,
    'Content-Type': 'application/json',
  };
}

// Pluralize model names for URL paths
pathForType(modelName: string): string {
  return pluralize(modelName); // 'client' -> 'clients'
}
```

### Caching Behavior Hooks

These hooks control when the store uses cached data vs fetching fresh:

```typescript
// Should the store make a request for findRecord when the record is already cached?
shouldReloadRecord(store: Store, snapshot: Snapshot): boolean;

// Should the store make a request for findAll when records are already cached?
shouldReloadAll(store: Store, snapshotRecordArray: SnapshotRecordArray): boolean;

// After returning a cached record from findRecord, should a background fetch happen?
shouldBackgroundReloadRecord(store: Store, snapshot: Snapshot): boolean;

// After returning cached records from findAll, should a background fetch happen?
shouldBackgroundReloadAll(store: Store, snapshotRecordArray: SnapshotRecordArray): boolean;
```

### A3 Adapter Hierarchy

```
ApplicationAdapter (CloudFirestoreAdapter)
├── Default for all Firestore-backed models
├── generateIdForRecord: modelName_uuid pattern
└── n+1 pagination logic

FirebaseAdapter (RESTAdapter)
├── For Cloud Functions endpoints
├── host: Cloud Functions URL
├── headers: Firebase Auth token
│
├── StripeCustomerAdapter
│   └── namespace: 'api/stripe'
├── MailgunAdapter
│   └── namespace: 'api/mailgun'
└── PandaDocAdapter
    └── namespace: 'api/pandadoc'
```

---

## Serializer API — Full Reference

Serializers transform raw API/Firestore payloads into the normalized JSON:API format that the store understands, and vice versa.

### Normalization Methods (Server -> Store)

#### normalize

```typescript
normalize(typeClass: ModelClass, hash: Record<string, unknown>): object
```

The primary normalization hook. Converts a single raw record hash into JSON:API format. Called by `normalizeResponse` for each record in the payload.

#### normalizeResponse

```typescript
normalizeResponse(
  store: Store,
  primaryModelClass: ModelClass,
  payload: object,
  id: string | null,
  requestType: string
): object
```

Top-level normalization. `requestType` is one of: `'findRecord'`, `'findAll'`, `'query'`, `'queryRecord'`, `'createRecord'`, `'updateRecord'`, `'deleteRecord'`.

#### Request-Type-Specific Normalization

Each request type has its own hook that delegates to `normalizeResponse` by default:

```typescript
normalizeFindRecordResponse(store, primaryModelClass, payload, id, requestType): object
normalizeFindAllResponse(store, primaryModelClass, payload, id, requestType): object
normalizeQueryResponse(store, primaryModelClass, payload, id, requestType): object
normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType): object
normalizeCreateRecordResponse(store, primaryModelClass, payload, id, requestType): object
normalizeUpdateRecordResponse(store, primaryModelClass, payload, id, requestType): object
normalizeDeleteRecordResponse(store, primaryModelClass, payload, id, requestType): object
```

Override these when a specific request type returns a different payload shape:

```typescript
normalizeQueryResponse(store, primaryModelClass, payload, id, requestType) {
  // Stripe list endpoints return { data: [...], has_more: true }
  return {
    data: payload.data.map((item) => this.normalize(primaryModelClass, item).data),
    meta: { hasMore: payload.has_more },
  };
}
```

### Serialization Methods (Store -> Server)

#### serialize

```typescript
serialize(snapshot: Snapshot, options?: { includeId?: boolean }): Record<string, unknown>
```

Converts a record snapshot into the format expected by the API.

#### serializeIntoHash

```typescript
serializeIntoHash(
  hash: Record<string, unknown>,
  typeClass: ModelClass,
  snapshot: Snapshot,
  options?: object
): void
```

Some APIs expect the record to be nested under a root key. This method mutates `hash` in place.

### Key Mapping

```typescript
// Controls how attribute names map between model and payload
keyForAttribute(key: string, method: string): string {
  return underscore(key); // firstName -> first_name
}

// Controls how relationship names map
keyForRelationship(key: string, typeClass: string, method: string): string {
  return underscore(key) + '_id'; // client -> client_id
}
```

### attrs Configuration

Static property to customize attribute serialization per field:

```typescript
class MySerializer extends RESTSerializer {
  attrs = {
    firstName: 'first_name',                    // rename
    email: { serialize: false },                 // never serialize (read-only)
    createdAt: { serialize: false },             // server-managed
    internalNotes: { serialize: 'internal_notes', deserialize: 'internal_notes' },
  };
}
```

### primaryKey

```typescript
primaryKey: string = 'id'; // default
```

Override when the API uses a different field as the primary key:

```typescript
class StripeSerializer extends RESTSerializer {
  primaryKey = 'stripe_id';
}
```

### modelNameFromPayloadKey

```typescript
modelNameFromPayloadKey(key: string): string
```

Maps a root key in the payload to a model name. Useful when the API uses non-standard root keys:

```typescript
modelNameFromPayloadKey(key) {
  if (key === 'stripe_customers') return 'stripe/customer';
  return super.modelNameFromPayloadKey(key);
}
```

---

## Transform API

Transforms convert attribute values between their server representation and their in-app representation.

### Built-in Transforms

| Transform | `deserialize` (server -> app) | `serialize` (app -> server) |
|-----------|-------------------------------|------------------------------|
| `'string'` | `String(value)` or `null` | `String(value)` or `null` |
| `'number'` | `Number(value)` or `null` | `Number(value)` or `null` |
| `'boolean'` | `Boolean(value)` | `Boolean(value)` |
| `'date'` | `new Date(value)` | `value.toISOString()` |

### Custom Transform Interface

```typescript
import Transform from '@ember-data/serializer/transform';

export default class MyTransform extends Transform {
  deserialize(serialized: ServerType): AppType {
    // Convert from server format to app format
  }

  serialize(deserialized: AppType): ServerType {
    // Convert from app format to server format
  }
}
```

### A3 Custom: null-timestamp

```typescript
// app/transforms/null-timestamp.ts
import Transform from '@ember-data/serializer/transform';

export default class NullTimestampTransform extends Transform {
  deserialize(serialized: FirestoreTimestamp | null): Date | null {
    if (!serialized) return null;
    // Firestore Timestamp has .toDate() method
    return serialized.toDate ? serialized.toDate() : new Date(serialized);
  }

  serialize(deserialized: Date | null): Date | null {
    // Pass through — Firestore SDK handles Date objects
    return deserialized;
  }
}
```

Usage in a model:

```typescript
@attr('null-timestamp') declare completedAt: Date | null;
@attr('null-timestamp') declare cancelledAt: Date | null;
```

### Writing Custom Transforms

Common patterns in A3:

```typescript
// Array transform for Firestore array fields
export default class ArrayTransform extends Transform {
  deserialize(serialized: unknown[]): unknown[] {
    return Array.isArray(serialized) ? serialized : [];
  }
  serialize(deserialized: unknown[]): unknown[] {
    return Array.isArray(deserialized) ? deserialized : [];
  }
}

// JSON/Object transform for embedded Firestore maps
export default class ObjectTransform extends Transform {
  deserialize(serialized: object): object {
    return serialized || {};
  }
  serialize(deserialized: object): object {
    return deserialized || {};
  }
}
```

---

## WarpDrive-Specific APIs

WarpDrive is the next-generation architecture layered on top of Ember Data. It introduces the RequestManager pattern, SchemaRecord, and reactive primitives.

### RequestManager

The central request coordination layer. Replaces the adapter/serializer pattern with a pipeline of handlers.

```typescript
import RequestManager from '@warp-drive/core/request-manager';
import { CacheHandler } from '@warp-drive/core';

const manager = new RequestManager();
manager.use([MyAuthHandler, MyFetchHandler]);
manager.useCache(CacheHandler);
```

Requests flow through handlers in order. Each handler can modify, short-circuit, or pass through the request.

### Handler Pattern

A handler is an object with a `request` method:

```typescript
interface Handler {
  request<T>(
    context: RequestContext,
    next: (request: RequestInfo) => Promise<T>
  ): Promise<T>;
}
```

Example custom handler:

```typescript
const AuthHandler = {
  async request(context, next) {
    // Add auth header to every request
    context.request.headers.set('Authorization', `Bearer ${getToken()}`);
    return next(context.request);
  },
};

const LoggingHandler = {
  async request(context, next) {
    console.log('Request:', context.request.url);
    const result = await next(context.request);
    console.log('Response:', result);
    return result;
  },
};
```

### CacheHandler

A built-in handler that intercepts requests and checks the store's cache before making a network call. If the cache has a valid entry, it returns it immediately.

```typescript
import { CacheHandler } from '@warp-drive/core';

manager.useCache(CacheHandler);
```

### JSONAPICache

The default cache implementation. Stores records in JSON:API normalized format.

```typescript
import { JSONAPICache } from '@warp-drive/json-api';

class MyStore extends Store {
  createCache(storeWrapper) {
    return new JSONAPICache(storeWrapper);
  }
}
```

### SchemaRecord

WarpDrive's next-gen record type that replaces `@ember-data/model`. Records are defined via schemas rather than class decorators. Not yet fully adopted in A3 but available for new patterns.

```typescript
import { SchemaRecord } from '@warp-drive/core';

const ClientSchema = {
  type: 'client',
  fields: [
    { name: 'firstName', kind: 'attribute', type: 'string' },
    { name: 'lastName', kind: 'attribute', type: 'string' },
    { name: 'enrollments', kind: 'hasMany', type: 'enrollment', options: { inverse: 'client', async: true } },
  ],
};
```

### Reactive Document

WarpDrive's `Document` is a reactive wrapper around a cache entry. It auto-updates when the cache changes.

```typescript
const doc = store.request({ url: '/api/clients/123' });
// doc.data — the record
// doc.content — the raw response
// Accessing doc.data in a tracked context auto-subscribes to changes
```

### @warp-drive/ember `<Request>` Component

A component that manages request lifecycle in templates:

```handlebars
<Request @request={{this.fetchClient}}>
  <:loading>
    <Spinner />
  </:loading>

  <:error as |error|>
    <ErrorDisplay @error={{error}} />
  </:error>

  <:content as |data|>
    <ClientCard @client={{data}} />
  </:content>
</Request>
```

```typescript
// In the component class
get fetchClient() {
  return this.store.request({
    url: `/api/clients/${this.args.clientId}`,
    method: 'GET',
  });
}
```

### RequestState

Tracks the state of a request:

```typescript
interface RequestState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: T | null;
  error: Error | null;
}
```

---

## Error Handling

Ember Data defines a hierarchy of error types. The adapter throws these, and they propagate to the record's `adapterError` property and reject the `save()` / `findRecord()` promise.

### Error Types

| Error Class | HTTP Status | Description |
|-------------|-------------|-------------|
| `AdapterError` | (base class) | Generic adapter failure. Parent of all specific errors. |
| `InvalidError` | 422 | Validation failed. Carries per-field error messages. |
| `TimeoutError` | 408 | Request timed out. |
| `AbortError` | 0 | Request was aborted (e.g., navigation away). |
| `UnauthorizedError` | 401 | Authentication required or token expired. |
| `ForbiddenError` | 403 | Authenticated but not authorized for this action. |
| `NotFoundError` | 404 | Record does not exist. |
| `ConflictError` | 409 | Conflict (e.g., concurrent edit). |
| `ServerError` | 500+ | Server-side failure. |

### Using Errors

```typescript
import { InvalidError, NotFoundError, ServerError } from '@ember-data/adapter/error';

// Throwing from an adapter
async findRecord(store, type, id, snapshot) {
  const response = await fetch(url);
  if (response.status === 404) {
    throw new NotFoundError();
  }
  if (response.status === 422) {
    const body = await response.json();
    throw new InvalidError(body.errors);
    // errors format: [{ detail: 'is required', source: { pointer: '/data/attributes/email' } }]
  }
  return response.json();
}
```

### Handling in Components

```typescript
try {
  await record.save();
} catch (error) {
  if (error instanceof InvalidError) {
    // record.isValid === false
    // record.errors contains field-level errors
    record.errors.forEach((err) => {
      console.log(err.attribute, err.message);
    });
  } else if (error instanceof NotFoundError) {
    this.router.transitionTo('not-found');
  } else if (error instanceof UnauthorizedError) {
    this.session.invalidate();
  } else if (error instanceof ServerError) {
    this.notifications.error('Server error. Please try again.');
  }
}
```

### record.errors (Errors Object)

After an `InvalidError`, the record's `errors` property is populated:

```typescript
record.errors.get('email');    // ['is required', 'must be valid']
record.errors.has('email');    // true
record.errors.errorsFor('email'); // [{ attribute: 'email', message: 'is required' }]
record.errors.length;          // total number of errors
record.isValid;                // false

// In templates
{{#each @record.errors.email as |error|}}
  <p class="error">{{error.message}}</p>
{{/each}}
```

---

## Model Inheritance Patterns

Ember Data supports model inheritance. Child models share parent attributes and can add their own.

### Base Model Pattern (A3)

A3 uses a common `BaseModel` that all models extend:

```typescript
// app/models/base.ts
import Model, { attr } from '@ember-data/model';

export default class BaseModel extends Model {
  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
  @attr('string') declare createdBy: string;
  @attr('string') declare updatedBy: string;
}
```

```typescript
// app/models/client.ts
import BaseModel from './base';
import { attr, hasMany } from '@ember-data/model';

export default class Client extends BaseModel {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;
  // Inherits createdAt, updatedAt, createdBy, updatedBy
}
```

### STI-Style Inheritance

For models that share a Firestore collection but differ by a `type` discriminator:

```typescript
// app/models/notification.ts (base)
export default class Notification extends BaseModel {
  @attr('string') declare type: string;
  @attr('string') declare message: string;
  @attr('boolean') declare isRead: boolean;
}

// app/models/email-notification.ts
export default class EmailNotification extends Notification {
  @attr('string') declare emailAddress: string;
  @attr('string') declare subject: string;
}

// app/models/sms-notification.ts
export default class SmsNotification extends Notification {
  @attr('string') declare phoneNumber: string;
}
```

### Mixin Pattern (Alternative)

For cross-cutting concerns that don't fit a single inheritance chain:

```typescript
// Reusable attribute sets
function withTimestamps(BaseClass) {
  return class extends BaseClass {
    @attr('date') declare createdAt: Date;
    @attr('date') declare updatedAt: Date;
  };
}

function withSoftDelete(BaseClass) {
  return class extends BaseClass {
    @attr('boolean', { defaultValue: false }) declare isArchived: boolean;
    @attr('null-timestamp') declare archivedAt: Date | null;
  };
}

export default class Client extends withSoftDelete(withTimestamps(Model)) {
  @attr('string') declare firstName: string;
}
```

---

## Embedded Records

When a Firestore document contains nested maps that you want to treat as their own model, you can use embedded records via the serializer.

### EmbeddedRecordsMixin

```typescript
import RESTSerializer from '@ember-data/serializer/rest';
import EmbeddedRecordsMixin from '@ember-data/serializer/rest';

export default class OrderSerializer extends RESTSerializer.extend(EmbeddedRecordsMixin) {
  attrs = {
    lineItems: { embedded: 'always' },  // Always serialize/deserialize as embedded
    shippingAddress: { embedded: 'always' },
  };
}
```

Modes:
- `{ embedded: 'always' }` — Embedded in both directions (serialize and deserialize).
- `{ serialize: 'records', deserialize: 'records' }` — Explicit per-direction.
- `{ serialize: 'ids', deserialize: 'records' }` — Deserialize as embedded but serialize only IDs.

### A3 Pattern for Firestore Maps

Since Firestore documents can contain nested maps, A3 often uses raw `@attr()` (untyped) for simple embedded data rather than full embedded records:

```typescript
export default class Enrollment extends BaseModel {
  // Simple nested object — not a separate model
  @attr() declare address: { street: string; city: string; state: string; zip: string };

  // Array of objects
  @attr() declare dependents: Array<{ name: string; relationship: string; dob: string }>;
}
```

For complex nested structures that need their own identity and relationships, use a Firestore subcollection instead of embedded records.

---

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

## Model Definition — Comprehensive

### Attributes

```typescript
import Model, { attr } from '@ember-data/model';

export default class MyModel extends Model {
  // String
  @attr('string') declare name: string;

  // Number
  @attr('number') declare amount: number;

  // Boolean
  @attr('boolean') declare isActive: boolean;

  // Date (maps to Firestore Timestamp)
  @attr('date') declare createdAt: Date;

  // Nullable timestamp (custom A3 transform)
  @attr('null-timestamp') declare completedAt: Date | null;

  // Default values
  @attr('string', { defaultValue: 'draft' }) declare status: string;
  @attr('number', { defaultValue: 0 }) declare count: number;
  @attr('boolean', { defaultValue: false }) declare isArchived: boolean;

  // Default value with factory (for mutable defaults)
  @attr({ defaultValue: () => [] }) declare tags: string[];
  @attr({ defaultValue: () => ({}) }) declare metadata: Record<string, unknown>;

  // Untyped (raw value from Firestore — no transform applied)
  @attr() declare rawData: unknown;
}
```

### Relationships

```typescript
import Model, { belongsTo, hasMany } from '@ember-data/model';
import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';

export default class Enrollment extends BaseModel {
  // belongsTo — references another document
  @belongsTo('client', { async: true, inverse: 'enrollments' })
  declare client: AsyncBelongsTo<Client>;

  // belongsTo with no inverse (one-directional)
  @belongsTo('carrier', { async: true, inverse: null })
  declare carrier: AsyncBelongsTo<Carrier>;

  // hasMany — subcollection or reference array
  @hasMany('enrollment-file', { async: true, inverse: 'enrollment' })
  declare files: AsyncHasMany<EnrollmentFile>;

  @hasMany('enrollment-note', { async: true, inverse: 'enrollment' })
  declare notes: AsyncHasMany<EnrollmentNote>;
}
```

### Accessing Relationships

```typescript
// In route/component — relationships are async, must await
const client = await enrollment.client;

// In template — auto-resolves (shows loading state)
// {{@enrollment.client.name}}

// Check if relationship is loaded without triggering a fetch
if (enrollment.belongsTo('client').value()) {
  // Already loaded, safe to access synchronously
}

// Get ID without loading the related record
const clientId = enrollment.belongsTo('client').id();
```

### Computed Getters on Models

```typescript
export default class Client extends BaseModel {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;
  @attr('string') declare email: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isComplete(): boolean {
    return Boolean(this.firstName && this.lastName && this.email);
  }

  get initials(): string {
    return `${this.firstName?.[0] ?? ''}${this.lastName?.[0] ?? ''}`.toUpperCase();
  }
}
```

---

## Adapters — A3 Configuration

### CloudFirestoreAdapter (Default)

```typescript
// app/adapters/application.ts
import CloudFirestoreAdapter from 'ember-cloud-firestore-adapter/adapters/cloud-firestore';

export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // Custom ID generation: modelName_uuid
  generateIdForRecord(store: Store, type: string): string {
    return `${type}_${crypto.randomUUID()}`;
  }

  // Pagination: fetch n+1 to determine hasMore
  // This is a key A3 pattern — asks for 1 extra record to know
  // if there are more pages without a separate count query
}
```

### Firebase REST Adapter

```typescript
// app/adapters/firebase.ts
import RESTAdapter from '@ember-data/adapter/rest';

export default class FirebaseAdapter extends RESTAdapter {
  // Calls Cloud Functions HTTP endpoints
  // Used by: stripe, mailgun, pandadoc, etc.
}
```

### Custom Adapters

```typescript
// app/adapters/stripe/customer.ts
import FirebaseAdapter from '../firebase';

export default class StripeCustomerAdapter extends FirebaseAdapter {
  namespace = 'api/stripe';
  // Routes: /api/stripe/customers, /api/stripe/customers/:id
}
```

---

## Serializers — A3 Configuration

### CloudFirestoreSerializer (Default)

```typescript
// app/serializers/application.ts
import CloudFirestoreSerializer from 'ember-cloud-firestore-adapter/serializers/cloud-firestore';

export default class ApplicationSerializer extends CloudFirestoreSerializer {
  // Handles Firestore-specific data transformations:
  // - Server timestamps on new records
  // - Meta object extraction for pagination
  // - Relationship reference resolution
}
```

### Custom Serializers

```typescript
// app/serializers/stripe/customer.ts
import RESTSerializer from '@ember-data/serializer/rest';

export default class StripeCustomerSerializer extends RESTSerializer {
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    // Transform Stripe API response to Ember Data format
  }
}
```

---

## Firestore-Specific Patterns

### Collection References

In Firestore, collections are top-level or subcollections:
- `clients` — top-level collection
- `clients/{id}/notes` — subcollection
- `clients/{id}/files` — subcollection

The ember-cloud-firestore-adapter maps:
- `belongsTo` — document reference field
- `hasMany` — subcollection query OR reference array

### Real-Time Updates

The ember-cloud-firestore-adapter supports real-time listeners:
- Records fetched with `findRecord` can receive live updates
- The store auto-updates when Firestore documents change
- Components re-render automatically via tracked properties
- Listeners are automatically cleaned up when records are unloaded

### Firestore Query Limitations

- **No JOINs** — must load related records separately
- **No OR queries across fields** — use composite indexes or multiple queries
- **Inequality filters** on only one field per query
- **orderBy** requires matching indexes for filtered queries
- **Pagination** via startAfter/limit, not offset (A3's n+1 pattern wraps this)
- **Array membership** — `array-contains` for single value, `array-contains-any` for up to 10 values
- **In queries** — `in` for up to 10 values on a single field

### Index Requirements

Complex queries need composite indexes defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "enrollments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

When a query requires an index that does not exist, Firestore returns an error with a direct link to create the index in the Firebase console.

---

## Further Investigation

- **WarpDrive Docs**: https://github.com/emberjs/data
- **Ember Data Guides**: https://guides.emberjs.com/release/models/
- **ember-cloud-firestore-adapter**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Data Model**: https://firebase.google.com/docs/firestore/data-model
- **JSON:API Specification**: https://jsonapi.org/
- **WarpDrive RFC Tracking**: https://github.com/emberjs/data/labels/RFC
