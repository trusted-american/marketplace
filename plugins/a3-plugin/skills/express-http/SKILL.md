---
name: express-http
description: Express.js HTTP app pattern reference — A3's create-http-app utility used across 6 backend files for Cloud Function HTTPS endpoints
version: 0.1.0
---

# Express.js HTTP App Pattern Reference

A3 uses a standardized `create-http-app` utility to create Express.js applications that are deployed as Firebase Cloud Functions HTTPS endpoints. This skill covers the utility pattern, CORS configuration, authentication middleware, route definition, error handling, TypeScript typing, and the relationship between Express and `firebase-functions`.

---

## Architecture Overview

### File Map

| File | Purpose |
|---|---|
| `functions/src/utils/create-http-app.ts` | Factory function that creates a configured Express app |
| `functions/src/stripe/index.ts` | Stripe HTTP app — uses create-http-app |
| `functions/src/pandadoc/index.ts` | PandaDoc HTTP app — uses create-http-app |
| `functions/src/algolia/index.ts` | Algolia HTTP app — uses create-http-app |
| `functions/src/mailgun/index.ts` | Mailgun HTTP app — uses create-http-app |
| `functions/src/openai/index.ts` | OpenAI HTTP app — uses create-http-app |
| `functions/src/neon/index.ts` | Neon/PostgreSQL HTTP app — uses create-http-app |

### Pattern Summary

Every external service integration in A3 follows the same pattern:

1. Import `createHttpApp` from the utility.
2. Define routes with Express Router.
3. Pass the router to `createHttpApp`.
4. Export the Express app wrapped in `onRequest` from `firebase-functions/v2/https`.

---

## The `create-http-app` Utility — `utils/create-http-app.ts`

### Full Implementation

```typescript
// functions/src/utils/create-http-app.ts
import express, { Express, Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';

export interface HttpAppOptions {
  router: Router;
  basePath?: string;
  corsOrigins?: string | string[] | boolean;
  rawBody?: boolean;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}

export function createHttpApp(options: HttpAppOptions): Express {
  const app = express();

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: options.corsOrigins ?? getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  };
  app.use(cors(corsOptions));

  // Body parsing
  if (options.rawBody) {
    // For webhooks that need raw body (e.g., Stripe signature verification)
    app.use(express.raw({ type: 'application/json', limit: '10mb' }));
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (Buffer.isBuffer(req.body)) {
        (req as any).rawBody = req.body;
        req.body = JSON.parse(req.body.toString());
      }
      next();
    });
  } else {
    app.use(express.json({ limit: '10mb' }));
  }
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Custom middleware
  if (options.middleware?.length) {
    options.middleware.forEach((mw) => app.use(mw));
  }

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // Mount routes
  const basePath = options.basePath || '/';
  app.use(basePath, options.router);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}

function getAllowedOrigins(): string[] {
  const origins = [
    process.env.FRONTEND_URL || 'http://localhost:4200',
  ];

  if (process.env.ADDITIONAL_CORS_ORIGINS) {
    origins.push(...process.env.ADDITIONAL_CORS_ORIGINS.split(','));
  }

  return origins;
}
```

### Key Components

#### CORS Setup

| Option | Value | Purpose |
|---|---|---|
| `origin` | Allowed origins list | Restricts which domains can call the API |
| `methods` | GET, POST, PUT, PATCH, DELETE, OPTIONS | HTTP methods allowed |
| `allowedHeaders` | Content-Type, Authorization, etc. | Headers the client can send |
| `credentials` | `true` | Allow cookies and auth headers |
| `maxAge` | 86400 (24h) | How long browsers cache preflight responses |

#### Body Parsing

- **JSON mode** (default): `express.json()` parses JSON request bodies. Used for most endpoints.
- **Raw body mode**: `express.raw()` preserves the raw request buffer. Required for webhook signature verification (Stripe, etc.). The middleware saves the raw buffer as `req.rawBody` and then parses JSON into `req.body`.
- **URL-encoded**: `express.urlencoded({ extended: true })` handles form submissions.
- **Size limit**: `10mb` limit on request bodies. Adjustable per use case.

#### Error Handling

The global error handler catches any unhandled errors thrown in route handlers. It:

1. Logs the full error stack trace.
2. Returns a generic 500 response to the client.
3. In development mode, includes the error message for debugging.

---

## Authentication Middleware

A3 uses Firebase Auth tokens for API authentication.

### Auth Middleware Implementation

```typescript
// functions/src/utils/auth-middleware.ts
import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Look up user's organization and role from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      res.status(403).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data()!;

    (req as AuthenticatedRequest).user = {
      uid,
      email: decodedToken.email || '',
      organizationId: userData.organizationId,
      role: userData.role || 'member',
    };

    next();
  } catch (err: any) {
    if (err.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (err.code === 'auth/id-token-revoked') {
      res.status(401).json({ error: 'Token revoked' });
      return;
    }
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Role-Based Access Middleware

```typescript
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Usage in routes
router.delete('/customers/:id', requireRole('admin', 'owner'), deleteCustomer);
```

### Webhook Bypass

Webhook endpoints skip auth middleware because they receive requests from external services (Stripe, PandaDoc), not from authenticated users:

```typescript
// Stripe webhook endpoint — no auth middleware
router.post('/webhook', handleStripeWebhook);

