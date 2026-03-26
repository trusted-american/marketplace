---
name: firebase-gcp
description: Deep Firebase and Google Cloud Platform reference — Firestore Admin SDK (every method, query operator, aggregation, timestamp, FieldValue), Authentication Admin (full user management, token operations, custom claims), Cloud Storage Admin (bucket operations, signed URLs, metadata), Realtime Database, Security Rules, indexes, backup/export, and GCP service configuration
version: 0.2.0
---

# Firebase & GCP Reference

firebase-admin is imported in 117 backend files and is the backbone of A3's entire server-side architecture. This skill covers every Admin SDK method, pattern, and GCP service used across the codebase.

## Firebase Project Structure

A3 uses the following Firebase services:
- **Cloud Firestore** — Primary NoSQL document database (the core of all data)
- **Firebase Authentication** — User auth with MFA, custom claims, blocking functions
- **Cloud Storage** — File/document storage with signed URLs
- **Realtime Database** — Status/presence tracking, ephemeral state
- **Cloud Functions** — Serverless backend (see cloud-functions skill)
- **Firebase Emulator Suite** — Local development and testing

---

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

## Firebase Authentication (Admin SDK)

### Initialization

```typescript
import { getAuth } from 'firebase-admin/auth';

const auth = getAuth();
```

### Create User

```typescript
// Create with email/password
const userRecord = await auth.createUser({
  email: 'user@example.com',
  emailVerified: false,
  phoneNumber: '+15551234567',
  password: 'secretPassword!',
  displayName: 'John Doe',
  photoURL: 'https://example.com/photo.jpg',
  disabled: false,
});
console.log('Created user:', userRecord.uid);

// Create with specific UID
const userRecord2 = await auth.createUser({
  uid: 'custom-uid-123',
  email: 'custom@example.com',
  password: 'password123',
});
```

### Get User

```typescript
// By UID
const user = await auth.getUser('uid-123');

// By email
const user2 = await auth.getUserByEmail('user@example.com');

// By phone number
const user3 = await auth.getUserByPhoneNumber('+15551234567');

// Get multiple users at once
const getUsersResult = await auth.getUsers([
  { uid: 'uid-1' },
  { email: 'user2@example.com' },
  { phoneNumber: '+15551234567' },
]);
getUsersResult.users.forEach((user) => console.log(user.uid));
getUsersResult.notFound.forEach((id) => console.log('Not found:', id));

// UserRecord properties
user.uid;              // string
user.email;            // string | undefined
user.emailVerified;    // boolean
user.displayName;      // string | undefined
user.phoneNumber;      // string | undefined
user.photoURL;         // string | undefined
user.disabled;         // boolean
user.metadata.creationTime;    // string (RFC 2822)
user.metadata.lastSignInTime;  // string (RFC 2822)
user.metadata.lastRefreshTime; // string | null
user.providerData;     // UserInfo[] (linked providers)
user.customClaims;     // Record<string, any> | undefined
user.tokensValidAfterTime; // string (RFC 2822)
user.tenantId;         // string | null
user.multiFactor;      // MultiFactorSettings
```

### Update User

```typescript
await auth.updateUser('uid-123', {
  email: 'newemail@example.com',
  emailVerified: true,
  phoneNumber: '+15559876543',
  password: 'newPassword!',
  displayName: 'Jane Doe',
  photoURL: 'https://example.com/new-photo.jpg',
  disabled: false,
});

// Remove optional fields by setting to null
await auth.updateUser('uid-123', {
  phoneNumber: null,   // Removes phone number
  photoURL: null,      // Removes photo URL
  displayName: null,   // Removes display name
});
```

### Delete User

```typescript
// Delete single user
await auth.deleteUser('uid-123');

// Delete multiple users (batch delete, up to 1000)
const deleteResult = await auth.deleteUsers(['uid-1', 'uid-2', 'uid-3']);
console.log(`Deleted ${deleteResult.successCount} users`);
console.log(`Failed to delete ${deleteResult.failureCount} users`);
deleteResult.errors.forEach((error) => {
  console.error(`Failed to delete ${error.index}:`, error.error);
});
```

### List Users

