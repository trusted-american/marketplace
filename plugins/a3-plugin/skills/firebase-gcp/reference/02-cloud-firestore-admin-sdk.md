## Cloud Firestore (Admin SDK)

### Initialization

```typescript
import { getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

// Auto-initialized in Cloud Functions environment
const db = getFirestore();

// Or with explicit project
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Named database (multi-database)
const secondaryDb = getFirestore('secondary-db');
```

### Document Model

Firestore is a NoSQL document database:
- **Collections** contain **Documents**
- **Documents** contain **Fields** and **Subcollections**
- Documents have a maximum size of 1 MiB (1,048,576 bytes)
- Collection names and document IDs are strings (max 1500 bytes for ID)
- A document path can have at most 100 segments
- Maximum depth of subcollections: 100 levels
- A single document can hold up to 40,000 index entries

### Data Types

| Firestore Type | TypeScript | Admin SDK Import | Ember Transform |
|---------------|------------|------------------|-----------------|
| String | `string` | — | `'string'` |
| Number (integer) | `number` | — | `'number'` |
| Number (float) | `number` | — | `'number'` |
| Boolean | `boolean` | — | `'boolean'` |
| Timestamp | `Timestamp` | `firebase-admin/firestore` | `'date'` or `'null-timestamp'` |
| GeoPoint | `GeoPoint` | `firebase-admin/firestore` | custom |
| Reference | `DocumentReference` | `firebase-admin/firestore` | `belongsTo` |
| Array | `any[]` | — | `attr()` |
| Map (object) | `Record<string, any>` | — | `attr()` |
| Null | `null` | — | `'null-timestamp'` for dates |
| Bytes | `Buffer` | — | custom |

### A3 Collection Structure

```
firestore/
├── agencies/                 # Insurance agencies
│   └── {agencyId}/
│       ├── notes/            # Agency notes (subcollection)
│       └── files/            # Agency files (subcollection)
├── carriers/                 # Insurance carriers
├── clients/                  # Contacts/clients
│   └── {clientId}/
│       ├── notes/
│       ├── files/
│       ├── enrollments/
│       └── activities/
├── contracts/                # Agent-carrier contracts
├── enrollments/              # Insurance enrollments
│   └── {enrollmentId}/
│       ├── notes/
│       └── files/
├── groups/                   # Group insurance
├── licenses/                 # Agent licenses
├── memberships/              # Client memberships
├── quotes/                   # Insurance quotes
├── statements/               # Commission statements
├── tickets/                  # Support tickets
├── transactions/             # Financial transactions
├── users/                    # Platform users
├── activities/               # Audit trail
├── messages/                 # Internal messages
├── events/                   # Calendar/marketing events
├── inquiries/                # Lead inquiries
├── notifications/            # Push/email notifications
├── reports/                  # Generated reports
├── imports/                  # Bulk import records
├── exports/                  # Data export jobs
├── settings/                 # App-level settings docs
├── counters/                 # Distributed counters
└── migrations/               # Data migration tracking
```

---

### DocumentReference API

A `DocumentReference` points to a single document.

```typescript
// Creating a reference
const docRef: DocumentReference = db.doc('clients/client_abc');
const docRef2 = db.collection('clients').doc('client_abc');
const autoIdRef = db.collection('clients').doc(); // Auto-generated ID

// Properties
docRef.id;        // 'client_abc'
docRef.path;      // 'clients/client_abc'
docRef.parent;    // CollectionReference to 'clients'
docRef.firestore; // Firestore instance

// Get document
const snapshot: DocumentSnapshot = await docRef.get();

// Set document (overwrite or create)
await docRef.set({ firstName: 'John', lastName: 'Doe', status: 'active' });

// Set with merge (partial update, creates if missing)
await docRef.set({ status: 'inactive' }, { merge: true });

// Set with mergeFields (only merge specific fields)
await docRef.set(
  { firstName: 'John', lastName: 'Doe', status: 'active', updatedAt: Timestamp.now() },
  { mergeFields: ['status', 'updatedAt'] }
);

// Update document (fails if document does not exist)
await docRef.update({ status: 'active' });

// Update nested fields with dot notation
await docRef.update({
  'address.city': 'Miami',
  'address.state': 'FL',
  'metadata.lastLogin': Timestamp.now(),
});

// Delete document
await docRef.delete();

// Delete with precondition
await docRef.delete({ lastUpdateTime: snapshot.updateTime });

// Access subcollection
const notesRef: CollectionReference = docRef.collection('notes');

// List subcollections of a document
const subcollections: CollectionReference[] = await docRef.listCollections();
// Returns: [notesRef, filesRef, activitiesRef, ...]
```

