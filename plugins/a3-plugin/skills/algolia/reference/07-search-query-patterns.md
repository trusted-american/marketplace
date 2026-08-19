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
