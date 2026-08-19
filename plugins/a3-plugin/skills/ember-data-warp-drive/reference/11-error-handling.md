## Error Handling

Ember Data defines a hierarchy of error types. The adapter throws these, and they propagate to the record's `adapterError` property and reject the `save()` / `findRecord()` promise.

### Error Types

| Error Class | HTTP Status | Description |
|-------------|-------------|-------------|
| `AdapterError` | (base class) | Generic adapter failure. Parent of all specific errors. |
| `InvalidError` | 422 | Validation failed. Carries per-field error messages. |
| `TimeoutError` | 408 | Request timed out. |
| `AbortError` | 0 | Request was aborted (e.g., navigation away). |
| `UnauthorizedError` | 401 | Authentication required or token expired. |
| `ForbiddenError` | 403 | Authenticated but not authorized for this action. |
| `NotFoundError` | 404 | Record does not exist. |
| `ConflictError` | 409 | Conflict (e.g., concurrent edit). |
| `ServerError` | 500+ | Server-side failure. |

### Using Errors

```typescript
import { InvalidError, NotFoundError, ServerError } from '@ember-data/adapter/error';

// Throwing from an adapter
async findRecord(store, type, id, snapshot) {
  const response = await fetch(url);
  if (response.status === 404) {
    throw new NotFoundError();
  }
  if (response.status === 422) {
    const body = await response.json();
    throw new InvalidError(body.errors);
    // errors format: [{ detail: 'is required', source: { pointer: '/data/attributes/email' } }]
  }
  return response.json();
}
```

### Handling in Components

```typescript
try {
  await record.save();
} catch (error) {
  if (error instanceof InvalidError) {
    // record.isValid === false
    // record.errors contains field-level errors
    record.errors.forEach((err) => {
      console.log(err.attribute, err.message);
    });
  } else if (error instanceof NotFoundError) {
    this.router.transitionTo('not-found');
  } else if (error instanceof UnauthorizedError) {
    this.session.invalidate();
  } else if (error instanceof ServerError) {
    this.notifications.error('Server error. Please try again.');
  }
}
```

### record.errors (Errors Object)

After an `InvalidError`, the record's `errors` property is populated:

```typescript
record.errors.get('email');    // ['is required', 'must be valid']
record.errors.has('email');    // true
record.errors.errorsFor('email'); // [{ attribute: 'email', message: 'is required' }]
record.errors.length;          // total number of errors
record.isValid;                // false

// In templates
{{#each @record.errors.email as |error|}}
  <p class="error">{{error.message}}</p>
{{/each}}
```

---
