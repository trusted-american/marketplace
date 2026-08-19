## Function Testing with firebase-functions-test

### Setup

```typescript
import * as functionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';

// Online mode (connects to real Firebase project)
const testEnv = functionsTest({
  projectId: 'a3-test',
  storageBucket: 'a3-test.appspot.com',
});

// Offline mode (no Firebase connection)
const testEnv = functionsTest();
```

### Testing Firestore Triggers

```typescript
import { onClientCreated } from '../src/triggers/clients/onCreate';

describe('onClientCreated', () => {
  afterAll(() => testEnv.cleanup());

  it('should create an activity record on client creation', async () => {
    // Create a fake Firestore snapshot
    const snapshot = testEnv.firestore.makeDocumentSnapshot(
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        agencyId: 'agency_abc',
        createdAt: admin.firestore.Timestamp.now(),
      },
      'clients/client_123'
    );

    // Wrap the function
    const wrapped = testEnv.wrap(onClientCreated);

    // Call with fake event
    await wrapped({
      data: snapshot,
      params: { clientId: 'client_123' },
    });

    // Assert side effects
    const activity = await admin.firestore()
      .doc('activities/client_123_created')
      .get();
    expect(activity.exists).toBe(true);
  });
});
```

### Testing HTTPS Functions

```typescript
import { stripeApi } from '../src/https/stripe';
import supertest from 'supertest';

describe('stripeApi', () => {
  it('should return 401 without auth token', async () => {
    const response = await supertest(stripeApi)
      .get('/customers')
      .expect(401);

    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return customers with valid token', async () => {
    const response = await supertest(stripeApi)
      .get('/customers')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('customers');
  });
});
```

### Testing Callable Functions

```typescript
import { processPayment } from '../src/https/processPayment';

describe('processPayment', () => {
  const wrapped = testEnv.wrap(processPayment);

  it('should throw unauthenticated without auth', async () => {
    await expect(
      wrapped({ data: { amount: 1000 } })
    ).rejects.toThrow('unauthenticated');
  });

  it('should process payment with valid auth', async () => {
    const result = await wrapped({
      data: { amount: 1000, customerId: 'cus_abc' },
      auth: { uid: 'user_123', token: { email: 'test@test.com' } },
    });

    expect(result.success).toBe(true);
    expect(result.chargeId).toBeDefined();
  });
});
```

### Testing Scheduled Functions

```typescript
import { dailyReport } from '../src/scheduled/dailyReport';

describe('dailyReport', () => {
  const wrapped = testEnv.wrap(dailyReport);

  it('should generate and send the daily report', async () => {
    await wrapped({ scheduleTime: new Date().toISOString() });

    // Verify report was created
    const reports = await admin.firestore()
      .collection('reports')
      .where('type', '==', 'daily')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    expect(reports.size).toBe(1);
  });
});
```

### Testing PubSub Functions

```typescript
import { processEnrollmentQueue } from '../src/pubsub/enrollmentQueue';

describe('processEnrollmentQueue', () => {
  const wrapped = testEnv.wrap(processEnrollmentQueue);

  it('should process enrollment message', async () => {
    const message = testEnv.pubsub.makeMessage(
      JSON.stringify({ enrollmentId: 'enr_abc', action: 'process' }),
      { priority: 'high' } // attributes
    );

    await wrapped({ data: { message } });

    // Verify enrollment was processed
    const enrollment = await admin.firestore()
      .doc('enrollments/enr_abc')
      .get();
    expect(enrollment.data()?.processedAt).toBeDefined();
  });
});
```

---
