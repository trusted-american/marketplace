---
name: algolia
description: Algolia search integration reference — 3 backend files + frontend search service. Index management, record syncing, search queries, and API key management
version: 0.1.0
---

# Algolia Search Integration Reference

A3 integrates Algolia for real-time search across clients, deals, contacts, and other domain entities. This skill covers the 3 backend files, frontend search service, index management, Firestore-to-Algolia sync triggers, faceting, filtering, pagination, and API key management.

---

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

## Index Management

### Index Configuration

Each index is configured with specific searchable attributes, custom ranking, and facets:

```typescript
// Configure clients index
await clientsIndex.setSettings({
  searchableAttributes: [
    'displayName',
    'email',
    'company',
    'phone',
    'address.city',
    'address.state',
    'tags',
  ],
  attributesForFaceting: [
    'filterOnly(organizationId)',
    'searchable(tags)',
    'searchable(status)',
    'filterOnly(assignedTo)',
    'searchable(address.state)',
    'searchable(address.city)',
  ],
  customRanking: [
    'desc(updatedAt)',
    'desc(dealCount)',
  ],
  attributeForDistinct: 'objectID',
  distinct: true,
  hitsPerPage: 20,
  maxValuesPerFacet: 100,
  removeStopWords: true,
  typoTolerance: true,
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
  highlightPreTag: '<mark>',
  highlightPostTag: '</mark>',
});

// Configure deals index
await dealsIndex.setSettings({
  searchableAttributes: [
    'title',
    'clientName',
    'description',
    'tags',
    'stage',
  ],
  attributesForFaceting: [
    'filterOnly(organizationId)',
    'searchable(stage)',
    'searchable(tags)',
    'filterOnly(assignedTo)',
    'searchable(pipelineName)',
  ],
  customRanking: [
    'desc(value)',
    'desc(updatedAt)',
  ],
  hitsPerPage: 20,
});
```

### Searchable Attributes Priority

Attributes listed first in `searchableAttributes` have higher search priority. In the clients index:

1. `displayName` — highest priority, matches on name are most relevant
2. `email` — second priority
3. `company` — third priority
4. `phone`, `address.city`, `address.state`, `tags` — lower priority

### Faceting Types

| Facet Type | Syntax | Purpose |
|---|---|---|
| `filterOnly(attr)` | No search, only filter | Used for `organizationId` (security filter) |
| `searchable(attr)` | Search + filter | Used for `tags`, `status`, `stage` |
| (default) | Search + filter + display | Used for display facets in UI |

---

## Firestore-to-Algolia Sync — `sync.ts`

A3 uses Firestore triggers to keep Algolia indices synchronized with the source of truth.

### Sync on Create

```typescript
// functions/src/algolia/sync.ts
import * as functions from 'firebase-functions';
import { clientsIndex, dealsIndex, contactsIndex } from './index';

export const onClientCreated = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { orgId, clientId } = context.params;

    const record = {
      objectID: clientId,
      organizationId: orgId,
      displayName: data.displayName || '',
      email: data.email || '',
      company: data.company || '',
      phone: data.phone || '',
      address: data.address || {},
      tags: data.tags || [],
      status: data.status || 'active',
      assignedTo: data.assignedTo || '',
      dealCount: data.dealCount || 0,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await clientsIndex.saveObject(record);
  });
```

### Sync on Update

```typescript
export const onClientUpdated = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onUpdate(async (change, context) => {
    const data = change.after.data();
    const { orgId, clientId } = context.params;

    const record = {
      objectID: clientId,
      organizationId: orgId,
      displayName: data.displayName || '',
      email: data.email || '',
      company: data.company || '',
      phone: data.phone || '',
      address: data.address || {},
      tags: data.tags || [],
      status: data.status || 'active',
      assignedTo: data.assignedTo || '',
      dealCount: data.dealCount || 0,
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await clientsIndex.saveObject(record);
  });
```

### Sync on Delete

```typescript
export const onClientDeleted = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onDelete(async (snapshot, context) => {
    const { clientId } = context.params;
    await clientsIndex.deleteObject(clientId);
  });
```

