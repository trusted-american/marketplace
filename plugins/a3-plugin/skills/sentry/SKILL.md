---
name: sentry
description: Sentry error tracking reference — @sentry/ember (14 frontend files) + @sentry/node (34 backend files) = 48 total. Error capture, breadcrumbs, context, performance monitoring
version: 0.1.0
---

# Sentry Error Tracking — Complete A3 Reference

A3 uses Sentry for error tracking on both frontend (14 files using `@sentry/ember`) and
backend (34 files using `@sentry/node`). Total: 48 files. This reference covers initialization,
error capture, context enrichment, performance monitoring, and Ember/Cloud Function-specific
integration patterns.

---

## Frontend — @sentry/ember

### Installation and Initialization

`@sentry/ember` is the official Sentry SDK for Ember.js applications. It wraps `@sentry/browser`
with Ember-specific integrations for route transitions, component rendering, and runloop errors.

**Initialization (typically in `app/app.ts` or an initializer):**

```ts
// app/app.ts
import * as Sentry from '@sentry/ember';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  environment: config.environment, // 'development', 'staging', 'production'
  release: config.APP.version,     // e.g., 'a3@1.2.3'

  // Sample rates
  tracesSampleRate: 1.0,           // 100% of transactions for performance monitoring
  replaysSessionSampleRate: 0.1,   // 10% of sessions for replay
  replaysOnErrorSampleRate: 1.0,   // 100% of sessions with errors for replay

  // Integrations
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
  ],

  // Before send hook — modify or filter events
  beforeSend(event, hint) {
    // Don't send errors in development
    if (config.environment === 'development') {
      return null;
    }
    return event;
  },

  // Before breadcrumb hook — filter noisy breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null; // Drop debug console breadcrumbs
    }
    return breadcrumb;
  },
});
```

### Configuration Options — Complete Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsn` | `string` | — | Data Source Name (required) |
| `environment` | `string` | `'production'` | Environment name |
| `release` | `string` | — | Release/version identifier |
| `tracesSampleRate` | `number` | `0` | % of transactions to capture (0-1) |
| `sampleRate` | `number` | `1` | % of errors to capture (0-1) |
| `maxBreadcrumbs` | `number` | `100` | Max breadcrumbs stored per event |
| `debug` | `boolean` | `false` | Enable SDK debug logging |
| `enabled` | `boolean` | `true` | Enable/disable SDK entirely |
| `ignoreErrors` | `(string\|RegExp)[]` | `[]` | Error messages to ignore |
| `denyUrls` | `(string\|RegExp)[]` | `[]` | URLs to ignore errors from |
| `allowUrls` | `(string\|RegExp)[]` | `[]` | Only capture from these URLs |
| `beforeSend` | `function` | — | Hook to modify/filter events |
| `beforeBreadcrumb` | `function` | — | Hook to modify/filter breadcrumbs |
| `attachStacktrace` | `boolean` | `false` | Attach stack trace to messages |

---

### Capturing Errors

#### `captureException` — Capture an Error Object

**Signature:** `Sentry.captureException(error: Error, captureContext?: CaptureContext): string`

Returns the event ID for the captured exception.

```ts
import * as Sentry from '@sentry/ember';

// Basic capture
try {
  await this.model.save();
} catch (error) {
  Sentry.captureException(error);
}

// With extra context
try {
  await this.model.save();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'employee-management',
      action: 'save',
    },
    extra: {
      employeeId: this.model.id,
      employeeName: this.model.name,
      changedFields: this.model.changedAttributes(),
    },
  });
}
```

**A3 pattern — catch-and-report in async actions:**
```ts
import * as Sentry from '@sentry/ember';
import { action } from '@ember/object';

export default class EmployeeFormComponent extends Component {
  @service('flash-messages') declare flashMessages: FlashMessageService;

  @action
  async save() {
    try {
      await this.args.model.save();
      this.flashMessages.success('Employee saved successfully.');
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'employee-form', action: 'save' },
        extra: { modelId: this.args.model.id },
      });
      this.flashMessages.danger('Failed to save employee. Please try again.');
    }
  }
}
```

