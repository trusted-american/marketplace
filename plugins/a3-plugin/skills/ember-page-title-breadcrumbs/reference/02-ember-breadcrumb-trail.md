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