### CollectionReference API

A `CollectionReference` points to a collection and extends `Query`.

```typescript
// Creating a reference
const colRef: CollectionReference = db.collection('clients');
const subColRef = db.doc('clients/client_abc').collection('notes');

// Properties
colRef.id;        // 'clients'
colRef.path;      // 'clients'
colRef.parent;    // null for root collections, DocumentReference for subcollections
subColRef.parent; // DocumentReference to 'clients/client_abc'

// Add document with auto-generated ID
const newDocRef = await colRef.add({
  firstName: 'Jane',
  lastName: 'Smith',
  createdAt: Timestamp.now(),
});
// newDocRef.id is the auto-generated ID

// Get a specific document reference
const docRef = colRef.doc('client_abc');

// List all documents (includes missing documents that have subcollections)
const documentRefs: DocumentReference[] = await colRef.listDocuments();

// Get all documents in collection (paginated in practice)
const snapshot: QuerySnapshot = await colRef.get();
```

### DocumentSnapshot API

Returned from `get()` operations on a `DocumentReference`.

```typescript
const snapshot: DocumentSnapshot = await db.doc('clients/client_abc').get();

// Properties
snapshot.id;          // 'client_abc'
snapshot.ref;         // DocumentReference
snapshot.exists;      // boolean — true if document exists
snapshot.createTime;  // Timestamp | undefined — when document was created
snapshot.updateTime;  // Timestamp | undefined — when document was last updated
snapshot.readTime;    // Timestamp — when the read was performed

// Get all data
const data: DocumentData | undefined = snapshot.data();

// Get specific field
const name: any = snapshot.get('firstName');
const city: any = snapshot.get('address.city'); // Nested field access

// Check if field exists
if (snapshot.get('email') !== undefined) {
  // field exists
}

// isEqual
snapshot.isEqual(otherSnapshot); // Deep comparison
```

### QuerySnapshot API

Returned from `get()` operations on a `Query` or `CollectionReference`.

```typescript
const querySnapshot: QuerySnapshot = await db.collection('clients')
  .where('status', '==', 'active')
  .get();

// Properties
querySnapshot.size;     // Number of documents
querySnapshot.empty;    // true if no results
querySnapshot.readTime; // Timestamp of the read
querySnapshot.query;    // The original Query that produced this snapshot

// Access documents
querySnapshot.docs;     // Array of QueryDocumentSnapshot

// Iterate
querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
  console.log(doc.id, doc.data());
});

// Get changes (useful for onSnapshot listeners)
const changes: DocumentChange[] = querySnapshot.docChanges();
changes.forEach((change) => {
  change.type;     // 'added' | 'modified' | 'removed'
  change.doc;      // QueryDocumentSnapshot
  change.oldIndex; // Previous index in results (-1 for added)
  change.newIndex; // New index in results (-1 for removed)
});
```

### QueryDocumentSnapshot API

Like `DocumentSnapshot` but guaranteed to exist (returned from query results).

```typescript
// data() is guaranteed to return DocumentData (never undefined)
querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
  const data: DocumentData = doc.data(); // Never undefined
  // All DocumentSnapshot properties are also available
});
```

---

### Query Operators — Full Reference

#### where() — Comparison Operators

