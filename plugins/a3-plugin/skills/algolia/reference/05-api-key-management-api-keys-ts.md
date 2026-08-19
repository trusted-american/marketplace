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
