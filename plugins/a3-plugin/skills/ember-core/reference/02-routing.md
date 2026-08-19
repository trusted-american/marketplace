## 2. Routing

### 2.1 Router Map (app/router.ts)

The router map defines the URL-to-route hierarchy. Every route corresponds to a
handler class, a template, and optionally a controller.

```typescript
import EmberRouter from '@ember/routing/router';
import config from 'a3/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;  // 'history', 'hash', or 'auto'
  rootURL = config.rootURL;        // e.g. '/'
}

Router.map(function () {
  this.route('login');
  this.route('authenticated', { path: '/a3' }, function () {
    this.route('dashboard');
    this.route('clients', function () {
      this.route('client', { path: '/:client_id' }, function () {
        this.route('enrollments');
        this.route('files');
        this.route('notes');
      });
      this.route('new');
    });
    this.route('reports', function () {
      this.route('report', { path: '/:report_id' });
    });
  });
  this.route('admin', function () {
    this.route('users');
    this.route('settings');
  });

  // Catch-all for 404
  this.route('not-found', { path: '/*path' });
});
```

**Key rules:**
- Nested routes create nested URL segments (e.g., `authenticated.clients.client` -> `/a3/clients/:client_id`)
- `{ path: '/:param' }` defines dynamic segments
- `{ path: '/*wildcard' }` defines wildcard segments for catch-all routes
- The `index` route is implicit for every resource with children
- `{ resetNamespace: true }` can flatten deeply nested route names

### 2.2 Route Class — Exhaustive Hook Reference

Every route extends `@ember/routing/route`. The hooks fire in a strict order
during a transition. Below is every hook with its full TypeScript signature,
purpose, and usage guidance.

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import type Controller from '@ember/controller';
import type StoreService from 'a3/services/store';
```

#### 2.2.1 `beforeModel(transition: Transition): void | Promise<void>`

Fires BEFORE any model resolution. Use for:
- Authentication/authorization gates
- Redirects that do not depend on model data
- Precondition checks

```typescript
export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare router: RouterService;

  async beforeModel(transition: Transition): Promise<void> {
    if (!this.session.isAuthenticated) {
      // Save the intended transition so we can retry after login
      this.session.attemptedTransition = transition;
      this.router.transitionTo('login');
    }
  }
}
```

**Important:** If `beforeModel` returns a promise, the transition will pause
until it resolves. A rejected promise triggers the error substate.

#### 2.2.2 `model(params: Record<string, string>, transition: Transition): any | Promise<any>`

The primary data-loading hook. Whatever this returns (or resolves to) becomes
the "model" for the route and is available in the template as `@model`.

```typescript
export default class ClientRoute extends Route {
  @service declare store: StoreService;

  async model(params: { client_id: string }, transition: Transition) {
    return this.store.findRecord('client', params.client_id, {
      include: 'enrollments,contacts',
      reload: true,
    });
  }
}
```

**Params object:** Contains only the dynamic segments and query params defined
for THIS specific route, not parent routes.

**Caching:** By default Ember caches the model if the route's dynamic segment
has not changed. Override by returning a fresh promise or using `reload: true`.

**Multiple models:** Return an object or use `RSVP.hash`:
```typescript
import { hash } from 'rsvp';

async model() {
  return hash({
    clients: this.store.findAll('client'),
    statuses: this.store.findAll('status'),
    reports: this.store.query('report', { recent: true }),
  });
}
```

#### 2.2.3 `afterModel(model: ResolvedModel, transition: Transition): void | Promise<void>`

Fires AFTER the model resolves but BEFORE the route renders. Use for:
- Redirects that depend on the loaded model
- Post-load validation
- Side effects that should block rendering

```typescript
export default class ClientRoute extends Route {
  @service declare router: RouterService;