```typescript
// List users in batches
const listUsersResult = await auth.listUsers(1000); // maxResults (up to 1000)
listUsersResult.users.forEach((user) => {
  console.log(user.uid, user.email);
});

// Paginate
let pageToken: string | undefined;
do {
  const result = await auth.listUsers(1000, pageToken);
  result.users.forEach((user) => { /* process */ });
  pageToken = result.pageToken;
} while (pageToken);
```

### Custom Tokens

```typescript
// Create a custom token for a user (used for custom auth flows)
const customToken = await auth.createCustomToken('uid-123');

// With additional claims embedded in the token
const customToken2 = await auth.createCustomToken('uid-123', {
  admin: true,
  agencyId: 'agency_abc',
  role: 'manager',
});
// Client signs in with: signInWithCustomToken(auth, customToken)
```

### Verify ID Token

```typescript
// Verify token (checks signature, expiration, audience, issuer)
const decodedToken = await auth.verifyIdToken(idToken);
const uid = decodedToken.uid;
const email = decodedToken.email;
const claims = decodedToken; // All custom claims are on the token

// Check if token has been revoked
const decodedToken2 = await auth.verifyIdToken(idToken, true); // checkRevoked = true
// Throws auth/id-token-revoked if the token has been revoked

// DecodedIdToken properties
decodedToken.uid;           // string
decodedToken.email;         // string | undefined
decodedToken.email_verified;// boolean
decodedToken.phone_number;  // string | undefined
decodedToken.name;          // string | undefined
decodedToken.picture;       // string | undefined
decodedToken.iss;           // string (issuer)
decodedToken.aud;           // string (audience = project ID)
decodedToken.auth_time;     // number (seconds since epoch)
decodedToken.iat;           // number (issued at)
decodedToken.exp;           // number (expiration)
decodedToken.firebase;      // { sign_in_provider, identities, ... }
// Plus any custom claims set via setCustomClaims
```

### Custom Claims

```typescript
// Set custom claims (replaces all existing custom claims)
await auth.setCustomClaims('uid-123', {
  admin: true,
  agencyId: 'agency_abc',
  role: 'owner',
  permissions: ['read', 'write', 'delete', 'manage_users'],
});

// Remove all custom claims
await auth.setCustomClaims('uid-123', null);

// Read custom claims
const user = await auth.getUser('uid-123');
const claims = user.customClaims; // { admin: true, agencyId: 'agency_abc', ... }

// Claims are included in the ID token (available in security rules and client)
// Max custom claims payload: 1000 bytes
// Claims propagate on next token refresh (~1 hour) unless client forces refresh
```

### Revoke Refresh Tokens

```typescript
// Revoke all refresh tokens for a user (force re-authentication)
await auth.revokeRefreshTokens('uid-123');

// After revoking, existing ID tokens remain valid until they expire (~1 hour)
// Use verifyIdToken with checkRevoked=true to catch revoked tokens immediately
const user = await auth.getUser('uid-123');
const revokeTime = new Date(user.tokensValidAfterTime).getTime() / 1000;
```

### Generate Email Action Links

```typescript
// Generate email verification link
const verificationLink = await auth.generateEmailVerificationLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/verify-complete',
    handleCodeInApp: true,
  }
);
// Send this link via your own email service (e.g., Mailgun)

// Generate password reset link
const resetLink = await auth.generatePasswordResetLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/login',
    handleCodeInApp: true,
  }
);

// Generate sign-in with email link
const signInLink = await auth.generateSignInWithEmailLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/complete-signin',
    handleCodeInApp: true,
  }
);
```

### Session Cookies

```typescript
// Create a session cookie from an ID token
const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in milliseconds
const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

// Verify session cookie
const decodedClaims = await auth.verifySessionCookie(sessionCookie, true); // checkRevoked

// Useful for server-rendered pages or API gateways
```

### A3 Auth Flow

1. User enters email/password on the login page
2. Firebase Auth validates credentials
3. If MFA enabled: user completes phone/TOTP verification
4. On success: JWT ID token issued
5. ember-simple-auth stores token in session
6. Token attached to all Firestore requests and API calls via Authorization header
7. Cloud Functions verify token via `getAuth().verifyIdToken(token)`
8. Custom claims contain agencyId, role, permissions for authorization

### MFA Support