#### `captureMessage` — Capture a Text Message

**Signature:** `Sentry.captureMessage(message: string, captureContext?: CaptureContext | Severity): string`

```ts
import * as Sentry from '@sentry/ember';

// Simple message
Sentry.captureMessage('User attempted unauthorized access');

// With severity level
Sentry.captureMessage('Feature flag not found', 'warning');

// With full context
Sentry.captureMessage('Unexpected empty response from API', {
  level: 'warning',
  tags: { api: 'employee-service' },
  extra: { endpoint: '/api/employees', params: queryParams },
});
```

**Severity levels:** `'fatal'`, `'error'`, `'warning'`, `'log'`, `'info'`, `'debug'`

#### `captureEvent` — Capture a Raw Event

```ts
Sentry.captureEvent({
  message: 'Manual event',
  level: 'info',
  tags: { source: 'audit-log' },
  extra: { userId: currentUser.id },
});
```

---

### User Context

#### `setUser` — Associate User with Errors

**Signature:** `Sentry.setUser(user: User | null): void`

```ts
import * as Sentry from '@sentry/ember';

// After login
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.displayName,
  // Custom fields:
  companyId: user.companyId,
  role: user.role,
});

// After logout
Sentry.setUser(null);
```

**A3 pattern — set user in session service:**
```ts
// app/services/session.ts
import Service from '@ember/service';
import * as Sentry from '@sentry/ember';

export default class SessionService extends Service {
  async onAuthStateChanged(firebaseUser: FirebaseUser | null) {
    if (firebaseUser) {
      const userRecord = await this.loadUserRecord(firebaseUser.uid);
      Sentry.setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        username: userRecord.name,
        companyId: userRecord.companyId,
        role: userRecord.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }
}
```

---

### Context and Tags

#### `setContext` — Set Structured Context

**Signature:** `Sentry.setContext(name: string, context: Record<string, any> | null): void`

```ts
// Set context for subsequent errors
Sentry.setContext('employee', {
  id: employee.id,
  name: employee.name,
  department: employee.department?.name,
  status: employee.status,
});

// Set context about the current page/route
Sentry.setContext('page', {
  route: this.router.currentRouteName,
  url: this.router.currentURL,
  params: JSON.stringify(routeParams),
});

// Clear context
Sentry.setContext('employee', null);
```

#### `setTag` / `setTags` — Set Searchable Tags

**Signature:** `Sentry.setTag(key: string, value: string): void`
**Signature:** `Sentry.setTags(tags: Record<string, string>): void`

Tags are indexed and searchable in the Sentry UI. Use for high-cardinality filtering.

```ts
Sentry.setTag('company', companySlug);
Sentry.setTag('feature', 'employee-onboarding');

Sentry.setTags({
  company: companySlug,
  plan: companyPlan,
  region: companyRegion,
});
```

#### `setExtra` / `setExtras` — Set Extra Data

**Signature:** `Sentry.setExtra(key: string, value: any): void`

Extras are NOT searchable but provide additional context on error events.

```ts
Sentry.setExtra('requestPayload', JSON.stringify(payload));
Sentry.setExtra('responseStatus', response.status);
```

---

### Breadcrumbs

Breadcrumbs are trail of events leading up to an error. Sentry auto-captures many breadcrumbs
(console logs, XHR requests, DOM clicks, navigation). You can add custom ones.

#### `addBreadcrumb` — Add a Custom Breadcrumb

**Signature:** `Sentry.addBreadcrumb(breadcrumb: Breadcrumb): void`

```ts
import * as Sentry from '@sentry/ember';

Sentry.addBreadcrumb({
  category: 'employee',
  message: `Edited employee ${employee.name}`,
  level: 'info',
  data: {
    employeeId: employee.id,
    changedFields: Object.keys(employee.changedAttributes()),
  },
});
```

**Breadcrumb shape:**

