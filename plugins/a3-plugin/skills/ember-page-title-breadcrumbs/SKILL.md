---
name: ember-page-title-breadcrumbs
description: ember-page-title (298 files) and ember-breadcrumb-trail (312 files) — the two most common route-level utilities in A3
version: 0.1.0
---


# ember-page-title and ember-breadcrumb-trail — Complete A3 Reference

These two addons appear in nearly every route template in A3. `ember-page-title` is used in
298 files and `ember-breadcrumb-trail` in 312 files. They work together to provide consistent
page titles and navigation breadcrumbs across the application.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-ember-page-title.md` | ember-page-title |
| `reference/02-ember-breadcrumb-trail.md` | ember-breadcrumb-trail |
| `reference/03-how-pagetitle-and-breadcrumbtrail-work-together.md` | How pageTitle and BreadcrumbTrail Work Together |

## Complete A3 Route Template Skeleton

This is the canonical pattern for an A3 route template that uses both addons:

```gts
import { pageTitle } from 'ember-page-title';
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';

<template>
  {{pageTitle "Page Title Here"}}

  <div class="page-header">
    <BreadcrumbTrail />
    <div class="page-header-content">
      <h1>Page Title Here</h1>
      {{! Optional: action buttons, filters, etc. }}
    </div>
  </div>

  <div class="page-content">
    {{! Page body content }}
    {{outlet}}
  </div>
</template>
```

And the corresponding route class:

```ts
import Route from '@ember/routing/route';

export default class MyPageRoute extends Route {
  breadcrumb = {
    title: 'Page Title Here',
    route: 'my-page',
  };

  async model() {
    // ...
  }
}
```

---
## Troubleshooting

### Document title not updating

1. Check that `{{pageTitle}}` is in the TEMPLATE, not the route class.
2. Ensure the template is actually being rendered (check `{{outlet}}`).
3. If using a dynamic value, verify the value is tracked/reactive.

### Breadcrumbs not appearing

1. Verify `breadcrumb` is defined on the ROUTE class, not the controller or component.
2. Check that `<BreadcrumbTrail />` is rendered in the template.
3. If using a function, ensure it returns an object (not `undefined`).
4. Check that parent routes also define breadcrumbs — gaps break the chain.

### Duplicate breadcrumbs

1. Check for `breadcrumb` on both a parent route and its index sub-route.
2. Ensure you are not rendering `<BreadcrumbTrail />` in multiple nested templates.

### Wrong breadcrumb order

1. Breadcrumbs render root-to-leaf. If the order seems wrong, check your route nesting.
2. Verify that the `route` property in each breadcrumb matches the correct level.

---
## TypeScript Types

```ts
interface BreadcrumbItem {
  title: string;
  route?: string;
  model?: unknown;
  models?: unknown[];
  query?: Record<string, unknown>;
  [key: string]: unknown; // Allows custom properties like `icon`
}

// On a Route class
interface RouteWithBreadcrumb {
  breadcrumb: BreadcrumbItem | ((model: unknown) => BreadcrumbItem | null) | null;
}
```

---
## Migration Notes

| Legacy Pattern | Modern Pattern |
|----------------|----------------|
| `{{title "Page"}}` | `{{pageTitle "Page"}}` |
| `this.set('breadcrumb', {...})` | `breadcrumb = {...}` (class field) |
| `{{bread-crumbs}}` | `<BreadcrumbTrail />` |
| `{{page-title "X"}}` (classic) | `{{pageTitle "X"}}` (GTS import) |
