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

## ember-page-title

**Package:** `ember-page-title`
**Import (GTS):** `import { pageTitle } from 'ember-page-title';`

### Overview

The `{{pageTitle}}` helper sets the document title (`<title>` tag) declaratively from route
templates. Titles compose hierarchically — nested routes prepend their title to the parent's
title, separated by a configurable separator.

### Basic Usage

**Template signature (GTS):**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "My Page Title"}}
</template>
```

**Classic `.hbs` template:**
```hbs
{{page-title "My Page Title"}}
```

> Note: In GTS strict mode the import is `pageTitle` (camelCase). In classic `.hbs` files the
> helper name is `page-title` (dasherized). Both refer to the same helper.

### How Title Composition Works

ember-page-title builds the document title by collecting `{{pageTitle}}` calls from all
currently active route templates, from leaf to root. The titles are joined with a separator
(default: `" | "`).

**Example route hierarchy:**
```
application.hbs:     {{pageTitle "A3"}}
admin.hbs:           {{pageTitle "Admin"}}
admin.employees.hbs: {{pageTitle "Employees"}}
```

**Resulting document title:** `Employees | Admin | A3`

The most specific (deepest) route's title appears first.

### Configuration

Configure the separator and other options in `config/environment.js`:

```js
// config/environment.js
module.exports = function (environment) {
  let ENV = {
    // ...
    pageTitle: {
      separator: ' | ',    // Default separator between title segments
      prepend: true,        // If true, child titles come before parent (default: true)
      replace: false,       // If true, child title replaces parent entirely
    },
  };
  return ENV;
};
```

### A3 Route Template Patterns

**Standard route with static title:**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Employees"}}

  <div class="page-content">
    {{outlet}}
  </div>
</template>
```

**Route with dynamic title from model:**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle @model.employee.name}}

  <div class="employee-detail">
    <h1>{{@model.employee.name}}</h1>
    {{outlet}}
  </div>
</template>
```

**Route with computed/conditional title:**
```gts
import { pageTitle } from 'ember-page-title';
import { or } from 'ember-truth-helpers';

<template>
  {{pageTitle (or @model.employee.name "New Employee")}}

  <EmployeeForm @model={{@model.employee}} />
</template>
```

**Route that replaces the full title (no composition):**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Login | A3" replace=true}}

  <LoginForm />
</template>
```

When `replace=true` is used, this title completely replaces any parent titles. Useful for
special pages like login, error pages, or landing pages.

**Route with front position (append instead of prepend):**
```gts
<template>
  {{pageTitle "Dashboard" prepend=false}}
</template>
```

With `prepend=false`, this title goes after the parent: `A3 | Dashboard` instead of
`Dashboard | A3`.

### Dynamic Title Updates

The `{{pageTitle}}` helper is reactive. If the value passed to it is a tracked property or
a model attribute, the document title updates automatically when the value changes:

```gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { pageTitle } from 'ember-page-title';

export default class EmployeeRoute extends Component {
  // If @model.employee.name changes (e.g., after an edit), the document title updates
  <template>
    {{pageTitle @model.employee.name}}
    <EmployeeDetail @employee={{@model.employee}} />
  </template>
}
```

### Title with Separator Override

You can override the separator for a specific title segment:

```gts
<template>
  {{pageTitle "Employee Details" separator=" - "}}
</template>
```

This would produce `Employee Details - A3` instead of `Employee Details | A3`.

### Multiple `{{pageTitle}}` in One Template

Only the LAST `{{pageTitle}}` in a single template takes effect. Do not use multiple
`{{pageTitle}}` calls in the same template — use conditional logic instead:

```gts
{{! WRONG — only the second one takes effect }}
{{pageTitle "Title A"}}
{{pageTitle "Title B"}}

{{! RIGHT — use conditional }}
{{pageTitle (if @isEditing "Edit Employee" "View Employee")}}
```

---

## ember-breadcrumb-trail

**Package:** `ember-breadcrumb-trail`
**Import (GTS):** `import { BreadcrumbTrail } from 'ember-breadcrumb-trail';`

### Overview

`ember-breadcrumb-trail` provides a component and route-level API for defining and rendering
hierarchical breadcrumbs. Breadcrumbs are defined in route files and automatically compose
based on the active route hierarchy. The `<BreadcrumbTrail>` component renders the collected
breadcrumbs.

### Defining Breadcrumbs on Routes

Breadcrumbs are defined as a static property or method on route classes:

