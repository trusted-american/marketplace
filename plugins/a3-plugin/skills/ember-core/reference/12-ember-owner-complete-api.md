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
