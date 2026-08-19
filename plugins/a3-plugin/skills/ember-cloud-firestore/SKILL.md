---
name: ember-cloud-firestore
description: Deep ember-cloud-firestore-adapter reference — how A3 bridges Ember Data/WarpDrive with Cloud Firestore for real-time document access
version: 0.2.0
---


# ember-cloud-firestore-adapter Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/03-adapter-layer-complete-method-reference.md` | Adapter Layer — Complete Method Reference |
| `reference/04-a3-s-application-adapter-full-implementation.md` | A3's Application Adapter — Full Implementation |
| `reference/05-query-syntax-exhaustive-reference.md` | Query Syntax — Exhaustive Reference |
| `reference/06-serializer-layer-complete-method-reference.md` | Serializer Layer — Complete Method Reference |
| `reference/07-relationships-in-firestore-complete-guide.md` | Relationships in Firestore — Complete Guide |
| `reference/08-real-time-updates-complete-guide.md` | Real-Time Updates — Complete Guide |
| `reference/10-error-handling.md` | Error Handling |
| `reference/12-common-pitfalls-and-solutions.md` | Common Pitfalls and Solutions |

## Overview

`ember-cloud-firestore-adapter` is the bridge between Ember Data (WarpDrive) and Cloud Firestore. It allows A3 to use Ember Data's store API while reading/writing directly to Firestore. Every model in A3 that persists to Firestore flows through this adapter and serializer pair.

**Package**: `ember-cloud-firestore-adapter` v4.3.2
**Repo**: https://github.com/nickersk/ember-cloud-firestore-adapter

---
## Architecture

```
┌─────────────┐     ┌──────────────────────────┐     ┌───────────────┐     ┌─────────────────┐
│ Ember Store  │────▶│ CloudFirestoreAdapter    │────▶│ Firebase SDK  │────▶│ Cloud Firestore │
│ (WarpDrive)  │◀────│ (app/adapters/application)│◀────│ (Web v9+)     │◀────│ (NoSQL DB)      │
└─────────────┘     └──────────────────────────┘     └───────────────┘     └─────────────────┘
       │                       │
       ▼                       ▼
┌─────────────┐     ┌──────────────────────────┐
│ JSON:API     │◀────│ CloudFirestoreSerializer │
│ Cache        │     │ (app/serializers/app.)   │
└─────────────┘     └──────────────────────────┘
```

---
## Offline Persistence

Firestore SDK includes built-in offline persistence. This affects how the adapter behaves:

### How Offline Works

1. **Reads**: When offline, `getDoc()` and `getDocs()` return data from the local IndexedDB cache. The adapter and serializer process this identically to online data.

2. **Writes**: When offline, `setDoc()`, `updateDoc()`, and `deleteDoc()` write to the local cache immediately. The SDK queues these operations and syncs when connectivity returns.

3. **Real-time listeners**: `onSnapshot` listeners fire for local cache changes even when offline. When connectivity returns, they fire again with the server-reconciled state.

4. **Metadata**: The SDK provides `fromCache` metadata on snapshots. The adapter can use this to inform the UI that data may be stale.

### Offline Implications for A3

```typescript
// Offline write queuing:
// 1. User is offline
// 2. User saves a record: record.save()
// 3. Adapter calls setDoc() → write goes to local cache
// 4. The promise resolves immediately (local write succeeded)
// 5. The user sees "Saved successfully" even though the server hasn't received it
// 6. When connectivity returns, the SDK syncs the write to the server
// 7. If the write fails server-side (e.g., security rules deny), the local cache
//    is reverted, but the user has already seen the success message
//
// This is a known trade-off. A3 prioritizes responsiveness over strict consistency.
```

---
## Configuration

### Adapter Configuration

```typescript
// The CloudFirestoreAdapter accepts configuration via:

// 1. Adapter properties
export default class ApplicationAdapter extends CloudFirestoreAdapter {
  // Enable real-time listeners for all findRecord calls
  isRealtime = true;

  // Reference to the Firestore database instance
  // (typically injected or resolved from the Firebase app config)
}

// 2. Per-request adapterOptions
await this.store.findRecord('client', 'client_abc', {
  adapterOptions: {
    isRealtime: true,           // Override real-time setting for this request
    buildReference(db) {        // Custom collection/document reference builder
      return doc(db, 'clients', 'client_abc');
    },
  },
});

// 3. Per-query adapterOptions for subcollection queries
await this.store.query('client-note', {
  adapterOptions: {
    buildReference(db) {
      return collection(db, 'clients', 'client_abc', 'notes');
    },
  },
});
```

### Firebase App Configuration

```typescript
// config/environment.js (relevant section)
firebase: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
  measurementId: '...',
},

// The adapter uses the initialized Firebase app to get the Firestore instance.
// In A3, the Firebase app is initialized in an instance initializer.
```

---
## Further Investigation

- **ember-cloud-firestore-adapter GitHub**: https://github.com/nickersk/ember-cloud-firestore-adapter
- **Firestore Querying**: https://firebase.google.com/docs/firestore/query-data/queries
- **Firestore Real-time**: https://firebase.google.com/docs/firestore/query-data/listen
- **Firestore Offline**: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- **Firestore Data Model**: https://firebase.google.com/docs/firestore/data-model
- **Firestore Index Management**: https://firebase.google.com/docs/firestore/query-data/indexing
- **Firestore Quotas/Limits**: https://firebase.google.com/docs/firestore/quotas
