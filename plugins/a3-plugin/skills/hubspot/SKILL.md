---
name: hubspot
description: HubSpot CRM integration reference — @hubspot/api-client for contact sync, deal management, and OAuth flow in A3 (1 backend utility + OAuth endpoint)
version: 0.1.0
---

# HubSpot CRM Integration Reference

## Overview

A3 integrates with HubSpot for CRM synchronization. The integration lives in:
- `functions/src/utils/hubspot.ts` — HubSpot client utility (1 file)
- `functions/src/https/hubspot/oauth.ts` — OAuth flow endpoint (1 file)

**Package**: `@hubspot/api-client` v13.1.0

## Client Initialization

```typescript
import { Client } from '@hubspot/api-client';

// With OAuth access token (A3 pattern)
const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// With API key (deprecated but may exist in legacy code)
const hubspot = new Client({ apiKey: process.env.HUBSPOT_API_KEY });
```

## OAuth Flow

A3 uses OAuth for HubSpot authentication (functions/src/https/hubspot/oauth.ts):

```typescript
// 1. Redirect user to HubSpot authorization URL
const authUrl = `https://app.hubspot.com/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `scope=crm.objects.contacts.read%20crm.objects.contacts.write`;

// 2. HubSpot redirects back with authorization code
// 3. Exchange code for access token
const tokenResponse = await hubspot.oauth.tokensApi.create(
  'authorization_code',
  code,
  REDIRECT_URI,
  CLIENT_ID,
  CLIENT_SECRET
);

// 4. Store tokens for future use
const { accessToken, refreshToken, expiresIn } = tokenResponse;

// 5. Refresh token when expired
const refreshResponse = await hubspot.oauth.tokensApi.create(
  'refresh_token',
  undefined,
  undefined,
  CLIENT_ID,
  CLIENT_SECRET,
  refreshToken
);
```

## Contacts API

### Create Contact
```typescript
const response = await hubspot.crm.contacts.basicApi.create({
  properties: {
    email: 'john@example.com',
    firstname: 'John',
    lastname: 'Doe',
    phone: '5551234567',
    company: 'Trusted American',
  },
});
const contactId = response.id;
```

### Update Contact
```typescript
await hubspot.crm.contacts.basicApi.update(contactId, {
  properties: {
    phone: '5559876543',
    lifecyclestage: 'customer',
  },
});
```

### Get Contact
```typescript
const contact = await hubspot.crm.contacts.basicApi.getById(contactId, [
  'email', 'firstname', 'lastname', 'phone', 'lifecyclestage',
]);
```

### Search Contacts
```typescript
const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
  filterGroups: [{
    filters: [{
      propertyName: 'email',
      operator: 'EQ',
      value: 'john@example.com',
    }],
  }],
  properties: ['email', 'firstname', 'lastname'],
  limit: 10,
});
```

### Batch Operations
```typescript
// Batch create
await hubspot.crm.contacts.batchApi.create({
  inputs: contacts.map(c => ({
    properties: { email: c.email, firstname: c.firstName, lastname: c.lastName },
  })),
});
```

## Deals API

```typescript
// Create deal
const deal = await hubspot.crm.deals.basicApi.create({
  properties: {
    dealname: 'Medicare Enrollment - John Doe',
    pipeline: 'default',
    dealstage: 'appointmentscheduled',
    amount: '500',
  },
});

// Associate deal with contact
await hubspot.crm.deals.associationsApi.create(
  deal.id, 'contacts', contactId, [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
);
```

## A3 Sync Patterns

### Firestore → HubSpot (on client create/update)
```typescript
// In a Firestore trigger:
export const onClientCreated = onDocumentCreated('clients/{clientId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // Sync to HubSpot
  await hubspot.crm.contacts.basicApi.create({
    properties: {
      email: data.email,
      firstname: data.firstName,
      lastname: data.lastName,
      phone: data.phone,
    },
  });
});
```

## Error Handling

```typescript
try {
  await hubspot.crm.contacts.basicApi.create({ properties: { email } });
} catch (error) {
  if (error.code === 409) {
    // Contact already exists — update instead
  } else if (error.code === 429) {
    // Rate limited — retry after delay
  } else {
    Sentry.captureException(error);
  }
}
```

## Rate Limits

- **Standard**: 100 requests per 10 seconds
- **Search**: 4 requests per second
- **Batch**: 10 requests per second, 100 records per batch

## Further Investigation

- **HubSpot API Docs**: https://developers.hubspot.com/docs/api/overview
- **Node Client**: https://github.com/HubSpot/hubspot-api-nodejs
- **OAuth Guide**: https://developers.hubspot.com/docs/api/working-with-oauth
