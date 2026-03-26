---
name: cloud-functions
description: Deep Google Cloud Functions v2 reference — every trigger type with full TypeScript signatures, function configuration, retry behavior, cold start optimization, testing, deployment, emulator usage, A3 index.ts export pattern, error handling, structured logging, all 40 Firestore trigger files by collection, and all 39 HTTPS endpoint files by service
version: 0.2.0
---

# Google Cloud Functions v2 Reference

firebase-functions is imported in 86 backend files and is the execution layer for A3's entire serverless backend. This skill covers every trigger type, configuration option, deployment strategy, and the complete inventory of A3's function files.

## Overview

A3's backend runs on Cloud Functions for Firebase (2nd generation), which are Google Cloud Run functions under the hood. Runtime: Node.js 22 with TypeScript. All functions are defined in the `functions/` directory and exported through a central `index.ts`.

---

## A3's index.ts Export Pattern

All Cloud Functions must be exported from the top-level `index.ts` to be deployed. A3 uses a modular pattern where each function is defined in its own file and re-exported.

```typescript
// functions/src/index.ts

// ─── Firestore Triggers ───
export { onClientCreated } from './triggers/clients/onCreate';
export { onClientUpdated } from './triggers/clients/onUpdate';
export { onClientDeleted } from './triggers/clients/onDelete';
export { onEnrollmentCreated } from './triggers/enrollments/onCreate';
export { onEnrollmentUpdated } from './triggers/enrollments/onUpdate';
// ... all trigger exports

// ─── HTTPS Endpoints ───
export { stripeApi } from './https/stripe';
export { mailgunWebhooks } from './https/mailgun';
export { pandadocWebhooks } from './https/pandadoc';
export { algoliaSync } from './https/algolia';
// ... all HTTPS exports

// ─── Scheduled Functions ───
export { dailyReport } from './scheduled/dailyReport';
export { hourlySync } from './scheduled/hourlySync';
export { weeklyCleanup } from './scheduled/weeklyCleanup';
// ... all scheduled exports

// ─── PubSub Functions ───
export { processEnrollmentQueue } from './pubsub/enrollmentQueue';
export { processNotificationQueue } from './pubsub/notificationQueue';
// ... all PubSub exports
```

**Key rules for the export pattern:**
- The exported name becomes the deployed function name (e.g., `onClientCreated` deploys as `onClientCreated`)
- Firebase CLI discovers functions by scanning exports at deploy time
- Functions not exported from `index.ts` will NOT be deployed
- Nested exports via barrel files are supported: `export * from './triggers/clients'`
- Lazy imports reduce cold start time: functions that are not invoked do not load their dependencies

### Lazy Loading Pattern (A3 Optimization)

```typescript
// functions/src/index.ts — lazy loading to reduce cold starts
// Instead of importing everything at the top level, use dynamic re-exports

// Option 1: Direct re-export (simple, but loads all modules)
export { onClientCreated } from './triggers/clients/onCreate';

// Option 2: Lazy loading with getter (advanced, reduces cold start)
const lazyExport = (modulePath: string, exportName: string) => {
  let cached: any;
  Object.defineProperty(exports, exportName, {
    get: () => {
      if (!cached) {
        cached = require(modulePath)[exportName];
      }
      return cached;
    },
  });
};

lazyExport('./triggers/clients/onCreate', 'onClientCreated');
lazyExport('./https/stripe', 'stripeApi');
```

---

## Every Trigger Type — Full TypeScript Signatures

### Firestore Triggers

#### onDocumentCreated

```typescript
import { onDocumentCreated, FirestoreEvent, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';

// Basic signature
export const onClientCreated = onDocumentCreated(
  'clients/{clientId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { clientId: string }>) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const clientId = event.params.clientId;
    const eventId = event.id;       // Unique event ID (for idempotency)
    const eventTime = event.time;   // ISO 8601 string
    const eventType = event.type;   // 'google.cloud.firestore.document.v1.created'

    // Common side effects:
    // 1. Create audit trail activity
    // 2. Sync to Algolia search index
    // 3. Send welcome email via Mailgun
    // 4. Sync to HubSpot CRM
    // 5. Update counters/aggregations
  }
);

// With options
export const onClientCreatedWithOptions = onDocumentCreated(
  {
    document: 'clients/{clientId}',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 50,
    retry: true,
  },
  async (event) => { /* ... */ }
);
```

#### onDocumentUpdated

```typescript
import { onDocumentUpdated, FirestoreEvent, Change, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';

export const onEnrollmentUpdated = onDocumentUpdated(
  'enrollments/{enrollmentId}',
  async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { enrollmentId: string }>) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data(); // Document data before the update
    const after = change.after.data();   // Document data after the update
    const enrollmentId = event.params.enrollmentId;

    // Detect specific field changes
    if (before.status !== after.status) {
      // Status transition logic
    }

    // Use deep-object-diff for complex change detection
    const { detailedDiff } = await import('deep-object-diff');
    const diff = detailedDiff(before, after);
    // diff.added — new fields
    // diff.deleted — removed fields
    // diff.updated — changed fields
  }
);
```

#### onDocumentDeleted

```typescript
import { onDocumentDeleted, FirestoreEvent, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';

export const onClientDeleted = onDocumentDeleted(
  'clients/{clientId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { clientId: string }>) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data(); // Data of the deleted document
    const clientId = event.params.clientId;

    // Cleanup tasks:
    // 1. Remove from Algolia search index
    // 2. Delete subcollections (notes, files, activities)
    // 3. Remove references in other documents
    // 4. Delete files from Cloud Storage
    // 5. Notify related users
    // 6. Create audit trail entry
  }
);
```

#### onDocumentWritten

```typescript
import { onDocumentWritten, FirestoreEvent, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore';

export const onClientWritten = onDocumentWritten(
  'clients/{clientId}',
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { clientId: string }>) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data(); // undefined if created
    const after = change.after.data();   // undefined if deleted

    if (!before && after) {
      // Document was CREATED
    } else if (before && after) {
      // Document was UPDATED
    } else if (before && !after) {
      // Document was DELETED
    }
  }
);
```

#### Subcollection Triggers