```typescript
const col = db.collection('enrollments');

// Equality
col.where('status', '==', 'active')

// Not equal
col.where('status', '!=', 'cancelled')

// Less than
col.where('premium', '<', 500)

// Less than or equal
col.where('premium', '<=', 500)

// Greater than
col.where('createdAt', '>', startDate)

// Greater than or equal
col.where('createdAt', '>=', startDate)

// Array contains — document's array field contains a specific value
col.where('tags', 'array-contains', 'health')

// Array contains any — document's array field contains ANY of the specified values
col.where('tags', 'array-contains-any', ['health', 'dental', 'vision'])
// Limited to 30 disjunction values

// In — field value matches any value in the array
col.where('status', 'in', ['active', 'pending', 'review'])
// Limited to 30 disjunction values

// Not in — field value does NOT match any value in the array
col.where('status', 'not-in', ['cancelled', 'expired', 'deleted'])
// Limited to 10 values; excludes documents where field does not exist
```

#### where() — Combining Filters

```typescript
// Multiple where clauses (AND logic)
db.collection('enrollments')
  .where('status', '==', 'active')
  .where('agencyId', '==', 'agency_abc')
  .where('createdAt', '>=', startOfYear)

// Composite filter with AND (explicit)
db.collection('enrollments')
  .where(
    Filter.and(
      Filter.where('status', '==', 'active'),
      Filter.where('agencyId', '==', 'agency_abc')
    )
  )

// Composite filter with OR
db.collection('enrollments')
  .where(
    Filter.or(
      Filter.where('status', '==', 'active'),
      Filter.where('status', '==', 'pending')
    )
  )

// Nested AND/OR
db.collection('enrollments')
  .where(
    Filter.and(
      Filter.where('agencyId', '==', 'agency_abc'),
      Filter.or(
        Filter.where('status', '==', 'active'),
        Filter.where('status', '==', 'pending')
      )
    )
  )
```

#### Query Constraints

```typescript
// Limitations on combining operators:
// 1. Only one inequality field per query (unless composite index covers it)
// 2. Only one array-contains per query
// 3. Only one array-contains-any or in per query (they share a slot)
// 4. not-in and != cannot be combined
// 5. not-in and not-in cannot be combined
// 6. in, not-in, and array-contains-any combined: max 30 disjunction values total
```

#### orderBy()

```typescript
// Single field ordering
db.collection('clients')
  .orderBy('lastName', 'asc')

// Multiple field ordering
db.collection('enrollments')
  .orderBy('status', 'asc')
  .orderBy('createdAt', 'desc')

// IMPORTANT: orderBy field must match inequality filter field (or be the first orderBy)
db.collection('enrollments')
  .where('premium', '>', 100)
  .orderBy('premium', 'asc')  // Must order by the inequality field first
  .orderBy('createdAt', 'desc')

// orderBy with documentId
db.collection('clients')
  .orderBy('__name__') // Order by document ID
```

#### limit() and limitToLast()

```typescript
// Limit results from the start
db.collection('clients')
  .orderBy('createdAt', 'desc')
  .limit(25)

// Limit results from the end (requires at least one orderBy)
db.collection('clients')
  .orderBy('createdAt', 'desc')
  .limitToLast(25)
// Returns last 25 results of the ordered set (i.e., the 25 oldest)
```

#### Pagination Cursors: startAt, startAfter, endAt, endBefore

```typescript
// Start at a specific value (inclusive)
db.collection('clients')
  .orderBy('lastName')
  .startAt('M')

// Start after a specific value (exclusive)
db.collection('clients')
  .orderBy('lastName')
  .startAfter('Martinez')

// End at a specific value (inclusive)
db.collection('clients')
  .orderBy('lastName')
  .endAt('N')

// End before a specific value (exclusive)
db.collection('clients')
  .orderBy('lastName')
  .endBefore('O')

// Cursor with DocumentSnapshot (most common pagination pattern)
const firstPage = await db.collection('clients')
  .orderBy('createdAt', 'desc')
  .limit(25)
  .get();

const lastDoc = firstPage.docs[firstPage.docs.length - 1];

const secondPage = await db.collection('clients')
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc)
  .limit(25)
  .get();

// Multi-field cursor
db.collection('enrollments')
  .orderBy('status')
  .orderBy('createdAt', 'desc')
  .startAfter('active', someTimestamp)
```

#### offset()

```typescript
// Skip first N results (use sparingly — still reads and charges for skipped docs)
db.collection('clients')
  .orderBy('createdAt', 'desc')
  .offset(100)
  .limit(25)
// WARNING: offset is expensive. Prefer cursor-based pagination with startAfter.
```