| Field | Type | Description |
|-------|------|-------------|
| `category` | `string` | Category for grouping (e.g., `'auth'`, `'navigation'`, `'employee'`) |
| `message` | `string` | Human-readable message |
| `level` | `string` | `'fatal'`, `'error'`, `'warning'`, `'info'`, `'debug'` |
| `data` | `object` | Arbitrary structured data |
| `type` | `string` | `'default'`, `'http'`, `'navigation'`, `'error'`, `'debug'`, `'query'`, `'ui'`, `'user'` |
| `timestamp` | `number` | Unix timestamp (auto-set if omitted) |

**A3 breadcrumb patterns:**
```ts
// Navigation breadcrumb
Sentry.addBreadcrumb({
  category: 'navigation',
  message: `Navigated to ${routeName}`,
  level: 'info',
  type: 'navigation',
});

// User action breadcrumb
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'Submitted employee form',
  level: 'info',
  type: 'user',
  data: { formType: 'edit', employeeId: id },
});

// API call breadcrumb
Sentry.addBreadcrumb({
  category: 'api',
  message: `POST /api/employees/${id}`,
  level: 'info',
  type: 'http',
  data: { status: 200, method: 'POST' },
});
```

---

### Scoped Context with `withScope`

**Signature:** `Sentry.withScope(callback: (scope: Scope) => void): void`

Creates an isolated scope for setting context that only applies to errors captured within
the callback. Does not affect global scope.

```ts
import * as Sentry from '@sentry/ember';

Sentry.withScope((scope) => {
  scope.setTag('operation', 'bulk-import');
  scope.setExtra('importData', { rowCount: 500, fileName: file.name });
  scope.setLevel('warning');
  scope.setUser({ id: currentUser.id, email: currentUser.email });

  // Only this capture gets the scope above
  Sentry.captureException(error);
});
// Global scope is unaffected after this block
```

**A3 pattern — scoped error capture in complex operations:**
```ts
async bulkImportEmployees(file: File) {
  const rows = await parseCSV(file);

  for (const [index, row] of rows.entries()) {
    try {
      await this.createEmployee(row);
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('operation', 'bulk-import');
        scope.setExtra('rowIndex', index);
        scope.setExtra('rowData', row);
        scope.setExtra('fileName', file.name);
        Sentry.captureException(error);
      });
      // Continue processing remaining rows
    }
  }
}
```

---

### Performance Monitoring

#### Transaction and Span API

```ts
import * as Sentry from '@sentry/ember';

// Start a manual transaction
const transaction = Sentry.startTransaction({
  name: 'employee-bulk-export',
  op: 'task',
});

// Create child spans
const fetchSpan = transaction.startChild({
  op: 'db.query',
  description: 'Fetch all employees',
});
const employees = await this.store.findAll('employee');
fetchSpan.finish();

const formatSpan = transaction.startChild({
  op: 'serialize',
  description: 'Format CSV data',
});
const csv = formatCSV(employees);
formatSpan.finish();

const uploadSpan = transaction.startChild({
  op: 'http.client',
  description: 'Upload to storage',
});
await uploadToStorage(csv);
uploadSpan.finish();

transaction.finish();
```

#### Ember-Specific Performance

`@sentry/ember` automatically instruments:

1. **Route transitions:** Each route transition creates a transaction with the route name
2. **Initial page load:** The first render is captured as a page-load transaction
3. **Component render times:** When configured, component render durations are captured as spans

**Enable component tracking:**
```ts
Sentry.init({
  // ...
  integrations: [
    Sentry.browserTracingIntegration({
      // Ember-specific: track component render performance
      _experiments: {
        enableLongTask: true,
      },
    }),
  ],
});
```

---

### Ember-Specific Error Handling

#### Route Error Handling

```ts
// app/routes/application.ts
import Route from '@ember/routing/route';
import * as Sentry from '@sentry/ember';

export default class ApplicationRoute extends Route {
  setupController(controller: any, model: any, transition: any) {
    super.setupController(controller, model, transition);

    // Set route context for Sentry
    Sentry.setContext('route', {
      name: transition.to?.name,
      params: JSON.stringify(transition.to?.params),
    });
  }
}
```