### Deal Sync Triggers

```typescript
export const onDealCreated = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { orgId, dealId } = context.params;

    const record = {
      objectID: dealId,
      organizationId: orgId,
      title: data.title || '',
      clientName: data.clientName || '',
      clientId: data.clientId || '',
      description: data.description || '',
      stage: data.stage || '',
      pipelineName: data.pipelineName || '',
      value: data.value || 0,
      tags: data.tags || [],
      assignedTo: data.assignedTo || '',
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await dealsIndex.saveObject(record);
  });

export const onDealUpdated = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onUpdate(async (change, context) => {
    const data = change.after.data();
    const { orgId, dealId } = context.params;

    await dealsIndex.partialUpdateObject({
      objectID: dealId,
      organizationId: orgId,
      title: data.title || '',
      clientName: data.clientName || '',
      stage: data.stage || '',
      pipelineName: data.pipelineName || '',
      value: data.value || 0,
      tags: data.tags || [],
      assignedTo: data.assignedTo || '',
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    });
  });

export const onDealDeleted = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onDelete(async (snapshot, context) => {
    const { dealId } = context.params;
    await dealsIndex.deleteObject(dealId);
  });
```

### Partial Updates

Use `partialUpdateObject` when only some fields change, to reduce Algolia indexing operations:

```typescript
// Only update the fields that changed
await clientsIndex.partialUpdateObject({
  objectID: clientId,
  status: 'inactive',
  updatedAt: Date.now(),
});
```

### Batch Operations

For bulk data migrations or re-indexing:

```typescript
// Batch save — up to 1000 records per batch
const records = clients.map((client) => ({
  objectID: client.id,
  organizationId: orgId,
  displayName: client.displayName,
  email: client.email,
  // ...
}));

await clientsIndex.saveObjects(records);

// Batch delete
const objectIDs = deletedClients.map((c) => c.id);
await clientsIndex.deleteObjects(objectIDs);

// Replace entire index (dangerous — use for full re-index)
await clientsIndex.replaceAllObjects(records);
```

---

## API Key Management — `api-keys.ts`

### Secured API Key Generation

A3 generates secured (scoped) API keys for the frontend. These keys restrict search to a specific organization.

```typescript
// functions/src/algolia/api-keys.ts
import algoliaClient from './index';

export async function generateSearchKey(organizationId: string): Promise<string> {
  const searchOnlyKey = process.env.ALGOLIA_SEARCH_KEY!;

  const securedKey = algoliaClient.generateSecuredApiKey(searchOnlyKey, {
    filters: `organizationId:${organizationId}`,
    validUntil: Math.floor(Date.now() / 1000) + 3600, // 1 hour TTL
    restrictIndices: ['clients', 'deals', 'contacts', 'products'],
    userToken: organizationId,
  });

  return securedKey;
}
```

### Key Security Model

| Key Type | Where Used | Permissions |
|---|---|---|
| Admin API Key | Backend only (`ALGOLIA_ADMIN_KEY`) | Full read/write/delete/settings |
| Search-Only API Key | Base for secured keys (`ALGOLIA_SEARCH_KEY`) | Search only |
| Secured API Key | Frontend, per-organization | Search only, scoped to `organizationId` filter |

### Key Properties

- **`filters`**: Automatically applied to every search query. The user cannot remove this filter. Ensures organization-level data isolation.
- **`validUntil`**: Unix timestamp for key expiry. A3 sets 1-hour TTL; the frontend refreshes the key periodically.
- **`restrictIndices`**: Limits which indices the key can search. Prevents access to admin-only indices.
- **`userToken`**: Identifies the user/org for analytics and rate limiting.

### Frontend Key Retrieval

```typescript
// GET /algolia/api-keys — Generate scoped key for current user
export async function getSearchKey(req: AuthenticatedRequest, res: Response) {
  const { organizationId } = req.user;
  const securedKey = await generateSearchKey(organizationId);

  return res.json({
    appId: process.env.ALGOLIA_APP_ID,
    searchKey: securedKey,
    indices: ['clients', 'deals', 'contacts', 'products'],
  });
}
```

