---
name: ember-data-warp-drive
description: Deep WarpDrive (next-gen Ember Data) reference — Store, models, adapters, serializers, relationships, caching, pagination, and A3-specific data layer patterns
version: 0.1.0
---

# WarpDrive / Ember Data Reference

## Overview

A3 uses WarpDrive, the next generation of Ember Data. The key packages are:
- `@warp-drive/core` — Core primitives
- `@warp-drive/ember` — Ember integration
- `@warp-drive/json-api` — JSON:API cache implementation
- `@warp-drive/legacy` — Legacy compatibility layer
- `@warp-drive/utilities` — Utility functions
- `@ember-data/adapter` — Adapter interface
- `@ember-data/serializer` — Serializer interface
- `@ember-data/graph` — Relationship graph

## Store Service

### A3's Extended Store
```typescript
// app/services/store.ts
import Store from '@ember-data/store';
import { service } from '@ember/service';

export default class StoreService extends Store {
  // Custom aggregation methods for Firestore
  async getCount(modelName: string, query?: object): Promise<number> {
    // Returns count via Firestore aggregation
  }

  async getSum(modelName: string, field: string, query?: object): Promise<number> {
    // Returns sum via Firestore aggregation
  }
}
```

### Store Operations

#### Finding Records
```typescript
// Single record by ID
const record = await this.store.findRecord('client', 'client_abc123');

// Single record with options
const record = await this.store.findRecord('client', 'client_abc123', {
  reload: true,          // Force re-fetch from server
  backgroundReload: true // Fetch in background, return cached if available
});

// Peek (cached only, no network request)
const cached = this.store.peekRecord('client', 'client_abc123');
```

#### Querying Collections
```typescript
// Basic query
const records = await this.store.query('enrollment', {
  filter: {
    status: 'active',
    agencyId: 'agency_abc',
  },
});

// Query with pagination (A3 pattern: n+1 for hasMore)
const records = await this.store.query('enrollment', {
  filter: { status: 'active' },
  page: { limit: 25, offset: 0 },
});
// records.meta.hasMore — boolean from n+1 pattern

// Query with sorting
const records = await this.store.query('client', {
  filter: { status: 'active' },
  sort: '-createdAt', // Descending
});
```

#### Creating Records
```typescript
const record = this.store.createRecord('client', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'active',
});

await record.save(); // Writes to Firestore
```

#### Updating Records
```typescript
record.firstName = 'Jane';
await record.save(); // Updates Firestore document
```

#### Deleting Records
```typescript
record.deleteRecord();
await record.save(); // Deletes Firestore document
```

## Model Definition

### Attributes
```typescript
import Model, { attr } from '@ember-data/model';

export default class MyModel extends Model {
  // String
  @attr('string') declare name: string;

  // Number
  @attr('number') declare amount: number;

  // Boolean
  @attr('boolean') declare isActive: boolean;

  // Date (maps to Firestore Timestamp)
  @attr('date') declare createdAt: Date;

  // Nullable timestamp (custom A3 transform)
  @attr('null-timestamp') declare completedAt: Date | null;

  // Default values
  @attr('string', { defaultValue: 'draft' }) declare status: string;
  @attr('number', { defaultValue: 0 }) declare count: number;

  // Untyped (raw value from Firestore)
  @attr() declare metadata: unknown;
}
```

### Relationships
```typescript
import { belongsTo, hasMany } from '@ember-data/model';
import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';

export default class Enrollment extends BaseModel {
  // belongsTo — references another document
  @belongsTo('client', { async: true, inverse: 'enrollments' })
  declare client: AsyncBelongsTo<Client>;

  // belongsTo with no inverse (one-directional)
  @belongsTo('carrier', { async: true, inverse: null })
  declare carrier: AsyncBelongsTo<Carrier>;

  // hasMany — subcollection or reference array
  @hasMany('enrollment-file', { async: true, inverse: 'enrollment' })
  declare files: AsyncHasMany<EnrollmentFile>;

  @hasMany('enrollment-note', { async: true, inverse: 'enrollment' })
  declare notes: AsyncHasMany<EnrollmentNote>;
}
```

