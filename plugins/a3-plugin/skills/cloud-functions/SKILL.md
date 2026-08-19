---
name: cloud-functions
description: Deep Google Cloud Functions v2 reference — every trigger type with full TypeScript signatures, function configuration, retry behavior, cold start optimization, testing, deployment, emulator usage, A3 index.ts export pattern, error handling, structured logging, all 40 Firestore trigger files by collection, and all 39 HTTPS endpoint files by service
version: 0.2.0
---


# Google Cloud Functions v2 Reference

firebase-functions is imported in 86 backend files and is the execution layer for A3's entire serverless backend. This skill covers every trigger type, configuration option, deployment strategy, and the complete inventory of A3's function files.

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-a3-s-index-ts-export-pattern.md` | A3's index.ts Export Pattern |
| `reference/03-every-trigger-type-full-typescript-signatures.md` | Every Trigger Type — Full TypeScript Signatures |
| `reference/04-function-configuration-complete-reference.md` | Function Configuration — Complete Reference |
| `reference/05-retry-behavior-for-background-functions.md` | Retry Behavior for Background Functions |
| `reference/06-cold-start-optimization-strategies.md` | Cold Start Optimization Strategies |
| `reference/07-function-testing-with-firebase-functions-test.md` | Function Testing with firebase-functions-test |
| `reference/09-local-emulator-usage-patterns.md` | Local Emulator Usage Patterns |
| `reference/10-error-handling-patterns-per-trigger-type.md` | Error Handling Patterns Per Trigger Type |
| `reference/11-logging-best-practices.md` | Logging Best Practices |
| `reference/12-a3-third-party-integration-patterns.md` | A3 Third-Party Integration Patterns |
| `reference/13-the-40-firestore-trigger-files-organized-by-coll.md` | The 40 Firestore Trigger Files Organized by Collection |
| `reference/14-the-39-https-endpoint-files-organized-by-service.md` | The 39 HTTPS Endpoint Files Organized by Service |

## Overview

A3's backend runs on Cloud Functions for Firebase (2nd generation), which are Google Cloud Run functions under the hood. Runtime: Node.js 22 with TypeScript. All functions are defined in the `functions/` directory and exported through a central `index.ts`.

---
## Deployment Strategies

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Specific Functions

```bash
# Single function
firebase deploy --only functions:onClientCreated

# Multiple functions
firebase deploy --only functions:onClientCreated,functions:onClientUpdated,functions:stripeApi

# Functions matching a prefix (if using group exports)
firebase deploy --only functions:triggers-clients
```

### Deploy with Environment

```bash
# Use specific project
firebase use production
firebase deploy --only functions

# Or inline
firebase deploy --only functions --project a3-production
```

### Deployment Best Practices

1. **Deploy in stages**: Deploy to staging first, verify, then production
2. **Use --only for targeted deploys**: Avoid redeploying all functions when only one changed
3. **Monitor after deploy**: Watch Cloud Logging for errors immediately after deploy
4. **Rollback**: `firebase functions:delete functionName` to remove a broken function, or redeploy the previous version
5. **CI/CD**: Use `firebase deploy --only functions --force` in CI pipelines (skips confirmation prompts)

### Function Deletion

```bash
# Delete a specific function
firebase functions:delete onOldFunction

# Delete multiple
firebase functions:delete onOldFunction1 onOldFunction2

# Delete with region
firebase functions:delete onOldFunction --region us-central1
```

---
## Error Handling with Sentry

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { functionName: 'onEnrollmentCreated', collection: 'enrollments' },
    extra: { enrollmentId, agencyId },
  });
  console.error('Operation failed:', error);
  throw error; // Re-throw for function retry
}
```

---
## Further Investigation

- **Cloud Functions Docs**: https://firebase.google.com/docs/functions
- **Functions v2 API Reference**: https://firebase.google.com/docs/reference/functions/2nd-gen
- **Express.js**: https://expressjs.com/en/api.html
- **Cloud Logging**: https://cloud.google.com/logging/docs
- **Cloud Run (underlying runtime)**: https://cloud.google.com/run/docs
- **Stripe Node SDK**: https://stripe.com/docs/api
- **Mailgun Node SDK**: https://github.com/mailgun/mailgun.js
- **Algolia Node SDK**: https://www.algolia.com/doc/api-client/getting-started/install/javascript/
- **PandaDoc API**: https://developers.pandadoc.com/reference
- **firebase-functions-test**: https://firebase.google.com/docs/functions/unit-testing
