---
name: algolia
description: Algolia search integration reference — 3 backend files + frontend search service. Index management, record syncing, search queries, and API key management
version: 0.1.0
---


# Algolia Search Integration Reference

A3 integrates Algolia for real-time search across clients, deals, contacts, and other domain entities. This skill covers the 3 backend files, frontend search service, index management, Firestore-to-Algolia sync triggers, faceting, filtering, pagination, and API key management.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/03-index-management.md` | Index Management |
| `reference/04-firestore-to-algolia-sync-sync-ts.md` | Firestore-to-Algolia Sync — `sync.ts` |
| `reference/05-api-key-management-api-keys-ts.md` | API Key Management — `api-keys.ts` |
| `reference/06-frontend-search-service-app-services-search-js.md` | Frontend Search Service — `app/services/search.js` |
| `reference/07-search-query-patterns.md` | Search Query Patterns |

## Architecture Overview

### Backend File Map

| File | Purpose |
|---|---|
| `functions/src/algolia/index.ts` | Algolia client initialization, saveObject, deleteObject, search operations |
| `functions/src/algolia/sync.ts` | Firestore trigger functions that sync data to Algolia indices |
| `functions/src/algolia/api-keys.ts` | Secured API key generation for frontend search |

### Frontend File

| File | Purpose |
|---|---|
| `app/services/search.js` | Ember service wrapping Algolia search client for frontend queries |

---
## Algolia Client Initialization — `index.ts`

### Server-Side Client

```typescript
// functions/src/algolia/index.ts
import algoliasearch, { SearchClient } from 'algoliasearch';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY!;

const algoliaClient: SearchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

export default algoliaClient;

// Index references
export const clientsIndex = algoliaClient.initIndex('clients');
export const dealsIndex = algoliaClient.initIndex('deals');
export const contactsIndex = algoliaClient.initIndex('contacts');
export const productsIndex = algoliaClient.initIndex('products');
export const invoicesIndex = algoliaClient.initIndex('invoices');
```

### Key Points

- **Admin key**: The server-side client uses the Admin API key, which has full read/write access. This key must never be exposed to the frontend.
- **Search-only key**: The frontend uses a restricted Search-Only API key (or secured API key) that only permits search operations.
- **Index per entity**: A3 maintains separate indices for each searchable entity type.

---
## Error Handling

```typescript
try {
  const results = await clientsIndex.search(query);
  return res.json(results);
} catch (err: any) {
  if (err.status === 403) {
    console.error('Algolia API key lacks permissions');
    return res.status(500).json({ error: 'Search configuration error' });
  }
  if (err.status === 404) {
    console.error('Algolia index not found');
    return res.status(500).json({ error: 'Search index not configured' });
  }
  if (err.transporterStackTrace) {
    console.error('Algolia network error:', err.message);
    return res.status(503).json({ error: 'Search temporarily unavailable' });
  }
  console.error('Algolia error:', err);
  return res.status(500).json({ error: 'Search failed' });
}
```

---
## Index Maintenance

### Re-indexing Strategy

When the data schema changes or records fall out of sync:

```typescript
async function reindexClients(orgId: string) {
  const snapshot = await admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('clients')
    .get();

  const records = snapshot.docs.map((doc) => ({
    objectID: doc.id,
    organizationId: orgId,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || 0,
    updatedAt: doc.data().updatedAt?.toMillis() || 0,
  }));

  // Use saveObjects for batch upsert (chunks of 1000)
  for (let i = 0; i < records.length; i += 1000) {
    await clientsIndex.saveObjects(records.slice(i, i + 1000));
  }
}
```

### Clear Index

```typescript
await clientsIndex.clearObjects(); // Removes all records, keeps settings
```

---
## Environment Variables Required

| Variable | Description |
|---|---|
| `ALGOLIA_APP_ID` | Application ID from Algolia dashboard |
| `ALGOLIA_ADMIN_KEY` | Admin API key (backend only, full access) |
| `ALGOLIA_SEARCH_KEY` | Search-Only API key (base for secured keys) |

---
## Common Patterns and Best Practices

1. **Organization-scoped security**: Every record must include `organizationId`. Every frontend search key must have `organizationId` baked into its filter. This prevents cross-organization data leakage.
2. **objectID mapping**: Always use the Firestore document ID as the Algolia `objectID`. This ensures 1:1 mapping and idempotent upserts.
3. **Timestamp conversion**: Firestore timestamps must be converted to milliseconds (`toMillis()`) before indexing. Algolia does not understand Firestore Timestamp objects.
4. **Avoid indexing sensitive data**: Do not index SSN, payment details, or other PII that should not be searchable. Only index fields that users need to search.
5. **Partial updates**: Use `partialUpdateObject` for frequently changing fields (like `status`) to minimize indexing operations and cost.
6. **Frontend key refresh**: The secured API key has a TTL. The frontend search service should handle key expiry by catching 403 errors and requesting a new key.
7. **Analytics**: Algolia provides search analytics (top queries, no-results queries). Use the Algolia dashboard to monitor search quality.
