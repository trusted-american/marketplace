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

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-frontend-sentry-ember.md` | Frontend — @sentry/ember |
| `reference/02-backend-sentry-node.md` | Backend — @sentry/node |

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
