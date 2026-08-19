## Security Rules Testing

### Using the Firestore Emulator and Rules Unit Testing

```typescript
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'a3-test',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
    host: 'localhost',
    port: 8080,
  },
});

// Create authenticated context
const aliceDb = testEnv.authenticatedContext('alice', {
  email: 'alice@example.com',
  agencyId: 'agency_abc',
  role: 'admin',
});

// Create unauthenticated context
const unauthDb = testEnv.unauthenticatedContext();

// Test read access
await assertSucceeds(
  aliceDb.firestore().collection('clients').doc('client_1').get()
);

// Test unauthorized access
await assertFails(
  unauthDb.firestore().collection('clients').doc('client_1').get()
);

// Test write access
await assertSucceeds(
  aliceDb.firestore().collection('clients').doc('new_client').set({
    firstName: 'Test',
    agencyId: 'agency_abc',
  })
);

// Test cross-agency access denied
const bobDb = testEnv.authenticatedContext('bob', {
  agencyId: 'agency_other',
  role: 'agent',
});
await assertFails(
  bobDb.firestore().collection('clients').doc('client_1').get()
);

// Cleanup
await testEnv.clearFirestore();
await testEnv.cleanup();
```

### Security Rules Pattern (A3)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own agency's data
    match /clients/{clientId} {
      allow read: if request.auth != null
        && resource.data.agencyId == request.auth.token.agencyId;
      allow create: if request.auth != null
        && request.resource.data.agencyId == request.auth.token.agencyId;
      allow update: if request.auth != null
        && resource.data.agencyId == request.auth.token.agencyId;
      allow delete: if request.auth != null
        && request.auth.token.role == 'admin';
    }
  }
}
```

---
