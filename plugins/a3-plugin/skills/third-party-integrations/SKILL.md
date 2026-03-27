---
name: third-party-integrations
description: Third-party service integration reference — Stripe, Mailgun, PandaDoc, Algolia, HubSpot, Salesforce, OpenAI, Intercom, Sentry, Google Maps, and Vimeo patterns in A3
version: 0.1.0
---

# Third-Party Integrations Reference

## Integration Architecture

Most third-party integrations in A3 follow this pattern:
```
Frontend Component → REST Adapter (adapter/firebase.ts) → Cloud Function HTTPS Endpoint → Third-Party API
```

The Cloud Function acts as a proxy/orchestrator, keeping API keys secure on the server side.

## Stripe (Payments)

**Frontend**: `app/adapters/stripe/` — REST adapters for Stripe resources
**Backend**: `functions/src/https/stripe/` — Checkout sessions, webhooks, customer management
**Package**: `stripe` (backend), `@stripe/stripe-js` (frontend)

### Common Operations
- Create checkout session for subscription/payment
- Handle webhook events (payment_succeeded, subscription_updated)
- Manage customers, subscriptions, invoices
- Process refunds

### Frontend Pattern
```typescript
// app/adapters/stripe/customer.ts
import FirebaseAdapter from '../firebase';
export default class StripeCustomerAdapter extends FirebaseAdapter {
  namespace = 'api/stripe';
}
```

### Backend Pattern
```typescript
// functions/src/https/stripe/checkout.ts
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  success_url: `${appUrl}/success`,
  cancel_url: `${appUrl}/cancel`,
});
```

## Mailgun (Email)

**Backend**: `functions/src/https/mailgun/` — Email sending
**Package**: `mailgun.js`

### Common Operations
- Send transactional emails (enrollment confirmations, password resets)
- Send notification emails (status changes, reminders)
- Template-based emails with dynamic data

### Pattern
```typescript
await mg.messages.create(domain, {
  from: 'A3 <noreply@trustedamerican.com>',
  to: [recipient],
  subject: 'Your enrollment has been approved',
  html: emailTemplate(data),
});
```

## PandaDoc (Document Generation)

**Frontend**: `app/adapters/pandadoc/` — Document management
**Backend**: `functions/src/https/pandadoc/` — Document creation, sending
**Package**: `pandadoc-node-client`

### Common Operations
- Create documents from templates
- Send documents for signature
- Track document status
- Populate dynamic fields (tokens)

## Algolia (Search)

**Frontend**: `app/services/search.ts` — Search client
**Backend**: `functions/src/https/algolia/` — Index management
**Package**: `algoliasearch` (both), `@algolia/client-search` (frontend)

### Frontend Search
```typescript
// app/services/search.ts
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(appId, searchKey);
const results = await client.search({
  requests: [{ indexName: 'clients', query: searchTerm }],
});
```

### Backend Indexing (via Firestore triggers)
```typescript
// When a client is created/updated, sync to Algolia
await client.saveObject({
  indexName: 'clients',
  body: { objectID: clientId, firstName, lastName, email },
});
```

## HubSpot (CRM)

**Backend**: `functions/src/https/hubspot/` — CRM sync
**Package**: `@hubspot/api-client`

### Common Operations
- Sync contacts between A3 and HubSpot
- Create/update deals
- Track interactions

## Salesforce (CRM)

**Backend**: `functions/src/https/salesforce/` — CRM sync

### Common Operations
- Bidirectional contact sync
- Opportunity management

## OpenAI (AI Features)

**Backend**: `functions/src/https/openai/` — AI-powered features
**Package**: `openai`

### Common Operations
- Text generation/summarization
- Data extraction from documents
- Smart suggestions

## Intercom (Customer Support)

**Frontend**: `@intercom/messenger-js-sdk` — Chat widget
### Integration
```typescript
// Initialize Intercom with user data
import Intercom from '@intercom/messenger-js-sdk';
Intercom({ app_id: 'xxx', user_id: userId, email: userEmail });
```

## Sentry (Error Tracking)

**Frontend**: `@sentry/ember` — Error monitoring
**Backend**: `@sentry/node` — Server-side error tracking

### Frontend
```typescript
// Auto-configured via @sentry/ember
// Catches: uncaught exceptions, unhandled rejections, Ember errors
```

### Backend
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
Sentry.captureException(error);
```

## Google Maps

**Frontend**: `@googlemaps/js-api-loader` — Map integration
### Pattern
```typescript
import { Loader } from '@googlemaps/js-api-loader';
const loader = new Loader({ apiKey: config.googleMapsApiKey });
const google = await loader.load();
const map = new google.maps.Map(element, { center, zoom: 10 });
```

## Highcharts (Charts)

**Frontend**: `highcharts` + `ember-highcharts` — Data visualization
### Pattern
```gts
<HighCharts @content={{this.chartData}} @chartOptions={{hash chart=(hash type="line")}} />
```

## Vimeo (Video)

**Frontend**: `@vimeo/player` — Video player
### Pattern
```typescript
import Player from '@vimeo/player';
const player = new Player(element, { id: videoId });
```

## Further Investigation

- **Stripe Docs**: https://stripe.com/docs
- **Mailgun Docs**: https://documentation.mailgun.com/
- **PandaDoc API**: https://developers.pandadoc.com/
- **Algolia Docs**: https://www.algolia.com/doc/
- **HubSpot API**: https://developers.hubspot.com/docs/api
- **OpenAI API**: https://platform.openai.com/docs
- **Sentry Docs**: https://docs.sentry.io/
- **Google Maps JS**: https://developers.google.com/maps/documentation/javascript
