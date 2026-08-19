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
