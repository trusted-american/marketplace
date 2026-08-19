## Express to Cloud Functions Mapping

### How `onRequest` Works

```typescript
import { onRequest } from 'firebase-functions/v2/https';

// The Express app is passed directly to onRequest
export const stripe = onRequest(options, app);
```

When deployed, Firebase creates an HTTPS endpoint at:

```
https://<region>-<project-id>.cloudfunctions.net/stripe
```

All requests to this URL (and sub-paths) are routed through the Express app.

### URL Mapping

| Express Route | Cloud Function URL |
|---|---|
| `POST /webhook` | `POST https://...cloudfunctions.net/stripe/webhook` |
| `POST /checkout/sessions` | `POST https://...cloudfunctions.net/stripe/checkout/sessions` |
| `GET /customers/:id` | `GET https://...cloudfunctions.net/stripe/customers/abc123` |

### v2 Function Options

```typescript
onRequest(
  {
    region: 'us-central1',        // Deployment region
    memory: '256MiB',             // Memory allocation (128MiB - 32GiB)
    timeoutSeconds: 60,           // Max execution time (1-3600)
    minInstances: 0,              // Minimum warm instances (0 = cold start possible)
    maxInstances: 100,            // Maximum concurrent instances
    concurrency: 80,              // Max concurrent requests per instance
    cpu: 1,                       // CPU allocation (fractional for < 2GiB memory)
    cors: true,                   // Can also configure CORS here (but A3 uses Express cors)
    invoker: 'public',            // Who can invoke: 'public' or specific service accounts
  },
  app,
);
```

### v1 vs v2 Functions

A3 uses Firebase Functions v2 (`firebase-functions/v2/https`). Key differences:

| Feature | v1 | v2 |
|---|---|---|
| Import | `firebase-functions` | `firebase-functions/v2/https` |
| Region | Set via `.region()` chaining | Set in options object |
| Concurrency | 1 request per instance | Up to 1000 per instance |
| Memory | Up to 8GB | Up to 32GB |
| Timeout | Up to 540s | Up to 3600s |
| Min instances | Paid feature | Built-in option |

---
