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
