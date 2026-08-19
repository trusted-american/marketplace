## @ember/routing

### `LinkTo` — Route Link Component

**Import:** `import { LinkTo } from '@ember/routing';`

**Template signature:**
```hbs
<LinkTo @route="routeName" @model={{model}}>Link Text</LinkTo>
<LinkTo @route="routeName" @models={{array model1 model2}}>Link Text</LinkTo>
<LinkTo @route="routeName" @query={{hash key=value}}>Link Text</LinkTo>
```

**Key arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `@route` | `string` | Dot-separated route name |
| `@model` | `any` | Single dynamic segment value |
| `@models` | `any[]` | Multiple dynamic segment values |
| `@query` | `object` | Query parameters |
| `@disabled` | `boolean` | Disables the link |
| `@current-when` | `string` | Override active state matching |
| `@activeClass` | `string` | CSS class when active (default: `"active"`) |

**A3 patterns:**

Simple route link:
```gts
<template>
  <LinkTo @route="employees.index">All Employees</LinkTo>
</template>
```

Link with dynamic segment:
```gts
<template>
  <LinkTo @route="employees.employee" @model={{@employee.id}}>
    {{@employee.name}}
  </LinkTo>
</template>
```

Nested route with multiple segments:
```gts
<template>
  <LinkTo @route="admin.companies.company.employees" @models={{array @companyId @departmentId}}>
    View Employees
  </LinkTo>
</template>
```

Link with query params:
```gts
<template>
  <LinkTo @route="employees.index" @query={{hash status="active" page=1}}>
    Active Employees
  </LinkTo>
</template>
```

### `RouterService` — Programmatic Navigation

**Import (type):** `import type RouterService from '@ember/routing/router-service';`

**Key methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `transitionTo` | `(routeName, ...models, options?)` | Navigate to route |
| `replaceWith` | `(routeName, ...models, options?)` | Navigate without history entry |
| `isActive` | `(routeName, ...models, options?)` | Check if route is active |
| `urlFor` | `(routeName, ...models, options?)` | Generate URL string |
| `currentRouteName` | `string` (property) | Current route dot-path |
| `currentURL` | `string` (property) | Current URL string |
| `on` | `(eventName, callback)` | Listen to route events |

**A3 navigation patterns:**

Transition after save:
```ts
@service declare router: RouterService;

@action
async saveEmployee() {
  await this.args.model.save();
  this.router.transitionTo('employees.employee', this.args.model.id);
}
```

Transition with query params:
```ts
this.router.transitionTo('employees.index', { queryParams: { status: 'active' } });
```

Conditional navigation:
```ts
if (this.router.isActive('admin')) {
  this.router.transitionTo('admin.dashboard');
} else {
  this.router.transitionTo('dashboard');
}
```

Route change listener:
```ts
constructor(owner: unknown, args: Args) {
  super(owner, args);
  this.router.on('routeDidChange', this.handleRouteChange);
}

willDestroy() {
  super.willDestroy();
  this.router.off('routeDidChange', this.handleRouteChange);
}
```

---
