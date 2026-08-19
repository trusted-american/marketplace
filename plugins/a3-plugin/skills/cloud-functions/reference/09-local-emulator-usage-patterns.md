## Local Emulator Usage Patterns

### Starting Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only functions,firestore,auth

# Start with import/export of data
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

# Start and run a script
firebase emulators:exec "npm test" --only functions,firestore
```

### Emulator Configuration in firebase.json

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "pubsub": { "port": 8085 },
    "database": { "port": 9000 },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### Calling Functions Against the Emulator

```bash
# HTTP functions
curl http://localhost:5001/a3-project/us-central1/stripeApi/customers

# With auth token
curl -H "Authorization: Bearer test-token" \
  http://localhost:5001/a3-project/us-central1/stripeApi/customers
```

### Emulator-Specific Code

```typescript
// Detect emulator environment
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

if (isEmulator) {
  // Skip external API calls in emulator
  console.log('Running in emulator — skipping Stripe call');
} else {
  await stripe.charges.create({ /* ... */ });
}
```

### Seeding Emulator Data

```typescript
// In a setup script or test helper
import { getFirestore } from 'firebase-admin/firestore';

async function seedData() {
  const db = getFirestore();

  // Create test agency
  await db.doc('agencies/test_agency').set({
    name: 'Test Agency',
    status: 'active',
    createdAt: Timestamp.now(),
  });

  // Create test users
  await db.doc('users/test_user').set({
    email: 'test@test.com',
    agencyId: 'test_agency',
    role: 'admin',
  });

  // Create test clients
  for (let i = 0; i < 10; i++) {
    await db.doc(`clients/client_${i}`).set({
      firstName: `Test${i}`,
      lastName: 'Client',
      agencyId: 'test_agency',
      status: 'active',
    });
  }
}
```

---
