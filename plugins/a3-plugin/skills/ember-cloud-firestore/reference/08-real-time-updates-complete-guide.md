## Real-Time Updates — Complete Guide

### How Real-Time Listeners Work

The adapter can attach Firestore `onSnapshot` listeners to documents and queries, enabling live data that updates automatically when the database changes.

#### Document-Level Real-Time

```typescript
// When isRealtime is enabled (via adapter config or adapterOptions):
const client = await this.store.findRecord('client', 'client_abc', {
  adapterOptions: { isRealtime: true },
});

// Internally:
// 1. Instead of getDoc(), the adapter calls:
//    onSnapshot(docRef, (snapshot) => { ... })
//
// 2. The initial snapshot resolves the findRecord promise
//
// 3. On subsequent server-side changes:
//    a. Firestore pushes a new DocumentSnapshot to the callback
//    b. The adapter normalizes the new data through the serializer
//    c. The store's cache is updated with the normalized record
//    d. Glimmer's tracking system detects the changed attributes
//    e. Any component rendering this record's tracked properties re-renders
//
// 4. The listener remains active until:
//    a. The record is unloaded from the store
//    b. The adapter explicitly detaches the listener
//    c. The application is destroyed (all listeners cleaned up)
```

#### Query-Level Real-Time

```typescript
// Real-time queries listen for changes to any document matching the query
const activeEnrollments = await this.store.query('enrollment', {
  filter: { status: 'active' },
  adapterOptions: { isRealtime: true },
});

// Internally uses onSnapshot on the entire query:
// onSnapshot(queryRef, (querySnapshot) => {
//   querySnapshot.docChanges().forEach((change) => {
//     if (change.type === 'added') { /* new doc matches query */ }
//     if (change.type === 'modified') { /* existing doc updated */ }
//     if (change.type === 'removed') { /* doc no longer matches query */ }
//   });
// });
```

#### Listener Lifecycle

```
Component renders → findRecord/query (isRealtime: true)
  → Adapter attaches onSnapshot listener
    → Initial data returned, component renders
      → Server-side change occurs (another user, Cloud Function, etc.)
        → onSnapshot callback fires with new data
          → Serializer normalizes the update
            → Store cache updated
              → Tracked properties invalidated
                → Component re-renders with new data
                  ...repeats for every change...
User navigates away → Component destroyed
  → Adapter detaches onSnapshot listener
    → No more callbacks, no memory leaks
```

#### Implications for A3

- **Multi-user collaboration**: When User A edits a client, User B sees the change immediately
- **Cloud Function side effects**: When a Cloud Function updates a document (e.g., after Stripe webhook), the frontend reflects the change without polling
- **Offline-to-online sync**: When a device reconnects, pending writes sync and the listener fires with the server-reconciled state
- **Billing impact**: Every document delivered via onSnapshot counts as a read. Busy documents can accumulate significant read counts.

### Teardown and Cleanup

```typescript
// Listeners are automatically cleaned up when:
// 1. The component that initiated the query is destroyed
// 2. store.unloadAll('model') is called
// 3. store.unloadRecord(record) is called
// 4. The Ember application is destroyed

// Manual cleanup is rarely needed, but if required:
// The adapter tracks active listeners and provides cleanup hooks
```

---
