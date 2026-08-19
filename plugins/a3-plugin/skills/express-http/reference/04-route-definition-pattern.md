## Route Definition Pattern

### Standard Route File

```typescript
// functions/src/stripe/index.ts
import { Router } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { createHttpApp } from '../utils/create-http-app';
import { authMiddleware } from '../utils/auth-middleware';

// Import handlers
import { handleWebhook } from './events';
import { createCheckoutSession, getSession } from './checkout/sessions';
import { createCustomer, getCustomer, updateCustomer, deleteCustomer } from './customers';
import { listSubscriptions, cancelSubscription } from './subscriptions';
import { listInvoices } from './invoices';

const router = Router();

// Webhook endpoint — no auth (verified via Stripe signature)
router.post('/webhook', handleWebhook);

// Apply auth middleware to all subsequent routes
router.use(authMiddleware);

// Checkout
router.post('/checkout/sessions', createCheckoutSession);
router.get('/checkout/sessions/:id', getSession);

// Customers
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Subscriptions
router.get('/subscriptions', listSubscriptions);
router.delete('/subscriptions/:id', cancelSubscription);

// Invoices
router.get('/invoices', listInvoices);

// Create the Express app
const app = createHttpApp({
  router,
  rawBody: true, // Needed for Stripe webhook signature verification
});

// Export as Cloud Function
export const stripe = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 100,
  },
  app,
);
```

### Route Handler Pattern

Each route handler follows a consistent pattern:

```typescript
// functions/src/stripe/customers.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../utils/auth-middleware';
import stripe from '../utils/stripe';

export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { email, name } = req.body;
    const { uid, organizationId } = (req as AuthenticatedRequest).user;

    // Validate input
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Business logic
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        firebaseUid: uid,
        organizationId,
      },
    });

    // Return response
    res.status(201).json(customer);
  } catch (err: any) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}
```

---