**Static breadcrumb (most common in A3):**
```ts
// app/routes/employees/index.ts
import Route from '@ember/routing/route';

export default class EmployeesIndexRoute extends Route {
  breadcrumb = {
    title: 'Employees',
    route: 'employees.index',
  };
}
```

**Dynamic breadcrumb from model:**
```ts
// app/routes/employees/employee.ts
import Route from '@ember/routing/route';

export default class EmployeeRoute extends Route {
  breadcrumb(model: EmployeeModel) {
    return {
      title: model.employee.name,
      route: 'employees.employee',
      model: model.employee.id,
    };
  }

  async model(params: { employee_id: string }) {
    // ...
  }
}
```

When `breadcrumb` is a function, it receives the resolved model as its first argument. This
enables dynamic breadcrumb text based on the loaded data.

**Breadcrumb with link disabled (current page):**
```ts
export default class EmployeeDetailRoute extends Route {
  breadcrumb = {
    title: 'Details',
    // Omitting `route` makes it non-clickable (current page)
  };
}
```

**Breadcrumb with multiple dynamic segments:**
```ts
export default class CompanyEmployeeRoute extends Route {
  breadcrumb(model: { company: CompanyModel; employee: EmployeeModel }) {
    return {
      title: model.employee.name,
      route: 'admin.companies.company.employees.employee',
      models: [model.company.id, model.employee.id],
    };
  }
}
```

### Breadcrumb Shape

The breadcrumb object supports these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | Yes | Display text for the breadcrumb |
| `route` | `string` | No | Route name for the link. Omit to make non-clickable |
| `model` | `any` | No | Single dynamic segment value |
| `models` | `any[]` | No | Multiple dynamic segment values |
| `query` | `object` | No | Query parameters for the link |

### Rendering Breadcrumbs

**Basic rendering (GTS):**
```gts
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';

<template>
  <BreadcrumbTrail />
</template>
```

**Custom rendering with block form:**
```gts
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';
import { LinkTo } from '@ember/routing';

<template>
  <BreadcrumbTrail as |Trail|>
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb">
        <Trail as |crumb isLast|>
          <li class={{if isLast "breadcrumb-item active" "breadcrumb-item"}}>
            {{#if (and crumb.route (not isLast))}}
              <LinkTo @route={{crumb.route}} @model={{crumb.model}}>
                {{crumb.title}}
              </LinkTo>
            {{else}}
              {{crumb.title}}
            {{/if}}
          </li>
        </Trail>
      </ol>
    </nav>
  </BreadcrumbTrail>
</template>
```

**Yielded values:**

| Value | Type | Description |
|-------|------|-------------|
| `crumb` | `BreadcrumbItem` | The breadcrumb object with `title`, `route`, `model`, etc. |
| `isLast` | `boolean` | Whether this is the last (current) breadcrumb |

### A3 Breadcrumb Patterns

**Standard A3 route template (combines both addons):**
```gts
import { pageTitle } from 'ember-page-title';
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';

<template>
  {{pageTitle "Employees"}}

  <div class="page-header">
    <BreadcrumbTrail />
    <h1>Employees</h1>
  </div>

  <div class="page-content">
    {{outlet}}
  </div>
</template>
```

This pattern is the most common structure in A3 route templates. Nearly every route follows:
1. Set `{{pageTitle}}` for the document title
2. Render `<BreadcrumbTrail />` in the page header
3. Render page heading
4. Render page content or `{{outlet}}`

**A3 application template (root level):**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "A3"}}

  <Sidebar />
  <main>
    {{outlet}}
  </main>
</template>
```

The root `{{pageTitle "A3"}}` in the application template ensures "A3" always appears as the
last segment in the document title.

**Nested A3 admin route hierarchy:**

```ts
// app/routes/admin.ts
export default class AdminRoute extends Route {
  breadcrumb = { title: 'Admin', route: 'admin.index' };
}

// app/routes/admin/companies.ts
export default class AdminCompaniesRoute extends Route {
  breadcrumb = { title: 'Companies', route: 'admin.companies.index' };
}

// app/routes/admin/companies/company.ts
export default class AdminCompanyRoute extends Route {
  breadcrumb(model: CompanyModel) {
    return {
      title: model.name,
      route: 'admin.companies.company',
      model: model.id,
    };
  }
}