```typescript
// Trigger on subcollection documents
export const onClientNoteCreated = onDocumentCreated(
  'clients/{clientId}/notes/{noteId}',
  async (event) => {
    const clientId = event.params.clientId;
    const noteId = event.params.noteId;
    const data = event.data?.data();
    // Update parent document's noteCount, send notification, etc.
  }
);
```

### HTTPS Functions

#### onRequest — Raw HTTP Handler

```typescript
import { onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

// Basic signature
export const myEndpoint = onRequest(
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { data } = req.body;
      const result = await processData(data);
      res.json({ success: true, result });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// With options
export const myEndpointWithOptions = onRequest(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
    minInstances: 1,
    maxInstances: 100,
    cors: true,                          // Enable CORS for all origins
    // cors: ['https://app.example.com'], // Or specific origins
    invoker: 'public',                   // Allow unauthenticated access
    ingressSettings: 'ALLOW_ALL',
    concurrency: 80,                     // Max concurrent requests per instance
  },
  async (req, res) => { /* ... */ }
);
```

#### Express App Pattern (A3 Primary Pattern)

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Auth middleware — used by most A3 HTTPS functions
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/customers', async (req, res) => { /* List */ });
app.post('/customers', async (req, res) => { /* Create */ });
app.get('/customers/:id', async (req, res) => { /* Read */ });
app.put('/customers/:id', async (req, res) => { /* Update */ });
app.delete('/customers/:id', async (req, res) => { /* Delete */ });

export const stripeApi = onRequest(
  { memory: '512MiB', timeoutSeconds: 120 },
  app
);
```

#### Callable Functions (onCall)

```typescript
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

export const processPayment = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    enforceAppCheck: false,    // Set true to require Firebase App Check
    consumeAppCheckToken: false,
  },
  async (request: CallableRequest<{ amount: number; customerId: string }>) => {
    // Auth is automatically verified
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    // Access auth info
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const claims = request.auth.token;

    // Access request data
    const { amount, customerId } = request.data;

    // Validate input
    if (!amount || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Amount must be positive');
    }

    try {
      const result = await stripe.charges.create({ amount, customer: customerId });
      return { success: true, chargeId: result.id };
    } catch (error) {
      // HttpsError codes: ok, cancelled, unknown, invalid-argument, deadline-exceeded,
      // not-found, already-exists, permission-denied, resource-exhausted, failed-precondition,
      // aborted, out-of-range, unimplemented, internal, unavailable, data-loss, unauthenticated
      throw new HttpsError('internal', 'Payment processing failed');
    }
  }
);
```

### PubSub Triggers

```typescript
import { onMessagePublished, MessagePublishedData } from 'firebase-functions/v2/pubsub';

// Basic PubSub trigger
export const processEnrollmentQueue = onMessagePublished(
  'enrollment-queue',
  async (event) => {
    const message = event.data.message;

    // Decode data (base64 encoded)
    const data = JSON.parse(
      Buffer.from(message.data, 'base64').toString()
    );

    // Access message attributes
    const attributes = message.attributes;

    // Access ordering key
    const orderingKey = message.orderingKey;

    await processEnrollment(data);
  }
);

// With options
export const processNotificationQueue = onMessagePublished(
  {
    topic: 'notification-queue',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    retry: true,  // Retry on failure
  },
  async (event) => { /* ... */ }
);

// With typed message
interface EnrollmentMessage {
  enrollmentId: string;
  action: 'process' | 'approve' | 'deny';
  userId: string;
}

export const typedQueue = onMessagePublished<EnrollmentMessage>(
  'enrollment-queue',
  async (event) => {
    const data: EnrollmentMessage = event.data.message.json;
    // data is typed as EnrollmentMessage
  }
);

// Publishing to PubSub
import { PubSub } from '@google-cloud/pubsub';
const pubsub = new PubSub();

await pubsub.topic('enrollment-queue').publishMessage({
  data: Buffer.from(JSON.stringify({
    enrollmentId: 'enr_abc',
    action: 'process',
    userId: 'user_123',
  })),
  attributes: { priority: 'high' },
  orderingKey: 'agency_abc',
});
```

### Storage Triggers

```typescript
import {
  onObjectFinalized,
  onObjectDeleted,
  onObjectArchived,
  onObjectMetadataUpdated,
  StorageEvent,
  StorageObjectData,
} from 'firebase-functions/v2/storage';

// On file uploaded (or overwritten)
export const onFileUploaded = onObjectFinalized(
  {
    bucket: 'my-bucket',  // Optional: defaults to default bucket
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event: StorageEvent<StorageObjectData>) => {
    const filePath = event.data.name;         // e.g., 'clients/abc/files/doc.pdf'
    const contentType = event.data.contentType; // e.g., 'application/pdf'
    const size = event.data.size;              // Bytes
    const bucket = event.data.bucket;
    const metageneration = event.data.metageneration; // Increments on metadata change
    const generation = event.data.generation;
    const md5Hash = event.data.md5Hash;
    const crc32c = event.data.crc32c;
    const customMetadata = event.data.metadata; // Custom metadata key-value pairs

    // Common processing:
    // 1. Generate thumbnails for images
    // 2. Scan uploaded files for malware
    // 3. Extract text from PDFs
    // 4. Update Firestore document with file metadata
    // 5. Convert file formats
  }
);

// On file deleted
export const onFileDeleted = onObjectDeleted(async (event) => {
  const filePath = event.data.name;
  // Clean up Firestore references, thumbnails, etc.
});

// On object archived (versioned bucket only)
export const onFileArchived = onObjectArchived(async (event) => {
  const filePath = event.data.name;
  // Handle archival (versioning-enabled buckets)
});

// On metadata updated
export const onMetadataUpdated = onObjectMetadataUpdated(async (event) => {
  const filePath = event.data.name;
  const metadata = event.data.metadata;
  // React to metadata changes
});
```

### Auth / Identity Triggers

```typescript
import {
  beforeUserSignedIn,
  beforeUserCreated,
  HttpsError,
} from 'firebase-functions/v2/identity';