### Accessing Relationships
```typescript
// In route/component — relationships are async, must await
const client = await enrollment.client;

// In template — auto-resolves (shows loading state)
{{@enrollment.client.name}}

// Check if relationship is loaded
if (enrollment.belongsTo('client').value()) {
  // Already loaded
}
```

### Computed Getters on Models
```typescript
export default class Client extends BaseModel {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isComplete(): boolean {
    return Boolean(this.firstName && this.lastName && this.email);
  }
}
```

## Adapters

### CloudFirestoreAdapter (Default)
The default adapter talks directly to Cloud Firestore:
```typescript
// app/adapters/application.ts
import CloudFirestoreAdapter from 'ember-cloud-firestore-adapter/adapters/cloud-firestore';

export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // Custom ID generation: modelName_uuid
  generateIdForRecord(store: Store, type: string): string {
    return `${type}_${crypto.randomUUID()}`;
  }

  // Pagination: fetch n+1 to determine hasMore
  // This is a key A3 pattern — asks for 1 extra record to know
  // if there are more pages without a separate count query
}
```

### Firebase REST Adapter
For data that comes from Cloud Functions (not directly from Firestore):
```typescript
// app/adapters/firebase.ts
import RESTAdapter from '@ember-data/adapter/rest';

export default class FirebaseAdapter extends RESTAdapter {
  // Calls Cloud Functions HTTP endpoints
  // Used by: stripe, mailgun, pandadoc, etc.
}
```

### Custom Adapters
```typescript
// app/adapters/stripe/customer.ts
import FirebaseAdapter from '../firebase';

export default class StripeCustomerAdapter extends FirebaseAdapter {
  namespace = 'api/stripe';
  // Routes: /api/stripe/customers, /api/stripe/customers/:id
}
```

## Serializers

### CloudFirestoreSerializer (Default)
```typescript
// app/serializers/application.ts
import CloudFirestoreSerializer from 'ember-cloud-firestore-adapter/serializers/cloud-firestore';

export default class ApplicationSerializer extends CloudFirestoreSerializer {
  // Handles Firestore-specific data transformations:
  // - Server timestamps on new records
  // - Meta object extraction for pagination
  // - Relationship reference resolution
}
```

### Custom Serializers
```typescript
// app/serializers/stripe/customer.ts
import RESTSerializer from '@ember-data/serializer/rest';

export default class StripeCustomerSerializer extends RESTSerializer {
  // Transform Stripe API response to Ember Data format
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    // Custom normalization
  }
}
```

## Transforms

### Built-in Transforms
| Transform | Input | Output |
|-----------|-------|--------|
| `'string'` | any | `string` |
| `'number'` | any | `number` |
| `'boolean'` | any | `boolean` |
| `'date'` | Firestore Timestamp | `Date` |

### Custom: null-timestamp
```typescript
// app/transforms/null-timestamp.ts
// Handles nullable Firestore timestamps
// Input: Firestore Timestamp | null
// Output: Date | null
```

## Firestore-Specific Patterns

### Collection References
In Firestore, collections are top-level or subcollections:
- `clients` → top-level collection
- `clients/{id}/notes` → subcollection
- `clients/{id}/files` → subcollection

The ember-cloud-firestore-adapter maps:
- `belongsTo` → document reference field
- `hasMany` → subcollection query OR reference array

### Real-Time Updates
The ember-cloud-firestore-adapter supports real-time listeners:
- Records fetched with `findRecord` can receive live updates
- The store auto-updates when Firestore documents change
- Components re-render automatically via tracked properties

### Firestore Query Limitations
- **No JOINs** — must load related records separately
- **No OR queries across fields** — use composite indexes
- **Inequality filters** on only one field per query
- **orderBy** requires matching indexes for filtered queries
- **Pagination** via startAfter/limit, not offset (A3's n+1 pattern wraps this)

### Index Requirements
Complex queries need composite indexes defined in `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "enrollments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Further Investigation

- **WarpDrive Docs**: https://github.com/emberjs/data
- **Ember Data Guides**: https://guides.emberjs.com/release/models/
- **ember-cloud-firestore-adapter**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Data Model**: https://firebase.google.com/docs/firestore/data-model
