## A3's Application Adapter — Full Implementation

```typescript
// app/adapters/application.ts
import CloudFirestoreAdapter from 'ember-cloud-firestore-adapter/adapters/cloud-firestore';
import type Store from '@ember-data/store';

export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // ──────────────────────────────────────────────────────
  // Custom ID Generation
  // ──────────────────────────────────────────────────────
  // A3 uses a prefix pattern: modelName_uuid (with hyphens stripped)
  // This makes IDs self-describing when seen in logs, URLs, and Firestore console.
  //
  // Examples:
  //   client_a1b2c3d4e5f6789012345678abcdef
  //   enrollment_f9e8d7c6b5a4321098765432fedcba
  //   agency_11223344556677889900aabbccddeeff
  //
  // The model name prefix allows you to identify the collection from the ID alone,
  // which is invaluable for debugging cross-collection references.
  generateIdForRecord(_store: Store, type: string): string {
    return `${type}_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  // ──────────────────────────────────────────────────────
  // n+1 Pagination
  // ──────────────────────────────────────────────────────
  // When the query includes a page.limit, the adapter actually fetches limit+1 records.
  // This is a deliberate pattern to determine if more pages exist WITHOUT running a
  // separate count query (which would be an extra Firestore read and added latency).
  //
  // How it works:
  // 1. User requests: page: { limit: 25 }
  // 2. Adapter sends: limit(26) to Firestore
  // 3. If 26 documents return → hasMore = true, adapter returns first 25
  // 4. If ≤25 documents return → hasMore = false, adapter returns all
  // 5. The serializer extracts this into results.meta.hasMore: boolean
  //
  // This pattern avoids Firestore's count aggregation (which still reads all docs
  // for billing purposes) and gives the UI a simple boolean to show/hide "Load More".
}
```

### How A3's ID Generation Pattern Works Internally

When `store.createRecord()` is called, Ember Data invokes the adapter's `generateIdForRecord()` before the record is sent to Firestore. The flow is:

1. `store.createRecord('enrollment', { ... })` is called
2. Ember Data calls `adapter.generateIdForRecord(store, 'enrollment')`
3. The adapter returns `enrollment_a1b2c3d4...`
4. This ID is set as the record's `id` property immediately (client-side)
5. When `record.save()` is called, the document is written to `enrollments/enrollment_a1b2c3d4...`
6. The ID is now permanent and referenced by other documents

**Why strip hyphens from UUID?** Firestore document IDs with hyphens work fine, but stripped UUIDs are more compact (32 chars vs 36) and avoid potential issues with URL encoding in deep links.

---
