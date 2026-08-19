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