  afterModel(model: ClientModel, transition: Transition): void {
    if (model.isArchived) {
      this.router.transitionTo('authenticated.clients.archived', model.id);
    }
  }
}
```

#### 2.2.4 `setupController(controller: Controller, model: ResolvedModel, transition: Transition): void`

Fires after the model resolves and the controller instance is available. The
default implementation sets `controller.model = model`. Override to pass
additional data to the controller.

```typescript
export default class ClientsRoute extends Route {
  setupController(
    controller: ClientsController,
    model: ClientModel[],
    transition: Transition
  ): void {
    super.setupController(controller, model, transition);
    controller.totalCount = model.length;
    controller.lastRefreshed = new Date();
  }
}
```

**Always call `super.setupController()`** unless you intentionally want to skip
the default `controller.model = model` assignment.

#### 2.2.5 `resetController(controller: Controller, isExiting: boolean, transition: Transition): void`

Fires when the route is about to be exited OR when the route's model changes
(i.e., navigating from `/clients/1` to `/clients/2`).

```typescript
export default class ClientsRoute extends Route {
  resetController(
    controller: ClientsController,
    isExiting: boolean,
    transition: Transition
  ): void {
    if (isExiting) {
      // Reset all filter state when leaving
      controller.search = '';
      controller.status = 'all';
      controller.page = 1;
      controller.sortBy = 'name';
      controller.sortDirection = 'asc';
    }
  }
}
```

**`isExiting`:** `true` when leaving the route entirely, `false` when only the
model is changing (e.g., different dynamic segment).

#### 2.2.6 `redirect(model: ResolvedModel, transition: Transition): void`

An alias-like hook that fires after `afterModel`. Historically used for redirects.
In modern Ember, prefer doing redirects in `beforeModel` or `afterModel` instead.

```typescript
export default class IndexRoute extends Route {
  @service declare router: RouterService;

  redirect(model: unknown, transition: Transition): void {
    this.router.transitionTo('authenticated.dashboard');
  }
}
```

#### 2.2.7 `serialize(model: Model, params: string[]): Record<string, string>`

Converts a model object into the URL dynamic segment parameters. Called when
generating URLs with `{{link-to}}` or `router.transitionTo` with a model object.

```typescript
export default class ClientRoute extends Route {
  serialize(model: ClientModel, params: string[]): { client_id: string } {
    return { client_id: model.id };
  }
}
```

**Default behavior:** Uses the model's `id` property mapped to the param name.
Override when the URL param does not correspond to `model.id`.

#### 2.2.8 `buildRouteInfoMetadata(): unknown`

Returns arbitrary metadata that is attached to the `RouteInfo` object. This
metadata is available on `transition.to.metadata` and `transition.from.metadata`
during `routeWillChange` / `routeDidChange` events.

```typescript
export default class ClientRoute extends Route {
  buildRouteInfoMetadata() {
    return {
      trackingCategory: 'clients',
      requiresAuth: true,
      breadcrumb: 'Client Detail',
    };
  }
}
```

### 2.3 Route Hook Execution Order

During a full transition, hooks fire in this exact order:

1. **Parent `beforeModel()`** (top-level ancestor first)
2. **Parent `model()`**
3. **Parent `afterModel()`**
4. **Child `beforeModel()`**
5. **Child `model()`**
6. **Child `afterModel()`**
7. *(repeat for deeper nesting)*
8. **Parent `redirect()`**
9. **Child `redirect()`**
10. **`resetController()`** on any routes being exited
11. **`setupController()`** on all entering/updating routes (parent first)
12. **Templates render** (parent first, child outlets fill in)

If ANY hook returns a rejected promise, the transition aborts and the
error substate activates.

### 2.4 Loading and Error Substates — Full Detail

Ember provides automatic substates for loading and error conditions during
route transitions. These are resolved by naming convention.

#### 2.4.1 Loading Substates

When a route's `model()` hook returns a promise that takes time to resolve,
Ember automatically enters a loading substate. Ember looks for templates in
this order:

For a route named `authenticated.clients`:
1. `authenticated/clients-loading` (sibling loading route)
2. `authenticated/clients/loading` (child loading template)
3. `authenticated-loading` (parent loading)
4. `authenticated/loading`
5. `application-loading`
6. `application/loading` (top-level fallback)

```gts
// app/templates/authenticated/clients/loading.gts
import LoadingSpinner from 'a3/components/loading-spinner';

<template>
  <div class="d-flex justify-content-center align-items-center py-5">
    <LoadingSpinner @size="lg" />
    <span class="ms-3 text-muted">Loading clients...</span>
  </div>