A3 supports multi-factor authentication via Firebase Auth:
- Phone number as second factor (SMS)
- TOTP (time-based one-time password) support
- Configured per-user in user settings
- Enrollment and verification handled in frontend

---

## Cloud Storage (Admin SDK)

### Initialization

```typescript
import { getStorage } from 'firebase-admin/storage';

const storage = getStorage();
const bucket = storage.bucket(); // Default bucket
const customBucket = storage.bucket('my-custom-bucket');
```

### Storage Structure

```
storage/
├── agencies/{agencyId}/
│   ├── files/
│   └── logos/
├── clients/{clientId}/
│   ├── files/
│   └── photos/
├── enrollments/{enrollmentId}/
│   └── files/
├── groups/{groupId}/
│   └── files/
├── statements/{statementId}/
│   └── files/
├── imports/
│   └── {importId}/
├── exports/
│   └── {exportId}/
└── users/{userId}/
    └── avatar/
```

### File Operations

```typescript
const bucket = getStorage().bucket();

// Get a file reference
const file = bucket.file(`clients/${clientId}/files/${fileName}`);

// Upload / save content
await file.save(buffer, {
  contentType: 'application/pdf',
  metadata: {
    metadata: {
      uploadedBy: userId,
      clientId: clientId,
      originalName: 'insurance_application.pdf',
    },
  },
});

// Save from string
await file.save('Hello, world!', { contentType: 'text/plain' });

// Save from stream
const readStream = fs.createReadStream('/tmp/report.pdf');
await new Promise((resolve, reject) => {
  readStream
    .pipe(file.createWriteStream({ contentType: 'application/pdf' }))
    .on('finish', resolve)
    .on('error', reject);
});

// Download file content
const [contents] = await file.download();
// contents is a Buffer

// Download to local file
await file.download({ destination: '/tmp/downloaded.pdf' });

// Check if file exists
const [exists] = await file.exists();

// Get signed URL (temporary access URL)
const [url] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
});

// Signed URL for upload
const [uploadUrl] = await file.getSignedUrl({
  action: 'write',
  expires: Date.now() + 15 * 60 * 1000,
  contentType: 'application/pdf',
});

// Signed URL for delete
const [deleteUrl] = await file.getSignedUrl({
  action: 'delete',
  expires: Date.now() + 15 * 60 * 1000,
});

// Get file metadata
const [metadata] = await file.getMetadata();
console.log(metadata.name);        // File path
console.log(metadata.contentType); // MIME type
console.log(metadata.size);        // Size in bytes
console.log(metadata.updated);     // Last modified timestamp
console.log(metadata.metadata);    // Custom metadata

// Set file metadata
await file.setMetadata({
  contentType: 'application/pdf',
  metadata: {
    processedAt: new Date().toISOString(),
    status: 'scanned',
  },
});

// Delete file
await file.delete();
// Delete with ignoreNotFound
await file.delete({ ignoreNotFound: true });

// Copy file
await file.copy(bucket.file(`backups/clients/${clientId}/files/${fileName}`));
// Copy to another bucket
await file.copy(storage.bucket('archive-bucket').file('path/to/dest'));

// Move file (copy + delete original)
await file.move(bucket.file(`archive/${clientId}/files/${fileName}`));

// Make file publicly readable
await file.makePublic();
// Public URL: https://storage.googleapis.com/{bucket}/{filePath}

// Make file private again
await file.makePrivate();
```

### Listing Files

```typescript
// List files with a prefix
const [files] = await bucket.getFiles({
  prefix: `clients/${clientId}/files/`,
  maxResults: 100,
});
files.forEach((file) => {
  console.log(file.name, file.metadata.size);
});

// List with pagination
const [files, nextQuery] = await bucket.getFiles({
  prefix: 'clients/',
  maxResults: 100,
  autoPaginate: false,
});
if (nextQuery) {
  const [moreFiles] = await bucket.getFiles(nextQuery);
}

// List with delimiter (simulates directory listing)
const [files2, , apiResponse] = await bucket.getFiles({
  prefix: 'clients/',
  delimiter: '/',
});
// apiResponse.prefixes contains "subdirectories"
```

### Upload from Frontend

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const storageRef = ref(storage, `clients/${clientId}/files/${fileName}`);

