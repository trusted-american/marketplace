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