</template>
```

**Loading event:** You can also handle loading programmatically via the
`loading` action on the route:

```typescript
export default class ApplicationRoute extends Route {
  @action
  loading(transition: Transition, originRoute: Route): boolean {
    // Show a global loading indicator
    const controller = this.controllerFor('application');
    controller.isLoading = true;

    transition.promise.finally(() => {
      controller.isLoading = false;
    });

    // Return true to bubble, false to stop (and show default substate)
    return true;
  }
}
```

#### 2.4.2 Error Substates

When a route's model hook rejects, Ember enters an error substate. The
lookup order mirrors loading substates:

For a route named `authenticated.clients.client`:
1. `authenticated/clients/client-error`
2. `authenticated/clients/client/error`
3. `authenticated/clients-error`
4. `authenticated/clients/error`
5. `authenticated-error`
6. `authenticated/error`
7. `application-error`
8. `application/error`

```gts
// app/templates/authenticated/clients/error.gts
import type { TemplateOnlyComponent } from '@ember/component/template-only';

interface ErrorSignature {
  Args: { model: Error };
}

const ErrorTemplate: TemplateOnlyComponent<ErrorSignature> = <template>
  <div class="alert alert-danger m-4" role="alert">
    <h4 class="alert-heading">Error Loading Clients</h4>
    <p>{{@model.message}}</p>
    <hr />
    <p class="mb-0">
      Please try refreshing the page. If the problem persists, contact support.
    </p>
  </div>
</template>;

export default ErrorTemplate;
```

**Error event:** Routes also receive an `error` action that bubbles up the
route hierarchy:

```typescript
export default class ApplicationRoute extends Route {
  @action
  error(error: Error, transition: Transition): boolean {
    if (error instanceof UnauthorizedError) {
      this.router.transitionTo('login');
      return false; // Do not bubble
    }

    if (error instanceof NotFoundError) {
      this.router.transitionTo('not-found');
      return false;
    }

    // Let it bubble to the default error substate
    return true;
  }
}
```

**Error event bubbling:** The error action bubbles from the route where the
error occurred upward through parent routes to the application route. Return
`false` to stop bubbling; return `true` (or `undefined`) to continue.

### 2.5 Query Parameters — Deep Coverage

Query params in Ember are defined on CONTROLLERS (not routes). They bridge the
URL query string with controller properties.

#### 2.5.1 Basic Definition

```typescript
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ClientsController extends Controller {
  // Declare which tracked properties are query params
  queryParams = ['search', 'status', 'page', 'perPage', 'sortBy', 'sortDir'];

  @tracked search = '';
  @tracked status = 'active';
  @tracked page = 1;
  @tracked perPage = 25;
  @tracked sortBy = 'name';
  @tracked sortDir = 'asc';
}
```

#### 2.5.2 Advanced Query Param Configuration

```typescript
export default class ClientsController extends Controller {
  queryParams = [
    'search',
    {
      // Map controller property to a different URL key
      status: { as: 's', type: 'string' },
    },
    {
      // Replace URL entry instead of pushing to history
      page: { as: 'p', replace: true },
    },
    {
      // Scope to a specific route (rarely needed)
      perPage: { as: 'per', scope: 'controller' },
    },
  ];

  @tracked search = '';
  @tracked status = 'active';
  @tracked page = 1;
  @tracked perPage = 25;
}
```

**Configuration options per query param:**
- **`as`** — URL key name (default: property name)
- **`replace`** — Use `replaceState` instead of `pushState` (default: `false`)
- **`scope`** — `'model'` scopes to the model (unique per model), `'controller'` is global (default: `'model'`)
- **`type`** — Serialization type: `'string'`, `'number'`, `'boolean'`, `'array'`

#### 2.5.3 `refreshModel` on the Route

By default, changing a query param does NOT re-fire the `model()` hook. To
opt into refreshing:

```typescript
export default class ClientsRoute extends Route {
  queryParams = {
    search: { refreshModel: true },
    status: { refreshModel: true },
    page: { refreshModel: true },
    perPage: { refreshModel: true },
    sortBy: { refreshModel: false },   // No server-side sort
    sortDir: { refreshModel: false },
  };

  async model(params: {
    search: string;
    status: string;
    page: number;
    perPage: number;
  }) {
    return this.store.query('client', {
      filter: { search: params.search, status: params.status },
      page: { number: params.page, size: params.perPage },
    });
  }
}
```

#### 2.5.4 Linking with Query Params

```gts
import { LinkTo } from '@ember/routing';