#### Collection Group Queries

```typescript
// Query across ALL subcollections with the same name
// e.g., query all 'notes' regardless of parent document
const allNotes = await db.collectionGroup('notes')
  .where('createdAt', '>=', startDate)
  .orderBy('createdAt', 'desc')
  .limit(100)
  .get();

// Requires a collection group index in firestore.indexes.json
// The parent path is available via doc.ref.parent.parent
allNotes.forEach((doc) => {
  const parentDocRef = doc.ref.parent.parent; // e.g., clients/client_abc
  console.log(`Note ${doc.id} belongs to ${parentDocRef?.path}`);
});
```

#### select() — Field Projection

```typescript
// Only return specific fields (reduces bandwidth and cost)
const snapshot = await db.collection('clients')
  .select('firstName', 'lastName', 'email')
  .get();
// Documents will only contain selected fields plus __name__
```

---

### Aggregation Queries

```typescript
import { AggregateField, getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Count
const countResult = await db.collection('enrollments')
  .where('status', '==', 'active')
  .count()
  .get();
const totalCount: number = countResult.data().count;

// Sum
const sumResult = await db.collection('transactions')
  .where('agencyId', '==', 'agency_abc')
  .where('type', '==', 'commission')
  .aggregate({
    totalAmount: AggregateField.sum('amount'),
  })
  .get();
const total: number = sumResult.data().totalAmount;

// Average
const avgResult = await db.collection('enrollments')
  .where('carrierId', '==', 'carrier_xyz')
  .aggregate({
    averagePremium: AggregateField.average('premium'),
  })
  .get();
const avg: number | null = avgResult.data().averagePremium;

// Multiple aggregations in one query
const multiResult = await db.collection('transactions')
  .where('agencyId', '==', 'agency_abc')
  .aggregate({
    count: AggregateField.count(),
    totalAmount: AggregateField.sum('amount'),
    avgAmount: AggregateField.average('amount'),
  })
  .get();
const { count, totalAmount, avgAmount } = multiResult.data();

// Aggregation on collection group
const groupResult = await db.collectionGroup('notes')
  .where('authorId', '==', 'user_abc')
  .count()
  .get();
```

**Aggregation limits:**
- Up to 5 aggregations per query
- Does not count toward document read costs (charged per index entries scanned)
- Cannot be used with `limit()`, `limitToLast()`, or cursors

---

### Firestore Timestamps

```typescript
import { Timestamp } from 'firebase-admin/firestore';

// Create timestamp for "now"
const now: Timestamp = Timestamp.now();

// Create from JavaScript Date
const ts: Timestamp = Timestamp.fromDate(new Date('2025-01-15T10:30:00Z'));

// Create from seconds and nanoseconds
const ts2: Timestamp = new Timestamp(1705312200, 0);

// Create from milliseconds
const ts3: Timestamp = Timestamp.fromMillis(1705312200000);

// Properties
ts.seconds;      // number — seconds since epoch
ts.nanoseconds;  // number — nanoseconds adjustment (0-999999999)

// Conversion methods
ts.toDate();     // JavaScript Date object
ts.toMillis();   // number — milliseconds since epoch
ts.valueOf();    // string representation

// Comparison
ts.isEqual(ts2);                  // boolean
Timestamp.now() > Timestamp.fromDate(pastDate); // Does NOT work — use toMillis()
ts.toMillis() > ts2.toMillis();   // Correct comparison

// Using in queries
db.collection('enrollments')
  .where('createdAt', '>=', Timestamp.fromDate(startDate))
  .where('createdAt', '<', Timestamp.fromDate(endDate))

// Storing timestamps
await db.doc('clients/abc').set({
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  dateOfBirth: Timestamp.fromDate(new Date('1990-05-15')),
});
```

---

### FieldValue Sentinels

FieldValue sentinels are special values that tell Firestore to perform server-side operations.

