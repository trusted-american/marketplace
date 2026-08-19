## @ember/owner

### `getOwner` — Get the Owner (DI Container)

**Import:** `import { getOwner } from '@ember/owner';`

**Signature:** `getOwner(obj: any): Owner | undefined`

**What it does:** Returns the owner (application instance / DI container) associated with
the given object. Used to look up services or perform manual dependency injection in
non-standard contexts.

**When to use:**
- Inside utility classes that need access to services
- When building framework-level abstractions
- In tests to look up services from the container

**A3 pattern:**
```ts
import { getOwner } from '@ember/owner';

class EmployeeExporter {
  constructor(context: object) {
    const owner = getOwner(context);
    this.store = owner!.lookup('service:store');
    this.intl = owner!.lookup('service:intl');
  }
}

// Usage in a component:
@action
export() {
  const exporter = new EmployeeExporter(this);
  exporter.run();
}
```

### `setOwner` — Set the Owner on an Object

**Import:** `import { setOwner } from '@ember/owner';`

**Signature:** `setOwner(obj: any, owner: Owner): void`

**What it does:** Associates an owner with an object, enabling it to participate in Ember's
DI system. Used when constructing objects outside the container that still need service access.

**A3 pattern:**
```ts
import { getOwner, setOwner } from '@ember/owner';

class CustomValidator {
  @service declare intl: IntlService;

  constructor(owner: Owner) {
    setOwner(this, owner);
  }
}

// In a component:
get validator() {
  return new CustomValidator(getOwner(this)!);
}
```

**Common mistakes:**
- Forgetting to call `setOwner` and then wondering why `@service` injections are undefined.
- Using `getOwner` in module-scope code (outside a class) where there is no owner context.

---