// Upload file
const snapshot = await uploadBytes(storageRef, file, {
  contentType: file.type,
  customMetadata: { uploadedBy: userId },
});

// Get download URL
const downloadURL = await getDownloadURL(snapshot.ref);
```

---

## Realtime Database

A3 uses Realtime Database primarily for status/presence tracking, which requires persistent connections that Firestore does not natively support.

```typescript
import { getDatabase } from 'firebase-admin/database';

const rtdb = getDatabase();

// Set data
await rtdb.ref(`status/${userId}`).set({
  state: 'online',
  lastSeen: Date.now(),
});

// Update specific fields
await rtdb.ref(`status/${userId}`).update({
  state: 'away',
  lastSeen: Date.now(),
});

// Read data
const snapshot = await rtdb.ref(`status/${userId}`).get();
if (snapshot.exists()) {
  const data = snapshot.val();
}

// Delete
await rtdb.ref(`status/${userId}`).remove();

// Listen for changes
rtdb.ref('status').on('child_changed', (snapshot) => {
  console.log(`${snapshot.key} is now ${snapshot.val().state}`);
});

// Server timestamp
await rtdb.ref(`status/${userId}/lastSeen`).set(
  rtdb.ServerValue.TIMESTAMP
);
```

---

## Security Rules Testing

### Using the Firestore Emulator and Rules Unit Testing

```typescript
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'a3-test',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
    host: 'localhost',
    port: 8080,
  },
});

// Create authenticated context
const aliceDb = testEnv.authenticatedContext('alice', {
  email: 'alice@example.com',
  agencyId: 'agency_abc',
  role: 'admin',
});

// Create unauthenticated context
const unauthDb = testEnv.unauthenticatedContext();

// Test read access
await assertSucceeds(
  aliceDb.firestore().collection('clients').doc('client_1').get()
);

// Test unauthorized access
await assertFails(
  unauthDb.firestore().collection('clients').doc('client_1').get()
);

// Test write access
await assertSucceeds(
  aliceDb.firestore().collection('clients').doc('new_client').set({
    firstName: 'Test',
    agencyId: 'agency_abc',
  })
);

// Test cross-agency access denied
const bobDb = testEnv.authenticatedContext('bob', {
  agencyId: 'agency_other',
  role: 'agent',
});
await assertFails(
  bobDb.firestore().collection('clients').doc('client_1').get()
);

// Cleanup
await testEnv.clearFirestore();
await testEnv.cleanup();
```

### Security Rules Pattern (A3)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own agency's data
    match /clients/{clientId} {
      allow read: if request.auth != null
        && resource.data.agencyId == request.auth.token.agencyId;
      allow create: if request.auth != null
        && request.resource.data.agencyId == request.auth.token.agencyId;
      allow update: if request.auth != null
        && resource.data.agencyId == request.auth.token.agencyId;
      allow delete: if request.auth != null
        && request.auth.token.role == 'admin';
    }
  }
}
```

---

## Environment Configuration

### Firebase Config (Frontend)

Located in `app/config/environment.js`:
```javascript
firebase: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

### Firebase Config (Backend)

Cloud Functions have automatic access to Firebase services via Admin SDK. Environment-specific config via environment variables or Google Secret Manager.

### Emulator Configuration

In `firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "pubsub": { "port": 8085 },
    "database": { "port": 9000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### Connecting to Emulators

```typescript
// Frontend
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';

if (environment === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}

// Backend (auto-detected when running via firebase emulators:exec)
// Set FIRESTORE_EMULATOR_HOST=localhost:8080
// Set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
// Set FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

---

## Further Investigation

- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Firebase Auth Admin**: https://firebase.google.com/docs/auth/admin
- **Cloud Storage Admin**: https://firebase.google.com/docs/storage/admin/start
- **Admin SDK Reference**: https://firebase.google.com/docs/reference/admin/node
- **Security Rules**: https://firebase.google.com/docs/firestore/security/get-started
- **Emulator Suite**: https://firebase.google.com/docs/emulator-suite
- **Firestore Backup**: https://firebase.google.com/docs/firestore/manage-data/export-import
- **Firestore Indexes**: https://firebase.google.com/docs/firestore/query-data/indexing
