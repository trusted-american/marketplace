---
name: deep-object-diff
description: deep-object-diff reference — used in 6 A3 Firestore update triggers. Detecting document field changes for conditional side effects
version: 0.1.0
---

# deep-object-diff Reference

## Overview

`deep-object-diff` is a lightweight library for computing the difference between two JavaScript objects. A3 uses it in 6 Firestore `onUpdate` Cloud Function triggers to detect exactly which fields changed on a document, enabling conditional side effects that only run when specific fields are modified.

**Version**: 1.x
**Import**: `import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';`

## Core Functions

### diff()

Returns an object representing all differences between two objects. The result contains only the paths that changed, with the new values.

```typescript
import { diff } from 'deep-object-diff';

const before = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  address: {
    street: '123 Main St',
    city: 'Austin',
    state: 'TX',
  },
};

const after = {
  firstName: 'John',
  lastName: 'Smith',         // changed
  email: 'john@example.com',
  address: {
    street: '456 Oak Ave',   // changed
    city: 'Austin',
    state: 'TX',
  },
};

const result = diff(before, after);
// {
//   lastName: 'Smith',
//   address: {
//     street: '456 Oak Ave'
//   }
// }
```

Key behaviors:
- Returns `undefined` for unchanged fields (they are omitted from the result).
- Nested objects are recursively compared.
- If a field was deleted, its value is `undefined` in the result.
- If a field was added, its new value appears in the result.
- Arrays are compared by index, not by value equality.

### addedDiff()

Returns only the fields that exist in the second object but NOT in the first (newly added fields).

```typescript
import { addedDiff } from 'deep-object-diff';

const before = {
  firstName: 'John',
  lastName: 'Doe',
};

const after = {
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',     // added
  phone: '555-1234',         // added
};

const result = addedDiff(before, after);
// {
//   middleName: 'Michael',
//   phone: '555-1234'
// }
```

### deletedDiff()

Returns only the fields that exist in the first object but NOT in the second (removed fields).

```typescript
import { deletedDiff } from 'deep-object-diff';

const before = {
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  phone: '555-1234',
};

const after = {
  firstName: 'John',
  lastName: 'Doe',
  // middleName removed
  // phone removed
};

const result = deletedDiff(before, after);
// {
//   middleName: undefined,
//   phone: undefined
// }
```

### updatedDiff()

Returns only the fields that exist in BOTH objects but have different values (modified fields only, no additions or deletions).

```typescript
import { updatedDiff } from 'deep-object-diff';

const before = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
};

const after = {
  firstName: 'John',
  lastName: 'Smith',          // updated
  email: 'john.smith@example.com', // updated
  age: 30,
};

const result = updatedDiff(before, after);
// {
//   lastName: 'Smith',
//   email: 'john.smith@example.com'
// }
```

### detailedDiff()

Returns an object with three keys: `added`, `deleted`, and `updated` — each containing the respective differences. This is the most informative function and is useful when you need to distinguish between types of changes.

```typescript
import { detailedDiff } from 'deep-object-diff';

const before = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '555-1234',
};

const after = {
  firstName: 'John',
  lastName: 'Smith',          // updated
  email: 'john@example.com',  // added
  // phone removed
};

const result = detailedDiff(before, after);
// {
//   added: {
//     email: 'john@example.com'
//   },
//   deleted: {
//     phone: undefined
//   },
//   updated: {
//     lastName: 'Smith'
//   }
// }
```

## Array Comparison Behavior

Arrays are compared by index, NOT by deep value equality or set membership. This is important to understand:

```typescript
import { diff } from 'deep-object-diff';

const before = { tags: ['health', 'dental', 'vision'] };
const after = { tags: ['health', 'life', 'vision'] };

const result = diff(before, after);
// { tags: { 1: 'life' } }
// Index 1 changed from 'dental' to 'life'
```

When array lengths differ:

```typescript
const before = { items: ['a', 'b'] };
const after = { items: ['a', 'b', 'c'] };

const result = diff(before, after);
// { items: { 2: 'c' } }
```

## How A3 Uses deep-object-diff in Firestore Triggers

A3 has 6 Firestore `onUpdate` triggers that use `deep-object-diff` to detect which document fields changed and only execute side effects when relevant fields are modified. This prevents unnecessary downstream work (emails, syncs, recalculations) when unrelated fields are updated.

### Pattern: Conditional Side Effects Based on Field Changes

The standard pattern used across all 6 triggers:

```typescript
import { diff } from 'deep-object-diff';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const onClientUpdated = onDocumentUpdated('clients/{clientId}', async (event) => {
  const beforeData = event.data!.before.data();
  const afterData = event.data!.after.data();

  const changes = diff(beforeData, afterData);

  // Exit early if no meaningful changes
  if (!changes || Object.keys(changes).length === 0) {
    return;
  }

  // Check for specific field changes and run conditional side effects
  if ('status' in changes) {
    await handleStatusChange(event.data!.after);
  }

  if ('email' in changes) {
    await syncEmailToAuthProvider(event.data!.after);
  }

  if ('agencyId' in changes) {
    await reassignToNewAgency(event.data!.after);
  }
});
```

