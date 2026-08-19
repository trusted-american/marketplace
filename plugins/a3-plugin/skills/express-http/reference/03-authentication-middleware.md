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
