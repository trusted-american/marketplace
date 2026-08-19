## Transform API

Transforms convert attribute values between their server representation and their in-app representation.

### Built-in Transforms

| Transform | `deserialize` (server -> app) | `serialize` (app -> server) |
|-----------|-------------------------------|------------------------------|
| `'string'` | `String(value)` or `null` | `String(value)` or `null` |
| `'number'` | `Number(value)` or `null` | `Number(value)` or `null` |
| `'boolean'` | `Boolean(value)` | `Boolean(value)` |
| `'date'` | `new Date(value)` | `value.toISOString()` |

### Custom Transform Interface

```typescript
import Transform from '@ember-data/serializer/transform';

export default class MyTransform extends Transform {
  deserialize(serialized: ServerType): AppType {
    // Convert from server format to app format
  }

  serialize(deserialized: AppType): ServerType {
    // Convert from app format to server format
  }
}
```

### A3 Custom: null-timestamp

```typescript
// app/transforms/null-timestamp.ts
import Transform from '@ember-data/serializer/transform';

export default class NullTimestampTransform extends Transform {
  deserialize(serialized: FirestoreTimestamp | null): Date | null {
    if (!serialized) return null;
    // Firestore Timestamp has .toDate() method
    return serialized.toDate ? serialized.toDate() : new Date(serialized);
  }

  serialize(deserialized: Date | null): Date | null {
    // Pass through — Firestore SDK handles Date objects
    return deserialized;
  }
}
```

Usage in a model:

```typescript
@attr('null-timestamp') declare completedAt: Date | null;
@attr('null-timestamp') declare cancelledAt: Date | null;
```

### Writing Custom Transforms

Common patterns in A3:

```typescript
// Array transform for Firestore array fields
export default class ArrayTransform extends Transform {
  deserialize(serialized: unknown[]): unknown[] {
    return Array.isArray(serialized) ? serialized : [];
  }
  serialize(deserialized: unknown[]): unknown[] {
    return Array.isArray(deserialized) ? deserialized : [];
  }
}

// JSON/Object transform for embedded Firestore maps
export default class ObjectTransform extends Transform {
  deserialize(serialized: object): object {
    return serialized || {};
  }
  serialize(deserialized: object): object {
    return deserialized || {};
  }
}
```

---