### clients/update.ts

Detects changes to client status, email, assigned agency, and address fields. Triggers:
- Status change notifications to the assigned agent
- Email sync to Firebase Auth when client email changes
- Agency reassignment workflows
- Address change propagation to active enrollments

```typescript
import { diff } from 'deep-object-diff';

export const onClientUpdated = onDocumentUpdated('clients/{clientId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('status' in changes) {
    await notifyAgentOfStatusChange(after, before.status, after.status);
  }

  if ('email' in changes) {
    await updateAuthEmail(event.params.clientId, after.email);
  }

  if ('address' in changes) {
    await propagateAddressToEnrollments(event.params.clientId, after.address);
  }
});
```

### enrollments/update.ts

Detects changes to enrollment status, effective date, tier, and premium. Triggers:
- Commission recalculation when premium changes
- Carrier notification when status changes to terminated
- Dependent enrollment updates when tier changes

```typescript
export const onEnrollmentUpdated = onDocumentUpdated('enrollments/{enrollmentId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('premium' in changes) {
    await recalculateCommission(event.params.enrollmentId, after);
  }

  if ('status' in changes && after.status === 'terminated') {
    await notifyCarrierOfTermination(after);
  }

  if ('tier' in changes) {
    await updateDependentEnrollments(event.params.enrollmentId, after.tier);
  }
});
```

### users/update.ts

Detects changes to user role, email, and agency assignment. Triggers:
- Firebase Auth custom claims update when role changes
- Permission cache invalidation
- Welcome/role-change email notifications

```typescript
export const onUserUpdated = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('role' in changes) {
    await updateCustomClaims(event.params.userId, after.role);
    await invalidatePermissionCache(event.params.userId);
  }

  if ('email' in changes) {
    await updateAuthEmail(event.params.userId, after.email);
  }
});
```

### contracts/update.ts

Detects changes to contract status, commission rates, and effective dates. Triggers:
- Commission recalculation across all enrollments under the contract
- Carrier sync when contract status changes
- Agent notification of rate changes

```typescript
export const onContractUpdated = onDocumentUpdated('contracts/{contractId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('commissionRate' in changes || 'overrideRate' in changes) {
    await recalculateContractCommissions(event.params.contractId, after);
  }

  if ('status' in changes) {
    await syncContractStatusToCarrier(after);
  }
});
```

### agencies/update.ts

Detects changes to agency name, contact info, and license status. Triggers:
- Cascading name update to all agent display records
- License expiration alerts
- Carrier appointment status sync

```typescript
export const onAgencyUpdated = onDocumentUpdated('agencies/{agencyId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('name' in changes) {
    await cascadeAgencyNameToAgents(event.params.agencyId, after.name);
  }

  if ('licenseStatus' in changes && after.licenseStatus === 'expired') {
    await alertAdminsOfLicenseExpiration(after);
  }
});
```

### user-secrets/update.ts

Detects changes to sensitive user credential fields. Triggers:
- Audit log entries for secret rotation
- Dependent service re-authentication

```typescript
export const onUserSecretUpdated = onDocumentUpdated('user-secrets/{userId}', async (event) => {
  const before = event.data!.before.data();
  const after = event.data!.after.data();
  const changes = diff(before, after);

  if (!changes || Object.keys(changes).length === 0) return;

  if ('apiKey' in changes || 'refreshToken' in changes) {
    await logSecretRotation(event.params.userId, Object.keys(changes));
  }
});
```

## Checking for Nested Field Changes

Use optional chaining or lodash `get` to check for nested field changes:

```typescript
const changes = diff(before, after);

// Check if any address field changed
if (changes && typeof changes === 'object' && 'address' in changes) {
  const addressChanges = (changes as Record<string, unknown>).address;
  if (addressChanges && typeof addressChanges === 'object') {
    if ('state' in addressChanges) {
      await handleStateChange(after);
    }
  }
}
```

## Utility: hasFieldChanged Helper

A3 often uses a reusable helper function:

```typescript
// utils/has-field-changed.ts
import { diff } from 'deep-object-diff';

export function hasFieldChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldPath: string,
): boolean {
  const changes = diff(before, after);
  if (!changes) return false;

  const parts = fieldPath.split('.');
  let current: unknown = changes;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    if (!(part in (current as Record<string, unknown>))) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

// Usage:
if (hasFieldChanged(before, after, 'address.state')) {
  await handleStateChange(after);
}
```

## Performance Considerations

- `diff()` performs a deep recursive comparison. For very large documents with many nested objects, consider comparing only the fields you care about instead of diffing the entire document.
- For Firestore triggers, documents are typically modest in size so `diff()` is fast.
- If you only need to know about additions, use `addedDiff()` directly instead of `detailedDiff()` for a marginal speedup.

## Further Investigation

- **deep-object-diff npm**: https://www.npmjs.com/package/deep-object-diff
- **GitHub**: https://github.com/mattphillips/deep-object-diff
- **Firestore Triggers**: https://firebase.google.com/docs/functions/firestore-events