// app/routes/admin/companies/company/employees.ts
export default class AdminCompanyEmployeesRoute extends Route {
  breadcrumb = { title: 'Employees', route: 'admin.companies.company.employees' };
}
```

**Resulting breadcrumb trail:**
`Admin > Companies > Acme Corp > Employees`

**Resulting document title:**
`Employees | Acme Corp | Companies | Admin | A3`

### Conditional Breadcrumbs

Sometimes a breadcrumb should only appear under certain conditions:

```ts
export default class EmployeeRoute extends Route {
  breadcrumb(model: EmployeeModel) {
    if (!model?.employee) {
      return null; // No breadcrumb if model is missing
    }
    return {
      title: model.employee.name,
      route: 'employees.employee',
      model: model.employee.id,
    };
  }
}
```

Returning `null` or `undefined` from a breadcrumb function suppresses that breadcrumb segment.

### Breadcrumbs with Icons

A3 sometimes renders breadcrumbs with icons for top-level sections:

```gts
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';
import { LinkTo } from '@ember/routing';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';

<template>
  <BreadcrumbTrail as |Trail|>
    <nav aria-label="Breadcrumb" class="breadcrumb-nav">
      <ol class="breadcrumb">
        <Trail as |crumb isLast index|>
          <li class={{if isLast "breadcrumb-item active" "breadcrumb-item"}}>
            {{#if (and crumb.route (not isLast))}}
              <LinkTo @route={{crumb.route}} @model={{crumb.model}}>
                {{#if crumb.icon}}
                  <FaIcon @icon={{crumb.icon}} @prefix="fas" />
                {{/if}}
                {{crumb.title}}
              </LinkTo>
            {{else}}
              {{crumb.title}}
            {{/if}}
          </li>
        </Trail>
      </ol>
    </nav>
  </BreadcrumbTrail>
</template>
```

For this to work, include `icon` in the breadcrumb definition:

```ts
export default class AdminRoute extends Route {
  breadcrumb = {
    title: 'Admin',
    route: 'admin.index',
    icon: 'cog', // Custom property
  };
}
```

### Breadcrumbs with Query Parameters

```ts
export default class EmployeesActiveRoute extends Route {
  breadcrumb = {
    title: 'Active Employees',
    route: 'employees.index',
    query: { status: 'active' },
  };
}
```

Rendering with query params:
```gts
<Trail as |crumb isLast|>
  <li>
    {{#if crumb.route}}
      <LinkTo @route={{crumb.route}} @query={{if crumb.query crumb.query (hash)}}>
        {{crumb.title}}
      </LinkTo>
    {{else}}
      {{crumb.title}}
    {{/if}}
  </li>
</Trail>
```

---

## How pageTitle and BreadcrumbTrail Work Together

In A3, these two addons serve complementary purposes:

| Concern | `pageTitle` | `BreadcrumbTrail` |
|---------|-------------|-------------------|
| **What it sets** | Browser tab / document title | Visual navigation breadcrumbs |
| **Where defined** | Route templates (`.gts`/`.hbs`) | Route classes (`.ts`) |
| **Composition** | String concatenation with separator | Array of linked items |
| **Direction** | Leaf first: `Details \| Employee \| A3` | Root first: `A3 > Employee > Details` |

**The standard A3 route file pair:**

Route class (`routes/employees/employee.ts`):
```ts
import Route from '@ember/routing/route';

export default class EmployeeRoute extends Route {
  breadcrumb(model: { employee: EmployeeModel }) {
    return {
      title: model.employee.name,
      route: 'employees.employee',
      model: model.employee.id,
    };
  }

  async model(params: { employee_id: string }) {
    const employee = await this.store.findRecord('employee', params.employee_id);
    return { employee };
  }
}
```

Route template (`templates/employees/employee.gts`):
```gts
import { pageTitle } from 'ember-page-title';
import { BreadcrumbTrail } from 'ember-breadcrumb-trail';

<template>
  {{pageTitle @model.employee.name}}

  <div class="page-header">
    <BreadcrumbTrail />
    <h1>{{@model.employee.name}}</h1>
  </div>

  <div class="page-content">
    {{outlet}}
  </div>
</template>
```

### Keeping Titles and Breadcrumbs In Sync

A common mistake is having the `pageTitle` and `breadcrumb.title` show different text. In A3,
always ensure they match (or are intentionally different for brevity):

```ts
// Route class
breadcrumb = { title: 'Employee Directory', route: 'employees.index' };
```

```gts
// Route template — MUST match or be a superset
{{pageTitle "Employee Directory"}}
```

If the breadcrumb says "Employee Directory" but the page title says "Employees", this creates
a confusing user experience.

---

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