---

## Frontend Search Service — `app/services/search.js`

### Service Implementation

```javascript
// app/services/search.js
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import algoliasearch from 'algoliasearch/lite';

export default class SearchService extends Service {
  @service api;
  @service session;

  @tracked client = null;
  @tracked isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    const response = await this.api.request('GET', '/algolia/api-keys');
    const { appId, searchKey } = response;

    this.client = algoliasearch(appId, searchKey);
    this.isInitialized = true;
  }

  async search(indexName, query, options = {}) {
    await this.initialize();

    const index = this.client.initIndex(indexName);
    const results = await index.search(query, {
      hitsPerPage: options.hitsPerPage || 20,
      page: options.page || 0,
      filters: options.filters || '',
      facets: options.facets || ['*'],
      facetFilters: options.facetFilters || [],
      attributesToRetrieve: options.attributesToRetrieve || ['*'],
      attributesToHighlight: options.attributesToHighlight || ['displayName', 'email', 'company'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      ...options,
    });

    return results;
  }

  async searchClients(query, options = {}) {
    return this.search('clients', query, options);
  }

  async searchDeals(query, options = {}) {
    return this.search('deals', query, options);
  }

  async searchContacts(query, options = {}) {
    return this.search('contacts', query, options);
  }

  async multiSearch(queries) {
    await this.initialize();

    const results = await this.client.multipleQueries(
      queries.map((q) => ({
        indexName: q.indexName,
        query: q.query,
        params: {
          hitsPerPage: q.hitsPerPage || 5,
          ...q.params,
        },
      })),
    );

    return results;
  }
}
```

### Multi-Index Search (Global Search)

A3 implements a global search bar that queries multiple indices simultaneously:

```javascript
// Component usage
const results = await this.search.multiSearch([
  { indexName: 'clients', query: searchTerm, hitsPerPage: 5 },
  { indexName: 'deals', query: searchTerm, hitsPerPage: 5 },
  { indexName: 'contacts', query: searchTerm, hitsPerPage: 5 },
]);

// results.results is an array of per-index results
const [clientResults, dealResults, contactResults] = results.results;
```

---

## Search Query Patterns

### Basic Search

```typescript
const results = await clientsIndex.search('jane smith');
// results.hits — array of matching records
// results.nbHits — total number of matches
// results.page — current page (0-indexed)
// results.nbPages — total pages
// results.hitsPerPage — results per page
```

### Filtered Search

```typescript
const results = await clientsIndex.search('', {
  filters: `organizationId:${orgId} AND status:active`,
  hitsPerPage: 50,
});
```

### Faceted Search

```typescript
const results = await clientsIndex.search(query, {
  facets: ['tags', 'status', 'address.state'],
  facetFilters: [
    ['tags:vip', 'tags:premium'],  // OR within array
    'status:active',                // AND between arrays
  ],
});

// results.facets — counts per facet value
// { tags: { vip: 12, premium: 8, new: 25 }, status: { active: 40, inactive: 5 } }
```

### Numeric Filters

```typescript
const results = await dealsIndex.search(query, {
  numericFilters: [
    'value >= 10000',
    'value <= 100000',
    `createdAt >= ${thirtyDaysAgo}`,
  ],
});
```

### Geo Search

If A3 stores latitude/longitude on client records:

```typescript
const results = await clientsIndex.search(query, {
  aroundLatLng: '37.7749,-122.4194',
  aroundRadius: 50000, // 50km radius
});
```

### Pagination

```typescript
// Page-based pagination (0-indexed)
const page1 = await clientsIndex.search(query, { page: 0, hitsPerPage: 20 });
const page2 = await clientsIndex.search(query, { page: 1, hitsPerPage: 20 });

// Offset-based pagination
const results = await clientsIndex.search(query, {
  offset: 40,
  length: 20,
});
```

### Browse All Records

For exporting or re-processing all records in an index:

```typescript
let allHits: any[] = [];
await clientsIndex.browseObjects({
  filters: `organizationId:${orgId}`,
  batch: (hits) => {
    allHits = allHits.concat(hits);
  },
});
```

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