#### Error Substates

Ember's error substates automatically trigger when route model hooks fail. Add Sentry
reporting to these:

```ts
// app/routes/employees/error.ts
import Route from '@ember/routing/route';
import * as Sentry from '@sentry/ember';

export default class EmployeesErrorRoute extends Route {
  setupController(controller: any, error: Error) {
    super.setupController(controller, error);

    Sentry.captureException(error, {
      tags: {
        errorType: 'route-error',
        route: 'employees',
      },
    });
  }
}
```

#### Ember RunLoop Error Handler

`@sentry/ember` automatically captures errors from the Ember RunLoop, including:
- Unhandled promise rejections in route hooks
- Errors in computed property calculations
- Errors thrown by observers and event listeners

You can customize this behavior:

```ts
import Ember from 'ember';
import * as Sentry from '@sentry/ember';

Ember.onerror = function (error: Error) {
  Sentry.captureException(error, {
    tags: { source: 'ember-onerror' },
  });

  // Optionally re-throw in development for debugging
  if (config.environment === 'development') {
    throw error;
  }
};
```

---

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

## Source Maps

### Frontend Source Maps

Upload source maps to Sentry for readable stack traces in production:

```bash
# In CI/CD pipeline after build
npx @sentry/cli sourcemaps upload \
  --auth-token $SENTRY_AUTH_TOKEN \
  --org your-org \
  --project a3-frontend \
  --release "a3@$VERSION" \
  ./dist/assets/
```

**Ember CLI integration:**
```js
// ember-cli-build.js
const app = new EmberApp(defaults, {
  sourcemaps: {
    enabled: true,
    extensions: ['js'],
  },
});
```

### Backend Source Maps

For TypeScript Cloud Functions:

```json
// functions/tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true,
    "sourceRoot": "/"
  }
}
```

```bash
npx @sentry/cli sourcemaps upload \
  --auth-token $SENTRY_AUTH_TOKEN \
  --org your-org \
  --project a3-functions \
  --release "a3-functions@$VERSION" \
  ./functions/lib/
```

---

## Best Practices for A3

1. **Always set user context after auth** — enables grouping errors by user and identifying
   affected users.

2. **Use tags for filtering, extras for context.** Tags are indexed (searchable); extras are not.
   Use tags for: company, role, feature area, function name. Use extras for: payloads, model
   data, stack context.

3. **Always `await Sentry.flush()` in Cloud Functions** before the function terminates.

4. **Scrub PII in `beforeSend`** — SSN, bank accounts, passwords must never reach Sentry.

5. **Use `withScope` for loop errors** — prevents context leaking between iterations.

6. **Set meaningful transaction names** for performance monitoring. Default route names are
   fine for frontend; backend needs explicit names.

7. **Do not capture expected errors** — 401s, validation failures, user-facing errors should
   NOT go to Sentry. Only capture unexpected server/infrastructure errors.

8. **Rate limit in production** — use `tracesSampleRate` < 1.0 and `sampleRate` to avoid
   overwhelming Sentry quota.

---

## Quick Reference

```ts
// Frontend
import * as Sentry from '@sentry/ember';

// Backend
import * as Sentry from '@sentry/node';

// Common API (both platforms)
Sentry.captureException(error);
Sentry.captureException(error, { tags: {}, extra: {} });
Sentry.captureMessage('message', 'warning');
Sentry.setUser({ id, email, username });
Sentry.setUser(null);
Sentry.setContext('name', { key: 'value' });
Sentry.setTag('key', 'value');
Sentry.setTags({ key1: 'v1', key2: 'v2' });
Sentry.setExtra('key', value);
Sentry.addBreadcrumb({ category, message, level, data });
Sentry.withScope((scope) => { ... });
Sentry.flush(timeoutMs);
```
