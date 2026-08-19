## Testing Rules with Emulator

### Starting the Emulator

```bash
# Start Firestore emulator only
firebase emulators:start --only firestore

# Start with rules file specified
firebase emulators:start --only firestore --rules=firestore.rules

# The emulator provides:
# - Rules evaluation with detailed error messages
# - Request/response logging
# - Rules coverage reports
# - Hot-reloading of rules file changes
```

### Unit Testing with @firebase/rules-unit-testing

```typescript
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'a3-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

// Test authenticated read
test('authenticated user can read clients', async () => {
  const db = testEnv.authenticatedContext('user_abc').firestore();
  await assertSucceeds(getDoc(doc(db, 'clients', 'client_123')));
});

// Test unauthenticated read is blocked
test('unauthenticated user cannot read clients', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'clients', 'client_123')));
});

// Test admin-only write
test('non-admin cannot create client', async () => {
  // Seed the user document WITHOUT admin flag
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'user_abc'), {
      isAdmin: false,
      permissions: [],
    });
  });

  const db = testEnv.authenticatedContext('user_abc').firestore();
  await assertFails(setDoc(doc(db, 'clients', 'client_new'), {
    firstName: 'John',
    lastName: 'Doe',
    createdBy: 'user_abc',
  }));
});

// Test admin CAN create client
test('admin can create client', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'user_admin'), {
      isAdmin: true,
      permissions: ['clients.create'],
    });
  });

  const db = testEnv.authenticatedContext('user_admin').firestore();
  await assertSucceeds(setDoc(doc(db, 'clients', 'client_new'), {
    firstName: 'John',
    lastName: 'Doe',
    createdBy: 'user_admin',
  }));
});
```

### Rules Coverage Report

```bash
# After running tests, access the coverage report:
# http://localhost:8080/emulator/v1/projects/a3-test:ruleCoverage.html
#
# The report shows:
# - Which rules were evaluated (green)
# - Which rules were never evaluated (yellow = not tested)
# - Which rules blocked access (red)
# - Percentage of rule coverage
```

---
