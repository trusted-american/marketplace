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
