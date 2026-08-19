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
