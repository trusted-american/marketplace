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
