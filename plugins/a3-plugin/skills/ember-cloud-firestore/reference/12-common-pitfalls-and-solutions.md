## Common Pitfalls and Solutions

### 1. Server Timestamps Return Null Initially

When creating a record with `serverTimestamp()`, Firestore returns a pending sentinel value until the server confirms the write. The `null-timestamp` transform handles this:

```typescript
// Model:
@attr('null-timestamp') declare completedAt: Date | null;

// Without null-timestamp, a newly created record shows:
// createdAt = null (sentinel not yet resolved)
// This causes "Cannot read property of null" errors in templates

// With null-timestamp transform:
// createdAt = null (explicitly null, templates handle it gracefully)
// After server confirms: createdAt = Date object
```

### 2. Subcollection Orphans After Parent Deletion

Deleting a parent document does NOT delete its subcollections. A3 addresses this with Cloud Function triggers that cascade-delete subcollection documents:

```typescript
// functions/src/firestore/onDeleteClient.ts
// When a client document is deleted, this trigger:
// 1. Queries all subcollections (notes, files, activities)
// 2. Batch-deletes all subcollection documents
// 3. Cleans up related Cloud Storage files
```

### 3. 1MB Document Size Limit

If a model stores arrays or maps that grow unbounded, it can exceed Firestore's 1MB document limit. Solutions:
- Move the growing data to a subcollection
- Paginate array fields
- Store large blobs in Cloud Storage, keep only URLs in Firestore

### 4. Query Requires Index

Any query combining multiple `where()` clauses with `orderBy()` requires a composite index. Missing indexes cause runtime errors with a link to create them. Keep `firestore.indexes.json` up to date.

### 5. Security Rules Apply to Adapter

The adapter operates with the current user's Firebase Auth token. Every read/write passes through Firestore security rules. The adapter does not bypass rules — it is subject to the same permissions as direct SDK calls.

---
