---
name: ember-core
description: Deep Ember.js 6.x Octane reference — routing, services, dependency injection, lifecycle, reactivity, GJS/GTS authoring, and modern patterns
version: 0.1.0
---

# Ember.js Core Reference (Octane / v6.x)

This is the definitive Ember.js reference for A3 developers. It covers every
major API surface in exhaustive detail: routing, services, dependency injection,
reactivity, run loop, destroyables, owner API, template compilation, initializers,
error handling, query params, transition objects, engines, and more.

---

## 1. Ember Octane Paradigm

Ember Octane (the current edition) is built on:
- **Native JavaScript classes** (not Ember.Object)
- **Tracked properties** (not computed properties)
- **Glimmer components** (not classic Ember components)
- **Decorators** (@tracked, @action, @service)
- **Template-tag components** (GTS/GJS format)
- **Strict-mode templates** with explicit imports of helpers, modifiers, and components

All new code in A3 follows the Octane paradigm. Legacy patterns from classic Ember
(computed properties, observers, mixins, `this.get()`, `Ember.Object.extend()`)
still exist in older parts of the codebase but must not be introduced in new code.

---

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

## 3. Router Service — Complete API

The router service (`@ember/routing/router-service`) provides programmatic
navigation and route introspection. Inject it with `@service declare router: RouterService;`.

### 3.1 Properties

| Property | Type | Description |
|---|---|---|
| `currentURL` | `string` | The current URL including query params (e.g., `/a3/clients?status=active`) |
| `currentRouteName` | `string` | Dot-separated route name (e.g., `authenticated.clients.index`) |
| `currentRoute` | `RouteInfo` | Full RouteInfo for the current leaf route (with `.parent`, `.params`, `.queryParams`, `.metadata`) |
| `rootURL` | `string` | The application root URL |
| `location` | `string` | Location implementation type (`'history'`, `'hash'`, `'none'`) |

### 3.2 Methods

#### `transitionTo(routeName: string, ...models: any[], options?: { queryParams: object }): Transition`
Navigate to a route. Creates a new browser history entry.

```typescript
// Simple navigation
this.router.transitionTo('authenticated.dashboard');

// With dynamic segment
this.router.transitionTo('authenticated.clients.client', clientId);

// With multiple dynamic segments
this.router.transitionTo('authenticated.clients.client.enrollments', clientId);

// With query params
this.router.transitionTo('authenticated.clients', {
  queryParams: { search: 'acme', page: 1 },
});

// With model object (calls serialize())
this.router.transitionTo('authenticated.clients.client', clientModel);

// To a URL string
this.router.transitionTo('/a3/clients/123');
```

#### `replaceWith(routeName: string, ...models: any[], options?: { queryParams: object }): Transition`
Same as `transitionTo` but replaces the current history entry instead of adding one.

```typescript
// Good for redirects — back button won't return to this page
this.router.replaceWith('authenticated.clients.client', newClientId);
```

#### `urlFor(routeName: string, ...models: any[], options?: { queryParams: object }): string`
Generate a URL string without navigating.

```typescript
const url = this.router.urlFor('authenticated.clients.client', clientId);
// Returns: '/a3/clients/123'

const urlWithQP = this.router.urlFor('authenticated.clients', {
  queryParams: { status: 'active' },
});
// Returns: '/a3/clients?status=active'
```

#### `recognize(url: string): RouteInfo | null`
Parse a URL and return the RouteInfo it maps to, without triggering a transition.

```typescript
const info = this.router.recognize('/a3/clients/123');
// info.name === 'authenticated.clients.client'
// info.params === { client_id: '123' }
```

#### `recognizeAndLoad(url: string): Promise<RouteInfoWithAttributes>`
Like `recognize` but also runs the model hooks and returns the loaded route info.

```typescript
const info = await this.router.recognizeAndLoad('/a3/clients/123');
// info.attributes contains the resolved model
```

#### `isActive(routeName: string, ...models: any[], options?: { queryParams: object }): boolean`
Check if a route (with optional models/QPs) is currently active.

```typescript
if (this.router.isActive('authenticated.clients')) {
  // We are somewhere within the clients section
}

if (this.router.isActive('authenticated.clients.client', '123')) {
  // We are viewing client 123
}
```

#### `on(eventName: string, callback: Function): void` / `off(eventName: string, callback: Function): void`
Subscribe to or unsubscribe from router events.

```typescript
// routeWillChange — fires BEFORE a transition starts
this.router.on('routeWillChange', (transition: Transition) => {
  if (this.hasUnsavedChanges && !confirm('Discard changes?')) {
    transition.abort();
  }
});

// routeDidChange — fires AFTER a transition completes
this.router.on('routeDidChange', (transition: Transition) => {
  // Analytics tracking
  this.analytics.trackPageView({
    route: transition.to.name,
    url: this.router.currentURL,
    metadata: transition.to.metadata,
  });
});
```

**Always clean up event listeners** in `willDestroy()` or with `registerDestructor`:

```typescript
export default class NavigationGuardService extends Service {
  @service declare router: RouterService;

  #boundHandler: ((t: Transition) => void) | null = null;

  constructor(owner: Owner) {
    super(owner);
    this.#boundHandler = this.handleWillChange.bind(this);
    this.router.on('routeWillChange', this.#boundHandler);
  }

  willDestroy(): void {
    super.willDestroy();
    if (this.#boundHandler) {
      this.router.off('routeWillChange', this.#boundHandler);
    }
  }

  handleWillChange(transition: Transition): void {
    // Guard logic
  }
}
```

---

