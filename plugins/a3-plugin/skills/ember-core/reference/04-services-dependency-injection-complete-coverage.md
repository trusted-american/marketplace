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
