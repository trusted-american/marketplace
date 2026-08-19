## @ember/service

### `service` — Service Injection Decorator

**Import:** `import { service } from '@ember/service';` (Ember 4.x+)
**Legacy import:** `import { inject as service } from '@ember/service';` (Ember 3.x)

**What it does:** Injects a singleton service instance into a component, route, controller,
or other service. The service is lazily instantiated on first access.

**JavaScript signature:**
```ts
class MyComponent extends Component {
  @service declare router: RouterService;
  @service declare store: StoreService;
  @service('flash-messages') declare flashMessages: FlashMessageService;
}
```

**Key details:**
- Without arguments, the service name is derived from the property name (camelCase to dash-case).
- With a string argument, that explicit service name is used.
- The `declare` keyword tells TypeScript the property exists but is not initialized in the
  constructor (Ember's DI handles it).

**Most commonly injected services in A3:**

| Service | Usage | Import |
|---------|-------|--------|
| `store` | Ember Data / Warp Drive model operations | Built-in |
| `router` | Navigation, URL reading | `@ember/routing` |
| `session` | Auth state, current user, permissions | Custom |
| `flash-messages` | Toast notifications | `ember-cli-flash` |
| `intl` | Internationalization strings | `ember-intl` |
| `firestore` | Cloud Firestore adapter service | Custom |
| `intercom` | Intercom chat integration | Custom |
| `current-user` | Resolved user model with permissions | Custom |
| `algolia` | Search service | Custom |

**A3 service injection patterns:**

Typical component with multiple services:
```gts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import type RouterService from '@ember/routing/router-service';
import type SessionService from 'a3/services/session';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';

export default class EmployeeActions extends Component {
  @service declare router: RouterService;
  @service declare session: SessionService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  @action
  async deleteEmployee() {
    if (!this.session.hasPermission('employees.delete')) {
      this.flashMessages.danger('You do not have permission to delete employees.');
      return;
    }
    // ... deletion logic
    this.router.transitionTo('employees.index');
  }
}
```

Service-to-service injection:
```ts
// app/services/notification-manager.ts
import Service from '@ember/service';
import { service } from '@ember/service';

export default class NotificationManager extends Service {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;

  success(translationKey: string) {
    this.flashMessages.success(this.intl.t(translationKey));
  }
}
```

**Common mistakes:**
- Injecting services in template-only components — services require a class-backed component.
- Misspelling service names — this produces a runtime error, not a build error.
- Using `@service` in utility functions — services are only available in Ember's DI container
  (components, routes, controllers, other services).

---
