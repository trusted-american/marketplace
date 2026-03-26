---
name: cloud-functions
description: Deep Google Cloud Functions v2 reference — Firestore triggers, HTTPS endpoints, PubSub, Storage triggers, auth triggers, deployment, and A3 backend patterns
version: 0.1.0
---

# Google Cloud Functions v2 Reference

## Overview

A3's backend runs on Cloud Functions for Firebase (2nd generation), which are Google Cloud Run functions under the hood. Runtime: Node.js 22 with TypeScript.

## Function Types

### Firestore Triggers

The most common trigger type in A3. Fires on document lifecycle events.

#### onCreate
```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const onClientCreated = onDocumentCreated(
  'clients/{clientId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const clientId = event.params.clientId;

    // Common side effects:
    // 1. Create audit trail activity
    // 2. Sync to Algolia search index
    // 3. Send welcome email via Mailgun
    // 4. Sync to HubSpot CRM
  }
);
```

#### onUpdate
```typescript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const onEnrollmentUpdated = onDocumentUpdated(
  'enrollments/{enrollmentId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Detect specific field changes
    if (before.status !== after.status) {
      // Status changed — trigger notifications, update related docs
    }

    // Use deep-object-diff for complex change detection
    import { detailedDiff } from 'deep-object-diff';
    const diff = detailedDiff(before, after);
  }
);
```

#### onDelete
```typescript
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';

export const onClientDeleted = onDocumentDeleted(
  'clients/{clientId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Cleanup: remove from Algolia, delete subcollections, notify
  }
);
```

#### onWrite (create + update + delete)
```typescript
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const onClientWritten = onDocumentWritten(
  'clients/{clientId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before && after) { /* Created */ }
    else if (before && after) { /* Updated */ }
    else if (before && !after) { /* Deleted */ }
  }
);
```

### HTTPS Functions

#### Simple Request Handler
```typescript
import { onRequest } from 'firebase-functions/v2/https';

export const myEndpoint = onRequest(async (req, res) => {
  // Validate method
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { data } = req.body;
    // Process request
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Express App (A3 Pattern)
```typescript
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Auth middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/customers', async (req, res) => {
  // List customers
});

app.post('/customers', async (req, res) => {
  // Create customer
});

app.get('/customers/:id', async (req, res) => {
  // Get customer
});

export const stripeApi = onRequest(app);
```

#### Callable Functions
```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const processPayment = onCall(async (request) => {
  // Auth is automatically verified
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const { amount, customerId } = request.data;

  try {
    const result = await stripe.charges.create({ amount, customer: customerId });
    return { success: true, chargeId: result.id };
  } catch (error) {
    throw new HttpsError('internal', 'Payment failed');
  }
});
```

### PubSub Triggers
```typescript
import { onMessagePublished } from 'firebase-functions/v2/pubsub';

export const processQueue = onMessagePublished(
  'enrollment-queue',
  async (event) => {
    const message = event.data.message;
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    // Process async task
    await processEnrollment(data);
  }
);
```

### Publishing to PubSub
```typescript
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();

await pubsub.topic('enrollment-queue').publishMessage({
  data: Buffer.from(JSON.stringify({ enrollmentId: 'enr_abc', action: 'process' })),
});
```

### Storage Triggers
```typescript
import { onObjectFinalized } from 'firebase-functions/v2/storage';

export const onFileUploaded = onObjectFinalized(async (event) => {
  const filePath = event.data.name; // e.g., 'clients/client_abc/files/document.pdf'
  const contentType = event.data.contentType;
  const size = event.data.size;

  // Process: generate thumbnail, scan, extract text, etc.
});
```

### Auth Triggers
```typescript
import { beforeUserSignedIn } from 'firebase-functions/v2/identity';

export const beforeSignIn = beforeUserSignedIn(async (event) => {
  const user = event.data;
  // Custom logic before sign-in completes
  // Throw to block sign-in
});
```

### Scheduled Functions
```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const dailyReport = onSchedule('every day 08:00', async (event) => {
  // Generate daily report
  // Send summary email
});

export const hourlySync = onSchedule('every 1 hours', async (event) => {
  // Sync data with external systems
});
```

## Function Configuration

### Memory & Timeout
```typescript
export const heavyFunction = onDocumentCreated(
  {
    document: 'large-collection/{docId}',
    memory: '1GiB',           // Default: 256MiB
    timeoutSeconds: 540,       // Default: 60, Max: 540 (9 min)
    minInstances: 1,           // Keep warm (reduce cold starts)
    maxInstances: 100,         // Limit concurrency
    region: 'us-central1',    // Deploy region
  },
  async (event) => { /* ... */ }
);
```

### Environment Variables & Secrets
```typescript
import { defineSecret, defineString } from 'firebase-functions/params';

const stripeKey = defineSecret('STRIPE_SECRET_KEY');
const appUrl = defineString('APP_URL');

export const myFunction = onRequest(
  { secrets: [stripeKey] },
  async (req, res) => {
    const key = stripeKey.value();
    // Use the secret
  }
);
```

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
  html: `<h1>Congratulations!</h1><p>Your enrollment is active.</p>`,
});
```

### Algolia
```typescript
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(appId, adminKey);

// Index a record
await client.saveObject({
  indexName: 'clients',
  body: {
    objectID: clientId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
  },
});

// Delete from index
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
  properties: {
    email: data.email,
    firstname: data.firstName,
    lastname: data.lastName,
  },
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

## Error Handling & Monitoring

### Sentry Integration
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  console.error('Operation failed:', error);
  throw error; // Re-throw for function retry
}
```

### Idempotency
Firestore triggers can fire more than once. Always design for idempotency:
```typescript
// Bad: creates duplicate
await db.collection('notifications').add({ message: 'New enrollment' });

// Good: uses deterministic ID
await db.doc(`notifications/${enrollmentId}_created`).set({
  message: 'New enrollment',
  createdAt: new Date(),
}, { merge: true });
```

## Further Investigation

- **Cloud Functions Docs**: https://firebase.google.com/docs/functions
- **Functions v2 Migration**: https://firebase.google.com/docs/functions/2nd-gen-upgrade
- **Express.js**: https://expressjs.com/en/api.html
- **Stripe Node SDK**: https://stripe.com/docs/api
- **Mailgun Node SDK**: https://github.com/mailgun/mailgun.js
- **Algolia Node SDK**: https://www.algolia.com/doc/api-client/getting-started/install/javascript/
