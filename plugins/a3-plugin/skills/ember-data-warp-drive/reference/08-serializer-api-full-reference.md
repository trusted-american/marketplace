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