```typescript
import { FieldValue } from 'firebase-admin/firestore';

// Server timestamp — set to the server's current time at commit
await db.doc('clients/abc').update({
  updatedAt: FieldValue.serverTimestamp(),
  'metadata.lastModified': FieldValue.serverTimestamp(),
});

// Increment — atomically increase/decrease a numeric field
await db.doc('counters/enrollments').update({
  total: FieldValue.increment(1),
});
await db.doc('agencies/abc').update({
  balance: FieldValue.increment(-50.25), // Decrement with negative value
});

// Array union — add elements to an array (no duplicates)
await db.doc('clients/abc').update({
  tags: FieldValue.arrayUnion('vip', 'health'),
  // If tags was ['dental'], it becomes ['dental', 'vip', 'health']
  // If 'vip' already existed, it won't be duplicated
});

// Array remove — remove elements from an array
await db.doc('clients/abc').update({
  tags: FieldValue.arrayRemove('inactive', 'test'),
  // Removes all instances of 'inactive' and 'test' from the array
});

// Delete — remove a field entirely from a document
await db.doc('clients/abc').update({
  legacyField: FieldValue.delete(),
  'metadata.deprecatedKey': FieldValue.delete(),
});

// Combining multiple sentinels in one update
await db.doc('enrollments/enr_abc').update({
  updatedAt: FieldValue.serverTimestamp(),
  viewCount: FieldValue.increment(1),
  tags: FieldValue.arrayUnion('reviewed'),
  tempData: FieldValue.delete(),
});
```

---

### Batch Reads — getAll()

```typescript
// Read multiple documents in a single round-trip
const refs = [
  db.doc('clients/client_1'),
  db.doc('clients/client_2'),
  db.doc('clients/client_3'),
  db.doc('agencies/agency_abc'),  // Can mix collections
];
const snapshots: DocumentSnapshot[] = await db.getAll(...refs);

snapshots.forEach((snap) => {
  if (snap.exists) {
    console.log(snap.id, snap.data());
  } else {
    console.log(`${snap.id} does not exist`);
  }
});

// With field mask (only fetch specific fields)
const snapshots2 = await db.getAll(
  db.doc('clients/client_1'),
  db.doc('clients/client_2'),
  { fieldMask: ['firstName', 'lastName', 'email'] }
);
```

---

### Batch Writes

```typescript
// WriteBatch — atomic writes, up to 500 operations
const batch = db.batch();

batch.set(db.doc('clients/new_id'), {
  firstName: 'John',
  lastName: 'Doe',
  createdAt: Timestamp.now(),
});

batch.set(db.doc('clients/existing_id'), { status: 'active' }, { merge: true });

batch.update(db.doc('enrollments/enr_abc'), {
  status: 'approved',
  updatedAt: FieldValue.serverTimestamp(),
});

batch.delete(db.doc('clients/old_id'));

// Create in subcollection
batch.set(db.doc('clients/client_abc/notes/note_1'), {
  text: 'Follow up needed',
  createdAt: Timestamp.now(),
});

// Commit atomically — all succeed or all fail
const writeResults: WriteResult[] = await batch.commit();
// writeResults[i].writeTime — Timestamp of the write
```

---

### Transactions — runTransaction()

Transactions provide atomic read-then-write semantics with optimistic locking.

```typescript
// Basic transaction
const result = await db.runTransaction(async (transaction) => {
  // All reads MUST happen before writes in a transaction
  const enrollmentDoc = await transaction.get(db.doc('enrollments/enr_abc'));
  const counterDoc = await transaction.get(db.doc('counters/enrollments'));

  if (!enrollmentDoc.exists) {
    throw new Error('Enrollment not found');
  }

  const currentCount = counterDoc.data()?.activeCount || 0;

  // Writes
  transaction.update(db.doc('enrollments/enr_abc'), {
    status: 'active',
    activatedAt: Timestamp.now(),
  });

  transaction.update(db.doc('counters/enrollments'), {
    activeCount: currentCount + 1,
  });

  return { newCount: currentCount + 1 };
});

console.log('New active count:', result.newCount);

// Transaction options
await db.runTransaction(
  async (transaction) => {
    // ... transaction body
  },
  {
    maxAttempts: 5,  // Default is 5; Firestore retries on contention
    readOnly: false, // Set true for read-only transactions (better performance)
    readTime: Timestamp.now(), // For read-only: read at a consistent point in time
  }
);

// Read-only transaction (no writes allowed, but consistent snapshot)
await db.runTransaction(
  async (transaction) => {
    const doc1 = await transaction.get(db.doc('clients/abc'));
    const doc2 = await transaction.get(db.doc('enrollments/enr_abc'));
    // Both reads are from the same consistent snapshot
    return { client: doc1.data(), enrollment: doc2.data() };
  },
  { readOnly: true }
);

// Transaction methods available:
// transaction.get(ref)           — Read a document
// transaction.getAll(...refs)    — Read multiple documents
// transaction.set(ref, data)     — Set a document
// transaction.update(ref, data)  — Update a document
// transaction.delete(ref)        — Delete a document
// transaction.create(ref, data)  — Create (fails if exists)
```

