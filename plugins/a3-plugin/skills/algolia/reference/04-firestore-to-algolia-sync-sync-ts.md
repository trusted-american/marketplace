## Firestore-to-Algolia Sync — `sync.ts`

A3 uses Firestore triggers to keep Algolia indices synchronized with the source of truth.

### Sync on Create

```typescript
// functions/src/algolia/sync.ts
import * as functions from 'firebase-functions';
import { clientsIndex, dealsIndex, contactsIndex } from './index';

export const onClientCreated = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { orgId, clientId } = context.params;

    const record = {
      objectID: clientId,
      organizationId: orgId,
      displayName: data.displayName || '',
      email: data.email || '',
      company: data.company || '',
      phone: data.phone || '',
      address: data.address || {},
      tags: data.tags || [],
      status: data.status || 'active',
      assignedTo: data.assignedTo || '',
      dealCount: data.dealCount || 0,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await clientsIndex.saveObject(record);
  });
```

### Sync on Update

```typescript
export const onClientUpdated = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onUpdate(async (change, context) => {
    const data = change.after.data();
    const { orgId, clientId } = context.params;

    const record = {
      objectID: clientId,
      organizationId: orgId,
      displayName: data.displayName || '',
      email: data.email || '',
      company: data.company || '',
      phone: data.phone || '',
      address: data.address || {},
      tags: data.tags || [],
      status: data.status || 'active',
      assignedTo: data.assignedTo || '',
      dealCount: data.dealCount || 0,
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await clientsIndex.saveObject(record);
  });
```

### Sync on Delete

```typescript
export const onClientDeleted = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onDelete(async (snapshot, context) => {
    const { clientId } = context.params;
    await clientsIndex.deleteObject(clientId);
  });
```

### Deal Sync Triggers

```typescript
export const onDealCreated = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const { orgId, dealId } = context.params;

    const record = {
      objectID: dealId,
      organizationId: orgId,
      title: data.title || '',
      clientName: data.clientName || '',
      clientId: data.clientId || '',
      description: data.description || '',
      stage: data.stage || '',
      pipelineName: data.pipelineName || '',
      value: data.value || 0,
      tags: data.tags || [],
      assignedTo: data.assignedTo || '',
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    };

    await dealsIndex.saveObject(record);
  });

export const onDealUpdated = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onUpdate(async (change, context) => {
    const data = change.after.data();
    const { orgId, dealId } = context.params;

    await dealsIndex.partialUpdateObject({
      objectID: dealId,
      organizationId: orgId,
      title: data.title || '',
      clientName: data.clientName || '',
      stage: data.stage || '',
      pipelineName: data.pipelineName || '',
      value: data.value || 0,
      tags: data.tags || [],
      assignedTo: data.assignedTo || '',
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    });
  });

export const onDealDeleted = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onDelete(async (snapshot, context) => {
    const { dealId } = context.params;
    await dealsIndex.deleteObject(dealId);
  });
```

### Partial Updates

Use `partialUpdateObject` when only some fields change, to reduce Algolia indexing operations:

```typescript
// Only update the fields that changed
await clientsIndex.partialUpdateObject({
  objectID: clientId,
  status: 'inactive',
  updatedAt: Date.now(),
});
```

### Batch Operations

For bulk data migrations or re-indexing:

```typescript
// Batch save — up to 1000 records per batch
const records = clients.map((client) => ({
  objectID: client.id,
  organizationId: orgId,
  displayName: client.displayName,
  email: client.email,
  // ...
}));

await clientsIndex.saveObjects(records);

// Batch delete
const objectIDs = deletedClients.map((c) => c.id);
await clientsIndex.deleteObjects(objectIDs);

// Replace entire index (dangerous — use for full re-index)
await clientsIndex.replaceAllObjects(records);
```

---