// Before user is created (blocking function)
export const beforeCreate = beforeUserCreated(async (event) => {
  const user = event.data;

  // Block specific email domains
  if (user.email && !user.email.endsWith('@trustedamerican.com')) {
    // For self-registration flows, may want to allow any domain
  }

  // Return custom claims to be set on the user
  return {
    customClaims: {
      createdVia: 'signup',
    },
  };
});

// Before user signs in (blocking function)
export const beforeSignIn = beforeUserSignedIn(async (event) => {
  const user = event.data;

  // Check if user is disabled in Firestore
  const userDoc = await db.doc(`users/${user.uid}`).get();
  if (userDoc.exists && userDoc.data()?.suspended) {
    throw new HttpsError('permission-denied', 'Account has been suspended');
  }

  // Update last login
  await db.doc(`users/${user.uid}`).update({
    lastLoginAt: Timestamp.now(),
    lastLoginIp: event.ipAddress,
  });

  // Return updated claims
  return {
    customClaims: {
      lastLoginAt: Date.now(),
    },
  };
});
```

### Scheduled Functions

```typescript
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';

// Cron-style schedule
export const dailyReport = onSchedule(
  {
    schedule: '0 8 * * *',              // Every day at 8:00 AM UTC
    timeZone: 'America/New_York',       // Timezone for the schedule
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 540,
    retryCount: 3,                      // Number of retries on failure
    maxRetrySeconds: 300,               // Max time for all retries
    minBackoffSeconds: 10,              // Minimum backoff between retries
    maxBackoffSeconds: 300,             // Maximum backoff between retries
    maxDoublings: 5,                    // Max doublings of backoff interval
  },
  async (event: ScheduledEvent) => {
    const scheduleTime = event.scheduleTime; // ISO 8601 string
    // Generate and send daily report
  }
);

// App Engine cron syntax
export const hourlySync = onSchedule('every 1 hours', async () => {
  // Sync data with external systems
});

// Every N minutes
export const frequentCheck = onSchedule('every 5 minutes', async () => {
  // Quick health check or queue processing
});

// Specific days
export const weeklyCleanup = onSchedule(
  { schedule: 'every monday 02:00', timeZone: 'America/New_York' },
  async () => {
    // Clean up temp data, expired sessions, etc.
  }
);

// Complex cron
export const monthlyBilling = onSchedule(
  { schedule: '0 0 1 * *', timeZone: 'America/New_York' }, // First of every month
  async () => {
    // Process monthly billing
  }
);
```

### Task Queue Functions

```typescript
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFunctions } from 'firebase-admin/functions';

// Define a task handler
export const processHeavyTask = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 5,
      minBackoffSeconds: 10,
      maxBackoffSeconds: 300,
      maxDoublings: 3,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
      maxDispatchesPerSecond: 5,
    },
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    const data = request.data;
    // Process the task
  }
);

// Enqueue a task
const queue = getFunctions().taskQueue('processHeavyTask');
await queue.enqueue(
  { enrollmentId: 'enr_abc', action: 'generateReport' },
  {
    scheduleDelaySeconds: 60,    // Delay execution by 60 seconds
    dispatchDeadlineSeconds: 300, // Must complete within 5 minutes
  }
);
```

### Eventarc Triggers (Custom Events)

```typescript
import { onCustomEventPublished } from 'firebase-functions/v2/eventarc';

export const onCustomEvent = onCustomEventPublished(
  {
    eventType: 'com.a3.enrollment.approved',
    region: 'us-central1',
  },
  async (event) => {
    const data = event.data;
    const subject = event.subject;
    // Handle custom event
  }
);
```

---

## Function Configuration — Complete Reference

### All Configuration Options

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const fullyConfiguredFunction = onDocumentCreated(
  {
    document: 'collection/{docId}',

    // ─── Compute ───
    memory: '256MiB',          // '128MiB' | '256MiB' | '512MiB' | '1GiB' | '2GiB' | '4GiB' | '8GiB' | '16GiB' | '32GiB'
    timeoutSeconds: 60,        // 1-540 for event-driven, 1-3600 for HTTPS
    cpu: 1,                    // 'gcf_gen1' | 1 | 2 | 4 | 6 | 8 (fractional for small memory)

    // ─── Scaling ───
    minInstances: 0,           // Minimum warm instances (0 = scale to zero)
    maxInstances: 100,         // Maximum concurrent instances
    concurrency: 80,           // Max concurrent requests per instance (HTTPS only, default 80)

    // ─── Networking ───
    region: 'us-central1',     // Deploy region(s)
    // region: ['us-central1', 'europe-west1'],  // Multi-region
    vpcConnector: 'projects/my-project/locations/us-central1/connectors/my-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC', // 'ALL_TRAFFIC' | 'PRIVATE_RANGES_ONLY'
    ingressSettings: 'ALLOW_ALL', // 'ALLOW_ALL' | 'ALLOW_INTERNAL_ONLY' | 'ALLOW_INTERNAL_AND_GCLB'

    // ─── Security ───
    serviceAccount: 'my-sa@my-project.iam.gserviceaccount.com',
    secrets: ['STRIPE_KEY', 'MAILGUN_KEY'], // Google Secret Manager secrets
    // Or with specific versions:
    // secrets: [{ key: 'STRIPE_KEY', secret: 'STRIPE_KEY', projectId: 'my-project' }],

    // ─── Metadata ───
    labels: {
      environment: 'production',
      team: 'backend',
      service: 'enrollment',
    },

    // ─── Retry (event-driven only) ───
    retry: true,               // Enable automatic retry on failure
  },
  async (event) => { /* ... */ }
);
```

### Environment Variables and Secrets

```typescript
import { defineSecret, defineString, defineInt, defineBoolean, defineList } from 'firebase-functions/params';

// Secrets (stored in Google Secret Manager, injected at runtime)
const stripeKey = defineSecret('STRIPE_SECRET_KEY');
const mailgunKey = defineSecret('MAILGUN_API_KEY');
const openaiKey = defineSecret('OPENAI_API_KEY');

// Environment parameters (set during deploy or in .env files)
const appUrl = defineString('APP_URL', { default: 'https://app.trustedamerican.com' });
const maxRetries = defineInt('MAX_RETRIES', { default: 3 });
const debugMode = defineBoolean('DEBUG_MODE', { default: false });
const allowedDomains = defineList('ALLOWED_DOMAINS', { default: ['trustedamerican.com'] });

export const myFunction = onRequest(
  {
    secrets: [stripeKey, mailgunKey], // Declare which secrets are needed
  },
  async (req, res) => {
    const key = stripeKey.value();       // Access secret value
    const url = appUrl.value();          // Access param value
    const retries = maxRetries.value();  // number
    const debug = debugMode.value();     // boolean
    const domains = allowedDomains.value(); // string[]
  }
);

// .env files for different environments:
// functions/.env              — all environments
// functions/.env.local        — emulator only
// functions/.env.production   — production only
// functions/.env.staging      — staging only
```

