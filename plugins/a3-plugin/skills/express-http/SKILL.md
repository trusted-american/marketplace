---
name: express-http
description: Express.js HTTP app pattern reference — A3's create-http-app utility used across 6 backend files for Cloud Function HTTPS endpoints
version: 0.1.0
---


# Express.js HTTP App Pattern Reference

A3 uses a standardized `create-http-app` utility to create Express.js applications that are deployed as Firebase Cloud Functions HTTPS endpoints. This skill covers the utility pattern, CORS configuration, authentication middleware, route definition, error handling, TypeScript typing, and the relationship between Express and `firebase-functions`.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-the-create-http-app-utility-utils-create-http-ap.md` | The `create-http-app` Utility — `utils/create-http-app.ts` |
| `reference/03-authentication-middleware.md` | Authentication Middleware |
| `reference/04-route-definition-pattern.md` | Route Definition Pattern |
| `reference/05-express-to-cloud-functions-mapping.md` | Express to Cloud Functions Mapping |
| `reference/07-error-handling-patterns.md` | Error Handling Patterns |

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
