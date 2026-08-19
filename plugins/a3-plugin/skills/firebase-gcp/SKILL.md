---
name: firebase-gcp
description: Deep Firebase and Google Cloud Platform reference — Firestore Admin SDK (every method, query operator, aggregation, timestamp, FieldValue), Authentication Admin (full user management, token operations, custom claims), Cloud Storage Admin (bucket operations, signed URLs, metadata), Realtime Database, Security Rules, indexes, backup/export, and GCP service configuration
version: 0.2.0
---


# Firebase & GCP Reference

firebase-admin is imported in 117 backend files and is the backbone of A3's entire server-side architecture. This skill covers every Admin SDK method, pattern, and GCP service used across the codebase.

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-cloud-firestore-admin-sdk.md` | Cloud Firestore (Admin SDK) |
| `reference/03-firebase-authentication-admin-sdk.md` | Firebase Authentication (Admin SDK) |
| `reference/04-cloud-storage-admin-sdk.md` | Cloud Storage (Admin SDK) |
| `reference/06-security-rules-testing.md` | Security Rules Testing |

## Firebase Project Structure

A3 uses the following Firebase services:
- **Cloud Firestore** — Primary NoSQL document database (the core of all data)
- **Firebase Authentication** — User auth with MFA, custom claims, blocking functions
- **Cloud Storage** — File/document storage with signed URLs
- **Realtime Database** — Status/presence tracking, ephemeral state
- **Cloud Functions** — Serverless backend (see cloud-functions skill)
- **Firebase Emulator Suite** — Local development and testing

---
## Realtime Database

A3 uses Realtime Database primarily for status/presence tracking, which requires persistent connections that Firestore does not natively support.

```typescript
import { getDatabase } from 'firebase-admin/database';

const rtdb = getDatabase();

// Set data
await rtdb.ref(`status/${userId}`).set({
  state: 'online',
  lastSeen: Date.now(),
});

// Update specific fields
await rtdb.ref(`status/${userId}`).update({
  state: 'away',
  lastSeen: Date.now(),
});

// Read data
const snapshot = await rtdb.ref(`status/${userId}`).get();
if (snapshot.exists()) {
  const data = snapshot.val();
}

// Delete
await rtdb.ref(`status/${userId}`).remove();

// Listen for changes
rtdb.ref('status').on('child_changed', (snapshot) => {
  console.log(`${snapshot.key} is now ${snapshot.val().state}`);
});

// Server timestamp
await rtdb.ref(`status/${userId}/lastSeen`).set(
  rtdb.ServerValue.TIMESTAMP
);
```

---
## Environment Configuration

### Firebase Config (Frontend)

Located in `app/config/environment.js`:
```javascript
firebase: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

### Firebase Config (Backend)

Cloud Functions have automatic access to Firebase services via Admin SDK. Environment-specific config via environment variables or Google Secret Manager.

### Emulator Configuration

In `firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "pubsub": { "port": 8085 },
    "database": { "port": 9000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### Connecting to Emulators

```typescript
// Frontend
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';

if (environment === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}

// Backend (auto-detected when running via firebase emulators:exec)
// Set FIRESTORE_EMULATOR_HOST=localhost:8080
// Set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
// Set FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

---
## Further Investigation

- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Firebase Auth Admin**: https://firebase.google.com/docs/auth/admin
- **Cloud Storage Admin**: https://firebase.google.com/docs/storage/admin/start
- **Admin SDK Reference**: https://firebase.google.com/docs/reference/admin/node
- **Security Rules**: https://firebase.google.com/docs/firestore/security/get-started
- **Emulator Suite**: https://firebase.google.com/docs/emulator-suite
- **Firestore Backup**: https://firebase.google.com/docs/firestore/manage-data/export-import
- **Firestore Indexes**: https://firebase.google.com/docs/firestore/query-data/indexing