**Transaction rules:**
- Maximum 500 writes per transaction
- All reads must precede all writes
- Transactions fail if a read document is modified by another client before the write commits
- Firestore automatically retries (up to maxAttempts)
- Transactions hold no locks; they use optimistic concurrency control
- Transaction function must be idempotent (it may be called multiple times)

---

### BulkWriter

`BulkWriter` is optimized for large volumes of writes with automatic throttling and retry.

```typescript
const bulkWriter = db.bulkWriter();

// Set throttling options
bulkWriter.onWriteResult((ref, result) => {
  console.log(`Wrote ${ref.path} at ${result.writeTime.toDate()}`);
});
bulkWriter.onWriteError((error) => {
  if (error.failedAttempts < 3) {
    return true; // Retry
  }
  console.error(`Failed to write ${error.documentRef.path}:`, error.message);
  return false; // Don't retry
});

// Queue writes (non-blocking)
for (const client of largeClientList) {
  bulkWriter.set(db.doc(`clients/${client.id}`), {
    ...client,
    migratedAt: Timestamp.now(),
  });
}

// Flush all pending writes
await bulkWriter.flush();

// Close the writer (flushes and prevents new writes)
await bulkWriter.close();

// BulkWriter with throttling configuration
const throttledWriter = db.bulkWriter();
throttledWriter.set(db.doc('test/doc'), { data: true });
// BulkWriter automatically handles:
// - Rate limiting to stay under Firestore write quotas
// - Exponential backoff on failures
// - Parallel writes for throughput
```

---

### recursiveDelete()

Delete a document and all of its subcollections recursively.

```typescript
// Delete a document and ALL subcollections
await db.recursiveDelete(db.doc('clients/client_abc'));
// This deletes: clients/client_abc, clients/client_abc/notes/*, clients/client_abc/files/*, etc.

// Delete an entire collection
await db.recursiveDelete(db.collection('temp_imports'));

// With custom BulkWriter for progress tracking
const bulkWriter = db.bulkWriter();
let deletedCount = 0;
bulkWriter.onWriteResult(() => { deletedCount++; });

await db.recursiveDelete(db.doc('clients/client_abc'), bulkWriter);
console.log(`Deleted ${deletedCount} documents`);
```

---

### listCollections() and listDocuments()

```typescript
// List all root-level collections
const rootCollections: CollectionReference[] = await db.listCollections();
rootCollections.forEach((col) => {
  console.log(col.id); // 'agencies', 'carriers', 'clients', ...
});

// List subcollections of a document
const subcollections = await db.doc('clients/client_abc').listCollections();
subcollections.forEach((col) => {
  console.log(col.id); // 'notes', 'files', 'activities', ...
});

// List documents in a collection (includes "missing" documents that have subcollections)
const docRefs: DocumentReference[] = await db.collection('clients').listDocuments();
docRefs.forEach((ref) => {
  console.log(ref.id);
});
```

---

### Realtime Listeners in Admin SDK — onSnapshot

The Admin SDK supports realtime listeners, though they are less common in Cloud Functions due to function lifecycle.

