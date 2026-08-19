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
