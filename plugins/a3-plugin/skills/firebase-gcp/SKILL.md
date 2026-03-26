---
name: firebase-gcp
description: Deep Firebase and Google Cloud Platform reference — Firestore, Authentication, Cloud Storage, Realtime Database, Admin SDK, and GCP service configuration
version: 0.1.0
---

# Firebase & GCP Reference

## Firebase Project Structure

A3 uses the following Firebase services:
- **Cloud Firestore** — Primary NoSQL database
- **Firebase Authentication** — User auth with MFA support
- **Cloud Storage** — File/document storage
- **Realtime Database** — Status/presence tracking
- **Cloud Functions** — Serverless backend
- **Firebase Emulator Suite** — Local development

## Cloud Firestore

### Document Model
Firestore is a NoSQL document database:
- **Collections** contain **Documents**
- **Documents** contain **Fields** and **Subcollections**
- Documents have a maximum size of 1MB
- Collection names are strings, document IDs are strings

### Data Types
| Firestore Type | TypeScript | Ember Transform |
|---------------|------------|-----------------|
| String | `string` | `'string'` |
| Number | `number` | `'number'` |
| Boolean | `boolean` | `'boolean'` |
| Timestamp | `Timestamp` | `'date'` or `'null-timestamp'` |
| GeoPoint | `GeoPoint` | custom |
| Reference | `DocumentReference` | `belongsTo` |
| Array | `any[]` | `attr()` |
| Map | `Record<string, any>` | `attr()` |
| Null | `null` | `'null-timestamp'` for dates |

### A3 Collection Structure
```
firestore/
├── agencies/                 # Insurance agencies
│   └── {agencyId}/
│       ├── notes/            # Agency notes (subcollection)
│       └── files/            # Agency files (subcollection)
├── carriers/                 # Insurance carriers
├── clients/                  # Contacts/clients
│   └── {clientId}/
│       ├── notes/
│       ├── files/
│       ├── enrollments/      # (or top-level with reference)
│       └── activities/
├── contracts/                # Agent-carrier contracts
├── enrollments/              # Insurance enrollments
│   └── {enrollmentId}/
│       ├── notes/
│       └── files/
├── groups/                   # Group insurance
├── licenses/                 # Agent licenses
├── memberships/              # Client memberships
├── quotes/                   # Insurance quotes
├── statements/               # Commission statements
├── tickets/                  # Support tickets
├── transactions/             # Financial transactions
├── users/                    # Platform users
├── activities/               # Audit trail
├── messages/                 # Internal messages
├── events/                   # Calendar/marketing events
├── inquiries/                # Lead inquiries
└── ... (more collections)
```

### Querying Firestore (Admin SDK)
```typescript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Get single document
const doc = await db.doc('clients/client_abc').get();
const data = doc.data();

// Query collection
const snapshot = await db.collection('enrollments')
  .where('status', '==', 'active')
  .where('agencyId', '==', 'agency_abc')
  .orderBy('createdAt', 'desc')
  .limit(25)
  .get();

// Batch reads
const refs = ids.map(id => db.doc(`clients/${id}`));
const docs = await db.getAll(...refs);

// Batch writes
const batch = db.batch();
batch.set(db.doc('clients/new_id'), { name: 'New' });
batch.update(db.doc('clients/existing_id'), { status: 'active' });
batch.delete(db.doc('clients/old_id'));
await batch.commit();

// Transactions (atomic read-then-write)
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(db.doc('counters/enrollments'));
  const newCount = (doc.data()?.count || 0) + 1;
  transaction.update(db.doc('counters/enrollments'), { count: newCount });
});

// Aggregation queries
const countSnapshot = await db.collection('enrollments')
  .where('status', '==', 'active')
  .count()
  .get();
const count = countSnapshot.data().count;

// Sum aggregation
const sumSnapshot = await db.collection('transactions')
  .where('agencyId', '==', 'agency_abc')
  .aggregate({ totalAmount: AggregateField.sum('amount') })
  .get();
```

### Firestore Indexes

**Single-field indexes** are automatic.

**Composite indexes** must be defined in `firestore.indexes.json`:
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

When a query requires a missing index, Firestore returns an error with a link to create it.

### Firestore Limitations
- Max document size: 1MB
- Max write rate per document: 1/second
- Max batch size: 500 operations
- No native full-text search (use Algolia)
- Inequality filters on one field only per query
- `in` queries limited to 30 values
- `array-contains` limited to one per query

## Firebase Authentication

### A3 Auth Flow
1. User enters email/password on login page
2. Firebase Auth validates credentials
3. On success: JWT token issued
4. ember-simple-auth stores token in session
5. Token attached to all Firestore requests
6. Cloud Functions verify token via Admin SDK

### Auth in Frontend (ember-simple-auth + Firebase)
```typescript
// app/services/session.ts
// Extends ember-simple-auth SessionService
// Handles: login, logout, MFA, password reset, token refresh
```

### Auth in Cloud Functions
```typescript
import { getAuth } from 'firebase-admin/auth';

// Verify ID token
const decodedToken = await getAuth().verifyIdToken(idToken);
const uid = decodedToken.uid;

// Create custom token
const customToken = await getAuth().createCustomToken(uid, { admin: true });

// Get user
const user = await getAuth().getUser(uid);

// Set custom claims
await getAuth().setCustomClaims(uid, { admin: true });
```

### Auth Triggers
```typescript
import { beforeUserSignedIn } from 'firebase-functions/v2/identity';

export const beforeSignIn = beforeUserSignedIn(async (event) => {
  // Custom pre-auth logic (block users, check conditions)
  const user = event.data;
  // Return to allow sign-in, throw to block
});
```

### MFA Support
A3 supports multi-factor authentication via Firebase Auth:
- Phone number as second factor
- TOTP (time-based one-time password) support
- Configured per-user in settings

## Cloud Storage

### Storage Structure
```
storage/
├── agencies/{agencyId}/
│   └── files/
├── clients/{clientId}/
│   ├── files/
│   └── photos/
├── enrollments/{enrollmentId}/
│   └── files/
├── groups/{groupId}/
│   └── files/
└── users/{userId}/
    └── avatar/
```

### Upload from Frontend
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const storageRef = ref(storage, `clients/${clientId}/files/${fileName}`);
const snapshot = await uploadBytes(storageRef, file);
const downloadURL = await getDownloadURL(snapshot.ref);
```

### Storage in Cloud Functions
```typescript
import { getStorage } from 'firebase-admin/storage';

const bucket = getStorage().bucket();
const file = bucket.file(`clients/${clientId}/files/${fileName}`);
await file.save(buffer, { contentType: 'application/pdf' });
const [url] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
});
```

### Storage Triggers
```typescript
import { onObjectFinalized } from 'firebase-functions/v2/storage';

export const onFileUploaded = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  // Process uploaded file (resize image, scan for viruses, etc.)
});
```

## Realtime Database

A3 uses Realtime Database for status/presence tracking:
```typescript
import { getDatabase } from 'firebase-admin/database';

const rtdb = getDatabase();
await rtdb.ref(`status/${userId}`).set({
  state: 'online',
  lastSeen: Date.now(),
});
```

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
    "ui": { "enabled": true }
  }
}
```

## Further Investigation

- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **Cloud Storage**: https://firebase.google.com/docs/storage
- **Admin SDK**: https://firebase.google.com/docs/admin/setup
- **Security Rules**: https://firebase.google.com/docs/firestore/security/get-started
- **Emulator Suite**: https://firebase.google.com/docs/emulator-suite
