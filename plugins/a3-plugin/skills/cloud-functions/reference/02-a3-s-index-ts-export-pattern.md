## A3's index.ts Export Pattern

All Cloud Functions must be exported from the top-level `index.ts` to be deployed. A3 uses a modular pattern where each function is defined in its own file and re-exported.

```typescript
// functions/src/index.ts

// ─── Firestore Triggers ───
export { onClientCreated } from './triggers/clients/onCreate';
export { onClientUpdated } from './triggers/clients/onUpdate';
export { onClientDeleted } from './triggers/clients/onDelete';
export { onEnrollmentCreated } from './triggers/enrollments/onCreate';
export { onEnrollmentUpdated } from './triggers/enrollments/onUpdate';
// ... all trigger exports

// ─── HTTPS Endpoints ───
export { stripeApi } from './https/stripe';
export { mailgunWebhooks } from './https/mailgun';
export { pandadocWebhooks } from './https/pandadoc';
export { algoliaSync } from './https/algolia';
// ... all HTTPS exports

// ─── Scheduled Functions ───
export { dailyReport } from './scheduled/dailyReport';
export { hourlySync } from './scheduled/hourlySync';
export { weeklyCleanup } from './scheduled/weeklyCleanup';
// ... all scheduled exports

// ─── PubSub Functions ───
export { processEnrollmentQueue } from './pubsub/enrollmentQueue';
export { processNotificationQueue } from './pubsub/notificationQueue';
// ... all PubSub exports
```

**Key rules for the export pattern:**
- The exported name becomes the deployed function name (e.g., `onClientCreated` deploys as `onClientCreated`)
- Firebase CLI discovers functions by scanning exports at deploy time
- Functions not exported from `index.ts` will NOT be deployed
- Nested exports via barrel files are supported: `export * from './triggers/clients'`
- Lazy imports reduce cold start time: functions that are not invoked do not load their dependencies

### Lazy Loading Pattern (A3 Optimization)

```typescript
// functions/src/index.ts — lazy loading to reduce cold starts
// Instead of importing everything at the top level, use dynamic re-exports

// Option 1: Direct re-export (simple, but loads all modules)
export { onClientCreated } from './triggers/clients/onCreate';

// Option 2: Lazy loading with getter (advanced, reduces cold start)
const lazyExport = (modulePath: string, exportName: string) => {
  let cached: any;
  Object.defineProperty(exports, exportName, {
    get: () => {
      if (!cached) {
        cached = require(modulePath)[exportName];
      }
      return cached;
    },
  });
};

lazyExport('./triggers/clients/onCreate', 'onClientCreated');
lazyExport('./https/stripe', 'stripeApi');
```

---
