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
