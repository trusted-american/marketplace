---
name: cloud-function
description: Templates for generating Cloud Functions — Firestore triggers, HTTPS endpoints, and PubSub handlers
---

# Cloud Function Templates

## Firestore onCreate Trigger

```typescript
// functions/src/firestore/{{collection}}/create.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/node';

export const on{{PascalName}}Created = onDocumentCreated(
  '{{collection}}/{docId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const docId = event.params.docId;
    const db = getFirestore();

    try {
      // Create audit trail activity
      await db.collection('activities').add({
        type: '{{collection}}-created',
        referenceId: docId,
        referenceType: '{{modelName}}',
        data: { /* relevant fields */ },
        createdAt: new Date(),
        createdBy: data.createdBy || 'system',
      });

      // Additional side effects (email, Algolia, etc.)

    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error processing {{collection}} create:`, error);
    }
  }
);
```

## Firestore onUpdate Trigger

```typescript
// functions/src/firestore/{{collection}}/update.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/node';

export const on{{PascalName}}Updated = onDocumentUpdated(
  '{{collection}}/{docId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const docId = event.params.docId;
    const db = getFirestore();

    try {
      // Detect field changes
      if (before.status !== after.status) {
        // Handle status change
      }

    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error processing {{collection}} update:`, error);
    }
  }
);
```

## HTTPS Endpoint (Express)

```typescript
// functions/src/https/{{namespace}}/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';
import * as Sentry from '@sentry/node';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Auth middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/{{endpoint}}', async (req, res) => {
  try {
    // Handler logic
    res.json({ success: true, data: result });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/{{endpoint}}', async (req, res) => {
  try {
    const { /* params */ } = req.body;
    // Handler logic
    res.json({ success: true, data: result });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const {{functionName}} = onRequest(app);
```

## Variables

- `{{collection}}` — Firestore collection name (kebab-case)
- `{{PascalName}}` — PascalCase name for function export
- `{{modelName}}` — Ember Data model name
- `{{namespace}}` — URL namespace for HTTPS endpoints
- `{{endpoint}}` — Specific endpoint path
- `{{functionName}}` — Exported function name