<template>
  {{! Reset page to 1 when changing filters }}
  <LinkTo
    @route="authenticated.clients"
    @query={{hash status="active" page=1}}
  >
    Active Clients
  </LinkTo>

  {{! Preserve all other QPs, only change status }}
  <LinkTo @route="authenticated.clients" @query={{hash status="archived"}}>
    Archived
  </LinkTo>
</template>
```

Programmatic navigation with query params:
```typescript
this.router.transitionTo('authenticated.clients', {
  queryParams: { search: 'acme', page: 1 },
});
```

#### 2.5.5 Sticky Query Params

Query params are "sticky" by default — they persist their value even when
navigating away and back. The value resets to the default only when explicitly
set or when `resetController` clears it.

### 2.6 Transition Object API

The `Transition` object is passed to most route hooks and is available on
router service events. It provides full control over the in-progress navigation.

```typescript
import type Transition from '@ember/routing/transition';
```

#### Properties

| Property | Type | Description |
|---|---|---|
| `transition.to` | `RouteInfo` | The destination route info (name, params, queryParams, metadata, parent, child) |
| `transition.from` | `RouteInfo \| null` | The origin route info (`null` on initial load) |
| `transition.intent` | `object` | Internal intent object with URL or route name |
| `transition.isActive` | `boolean` | `true` if the transition has not been aborted or superseded |
| `transition.data` | `Record<string, unknown>` | Arbitrary data bag — persists across `retry()` calls |
| `transition.promise` | `Promise<unknown>` | Promise that resolves when the transition completes |
| `transition.isAborted` | `boolean` | `true` if `abort()` was called |
| `transition.queryParamsOnly` | `boolean` | `true` if only query params are changing (no route change) |

#### Methods

| Method | Signature | Description |
|---|---|---|
| `abort()` | `(): void` | Cancel the transition entirely |
| `retry()` | `(): Transition` | Retry a previously aborted transition |
| `followRedirects()` | `(): Promise<unknown>` | Returns a promise that follows any redirects |
| `send()` | `(ignoreFailure: boolean, name: string, ...args): void` | Send an action to the transition's routes |

#### Common Patterns

```typescript
// Save and retry pattern (e.g., after login)
async beforeModel(transition: Transition) {
  if (!this.session.isAuthenticated) {
    this.session.savedTransition = transition;
    this.router.transitionTo('login');
  }
}

// In the login route after successful auth:
async afterLogin() {
  const savedTransition = this.session.savedTransition;
  if (savedTransition) {
    this.session.savedTransition = null;
    savedTransition.retry();
  } else {
    this.router.transitionTo('authenticated.dashboard');
  }
}

// Using transition.data for passing info between hooks
beforeModel(transition: Transition) {
  transition.data.startTime = performance.now();
}

afterModel(model: unknown, transition: Transition) {
  const elapsed = performance.now() - (transition.data.startTime as number);
  console.log(`Model loaded in ${elapsed}ms`);
}

// Checking if a transition is still active before acting
async model(params: { id: string }, transition: Transition) {
  const result = await this.store.findRecord('client', params.id);
  if (!transition.isActive) {
    return; // Transition was superseded; do nothing
  }
  return result;
}
```

### 2.7 Link Navigation

```gts
import { LinkTo } from '@ember/routing';

<template>
  {{! Basic link }}
  <LinkTo @route="authenticated.dashboard">Dashboard</LinkTo>

  {{! Link with dynamic segment (model) }}
  <LinkTo @route="authenticated.clients.client" @model={{@client.id}}>
    {{@client.name}}
  </LinkTo>

  {{! Link with multiple dynamic segments (nested) }}
  <LinkTo
    @route="authenticated.clients.client.enrollments"
    @models={{array @client.id}}
  >
    Enrollments
  </LinkTo>

  {{! Link with query params }}
  <LinkTo @route="authenticated.clients" @query={{hash status="active" page=1}}>
    Active Clients
  </LinkTo>

  {{! Link with current-when for active state }}
  <LinkTo
    @route="authenticated.clients"
    @current-when="authenticated.clients authenticated.clients.client"
  >
    Clients
  </LinkTo>

  {{! Disabled link }}
  <LinkTo @route="admin" @disabled={{not this.isAdmin}}>Admin</LinkTo>
</template>
```

---