## 4. Services (Dependency Injection) — Complete Coverage

### 4.1 What is a Service?

A service is a **singleton** object that lives for the duration of the application.
It is created lazily on first access and shared across all consumers (routes,
controllers, components, other services).

### 4.2 Declaring a Service

```typescript
// app/services/my-service.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class MyService extends Service {
  @tracked isLoading = false;
  @tracked data: SomeType[] = [];

  @action
  async fetchData(): Promise<void> {
    this.isLoading = true;
    try {
      this.data = await fetch('/api/data').then(r => r.json());
    } finally {
      this.isLoading = false;
    }
  }

  willDestroy(): void {
    super.willDestroy();
    // Clean up subscriptions, timers, etc.
  }
}
```

### 4.3 Service Lifecycle

| Phase | Details |
|---|---|
| **Creation** | Lazy — created the FIRST time any consumer accesses it via `@service` |
| **Singleton scope** | ONE instance per application. All injections resolve to the same object |
| **Persistence** | Lives for the entire application lifetime. Survives route transitions |
| **Destruction** | `willDestroy()` fires only when the application is torn down (in tests, between each test; in production, essentially never) |

**Cross-route persistence:** Because services are singletons, tracked properties
on a service are shared across every route and component. Changing a tracked
property on a service triggers re-render in EVERY template that reads it.

```typescript
// Setting state in one component...
this.currentUser.selectedClient = client;

// ...is immediately visible in every other component reading it:
// <template>{{this.currentUser.selectedClient.name}}</template>
```

### 4.4 Injecting a Service

```typescript
import { service } from '@ember/service';

export default class MyComponent extends Component {
  // Standard injection — service name matches property name
  @service declare store: StoreService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare intl: IntlService;

  // When the service name differs from the property name
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service('current-user') declare currentUser: CurrentUserService;

  // The service is lazily instantiated on first property access
  doSomething() {
    // First access of this.store creates the store service instance
    return this.store.findAll('client');
  }
}
```

**`declare` keyword:** Required in TypeScript. It tells TS that the property
is defined by the decorator, not as a class field (which would shadow the
injected value).

### 4.5 Lazy Instantiation Detail

Services are NOT created at application boot. They are created when first
accessed. This means:

1. If nothing ever accesses `@service myService`, `MyService` is never instantiated
2. The constructor runs on first access (NOT when the consumer is created)
3. If the service has side effects in its constructor (WebSocket connection, etc.), those only fire on first access

```typescript
export default class WebSocketService extends Service {
  socket: WebSocket | null = null;

  constructor(owner: Owner) {
    super(owner);
    // This only runs when some component/route first accesses @service webSocket
    this.socket = new WebSocket('wss://...');
  }

  willDestroy(): void {
    super.willDestroy();
    this.socket?.close();
  }
}
```

### 4.6 Key A3 Services

| Service | Injection Name | Purpose |
|---|---|---|
| WarpDrive Store | `store` | Data fetching, caching, persistence |
| Session | `session` | Firebase auth state, tokens, login/logout |
| Current User | `current-user` | Current user profile, permissions, preferences |
| Router | `router` | Programmatic navigation, route inspection |
| Internationalization | `intl` | Translation via ember-intl (`this.intl.t('key')`) |
| Flash Messages | `flash-messages` | Toast notifications (ember-cli-flash) |
| Notifications | `notifications` | In-app notification system |
| Permissions | `permissions` | Feature flags and role-based access |

### 4.7 Service Registration

By convention, a file at `app/services/my-service.ts` is automatically
registered with the container under the name `service:my-service`. No
explicit registration is needed.

For non-standard locations or names, use an initializer:
```typescript
// app/initializers/register-custom-service.ts
export function initialize(application: Application): void {
  application.register('service:custom-name', MyCustomClass);
}

export default { initialize };
```

---

## 5. Reactivity System (Tracked Properties)

### 5.1 Basic Tracked State

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CounterComponent extends Component {
  @tracked count = 0;
  @tracked name = '';
  @tracked items: string[] = [];

  // Getters that read tracked properties are auto-tracked
  get doubleCount(): number {
    return this.count * 2;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  @action increment(): void {
    this.count++;  // Triggers re-render of anything reading this.count or doubleCount
  }

  @action addItem(item: string): void {
    // MUST create a new array reference for tracking to detect the change
    this.items = [...this.items, item];
  }

  @action removeItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }
}
```

### 5.2 tracked-built-ins

For deep tracking of arrays, objects, maps, and sets without creating new references:

```typescript
import { TrackedArray, TrackedObject, TrackedMap, TrackedSet } from 'tracked-built-ins';

export default class MyComponent extends Component {
  items = new TrackedArray<string>();
  data = new TrackedObject<Record<string, unknown>>();
  lookup = new TrackedMap<string, number>();
  tags = new TrackedSet<string>();

  @action addItem(item: string): void {
    this.items.push(item);         // Mutation is tracked automatically
  }

  @action setData(key: string, value: unknown): void {
    this.data[key] = value;        // Property set is tracked
  }

  @action updateLookup(key: string, val: number): void {
    this.lookup.set(key, val);     // Map.set is tracked
  }
}
```

### 5.3 Auto-tracking Rules

1. **Tracked properties** trigger re-renders when their value is set (even to the same value)
2. **Getters** that read tracked properties are automatically tracked — no decoration needed
3. **Plain arrays/objects** require a new reference (`this.arr = [...this.arr, item]`)
4. **TrackedArray/TrackedObject** allow in-place mutation
5. **Services** with tracked properties trigger re-renders across the entire app
6. **Args** (`this.args.foo`) are auto-tracked — changes from the parent re-render the child
7. **Two reads in one render cycle** always return the same value (consistency guarantee)

---

## 6. Actions

```typescript
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