---

## Retry Behavior for Background Functions

Event-driven functions (Firestore, PubSub, Storage, Auth, Scheduled) can be configured to retry on failure.

### How Retries Work

```typescript
// Enable retry
export const retriableFunction = onDocumentCreated(
  {
    document: 'enrollments/{enrollmentId}',
    retry: true, // Enable retry
  },
  async (event) => {
    // If this function throws, it will be retried

    // Check if this is a retry using event age
    const eventAge = Date.now() - Date.parse(event.time);
    const MAX_EVENT_AGE_MS = 10 * 60 * 1000; // 10 minutes

    if (eventAge > MAX_EVENT_AGE_MS) {
      console.warn(`Dropping stale event for ${event.params.enrollmentId}`);
      return; // Don't process stale events
    }

    try {
      await riskyOperation();
    } catch (error) {
      console.error('Operation failed, will retry:', error);
      throw error; // Throw to trigger retry
    }
  }
);
```

### Retry behavior details:
- **Firestore triggers**: Retried for up to 7 days with exponential backoff (10s, 20s, 40s, ... up to 600s)
- **PubSub triggers**: Retried with exponential backoff until acknowledged (up to 7 days)
- **Storage triggers**: Retried for up to 7 days
- **Scheduled functions**: Configurable retryCount (default 0)
- **HTTPS functions**: NOT retried (client is responsible for retry)
- **Callable functions**: NOT retried (client is responsible for retry)

### Idempotency is critical:

```typescript
// BAD: Creates duplicates on retry
await db.collection('notifications').add({ message: 'New enrollment' });

// GOOD: Deterministic ID prevents duplicates
await db.doc(`notifications/${enrollmentId}_created`).set(
  { message: 'New enrollment', createdAt: Timestamp.now() },
  { merge: true }
);

// GOOD: Use event.id for deduplication
const eventId = event.id;
const lockRef = db.doc(`_locks/${eventId}`);
const lock = await lockRef.get();
if (lock.exists) {
  console.log('Event already processed, skipping');
  return;
}
await lockRef.set({ processedAt: Timestamp.now() });
// ... process event
```

---

## Cold Start Optimization Strategies

### 1. Minimize Top-Level Imports

```typescript
// BAD: All imports load on cold start regardless of which function runs
import Stripe from 'stripe';
import Mailgun from 'mailgun.js';
import OpenAI from 'openai';
import { algoliasearch } from 'algoliasearch';

// GOOD: Import only when needed
export const stripeWebhook = onRequest(async (req, res) => {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_KEY!);
  // ...
});
```

### 2. Use minInstances for Critical Functions

```typescript
export const criticalEndpoint = onRequest(
  {
    minInstances: 1, // Always keep one instance warm
    memory: '512MiB',
  },
  async (req, res) => { /* ... */ }
);
// Note: minInstances incurs costs even when idle
```

### 3. Use Global Scope for Reusable Connections

```typescript
// Initialize once, reuse across invocations
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}

export const chargeCustomer = onCall(async (request) => {
  const stripe = getStripe(); // Reused on warm instances
  // ...
});
```

### 4. Reduce Function Bundle Size

```bash
# Check what's in node_modules
du -sh functions/node_modules/* | sort -rh | head -20

# Use --only flag to deploy specific functions (faster deploys)
firebase deploy --only functions:onClientCreated,functions:stripeApi
```

### 5. Optimize package.json

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Move test-only packages to `devDependencies` since they are not deployed.

### 6. Memory Allocation Affects CPU

Higher memory allocations automatically get more CPU:
- 128 MiB - 256 MiB: 0.083 vCPU
- 512 MiB: 0.333 vCPU
- 1 GiB: 0.583 vCPU
- 2 GiB: 1 vCPU
- 4 GiB: 2 vCPU
- 8 GiB: 2 vCPU
- 16 GiB+: 4+ vCPU

---

## Function Testing with firebase-functions-test

### Setup

```typescript
import * as functionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';

// Online mode (connects to real Firebase project)
const testEnv = functionsTest({
  projectId: 'a3-test',
  storageBucket: 'a3-test.appspot.com',
});

// Offline mode (no Firebase connection)
const testEnv = functionsTest();
```

### Testing Firestore Triggers

```typescript
import { onClientCreated } from '../src/triggers/clients/onCreate';

describe('onClientCreated', () => {
  afterAll(() => testEnv.cleanup());

  it('should create an activity record on client creation', async () => {
    // Create a fake Firestore snapshot
    const snapshot = testEnv.firestore.makeDocumentSnapshot(
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        agencyId: 'agency_abc',
        createdAt: admin.firestore.Timestamp.now(),
      },
      'clients/client_123'
    );

    // Wrap the function
    const wrapped = testEnv.wrap(onClientCreated);

    // Call with fake event
    await wrapped({
      data: snapshot,
      params: { clientId: 'client_123' },
    });

    // Assert side effects
    const activity = await admin.firestore()
      .doc('activities/client_123_created')
      .get();
    expect(activity.exists).toBe(true);
  });
});
```

### Testing HTTPS Functions

```typescript
import { stripeApi } from '../src/https/stripe';
import supertest from 'supertest';

describe('stripeApi', () => {
  it('should return 401 without auth token', async () => {
    const response = await supertest(stripeApi)
      .get('/customers')
      .expect(401);

    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return customers with valid token', async () => {
    const response = await supertest(stripeApi)
      .get('/customers')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('customers');
  });
});
```

### Testing Callable Functions

