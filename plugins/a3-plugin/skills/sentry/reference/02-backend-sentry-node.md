## Backend — @sentry/node

### Initialization in Cloud Functions

```ts
// functions/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  environment: process.env.FUNCTIONS_EMULATOR ? 'emulator' : 'production',
  release: process.env.K_REVISION || 'unknown', // Cloud Functions revision
  tracesSampleRate: 0.2, // 20% sampling in production

  integrations: [
    // Node-specific integrations
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],

  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.ssn;
      delete event.request.data.bankAccount;
    }
    return event;
  },
});
```

### Express Middleware Integration

A3 uses Express for HTTP Cloud Functions. Sentry provides middleware for automatic error
capture and request context:

```ts
// functions/src/api/index.ts
import express from 'express';
import * as Sentry from '@sentry/node';

const app = express();

// Sentry request handler — MUST be first middleware
Sentry.setupExpressErrorHandler(app);

// Your routes
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await getEmployees();
    res.json(employees);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
```

### Cloud Function Error Patterns

#### Callable Functions

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as Sentry from '@sentry/node';

export const updateEmployee = onCall(async (request) => {
  try {
    const { employeeId, data } = request.data;

    // Set user context from auth
    if (request.auth) {
      Sentry.setUser({
        id: request.auth.uid,
        email: request.auth.token.email ?? undefined,
      });
    }

    Sentry.addBreadcrumb({
      category: 'function',
      message: `updateEmployee called for ${employeeId}`,
      level: 'info',
    });

    const result = await performUpdate(employeeId, data);
    return result;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        function: 'updateEmployee',
        trigger: 'callable',
      },
      extra: {
        employeeId: request.data.employeeId,
      },
    });

    throw new HttpsError('internal', 'Failed to update employee');
  }
});
```

#### Firestore Triggers

```ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as Sentry from '@sentry/node';

export const onEmployeeCreated = onDocumentCreated(
  'companies/{companyId}/employees/{employeeId}',
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const employee = snapshot.data();

      Sentry.setContext('trigger', {
        type: 'firestore',
        event: 'create',
        path: event.params
          ? `companies/${event.params.companyId}/employees/${event.params.employeeId}`
          : 'unknown',
      });

      await sendWelcomeEmail(employee);
      await createDefaultPermissions(event.params!.companyId, event.params!.employeeId);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          function: 'onEmployeeCreated',
          trigger: 'firestore',
        },
        extra: {
          companyId: event.params?.companyId,
          employeeId: event.params?.employeeId,
        },
      });
      throw error; // Re-throw so Cloud Functions can retry
    }
  }
);
```

#### Scheduled Functions

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as Sentry from '@sentry/node';

export const dailyPayrollSync = onSchedule(
  { schedule: 'every day 02:00', timeZone: 'America/New_York' },
  async (event) => {
    const transaction = Sentry.startTransaction({
      name: 'dailyPayrollSync',
      op: 'scheduled-task',
    });

    try {
      Sentry.setContext('scheduled-task', {
        name: 'dailyPayrollSync',
        scheduledTime: event.scheduleTime,
      });

      const companiesSpan = transaction.startChild({ op: 'db.query', description: 'Fetch companies' });
      const companies = await getAllCompanies();
      companiesSpan.finish();

      for (const company of companies) {
        const syncSpan = transaction.startChild({
          op: 'task',
          description: `Sync ${company.name}`,
        });

        try {
          await syncPayroll(company.id);
        } catch (error) {
          Sentry.withScope((scope) => {
            scope.setTag('company', company.id);
            scope.setExtra('companyName', company.name);
            Sentry.captureException(error);
          });
          // Continue with other companies
        }

        syncSpan.finish();
      }

      transaction.setStatus('ok');
    } catch (error) {
      transaction.setStatus('internal_error');
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.finish();
    }
  }
);
```

### Flushing Events in Cloud Functions

Cloud Functions may terminate before Sentry finishes sending events. Always flush:

```ts
import * as Sentry from '@sentry/node';

export const myFunction = onCall(async (request) => {
  try {
    // ... function logic
  } catch (error) {
    Sentry.captureException(error);
    // CRITICAL: Wait for Sentry to send before function terminates
    await Sentry.flush(2000); // Wait up to 2 seconds
    throw error;
  }
});
```

---
