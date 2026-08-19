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
