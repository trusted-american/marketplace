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
