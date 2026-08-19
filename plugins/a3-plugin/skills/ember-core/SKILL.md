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

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-routing.md` | 2. Routing |
| `reference/03-router-service-complete-api.md` | 3. Router Service — Complete API |
| `reference/04-services-dependency-injection-complete-coverage.md` | 4. Services (Dependency Injection) — Complete Coverage |
| `reference/05-reactivity-system-tracked-properties.md` | 5. Reactivity System (Tracked Properties) |
| `reference/07-template-syntax-gts-gjs.md` | 7. Template Syntax (GTS/GJS) |
| `reference/08-modifiers.md` | 8. Modifiers |
| `reference/09-ember-object-utilities-legacy-aware.md` | 9. @ember/object Utilities (Legacy-aware) |
| `reference/10-ember-runloop-complete-api.md` | 10. @ember/runloop — Complete API |
| `reference/11-ember-destroyable-complete-api.md` | 11. @ember/destroyable — Complete API |
| `reference/12-ember-owner-complete-api.md` | 12. @ember/owner — Complete API |
| `reference/13-initializers-and-instance-initializers.md` | 13. Initializers and Instance Initializers |
| `reference/14-component-lifecycle-glimmer.md` | 14. Component Lifecycle (Glimmer) |
| `reference/15-ember-template-compilation-helpers.md` | 15. @ember/template Compilation Helpers |
| `reference/17-error-handling-patterns.md` | 17. Error Handling Patterns |
| `reference/20-quick-reference-tables.md` | 20. Quick Reference Tables |

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
## 21. Further Investigation

- **Ember Guides**: https://guides.emberjs.com/release/
- **Ember API Docs**: https://api.emberjs.com/ember/release
- **Ember CLI Docs**: https://cli.emberjs.com/release/
- **RFC Tracker**: https://rfcs.emberjs.com/
- **Ember Blog**: https://blog.emberjs.com/
- **Glimmer Component API**: https://api.emberjs.com/ember/release/modules/@glimmer%2Fcomponent
- **Tracked Properties Guide**: https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/
- **Ember Modifier Docs**: https://github.com/ember-modifier/ember-modifier
