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
