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
