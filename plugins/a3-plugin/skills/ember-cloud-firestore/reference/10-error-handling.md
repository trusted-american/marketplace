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
