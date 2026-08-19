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
