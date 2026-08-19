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
