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