```typescript
import { processPayment } from '../src/https/processPayment';

describe('processPayment', () => {
  const wrapped = testEnv.wrap(processPayment);

  it('should throw unauthenticated without auth', async () => {
    await expect(
      wrapped({ data: { amount: 1000 } })
    ).rejects.toThrow('unauthenticated');
  });

  it('should process payment with valid auth', async () => {
    const result = await wrapped({
      data: { amount: 1000, customerId: 'cus_abc' },
      auth: { uid: 'user_123', token: { email: 'test@test.com' } },
    });

    expect(result.success).toBe(true);
    expect(result.chargeId).toBeDefined();
  });
});
```

### Testing Scheduled Functions

```typescript
import { dailyReport } from '../src/scheduled/dailyReport';

describe('dailyReport', () => {
  const wrapped = testEnv.wrap(dailyReport);

  it('should generate and send the daily report', async () => {
    await wrapped({ scheduleTime: new Date().toISOString() });

    // Verify report was created
    const reports = await admin.firestore()
      .collection('reports')
      .where('type', '==', 'daily')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    expect(reports.size).toBe(1);
  });
});
```

### Testing PubSub Functions

```typescript
import { processEnrollmentQueue } from '../src/pubsub/enrollmentQueue';

describe('processEnrollmentQueue', () => {
  const wrapped = testEnv.wrap(processEnrollmentQueue);

  it('should process enrollment message', async () => {
    const message = testEnv.pubsub.makeMessage(
      JSON.stringify({ enrollmentId: 'enr_abc', action: 'process' }),
      { priority: 'high' } // attributes
    );

    await wrapped({ data: { message } });

    // Verify enrollment was processed
    const enrollment = await admin.firestore()
      .doc('enrollments/enr_abc')
      .get();
    expect(enrollment.data()?.processedAt).toBeDefined();
  });
});
```

---

## Deployment Strategies

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Specific Functions

```bash
# Single function
firebase deploy --only functions:onClientCreated

# Multiple functions
firebase deploy --only functions:onClientCreated,functions:onClientUpdated,functions:stripeApi

# Functions matching a prefix (if using group exports)
firebase deploy --only functions:triggers-clients
```

### Deploy with Environment

```bash
# Use specific project
firebase use production
firebase deploy --only functions

# Or inline
firebase deploy --only functions --project a3-production
```

### Deployment Best Practices

1. **Deploy in stages**: Deploy to staging first, verify, then production
2. **Use --only for targeted deploys**: Avoid redeploying all functions when only one changed
3. **Monitor after deploy**: Watch Cloud Logging for errors immediately after deploy
4. **Rollback**: `firebase functions:delete functionName` to remove a broken function, or redeploy the previous version
5. **CI/CD**: Use `firebase deploy --only functions --force` in CI pipelines (skips confirmation prompts)

### Function Deletion

```bash
# Delete a specific function
firebase functions:delete onOldFunction

# Delete multiple
firebase functions:delete onOldFunction1 onOldFunction2

# Delete with region
firebase functions:delete onOldFunction --region us-central1
```

---

## Local Emulator Usage Patterns

### Starting Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only functions,firestore,auth

# Start with import/export of data
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

# Start and run a script
firebase emulators:exec "npm test" --only functions,firestore
```

### Emulator Configuration in firebase.json

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "pubsub": { "port": 8085 },
    "database": { "port": 9000 },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### Calling Functions Against the Emulator

```bash
# HTTP functions
curl http://localhost:5001/a3-project/us-central1/stripeApi/customers

# With auth token
curl -H "Authorization: Bearer test-token" \
  http://localhost:5001/a3-project/us-central1/stripeApi/customers
```

### Emulator-Specific Code

```typescript
// Detect emulator environment
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

if (isEmulator) {
  // Skip external API calls in emulator
  console.log('Running in emulator — skipping Stripe call');
} else {
  await stripe.charges.create({ /* ... */ });
}
```

### Seeding Emulator Data

```typescript
// In a setup script or test helper
import { getFirestore } from 'firebase-admin/firestore';

async function seedData() {
  const db = getFirestore();

  // Create test agency
  await db.doc('agencies/test_agency').set({
    name: 'Test Agency',
    status: 'active',
    createdAt: Timestamp.now(),
  });

  // Create test users
  await db.doc('users/test_user').set({
    email: 'test@test.com',
    agencyId: 'test_agency',
    role: 'admin',
  });

  // Create test clients
  for (let i = 0; i < 10; i++) {
    await db.doc(`clients/client_${i}`).set({
      firstName: `Test${i}`,
      lastName: 'Client',
      agencyId: 'test_agency',
      status: 'active',
    });
  }
}
```

---

## Error Handling Patterns Per Trigger Type

### Firestore Triggers — Throw to Retry (if retry enabled)

```typescript
export const onEnrollmentCreated = onDocumentCreated(
  { document: 'enrollments/{enrollmentId}', retry: true },
  async (event) => {
    try {
      await syncToAlgolia(event.data?.data());
      await sendConfirmationEmail(event.data?.data());
    } catch (error) {
      // Log error with context
      console.error('Failed to process enrollment creation', {
        enrollmentId: event.params.enrollmentId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Sentry reporting
      Sentry.captureException(error, {
        extra: { enrollmentId: event.params.enrollmentId },
      });

      // Throw to trigger retry (only if retry is enabled)
      throw error;
    }
  }
);
```

### HTTPS Functions — Return HTTP Status Codes

```typescript
export const apiEndpoint = onRequest(async (req, res) => {
  try {
    const result = await processRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    } else if (error instanceof AuthError) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    } else {
      console.error('Unhandled error:', error);
      Sentry.captureException(error);
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
    }
  }
});
```

### Callable Functions — Throw HttpsError

```typescript
export const myCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  try {
    return await processData(request.data);
  } catch (error) {
    if (error instanceof HttpsError) throw error; // Re-throw HttpsError as-is

    console.error('Callable function error:', error);
    Sentry.captureException(error);
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
});
```

### PubSub — Throw to NACK (retry), Return to ACK

```typescript
export const processQueue = onMessagePublished(
  { topic: 'my-queue', retry: true },
  async (event) => {
    const data = event.data.message.json;

    try {
      await processMessage(data);
      // Returning successfully = message is acknowledged
    } catch (error) {
      if (isTransientError(error)) {
        throw error; // NACK — message will be redelivered
      } else {
        // Permanent failure — log and acknowledge to prevent infinite retries
        console.error('Permanent failure, dropping message:', error);
        Sentry.captureException(error, { extra: { messageData: data } });
        // Return normally to ACK the message
      }
    }
  }
);
```

### Scheduled Functions — Throw to Mark as Failed

```typescript
export const dailyReport = onSchedule(
  { schedule: 'every day 08:00', retryCount: 3 },
  async () => {
    try {
      await generateDailyReport();
    } catch (error) {
      console.error('Daily report generation failed:', error);
      Sentry.captureException(error);

      // Send alert notification
      await sendSlackAlert(`Daily report failed: ${error}`);

      throw error; // Will retry up to retryCount times
    }
  }
);
```

---

## Logging Best Practices

### Structured Logging (JSON)

Cloud Functions running on Cloud Run support structured logging via JSON.

```typescript
// Simple structured log (appears in Cloud Logging with proper severity)
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'Enrollment processed successfully',
  enrollmentId: 'enr_abc',
  agencyId: 'agency_xyz',
  duration: 1234,
}));