```typescript
// Listen to a single document
const unsubscribe = db.doc('settings/app_config').onSnapshot((snapshot) => {
  if (snapshot.exists) {
    const config = snapshot.data();
    console.log('Config updated:', config);
  }
});

// Listen to a query
const unsubscribeQuery = db.collection('enrollments')
  .where('status', '==', 'pending')
  .onSnapshot((querySnapshot) => {
    querySnapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New pending enrollment:', change.doc.id);
      }
      if (change.type === 'modified') {
        console.log('Updated pending enrollment:', change.doc.id);
      }
      if (change.type === 'removed') {
        console.log('No longer pending:', change.doc.id);
      }
    });
  }, (error) => {
    console.error('Listener error:', error);
  });

// Stop listening
unsubscribe();
unsubscribeQuery();

// Use case: long-running processes, local scripts, or admin tools
// NOT recommended inside short-lived Cloud Functions (use triggers instead)
```

---

### Firestore Composite Indexes

#### Index Types

1. **Single-field indexes** — Automatically created for every field. Support equality and range queries on a single field.
2. **Composite indexes** — Must be manually defined. Required when querying on multiple fields with ordering or inequality conditions.
3. **Collection group indexes** — For `collectionGroup()` queries across subcollections.

#### firestore.indexes.json

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
    },
    {
      "collectionGroup": "enrollments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "agencyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "agencyId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clients",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "agencyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "lastName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notes",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "activities",
      "fieldPath": "metadata",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" }
      ]
    }
  ]
}
```

#### Index rules:
- Maximum 200 composite indexes per database
- Maximum 40,000 index entries per document
- Maximum index entry size: 7.5 KiB
- Maximum size of all index entries for a document: 8 MiB
- Deploy with `firebase deploy --only firestore:indexes`
- When a query needs a missing index, Firestore returns an error with a direct URL to create it

#### Exemptions

You can exempt fields from indexing to save index entry costs:

```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "logs",
      "fieldPath": "rawPayload",
      "indexes": []
    }
  ]
}
```

---

### Firestore Backup and Export

#### Export to Cloud Storage (for backups)

```typescript
import { v1 } from '@google-cloud/firestore';

const firestoreAdmin = new v1.FirestoreAdminClient();

// Export all collections
const [operation] = await firestoreAdmin.exportDocuments({
  name: `projects/${projectId}/databases/(default)`,
  outputUriPrefix: `gs://${backupBucket}/firestore-backups/${Date.now()}`,
});

// Export specific collections
const [operation2] = await firestoreAdmin.exportDocuments({
  name: `projects/${projectId}/databases/(default)`,
  outputUriPrefix: `gs://${backupBucket}/firestore-backups/${Date.now()}`,
  collectionIds: ['clients', 'enrollments', 'transactions'],
});

// Wait for completion
await operation.promise();
console.log('Export complete');
```

#### Import from backup

```typescript
const [importOp] = await firestoreAdmin.importDocuments({
  name: `projects/${projectId}/databases/(default)`,
  inputUriPrefix: `gs://${backupBucket}/firestore-backups/1705312200000`,
  collectionIds: ['clients'], // Optional: import specific collections
});

await importOp.promise();
```

#### Scheduled backup pattern (A3)

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const scheduledFirestoreBackup = onSchedule(
  { schedule: 'every day 02:00', timeZone: 'America/New_York' },
  async () => {
    const firestoreAdmin = new v1.FirestoreAdminClient();
    const timestamp = new Date().toISOString().split('T')[0];

    await firestoreAdmin.exportDocuments({
      name: `projects/${projectId}/databases/(default)`,
      outputUriPrefix: `gs://${backupBucket}/automated/${timestamp}`,
      collectionIds: [
        'agencies', 'carriers', 'clients', 'contracts',
        'enrollments', 'groups', 'licenses', 'memberships',
        'quotes', 'statements', 'tickets', 'transactions', 'users',
      ],
    });
  }
);
```

---

### Firestore Limitations

- Max document size: 1 MiB
- Max write rate per document: 1 write/second sustained (can burst higher)
- Max batch/transaction size: 500 operations
- Max `in`/`array-contains-any` values: 30 disjunction values
- Only one `array-contains` per query
- Only one inequality field per compound query (unless index covers it; Firestore now supports multiple inequality fields with proper composite indexes)
- No native full-text search (A3 uses Algolia)
- Document fields limited to 20 nesting levels
- Maximum number of composite indexes: 200
- Maximum index entry size: 7.5 KiB
- Collection group queries require explicit indexes

---