export default class ItemListComponent extends Component {
  @action
  handleClick(event: MouseEvent): void {
    event.preventDefault();
    // Handle
  }

  @action
  handleItemAction(item: Item, event: MouseEvent): void {
    // item is bound via {{fn}}, event is the native event
  }

  @action
  handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.args.onSearch?.(value);
  }

  <template>
    <button type="button" {{on "click" this.handleClick}}>Click</button>

    {{#each @items as |item|}}
      <button type="button" {{on "click" (fn this.handleItemAction item)}}>
        {{item.name}}
      </button>
    {{/each}}

    <input type="text" {{on "input" this.handleInput}} />
  </template>
}
```

**Why `@action`?** The decorator binds `this` to the component instance. Without
it, `this` would be `undefined` in strict mode when passed as a callback.

---

## 7. Template Syntax (GTS/GJS)

### 7.1 Conditionals

```gts
{{#if this.isLoading}}
  <LoadingSpinner />
{{else if this.hasError}}
  <ErrorMessage @error={{this.error}} />
{{else if this.isEmpty}}
  <EmptyState @message="No items found" />
{{else}}
  <ItemList @items={{@model}} />
{{/if}}

{{#unless this.isVisible}}
  <p>This content is hidden</p>
{{/unless}}

{{! Inline conditionals }}
<div class={{if this.isActive "active" "inactive"}}>...</div>
<div class="btn {{unless this.isEnabled "disabled"}}">...</div>
```

### 7.2 Iteration

```gts
{{#each @items as |item index|}}
  <div class="item" data-index={{index}}>
    {{item.name}}
  </div>
{{else}}
  <p>No items to display.</p>
{{/each}}

{{! Iterating over object keys }}
{{#each-in @record as |key value|}}
  <dt>{{key}}</dt>
  <dd>{{value}}</dd>
{{/each-in}}
```

### 7.3 Yielding (Block Components)

```gts
// Card component
<template>
  <div class="card" ...attributes>
    {{yield this.api}}
  </div>
</template>

// Usage
<Card as |api|>
  <p>{{api.title}}</p>
</Card>
```

### 7.4 Named Blocks

```gts
// Component definition with named blocks
<template>
  <div class="card">
    {{#if (has-block "header")}}
      <div class="card-header">{{yield to="header"}}</div>
    {{/if}}
    <div class="card-body">{{yield to="body"}}</div>
    {{#if (has-block "footer")}}
      <div class="card-footer">{{yield to="footer"}}</div>
    {{/if}}
  </div>
</template>

// Usage
<Card>
  <:header>My Title</:header>
  <:body>My Content</:body>
  <:footer>
    <button type="button">Save</button>
  </:footer>
</Card>
```

### 7.5 Splattributes

```gts
<template>
  <div class="my-component" ...attributes>
    {{! ...attributes spreads all HTML attributes from the invocation site }}
    {{! Invocation: <MyComponent class="extra" data-test-id="foo" /> }}
    {{! Result: <div class="my-component extra" data-test-id="foo"> }}
  </div>
</template>
```

### 7.6 Built-in Helpers

```gts
{{concat "Hello" " " "World"}}               {{! String concatenation }}
{{if condition "yes" "no"}}                   {{! Inline conditional }}
{{unless condition "fallback"}}               {{! Inline unless }}
{{fn this.method arg1 arg2}}                  {{! Partial application }}
{{hash key1="value1" key2="value2"}}          {{! Create POJO }}
{{array "a" "b" "c"}}                         {{! Create array }}
{{get @model "propertyName"}}                 {{! Dynamic property access }}
{{let (helper-result) as |localVar|}}         {{! Local variable binding }}
{{unique-id}}                                 {{! Generate unique DOM id }}
{{yield}}                                     {{! Yield to block }}
{{yield to="named"}}                          {{! Yield to named block }}
{{has-block "name"}}                          {{! Check if named block provided }}
{{has-block-params "name"}}                   {{! Check if block expects params }}
{{in-element this.destinationElement}}        {{! Render into a different DOM node }}
{{#in-element this.el insertBefore=null}}...{{/in-element}}
```

### 7.7 ember-truth-helpers

```gts
{{and a b}}                    {{! Logical AND }}
{{or a b}}                     {{! Logical OR }}
{{not a}}                      {{! Logical NOT }}
{{eq a b}}                     {{! Strict equality }}
{{not-eq a b}}                 {{! Strict inequality }}
{{gt a b}}                     {{! Greater than }}
{{gte a b}}                    {{! Greater than or equal }}
{{lt a b}}                     {{! Less than }}
{{lte a b}}                    {{! Less than or equal }}
{{is-array value}}             {{! Check if array }}
{{is-empty value}}             {{! Check if empty }}
{{is-equal a b}}               {{! Deep equality }}
```

---

## 8. Modifiers

### 8.1 Built-in: {{on}}

```gts
import { on } from '@ember/modifier';

<template>
  <button {{on "click" this.handleClick}}>Click</button>
  <input {{on "input" this.handleInput}} {{on "focus" this.handleFocus}} />

  {{! With event options }}
  <form {{on "submit" this.handleSubmit}}>
    <button type="submit">Submit</button>
  </form>
</template>
```

The `{{on}}` modifier accepts event options as named arguments:
```gts
<div {{on "scroll" this.handleScroll passive=true}}>...</div>
<a {{on "click" this.handleClick capture=true}}>...</a>
<form {{on "submit" this.handleSubmit once=true}}>...</form>
```

### 8.2 Custom Modifiers (Functional)

```typescript
import { modifier } from 'ember-modifier';

// Simple — runs once on insert, cleanup on destroy
const autofocus = modifier((element: HTMLElement) => {
  element.focus();
});

// With cleanup — return a destructor function
const onResize = modifier(
  (element: HTMLElement, [callback]: [(entry: ResizeObserverEntry) => void]) => {
    const observer = new ResizeObserver((entries) => {
      callback(entries[0]);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }
);

// With tracked dependencies — re-runs when args change
const tooltip = modifier(
  (element: HTMLElement, [text]: [string], { placement }: { placement?: string }) => {
    const instance = createTooltip(element, { text, placement: placement ?? 'top' });

    return () => {
      instance.destroy();
    };
  }
);

export { autofocus, onResize, tooltip };
```

### 8.3 Custom Modifiers (Class-based)

For complex modifiers that need lifecycle control:

```typescript
import Modifier from 'ember-modifier';

interface ClickOutsideSignature {
  Element: HTMLElement;
  Args: {
    Positional: [() => void];
    Named: { except?: HTMLElement };
  };
}

export default class ClickOutsideModifier extends Modifier<ClickOutsideSignature> {
  handler: ((event: MouseEvent) => void) | null = null;

  modify(
    element: HTMLElement,
    [callback]: [() => void],
    { except }: { except?: HTMLElement }
  ): void {
    // Remove previous handler
    if (this.handler) {
      document.removeEventListener('click', this.handler);
    }

    this.handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && (!except || !except.contains(target))) {
        callback();
      }
    };

    document.addEventListener('click', this.handler);
  }

  willDestroy(): void {
    if (this.handler) {
      document.removeEventListener('click', this.handler);
    }
  }
}
```

---

## 9. @ember/object Utilities (Legacy-aware)

These exist in the codebase (457+ usages of `@ember/service`, 192 of
`@ember/object`). New code should avoid legacy patterns, but understanding
them is essential for maintaining existing code.

### 9.1 `get` and `set` (Legacy)

```typescript
import { get, set } from '@ember/object';

// Legacy: needed for Ember.Object-based classes and proxy objects
get(obj, 'some.nested.property');
set(obj, 'some.nested.property', value);

// Modern: use native JS property access with @tracked
this.someProperty;           // reading
this.someProperty = value;   // writing
```

**When `get`/`set` is still needed:**
- Accessing properties on `ObjectProxy` or `ArrayProxy` instances
- Accessing unknown/dynamic property paths on Ember objects
- Interacting with older addons that rely on `Ember.Object`

### 9.2 `computed` (Legacy)

```typescript
import { computed } from '@ember/object';

// Legacy computed property — DO NOT use in new code
export default class OldComponent extends EmberObject {
  firstName = 'John';
  lastName = 'Doe';

  // LEGACY: Use @tracked + getter instead
  fullName: computed('firstName', 'lastName', function () {
    return `${this.firstName} ${this.lastName}`;
  }),
}

// MODERN equivalent:
export default class NewComponent extends Component {
  @tracked firstName = 'John';
  @tracked lastName = 'Doe';

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

### 9.3 `defineProperty` (Legacy)

```typescript
import { defineProperty } from '@ember/object';

// Used in metaprogramming scenarios on classic Ember objects
defineProperty(obj, 'newProp', computed('dep', function () { ... }));
defineProperty(obj, 'newProp', descriptor);
```

### 9.4 `observer` (Legacy — Avoid)

```typescript
import { observer } from '@ember/object';

// NEVER use in new code. Observers are synchronous side effects that
// make code extremely hard to reason about.
export default class LegacyThing extends EmberObject {
  value = 0,

  valueChanged: observer('value', function () {
    // Fires every time 'value' changes
    console.log('value changed to', this.value);
  }),
}
```

### 9.5 `@action` (Modern — from @ember/object)

```typescript
import { action } from '@ember/object';

// Binds `this` context. Essential for event handlers passed as callbacks.
@action
handleClick(event: MouseEvent): void {
  // `this` is guaranteed to be the class instance
}
```

---

## 10. @ember/runloop — Complete API

The Ember run loop batches DOM updates and executes work in a specific queue
order. Understanding it is critical for integrating with non-Ember async
operations and third-party libraries.

### 10.1 Queue Order

Ember processes queues in this order on every run loop turn:
1. **`sync`** — Binding synchronization (legacy)
2. **`actions`** — General work, action handlers
3. **`routerTransitions`** — Route transition work
4. **`render`** — Template re-rendering
5. **`afterRender`** — Post-render DOM work
6. **`destroy`** — Object teardown

### 10.2 `schedule(queueName, target, method, ...args)`

Schedule work into a specific queue of the current run loop iteration.

```typescript
import { schedule } from '@ember/runloop';

// Schedule DOM measurement after render
schedule('afterRender', this, function () {
  const height = this.element.offsetHeight;
  this.reportHeight(height);
});

// Schedule general work
schedule('actions', this, this.processData, arg1, arg2);
```

**When to use:** When you need to guarantee work runs after rendering (e.g.,
measuring DOM dimensions, setting scroll position, focusing elements).

### 10.3 `next(target, method, ...args)`

Schedule work for the NEXT run loop turn (not the current one).

```typescript
import { next } from '@ember/runloop';

next(this, function () {
  // Runs in the next run loop iteration
  this.doSomethingAfterCurrentFlush();
});
```

**When to use:** When you need to defer work until after the current run loop
completely finishes (all queues processed).

### 10.4 `later(target, method, ...args, delay)`

Schedule work after a delay (like `setTimeout` but run-loop aware).

```typescript
import { later } from '@ember/runloop';

// Auto-dismiss a notification after 5 seconds
const timer = later(this, function () {
  this.dismissNotification();
}, 5000);
```

Returns a timer handle that can be passed to `cancel()`.

### 10.5 `cancel(timer)`

Cancel a scheduled timer from `later`, `debounce`, `throttle`, or `next`.

```typescript
import { later, cancel } from '@ember/runloop';

export default class NotificationService extends Service {
  #dismissTimer: ReturnType<typeof later> | null = null;

  showNotification(message: string): void {
    // Cancel any existing timer
    if (this.#dismissTimer) {
      cancel(this.#dismissTimer);
    }
    this.message = message;
    this.#dismissTimer = later(this, this.dismiss, 5000);
  }

  dismiss(): void {
    this.message = null;
    this.#dismissTimer = null;
  }

  willDestroy(): void {
    super.willDestroy();
    if (this.#dismissTimer) {
      cancel(this.#dismissTimer);
    }
  }
}
```

### 10.6 `debounce(target, method, ...args, wait, immediate?)`

Coalesce rapid calls. Only the last invocation fires after `wait` ms of inactivity.

```typescript
import { debounce } from '@ember/runloop';

export default class SearchComponent extends Component {
  @action
  handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // Wait 300ms after the user stops typing before searching
    debounce(this, this.performSearch, value, 300);
  }

  performSearch(query: string): void {
    this.args.onSearch?.(query);
  }
}
```

**`immediate` flag:** If `true`, fires on the leading edge (first call) and
then ignores subsequent calls within the wait period.

### 10.7 `throttle(target, method, ...args, spacing, immediate?)`

Rate-limit calls. Fires at most once every `spacing` ms.

```typescript
import { throttle } from '@ember/runloop';

export default class ScrollTrackerComponent extends Component {
  @action
  handleScroll(event: Event): void {
    // Fire at most once every 100ms during scrolling
    throttle(this, this.reportScrollPosition, event, 100);
  }

  reportScrollPosition(event: Event): void {
    const target = event.target as HTMLElement;
    this.args.onScroll?.(target.scrollTop);
  }
}
```

### 10.8 `join(target, method, ...args)`

If a run loop is already active, schedule into it. If not, create a new one.

```typescript
import { join } from '@ember/runloop';

// Safe to call from non-Ember callbacks (e.g., WebSocket, third-party libraries)
websocket.onmessage = (event) => {
  join(this, function () {
    this.handleMessage(JSON.parse(event.data));
  });
};
```

**When to use:** When integrating with external event sources (WebSockets,
Firebase listeners, ResizeObserver callbacks, etc.) that fire outside the
Ember run loop.

### 10.9 `begin()` / `end()`

Manually open and close a run loop. Rarely needed — prefer `join()`.

```typescript
import { begin, end } from '@ember/runloop';

begin();
try {
  // Work inside a run loop
  this.updateState();
  this.triggerRender();
} finally {
  end();
}
```

---

## 11. @ember/destroyable — Complete API

The destroyable API provides a structured way to register cleanup logic and
manage parent-child destruction relationships.

### 11.1 `registerDestructor(destroyable, destructor)`

Register a function that runs when the destroyable (component, service, etc.)
is destroyed.

```typescript
import { registerDestructor } from '@ember/destroyable';

export default class WebSocketComponent extends Component {
  socket: WebSocket;

  constructor(owner: Owner, args: ComponentArgs) {
    super(owner, args);

    this.socket = new WebSocket('wss://...');

    registerDestructor(this, () => {
      this.socket.close();
    });
  }
}
```

**Advantage over `willDestroy`:** Multiple destructors can be registered, and
they can be registered from helpers, modifiers, or utility functions — not just
inside the class itself.

### 11.2 `unregisterDestructor(destroyable, destructor)`

Remove a previously registered destructor.

```typescript
import { registerDestructor, unregisterDestructor } from '@ember/destroyable';

const destructor = () => { /* cleanup */ };
registerDestructor(this, destructor);

// Later, if cleanup is no longer needed:
unregisterDestructor(this, destructor);
```

### 11.3 `associateDestroyableChild(parent, child)`

Link a child destroyable to a parent so the child is destroyed when the parent is.

```typescript
import { associateDestroyableChild } from '@ember/destroyable';

export default class ParentComponent extends Component {
  childManager: ChildManager;

  constructor(owner: Owner, args: ComponentArgs) {
    super(owner, args);
    this.childManager = new ChildManager();
    associateDestroyableChild(this, this.childManager);
    // When ParentComponent is destroyed, childManager.willDestroy() fires too
  }
}

class ChildManager {
  timerId: ReturnType<typeof setInterval>;

  constructor() {
    this.timerId = setInterval(() => this.poll(), 5000);
    registerDestructor(this, () => {
      clearInterval(this.timerId);
    });
  }
}
```

### 11.4 `isDestroying(destroyable)` / `isDestroyed(destroyable)`

Check the destruction state of an object.

```typescript
import { isDestroying, isDestroyed } from '@ember/destroyable';

async fetchData(): Promise<void> {
  const data = await fetch('/api/data');

  // Guard against acting on a destroyed component
  if (isDestroying(this) || isDestroyed(this)) {
    return;
  }

  this.data = await data.json();
}
```

**`isDestroying`:** `true` from the moment destruction begins (destructors running).
**`isDestroyed`:** `true` after all destructors have completed.

### 11.5 `destroy(destroyable)`

Explicitly trigger destruction of a destroyable. Rarely needed since the
framework handles destruction of components, services, etc.

```typescript
import { destroy } from '@ember/destroyable';

// Manually destroy an object
destroy(someDestroyable);
```

---

## 12. @ember/owner — Complete API

The owner API provides access to the dependency injection container. It allows
manual lookup of services, factories, and other registered objects.

### 12.1 `getOwner(object)`

Retrieve the owner (application instance) from any framework object.

```typescript
import { getOwner } from '@ember/owner';

export default class MyComponent extends Component {
  get someService(): SomeService {
    // Manual lookup — prefer @service decorator instead
    return getOwner(this)!.lookup('service:some-service') as SomeService;
  }
}
```

**Common use cases:**
- Looking up services dynamically (name determined at runtime)
- Passing ownership to manually created objects
- Working with factories in initializers

```typescript
// Dynamic service lookup
const serviceName = `service:${this.args.providerType}-provider`;
const provider = getOwner(this)!.lookup(serviceName) as ProviderService;

// Looking up a factory
const Factory = getOwner(this)!.factoryFor('component:my-dynamic-component');
const instance = Factory?.create();
```

### 12.2 `setOwner(object, owner)`

Set the owner on a manually created object so it can participate in DI.

```typescript
import { getOwner, setOwner } from '@ember/owner';

export default class MyComponent extends Component {
  createHelper(): MyHelper {
    const helper = new MyHelper();
    setOwner(helper, getOwner(this)!);
    // Now helper can use @service injections
    return helper;
  }
}
```

**When to use:** When creating objects outside the normal factory system that
still need access to services.

### 12.3 Owner Lookup Methods

Once you have an owner, these methods are available:

```typescript
const owner = getOwner(this)!;

// Lookup a registered instance (singleton)
const store = owner.lookup('service:store') as StoreService;

// Get a factory for creating instances
const factory = owner.factoryFor('model:client');
const clientInstance = factory?.create({ name: 'Acme' });

// Check if something is registered
const hasService = owner.hasRegistration('service:my-service');

// Register a value manually
owner.register('service:custom', MyCustomService);

// Register an already-instantiated object
owner.register('service:config', configObject, { instantiate: false });

// Inject into all instances of a type
owner.inject('component', 'store', 'service:store');
```

---

## 13. Initializers and Instance Initializers

Initializers run during application boot and are used to configure the DI
container and set up application-wide state.

### 13.1 Initializers (app/initializers/)

Run ONCE when the `Application` is created. They receive the `Application`
object and can register/inject dependencies.

```typescript
// app/initializers/register-config.ts
import type Application from '@ember/application';

export function initialize(application: Application): void {
  // Register a non-class value as a service
  const config = {
    apiUrl: 'https://api.example.com',
    version: '1.0.0',
  };
  application.register('config:main', config, { instantiate: false });

  // Inject into all routes
  application.inject('route', 'appConfig', 'config:main');
}

export default {
  name: 'register-config',
  initialize,
};
```

**Initializer ordering:**

```typescript
export default {
  name: 'my-initializer',
  before: 'other-initializer',   // Run before this one
  after: 'dependency-initializer', // Run after this one
  initialize,
};
```

### 13.2 Instance Initializers (app/instance-initializers/)

Run ONCE per application instance (important in FastBoot where multiple instances
may exist). They receive the `ApplicationInstance` and can perform lookups.

```typescript
// app/instance-initializers/setup-session.ts
import type ApplicationInstance from '@ember/application/instance';

export function initialize(appInstance: ApplicationInstance): void {
  // Can look up services (unlike regular initializers)
  const session = appInstance.lookup('service:session') as SessionService;
  const config = appInstance.lookup('config:main') as AppConfig;

  session.configure({
    apiUrl: config.apiUrl,
  });
}

export default {
  name: 'setup-session',
  initialize,
};
```

**Key difference:** Regular initializers cannot do lookups (the container is
not fully initialized). Instance initializers CAN look up services and other
registered objects.

### 13.3 When to Use Each

| Use Case | Initializer | Instance Initializer |
|---|---|---|
| Register factories/values | Yes | No (already booted) |
| Configure injections | Yes | No |
| Look up services | No | Yes |
| Setup based on runtime config | No | Yes |
| Runs per-instance (FastBoot) | No | Yes |
| Order dependencies | `before`/`after` | `before`/`after` |

---

## 14. Component Lifecycle (Glimmer)

Glimmer components have a minimal lifecycle compared to classic Ember components.

### 14.1 `constructor(owner, args)`

Called when the component is instantiated. `this.args` is available.

```typescript
import Component from '@glimmer/component';

interface MyComponentSignature {
  Args: {
    initialValue: string;
  };
  Element: HTMLDivElement;
  Blocks: {
    default: [value: string];
  };
}

export default class MyComponent extends Component<MyComponentSignature> {
  localValue: string;

  constructor(owner: Owner, args: MyComponentSignature['Args']) {
    super(owner, args);
    this.localValue = this.args.initialValue;
    // DO: Setup initial state, create non-framework objects
    // DON'T: Access DOM (doesn't exist yet), modify args
  }
}
```

### 14.2 `willDestroy()`

Called when the component is being removed from the DOM.

```typescript
export default class TimerComponent extends Component {
  intervalId: ReturnType<typeof setInterval>;

  constructor(owner: Owner, args: Args) {
    super(owner, args);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  willDestroy(): void {
    super.willDestroy();
    clearInterval(this.intervalId);
    // Clean up: event listeners, timers, subscriptions, WebSockets
  }
}
```

### 14.3 No `didInsertElement` / `didRender` etc.

Glimmer components do NOT have `didInsertElement`, `didRender`, `didUpdate`,
or `didReceiveAttrs`. Use modifiers instead:

```gts
import { modifier } from 'ember-modifier';

const setupChart = modifier((element: HTMLCanvasElement, [data]: [ChartData]) => {
  const chart = new Chart(element, { data });
  return () => chart.destroy();
});

<template>
  <canvas {{setupChart @data}}></canvas>
</template>
```

---

## 15. @ember/template Compilation Helpers

These are helpers and utilities used in template compilation and resolution.

### 15.1 Template-Only Components

```typescript
import templateOnlyComponent from '@ember/component/template-only';

// Explicitly declare a template-only component (no class)
// In GTS, simply export a <template> without a class:
<template>
  <div class="badge" ...attributes>{{yield}}</div>
</template>
```

### 15.2 Helper Functions

```typescript
import { helper } from '@ember/component/helper';

// Function-based helper
const formatCurrency = helper(function ([value]: [number], { currency }: { currency?: string }) {
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  });
  return fmt.format(value);
});

export default formatCurrency;
```

Usage in templates:
```gts
<template>
  <span>{{formatCurrency @amount currency="EUR"}}</span>
</template>
```

### 15.3 The `{{component}}` Helper (Dynamic Components)

```gts
{{! Render a component dynamically by name or reference }}
{{#let (component "my-component") as |MyDynamic|}}
  <MyDynamic @arg="value" />
{{/let}}

{{! With curry: pre-bind arguments }}
{{#let (component "form-field" type="text" required=true) as |TextField|}}
  <TextField @label="Name" @value={{this.name}} />
  <TextField @label="Email" @value={{this.email}} />
{{/let}}
```

### 15.4 The `{{modifier}}` and `{{helper}}` Currying Helpers

```gts
{{! Curry a modifier }}
{{#let (modifier "on" "click") as |onClick|}}
  <button {{onClick this.handleSave}}>Save</button>
  <button {{onClick this.handleCancel}}>Cancel</button>
{{/let}}

{{! Curry a helper }}
{{#let (helper "format-date" format="short") as |shortDate|}}
  <span>{{shortDate @startDate}}</span>
  <span>{{shortDate @endDate}}</span>
{{/let}}
```

---

## 16. Engines and Mount Patterns

Ember Engines allow splitting an application into isolated, mountable units
with their own routes, services, and templates.

### 16.1 Mounting an Engine

```typescript
// In the host app's router.ts
Router.map(function () {
  this.mount('admin-engine', { as: 'admin', path: '/admin' });
  this.mount('reporting-engine', { as: 'reports', path: '/reports' });
});
```

### 16.2 Route-less Engines

```gts
{{! Mount an engine without routes (inline) }}
{{mount "dashboard-widget"}}
```

### 16.3 Sharing Services Between Host and Engine

```typescript
// In the engine's app/app.js
export default class AdminEngine extends Engine {
  dependencies = {
    services: ['session', 'current-user', 'store'],
  };
}

// In the host's app/app.js
export default class App extends Application {
  engines = {
    'admin-engine': {
      dependencies: {
        services: ['session', 'current-user', 'store'],
      },
    },
  };
}
```

---

## 17. Error Handling Patterns

### 17.1 Route Error Action

The `error` action on a route fires when any hook rejects. It bubbles upward.

```typescript
export default class ClientRoute extends Route {
  @action
  error(error: Error, transition: Transition): boolean | void {
    if (error instanceof NotFoundError) {
      this.router.transitionTo('not-found');
      return false; // Stop bubbling
    }

    if (error instanceof ForbiddenError) {
      this.flashMessages.danger('You do not have permission to view this resource.');
      this.router.transitionTo('authenticated.dashboard');
      return false;
    }

    // Let unknown errors bubble to parent route / application error handler
    return true;
  }
}
```

### 17.2 Application-Level Error Handler

```typescript
export default class ApplicationRoute extends Route {
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  @action
  error(error: Error, transition: Transition): boolean {
    // Handle 401 — redirect to login
    if (isUnauthorizedError(error)) {
      this.session.invalidate();
      this.router.transitionTo('login');
      return false;
    }

    // Handle 403
    if (isForbiddenError(error)) {
      this.flashMessages.danger('Access denied.');
      this.router.transitionTo('authenticated.dashboard');
      return false;
    }

    // Handle 404
    if (isNotFoundError(error)) {
      this.router.transitionTo('not-found');
      return false;
    }

    // Handle network errors
    if (isNetworkError(error)) {
      this.flashMessages.danger('Network error. Please check your connection.');
      return false;
    }

    // Log unknown errors and show generic error substate
    console.error('Unhandled route error:', error);
    return true; // Show the error substate template
  }
}
```

### 17.3 Error Bubbling Order

For an error in `authenticated.clients.client`:

1. `authenticated.clients.client` route `error` action
2. `authenticated.clients` route `error` action
3. `authenticated` route `error` action
4. `application` route `error` action
5. Default error substate template

If any handler returns `false`, bubbling stops. If all return `true` (or none
handle it), the error substate template is shown.

### 17.4 Error Recovery in Templates

The error substate template receives the error as `@model`:

```gts
// app/templates/authenticated/error.gts
<template>
  <div class="container py-5">
    <div class="alert alert-danger">
      <h4>Something went wrong</h4>
      <p>{{@model.message}}</p>
      {{#if @model.stack}}
        <details>
          <summary>Technical details</summary>
          <pre>{{@model.stack}}</pre>
        </details>
      {{/if}}
      <button
        type="button"
        class="btn btn-primary mt-3"
        {{on "click" this.retry}}
      >
        Try Again
      </button>
    </div>
  </div>
</template>
```

---

## 18. Ember Application Boot Sequence

The complete boot sequence for an Ember application:

1. **`app/app.ts`** — `Application` class created, modules loaded
2. **`ember-load-initializers`** — Discovers and runs all initializers
3. **Initializers** — Run in dependency order (`before`/`after`)
4. **Application instance created**
5. **Instance initializers** — Run in dependency order
6. **`app/router.ts`** — Route map evaluated
7. **URL resolved** — Current URL mapped to route hierarchy
8. **Route hooks fire** — `beforeModel` -> `model` -> `afterModel` (parent to child)
9. **`setupController`** — Controllers populated with model data
10. **Templates render** — Glimmer renders the component tree
11. **Modifiers run** — DOM modifiers execute after elements are in the DOM
12. **`routeDidChange`** event fires on the router service

---

## 19. Testing Considerations

### 19.1 Service Stubs in Tests

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders with stubbed service', async function (assert) {
    // Register a stub for the service
    this.owner.register('service:session', class extends Service {
      isAuthenticated = true;
      user = { name: 'Test User' };
    });

    await render(hbs`<MyComponent />`);
    assert.dom('[data-test-user-name]').hasText('Test User');
  });
});
```

### 19.2 Transition Testing

```typescript
import { visit, currentRouteName, currentURL } from '@ember/test-helpers';

test('redirects unauthenticated users', async function (assert) {
  await visit('/a3/clients');
  assert.strictEqual(currentRouteName(), 'login');
  assert.strictEqual(currentURL(), '/login');
});
```

---

## 20. Quick Reference Tables

### 20.1 Import Map

| Import | Package | Purpose |
|---|---|---|
| `Route` | `@ember/routing/route` | Route class |
| `RouterService` | `@ember/routing/router-service` | Router service type |
| `Controller` | `@ember/controller` | Controller class |
| `Service` | `@ember/service` | Service base class |
| `{ service }` | `@ember/service` | Service injection decorator |
| `Component` | `@glimmer/component` | Glimmer component class |
| `{ tracked }` | `@glimmer/tracking` | Tracked property decorator |
| `{ action }` | `@ember/object` | Action decorator |
| `{ on }` | `@ember/modifier` | Event listener modifier |
| `{ fn }` | `@ember/helper` | Partial application helper |
| `{ hash }` | `@ember/helper` | POJO creation helper |
| `{ array }` | `@ember/helper` | Array creation helper |
| `{ get }` | `@ember/helper` | Dynamic property access helper |
| `{ concat }` | `@ember/helper` | String concatenation helper |
| `{ LinkTo }` | `@ember/routing` | Link component |
| `{ modifier }` | `ember-modifier` | Custom modifier factory |
| `{ helper }` | `@ember/component/helper` | Custom helper factory |
| `{ getOwner, setOwner }` | `@ember/owner` | DI owner access |
| `{ registerDestructor }` | `@ember/destroyable` | Cleanup registration |
| `{ schedule, later, ... }` | `@ember/runloop` | Run loop utilities |
| `{ get, set, computed }` | `@ember/object` | Legacy object utilities |

### 20.2 Route Hook Cheat Sheet

| Hook | Receives | Returns | Purpose |
|---|---|---|---|
| `beforeModel` | `transition` | `void \| Promise` | Auth, redirects (no model needed) |
| `model` | `params, transition` | `any \| Promise` | Load data |
| `afterModel` | `model, transition` | `void \| Promise` | Post-load redirects, validation |
| `setupController` | `controller, model, transition` | `void` | Pass extra data to controller |
| `resetController` | `controller, isExiting, transition` | `void` | Clean up state on exit |
| `redirect` | `model, transition` | `void` | Legacy redirect hook |
| `serialize` | `model, params` | `object` | Model-to-URL params |
| `buildRouteInfoMetadata` | *(none)* | `any` | Attach metadata to RouteInfo |

### 20.3 Router Service Cheat Sheet

| Method/Property | Purpose |
|---|---|
| `transitionTo(route, ...models, options)` | Navigate (pushState) |
| `replaceWith(route, ...models, options)` | Navigate (replaceState) |
| `urlFor(route, ...models, options)` | Generate URL string |
| `recognize(url)` | Parse URL to RouteInfo |
| `recognizeAndLoad(url)` | Parse URL and load model |
| `isActive(route, ...models, options)` | Check if route is active |
| `currentURL` | Current full URL |
| `currentRouteName` | Current route dot-name |
| `currentRoute` | Current RouteInfo |
| `on('routeWillChange', fn)` | Before transition |
| `on('routeDidChange', fn)` | After transition |

---

## 21. Further Investigation

- **Ember Guides**: https://guides.emberjs.com/release/
- **Ember API Docs**: https://api.emberjs.com/ember/release
- **Ember CLI Docs**: https://cli.emberjs.com/release/
- **RFC Tracker**: https://rfcs.emberjs.com/
- **Ember Blog**: https://blog.emberjs.com/
- **Glimmer Component API**: https://api.emberjs.com/ember/release/modules/@glimmer%2Fcomponent
- **Tracked Properties Guide**: https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/
- **Ember Modifier Docs**: https://github.com/ember-modifier/ember-modifier
