## A3 Third-Party Integration Patterns

### Stripe

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: 'price_abc', quantity: 1 }],
  mode: 'subscription',
  success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/cancel`,
});

// Webhook handling
const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
```

### Mailgun

```typescript
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mg = new Mailgun(formData).client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY!,
});

await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
  from: 'A3 <noreply@trustedamerican.com>',
  to: [email],
  subject: 'Your enrollment has been approved',
  html: htmlContent,
});
```

### Algolia

```typescript
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(appId, adminKey);

await client.saveObject({
  indexName: 'clients',
  body: { objectID: clientId, firstName, lastName, email },
});

await client.deleteObject({ indexName: 'clients', objectID: clientId });
```

### PandaDoc

```typescript
import * as PandaDoc from 'pandadoc-node-client';

const config = PandaDoc.createConfiguration({
  authMethods: { apiKey: `API-Key ${process.env.PANDADOC_API_KEY}` },
});
const documentsApi = new PandaDoc.DocumentsApi(config);

const response = await documentsApi.createDocument({
  documentCreateRequest: {
    name: 'Insurance Application',
    templateUuid: 'template_uuid',
    recipients: [{ email, firstName, lastName, role: 'signer' }],
    tokens: [{ name: 'client.name', value: fullName }],
  },
});
```

### OpenAI

```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
});
```

### HubSpot

```typescript
import { Client } from '@hubspot/api-client';
const hubspot = new Client({ accessToken: process.env.HUBSPOT_TOKEN });

await hubspot.crm.contacts.basicApi.create({
  properties: { email, firstname, lastname },
});
```

### Neon (PostgreSQL)

```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

const result = await pool.query(
  'SELECT * FROM reports WHERE agency_id = $1 AND created_at > $2',
  [agencyId, startDate]
);
```

---
