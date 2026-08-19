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