// All other Stripe endpoints — auth required
router.use(authMiddleware);
router.post('/checkout/sessions', createCheckoutSession);
router.get('/customers/:id', getCustomer);
```

---

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

## Request/Response TypeScript Typing

### Extending Express Types

```typescript
// functions/src/types/express.d.ts
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: {
        uid: string;
        email: string;
        organizationId: string;
        role: string;
      };
    }
  }
}
```

### Typed Request Bodies

```typescript
interface CreateCheckoutSessionBody {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(
  req: Request<{}, {}, CreateCheckoutSessionBody>,
  res: Response,
): Promise<void> {
  const { priceId, successUrl, cancelUrl, metadata } = req.body;
  // priceId is typed as string
  // ...
}
```

### Typed Route Parameters

```typescript
interface CustomerParams {
  id: string;
}

export async function getCustomer(
  req: Request<CustomerParams>,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  // id is typed as string
  // ...
}
```

### Typed Query Parameters

```typescript
interface ListQuery {
  limit?: string;
  offset?: string;
  status?: string;
}

export async function listCustomers(
  req: Request<{}, {}, {}, ListQuery>,
  res: Response,
): Promise<void> {
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = parseInt(req.query.offset || '0', 10);
  const status = req.query.status;
  // ...
}
```

---

## Error Handling Patterns

### Route-Level Try/Catch

Every route handler wraps its body in try/catch:

```typescript
export async function handler(req: Request, res: Response): Promise<void> {
  try {
    // ... business logic
    res.json(result);
  } catch (err: any) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Custom Error Classes

```typescript
// functions/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

### Error-Aware Global Handler

```typescript
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Unexpected error
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

### Usage in Handlers

```typescript
export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const customer = await stripe.customers.retrieve(id);

    if (!customer || customer.deleted) {
      throw new NotFoundError('Customer not found');
    }

    res.json(customer);
  } catch (err) {
    next(err); // Pass to global error handler
  }
}
```

---

## Request Validation Middleware

```typescript
// functions/src/utils/validate.ts
import { Request, Response, NextFunction } from 'express';

interface ValidationSchema {
  body?: Record<string, { required?: boolean; type?: string; enum?: string[] }>;
  params?: Record<string, { required?: boolean; type?: string }>;
  query?: Record<string, { required?: boolean; type?: string }>;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
        }
        if (value !== undefined && rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be a ${rules.type}`);
        }
        if (value !== undefined && rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
}

// Usage
router.post(
  '/checkout/sessions',
  validate({
    body: {
      priceId: { required: true, type: 'string' },
    },
  }),
  createCheckoutSession,
);
```

---

## Complete Example: Service Integration File

```typescript
// functions/src/pandadoc/index.ts
import { Router } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { createHttpApp } from '../utils/create-http-app';
import { authMiddleware } from '../utils/auth-middleware';

import { createDocument, getDocument, sendDocument, downloadDocument, listDocuments } from './documents';
import { listTemplates, getTemplateDetails } from './templates';
import { handleFormSubmission } from './forms';
import { handlePandaDocWebhook } from './notify';

const router = Router();

// Webhook — no auth (verified via PandaDoc signature)
router.post('/notify', handlePandaDocWebhook);

// Auth required for all other routes
router.use(authMiddleware);

// Documents
router.post('/documents', createDocument);
router.get('/documents', listDocuments);
router.get('/documents/:id', getDocument);
router.post('/documents/:id/send', sendDocument);
router.get('/documents/:id/download', downloadDocument);

// Templates
router.get('/templates', listTemplates);
router.get('/templates/:id/details', getTemplateDetails);

// Forms
router.post('/forms/:id/submit', handleFormSubmission);

const app = createHttpApp({ router });

export const pandadoc = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120, // Document operations can be slow
  },
  app,
);
```

---

## Testing Express Apps

### Unit Testing Route Handlers

```typescript
import request from 'supertest';
import { createHttpApp } from '../utils/create-http-app';
import { Router } from 'express';

describe('Customer Routes', () => {
  let app: Express;

  beforeEach(() => {
    const router = Router();
    router.get('/customers/:id', getCustomer);
    app = createHttpApp({ router });
  });

  it('returns 404 for non-existent customer', async () => {
    const res = await request(app)
      .get('/customers/nonexistent')
      .set('Authorization', 'Bearer valid-test-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Customer not found');
  });
});
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `FRONTEND_URL` | Allowed CORS origin (e.g., `https://app.a3platform.com`) |
| `ADDITIONAL_CORS_ORIGINS` | Comma-separated additional CORS origins |
| `NODE_ENV` | `development` or `production` — affects error verbosity |

---

## Common Patterns and Best Practices

1. **One Express app per service**: Each external integration (Stripe, PandaDoc, etc.) gets its own Express app and Cloud Function. This enables independent scaling and deployment.
2. **Webhook routes before auth**: Place webhook endpoints before `router.use(authMiddleware)` so they bypass token verification. Webhooks use their own signature verification.
3. **Raw body for webhooks**: Set `rawBody: true` in `createHttpApp` options when the app handles webhooks that require signature verification against the raw request body.
4. **Consistent error format**: All error responses use `{ error: string, code?: string }` format for frontend consistency.
5. **Request logging**: The built-in logging middleware logs every request method and path. In production, consider adding request ID tracking for correlation.
6. **CORS origin control**: Never use `origin: '*'` in production. Always specify allowed origins explicitly.
7. **Timeout awareness**: Cloud Functions have a maximum timeout. Long-running operations (document generation, bulk exports) should use background functions or task queues instead.
8. **Type safety**: Use `AuthenticatedRequest` after auth middleware to access `req.user` with full TypeScript support. Define typed request bodies, params, and query interfaces.
