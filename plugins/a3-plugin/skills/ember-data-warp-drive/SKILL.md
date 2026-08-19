---
name: ember-data-warp-drive
description: Deep WarpDrive (next-gen Ember Data) reference — Store, models, adapters, serializers, relationships, caching, pagination, and A3-specific data layer patterns
version: 0.1.0
---


# WarpDrive / Ember Data Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-store-service-exhaustive-api.md` | Store Service — Exhaustive API |
| `reference/03-record-lifecycle-states.md` | Record Lifecycle States |
| `reference/04-record-operations-complete-reference.md` | Record Operations — Complete Reference |
| `reference/05-relationships-deep-dive.md` | Relationships — Deep Dive |
| `reference/06-recordarray-and-adapterpopulatedrecordarray.md` | RecordArray and AdapterPopulatedRecordArray |
| `reference/07-adapter-api-full-reference.md` | Adapter API — Full Reference |
| `reference/08-serializer-api-full-reference.md` | Serializer API — Full Reference |
| `reference/09-transform-api.md` | Transform API |
| `reference/10-warpdrive-specific-apis.md` | WarpDrive-Specific APIs |
| `reference/11-error-handling.md` | Error Handling |
| `reference/12-model-inheritance-patterns.md` | Model Inheritance Patterns |
| `reference/14-how-findrecord-vs-query-vs-peekrecord-interact-w.md` | How findRecord vs query vs peekRecord Interact with the Cache |
| `reference/15-model-definition-comprehensive.md` | Model Definition — Comprehensive |
| `reference/18-firestore-specific-patterns.md` | Firestore-Specific Patterns |

## Overview

A3 uses WarpDrive, the next generation of Ember Data. With 823+ file imports, this is the single most-used package in the A3 codebase. It provides the entire data layer: identity map, caching, request lifecycle, relationships, serialization, and reactivity.

Key packages:
- `@warp-drive/core` — Core primitives (identifiers, request management, cache)
- `@warp-drive/ember` — Ember integration (`<Request>` component, reactive documents)
- `@warp-drive/json-api` — JSON:API cache implementation
- `@warp-drive/legacy` — Legacy compatibility layer for classic Ember Data APIs
- `@warp-drive/utilities` — Utility functions
- `@ember-data/adapter` — Adapter interface (how data reaches the persistence layer)
- `@ember-data/serializer` — Serializer interface (how raw payloads become normalized records)
- `@ember-data/model` — Model class, `@attr`, `@belongsTo`, `@hasMany`
- `@ember-data/graph` — Relationship graph (tracks all relationship state)
- `@ember-data/store` — The Store service itself

---
## Embedded Records

When a Firestore document contains nested maps that you want to treat as their own model, you can use embedded records via the serializer.

### EmbeddedRecordsMixin

```typescript
import RESTSerializer from '@ember-data/serializer/rest';
import EmbeddedRecordsMixin from '@ember-data/serializer/rest';

export default class OrderSerializer extends RESTSerializer.extend(EmbeddedRecordsMixin) {
  attrs = {
    lineItems: { embedded: 'always' },  // Always serialize/deserialize as embedded
    shippingAddress: { embedded: 'always' },
  };
}
```

Modes:
- `{ embedded: 'always' }` — Embedded in both directions (serialize and deserialize).
- `{ serialize: 'records', deserialize: 'records' }` — Explicit per-direction.
- `{ serialize: 'ids', deserialize: 'records' }` — Deserialize as embedded but serialize only IDs.

### A3 Pattern for Firestore Maps

Since Firestore documents can contain nested maps, A3 often uses raw `@attr()` (untyped) for simple embedded data rather than full embedded records:

```typescript
export default class Enrollment extends BaseModel {
  // Simple nested object — not a separate model
  @attr() declare address: { street: string; city: string; state: string; zip: string };

  // Array of objects
  @attr() declare dependents: Array<{ name: string; relationship: string; dob: string }>;
}
```

For complex nested structures that need their own identity and relationships, use a Firestore subcollection instead of embedded records.

---
## Adapters — A3 Configuration

### CloudFirestoreAdapter (Default)

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

---
## Serializers — A3 Configuration

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
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    // Transform Stripe API response to Ember Data format
  }
}
```

---
## Further Investigation

- **WarpDrive Docs**: https://github.com/emberjs/data
- **Ember Data Guides**: https://guides.emberjs.com/release/models/
- **ember-cloud-firestore-adapter**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Data Model**: https://firebase.google.com/docs/firestore/data-model
- **JSON:API Specification**: https://jsonapi.org/
- **WarpDrive RFC Tracking**: https://github.com/emberjs/data/labels/RFC
