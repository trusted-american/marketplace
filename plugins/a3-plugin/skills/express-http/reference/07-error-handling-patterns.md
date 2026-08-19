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