// Using console methods maps to severity levels:
console.log('...');    // DEFAULT severity
console.info('...');   // INFO severity
console.warn('...');   // WARNING severity
console.error('...');  // ERROR severity
console.debug('...');  // DEBUG severity
```

### Severity Levels

| Method | Severity | When to Use |
|--------|----------|-------------|
| `console.debug()` | DEBUG | Verbose debugging info, disabled in production |
| `console.log()` | DEFAULT | General information |
| `console.info()` | INFO | Noteworthy events (function started, completed) |
| `console.warn()` | WARNING | Potential issues, deprecated usage, slow queries |
| `console.error()` | ERROR | Errors that need attention |

### A3 Logging Pattern

```typescript
// Consistent structured logging across all functions
interface LogEntry {
  message: string;
  functionName: string;
  eventId?: string;
  documentPath?: string;
  userId?: string;
  agencyId?: string;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: any;
}

function logInfo(entry: LogEntry) {
  console.info(JSON.stringify({ severity: 'INFO', ...entry }));
}

function logError(entry: LogEntry) {
  console.error(JSON.stringify({ severity: 'ERROR', ...entry }));
}

// Usage in functions
export const onEnrollmentCreated = onDocumentCreated(
  'enrollments/{enrollmentId}',
  async (event) => {
    const startTime = Date.now();
    const enrollmentId = event.params.enrollmentId;

    logInfo({
      message: 'Processing new enrollment',
      functionName: 'onEnrollmentCreated',
      eventId: event.id,
      documentPath: `enrollments/${enrollmentId}`,
      enrollmentId,
    });

    try {
      await processEnrollment(event.data?.data());

      logInfo({
        message: 'Enrollment processed successfully',
        functionName: 'onEnrollmentCreated',
        enrollmentId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logError({
        message: 'Failed to process enrollment',
        functionName: 'onEnrollmentCreated',
        enrollmentId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
);
```

### Cloud Logging Queries

```
# Find all errors for a specific function
resource.type="cloud_run_revision"
severity>=ERROR
jsonPayload.functionName="onEnrollmentCreated"

# Find slow functions (over 5 seconds)
resource.type="cloud_run_revision"
jsonPayload.duration>5000

# Find by enrollment ID
resource.type="cloud_run_revision"
jsonPayload.enrollmentId="enr_abc"
```

---

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

## The 40 Firestore Trigger Files Organized by Collection

Each file is in `functions/src/triggers/{collection}/` and handles one lifecycle event.

### Clients Collection (4 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `clients/onCreate.ts` | `onDocumentCreated('clients/{clientId}')` | Creates activity record, syncs to Algolia search index, syncs to HubSpot CRM, initializes client metadata |
| `clients/onUpdate.ts` | `onDocumentUpdated('clients/{clientId}')` | Detects field changes, updates Algolia index, syncs changes to HubSpot, creates change-specific activity records, propagates name/email changes to related enrollments |
| `clients/onDelete.ts` | `onDocumentDeleted('clients/{clientId}')` | Removes from Algolia, deletes subcollections (notes, files, activities), removes HubSpot contact, cleans up Storage files, creates deletion activity |
| `clients/onWrite.ts` | `onDocumentWritten('clients/{clientId}')` | Maintains client count aggregation, updates agency-level client statistics |

### Enrollments Collection (4 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `enrollments/onCreate.ts` | `onDocumentCreated('enrollments/{enrollmentId}')` | Creates activity, syncs to Algolia, sends confirmation email via Mailgun, notifies assigned agent, updates client's enrollment count |
| `enrollments/onUpdate.ts` | `onDocumentUpdated('enrollments/{enrollmentId}')` | Detects status transitions (pending->active, active->cancelled), sends status-change emails, updates Algolia, triggers commission calculations on approval, creates activity |
| `enrollments/onDelete.ts` | `onDocumentDeleted('enrollments/{enrollmentId}')` | Removes from Algolia, deletes subcollections, updates client enrollment count, creates deletion activity, cleans up related transactions |
| `enrollments/onWrite.ts` | `onDocumentWritten('enrollments/{enrollmentId}')` | Maintains enrollment count aggregations per agency/carrier, updates dashboard statistics |

### Agencies Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `agencies/onCreate.ts` | `onDocumentCreated('agencies/{agencyId}')` | Initializes agency settings, creates default roles, syncs to Algolia, creates welcome notification |
| `agencies/onUpdate.ts` | `onDocumentUpdated('agencies/{agencyId}')` | Updates Algolia, propagates name/address changes to related documents, updates branding assets |
| `agencies/onDelete.ts` | `onDocumentDeleted('agencies/{agencyId}')` | Removes from Algolia, cascades deletion to agency's clients/enrollments (or blocks deletion if data exists) |

### Contracts Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `contracts/onCreate.ts` | `onDocumentCreated('contracts/{contractId}')` | Creates activity, syncs to Algolia, notifies carrier, initializes commission schedule |
| `contracts/onUpdate.ts` | `onDocumentUpdated('contracts/{contractId}')` | Detects status changes, updates Algolia, recalculates commission rates on contract amendments, creates activity |
| `contracts/onDelete.ts` | `onDocumentDeleted('contracts/{contractId}')` | Removes from Algolia, handles orphaned enrollments under this contract, creates activity |

### Transactions Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `transactions/onCreate.ts` | `onDocumentCreated('transactions/{transactionId}')` | Creates activity, updates running balances, syncs to accounting/Neon PostgreSQL, triggers commission split calculations |
| `transactions/onUpdate.ts` | `onDocumentUpdated('transactions/{transactionId}')` | Recalculates balances on amount changes, updates Neon, adjusts commission splits, creates activity |
| `transactions/onDelete.ts` | `onDocumentDeleted('transactions/{transactionId}')` | Reverses balance updates, syncs deletion to Neon, creates reversal activity |

### Users Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `users/onCreate.ts` | `onDocumentCreated('users/{userId}')` | Sets custom claims on Firebase Auth, syncs to Algolia, creates welcome activity, initializes user preferences |
| `users/onUpdate.ts` | `onDocumentUpdated('users/{userId}')` | Updates custom claims on role/permission changes, syncs to Algolia, propagates name changes to authored activities/notes |
| `users/onDelete.ts` | `onDocumentDeleted('users/{userId}')` | Removes from Algolia, disables Firebase Auth account, reassigns owned records, cleans up user-specific data |

### Carriers Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `carriers/onCreate.ts` | `onDocumentCreated('carriers/{carrierId}')` | Syncs to Algolia, creates activity, initializes carrier product catalog |
| `carriers/onUpdate.ts` | `onDocumentUpdated('carriers/{carrierId}')` | Updates Algolia, propagates name changes to enrollments/contracts, creates activity |
| `carriers/onDelete.ts` | `onDocumentDeleted('carriers/{carrierId}')` | Removes from Algolia, handles orphaned contracts/enrollments, creates activity |

### Quotes Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `quotes/onCreate.ts` | `onDocumentCreated('quotes/{quoteId}')` | Creates activity, generates quote PDF via PandaDoc, sends quote email to client, syncs to Algolia |
| `quotes/onUpdate.ts` | `onDocumentUpdated('quotes/{quoteId}')` | Detects status changes (draft->sent->accepted->declined), updates Algolia, converts accepted quotes to enrollments |

### Tickets Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `tickets/onCreate.ts` | `onDocumentCreated('tickets/{ticketId}')` | Creates activity, sends notification to assigned agent, syncs to Algolia, auto-assigns based on rules |
| `tickets/onUpdate.ts` | `onDocumentUpdated('tickets/{ticketId}')` | Detects status changes (open->in-progress->resolved->closed), sends status update notifications, calculates resolution time |

### Groups Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `groups/onCreate.ts` | `onDocumentCreated('groups/{groupId}')` | Creates activity, syncs to Algolia, initializes group enrollment tracking |
| `groups/onUpdate.ts` | `onDocumentUpdated('groups/{groupId}')` | Updates Algolia, propagates changes to group members, recalculates group rates |

### Statements Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `statements/onCreate.ts` | `onDocumentCreated('statements/{statementId}')` | Parses uploaded commission statement, creates individual transaction records, matches commissions to enrollments |
| `statements/onUpdate.ts` | `onDocumentUpdated('statements/{statementId}')` | Handles reprocessing of statements, updates matched transactions on corrections |

### Licenses Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `licenses/onCreate.ts` | `onDocumentCreated('licenses/{licenseId}')` | Creates activity, validates license data, sets expiration reminders |
| `licenses/onUpdate.ts` | `onDocumentUpdated('licenses/{licenseId}')` | Detects expiration date changes, updates reminders, creates activity |

### Activities Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `activities/onCreate.ts` | `onDocumentCreated('activities/{activityId}')` | Sends real-time notifications to relevant users, updates notification badges, syncs to Algolia for activity search |

### Messages Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `messages/onCreate.ts` | `onDocumentCreated('messages/{messageId}')` | Sends push/email notification to recipient, updates unread count, marks message thread as active |

### Events Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `events/onCreate.ts` | `onDocumentCreated('events/{eventId}')` | Creates calendar entries, sends invitations via email, syncs to external calendar services |

### Inquiries Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `inquiries/onCreate.ts` | `onDocumentCreated('inquiries/{inquiryId}')` | Auto-assigns to agent, sends acknowledgment email to lead, creates activity, syncs to HubSpot, triggers lead scoring via OpenAI |

### Notifications Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `notifications/onCreate.ts` | `onDocumentCreated('notifications/{notificationId}')` | Delivers notification via appropriate channel (push, email, in-app), updates delivery status |

### Memberships Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `memberships/onUpdate.ts` | `onDocumentUpdated('memberships/{membershipId}')` | Detects status changes, updates client's active membership status, triggers renewal notifications on expiration approach |

---

## The 39 HTTPS Endpoint Files Organized by Service

Each file is in `functions/src/https/` and exports an Express app wrapped with `onRequest`.

### Stripe Integration (6 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `stripe/customers.ts` | `stripeCustomers` | CRUD operations for Stripe customers — create, read, update, delete customer records, sync with Firestore clients |
| `stripe/subscriptions.ts` | `stripeSubscriptions` | Manage subscriptions — create, update, cancel, resume, list subscriptions, handle plan changes and proration |
| `stripe/invoices.ts` | `stripeInvoices` | Invoice management — list invoices, send invoices, mark as paid, void, generate PDF download URLs |
| `stripe/payments.ts` | `stripePayments` | One-time payments — create payment intents, confirm payments, handle 3D Secure, process refunds |
| `stripe/webhooks.ts` | `stripeWebhooks` | Receives and processes Stripe webhook events — payment succeeded/failed, subscription changes, invoice events, dispute handling |
| `stripe/connect.ts` | `stripeConnect` | Stripe Connect for agencies — create connected accounts, handle onboarding, manage payouts, transfer funds |

### Mailgun Integration (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `mailgun/send.ts` | `mailgunSend` | Send transactional emails — enrollment confirmations, password resets, welcome emails, notifications, uses HTML templates |
| `mailgun/templates.ts` | `mailgunTemplates` | Manage email templates — CRUD for Mailgun stored templates, preview rendering with merge variables |
| `mailgun/webhooks.ts` | `mailgunWebhooks` | Receives Mailgun webhook events — delivered, opened, clicked, bounced, complained, unsubscribed; updates email delivery status in Firestore |
| `mailgun/lists.ts` | `mailgunLists` | Mailing list management — create/update lists, add/remove members, used for marketing campaigns and agency-wide announcements |

### Algolia Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `algolia/sync.ts` | `algoliaSync` | Bulk sync Firestore collections to Algolia — full reindex for clients, enrollments, agencies, carriers; used for initial setup and recovery |
| `algolia/search.ts` | `algoliaSearch` | Server-side search proxy — performs Algolia searches with secured API key, filters results by agency permissions |
| `algolia/config.ts` | `algoliaConfig` | Manage Algolia index configuration — update searchable attributes, facets, ranking, synonyms, rules |

### PandaDoc Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `pandadoc/documents.ts` | `pandadocDocuments` | Create and manage documents — generate insurance applications, proposals, contracts from templates with client/enrollment data |
| `pandadoc/webhooks.ts` | `pandadocWebhooks` | Receives PandaDoc webhook events — document viewed, completed, voided; updates Firestore enrollment status on signature completion |
| `pandadoc/templates.ts` | `pandadocTemplates` | List and manage document templates — retrieve available templates, preview with sample data |

### HubSpot Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `hubspot/contacts.ts` | `hubspotContacts` | Sync contacts between Firestore and HubSpot — create, update, delete contacts, map A3 fields to HubSpot properties |
| `hubspot/deals.ts` | `hubspotDeals` | Manage HubSpot deals — create deals from enrollments, update deal stages on status changes, associate deals with contacts |
| `hubspot/webhooks.ts` | `hubspotWebhooks` | Receives HubSpot webhook events — contact/deal changes made in HubSpot, syncs back to Firestore |

### OpenAI Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `openai/chat.ts` | `openaiChat` | AI-powered chat assistant — answers agent questions about insurance products, policy details, compliance requirements |
| `openai/summarize.ts` | `openaiSummarize` | Summarize documents and notes — generates summaries of client interactions, enrollment histories, meeting notes |
| `openai/analyze.ts` | `openaiAnalyze` | Data analysis — lead scoring for inquiries, risk assessment for enrollments, recommendation engine for quotes |

### Reporting & Analytics (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `reports/commissions.ts` | `commissionReports` | Generate commission reports — by agent, agency, carrier, date range; calculates totals, splits, overrides; exports to CSV/PDF |
| `reports/enrollments.ts` | `enrollmentReports` | Enrollment analytics — active/pending/cancelled breakdowns, trends over time, carrier distribution, premium analysis |
| `reports/production.ts` | `productionReports` | Agent production reports — new business, renewals, retention rates, revenue per agent, leaderboards |
| `reports/export.ts` | `dataExport` | Bulk data export — exports filtered Firestore data to CSV/Excel, handles large datasets via streaming, tracks export jobs |

### Import & Data Processing (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `imports/csv.ts` | `csvImport` | Import data from CSV — parse uploaded CSV files, validate rows, create/update Firestore documents, handle duplicates, track import progress |
| `imports/statements.ts` | `statementImport` | Commission statement processing — parse carrier commission statements (CSV/Excel), match to enrollments, create transaction records |
| `imports/carriers.ts` | `carrierDataImport` | Import carrier data — product catalogs, rate tables, plan details; normalize and store in Firestore |

### Admin & System (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `admin/users.ts` | `adminUsers` | User management — create users with custom claims, update roles/permissions, disable/enable accounts, impersonate users |
| `admin/agencies.ts` | `adminAgencies` | Agency management — onboard new agencies, configure settings, manage billing, toggle features |
| `admin/migration.ts` | `adminMigration` | Data migration tools — run migrations to update document schemas, backfill new fields, restructure collections |
| `admin/health.ts` | `healthCheck` | System health check — verifies connectivity to Firestore, Auth, Storage, external APIs; returns status dashboard |

### Authentication & Security (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `auth/custom-token.ts` | `authCustomToken` | Generate custom auth tokens — for SSO integration, cross-platform login, service-to-service authentication |
| `auth/verify.ts` | `authVerify` | Token verification endpoint — validates ID tokens, returns decoded claims, used by external services integrating with A3 |
| `auth/mfa.ts` | `authMfa` | MFA management — enroll/unenroll phone numbers, generate TOTP secrets, verify MFA codes |

### Neon PostgreSQL Integration (2 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `neon/sync.ts` | `neonSync` | Sync Firestore data to Neon PostgreSQL — maintains relational mirror of key collections for complex reporting queries |
| `neon/query.ts` | `neonQuery` | Execute complex analytical queries — joins, aggregations, window functions that Firestore cannot perform natively |

### File Processing (1 endpoint)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `files/process.ts` | `fileProcess` | File processing pipeline — receives uploaded files, generates thumbnails, extracts text from PDFs, scans for malware, stores metadata |

---

## Error Handling with Sentry

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { functionName: 'onEnrollmentCreated', collection: 'enrollments' },
    extra: { enrollmentId, agencyId },
  });
  console.error('Operation failed:', error);
  throw error; // Re-throw for function retry
}
```

---

## Further Investigation

- **Cloud Functions Docs**: https://firebase.google.com/docs/functions
- **Functions v2 API Reference**: https://firebase.google.com/docs/reference/functions/2nd-gen
- **Express.js**: https://expressjs.com/en/api.html
- **Cloud Logging**: https://cloud.google.com/logging/docs
- **Cloud Run (underlying runtime)**: https://cloud.google.com/run/docs
- **Stripe Node SDK**: https://stripe.com/docs/api
- **Mailgun Node SDK**: https://github.com/mailgun/mailgun.js
- **Algolia Node SDK**: https://www.algolia.com/doc/api-client/getting-started/install/javascript/
- **PandaDoc API**: https://developers.pandadoc.com/reference
- **firebase-functions-test**: https://firebase.google.com/docs/functions/unit-testing
