---
name: ember-core
description: Deep Ember.js 6.x Octane reference — routing, services, dependency injection, lifecycle, reactivity, GJS/GTS authoring, and modern patterns
version: 0.1.0
---

# Ember.js Core Reference (Octane / v6.x)

## Ember Octane Paradigm

Ember Octane (the current edition) is built on:
- **Native JavaScript classes** (not Ember.Object)
- **Tracked properties** (not computed properties)
- **Glimmer components** (not classic Ember components)
- **Decorators** (@tracked, @action, @service)
- **Template-tag components** (GTS/GJS format)

## Routing

### Route Definition
```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type StoreService from 'a3/services/store';

export default class MyRoute extends Route {
  @service declare store: StoreService;

  // Model hook — loads data for the route
  async model(params: { id: string }) {
    return this.store.findRecord('my-model', params.id);
  }

  // Before model — auth checks, redirects
  async beforeModel(transition: Transition) {
    if (!this.session.isAuthenticated) {
      transition.abort();
      this.router.transitionTo('login');
    }
  }

  // After model — post-load processing
  afterModel(model: MyModel) {
    // Set up side effects after data loads
  }

  // Setup controller — pass data to controller
  setupController(controller: Controller, model: MyModel) {
    super.setupController(controller, model);
    controller.set('additionalData', someData);
  }

  // Reset controller — clean up on exit
  resetController(controller: Controller, isExiting: boolean) {
    if (isExiting) {
      controller.set('search', '');
    }
  }
}
```

### Router Map (app/router.ts)
```typescript
import EmberRouter from '@ember/routing/router';
import config from 'a3/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('login');
  this.route('authenticated', { path: '/a3' }, function () {
    this.route('clients', function () {
      this.route('client', { path: '/:client_id' }, function () {
        this.route('enrollments');
        this.route('files');
      });
      this.route('new');
    });
  });
  this.route('admin', function () {
    // admin routes
  });
});
```

### Query Parameters
```typescript
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class MyController extends Controller {
  queryParams = ['search', 'status', 'page'];

  @tracked search = '';
  @tracked status = 'all';
  @tracked page = 1;
}
```

### Link Navigation
```gts
import { LinkTo } from '@ember/routing';

<template>
  <LinkTo @route="authenticated.clients.client" @model={{@client.id}}>
    {{@client.name}}
  </LinkTo>
</template>
```

## Services (Dependency Injection)

### Declaring a Service
```typescript
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class MyService extends Service {
  @tracked someState = false;

  doSomething() {
    this.someState = true;
  }
}
```

### Injecting a Service
```typescript
import { service } from '@ember/service';

export default class MyComponent extends Component {
  @service declare store: StoreService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare intl: IntlService;
  @service('flash-messages') declare flashMessages: FlashMessageService;
}
```

### Key A3 Services
- `store` — WarpDrive data store
- `session` — Firebase auth session
- `current-user` — Current user data
- `router` — Ember router service
- `intl` — Internationalization (ember-intl)
- `flash-messages` — Toast notifications (ember-cli-flash)

## Reactivity System (Tracked Properties)

### Basic Tracked State
```typescript
import { tracked } from '@glimmer/tracking';

export default class MyComponent extends Component {
  @tracked count = 0;
  @tracked name = '';
  @tracked items: string[] = [];

  // Getters that depend on tracked properties are auto-tracked
  get doubleCount() {
    return this.count * 2;
  }

  @action
  increment() {
    this.count++; // Triggers re-render of anything using this.count
  }

  @action
  addItem(item: string) {
    // IMPORTANT: Must create new array reference for tracking
    this.items = [...this.items, item];
  }
}
```

### tracked-built-ins
For deep tracking of arrays and objects:
```typescript
import { TrackedArray, TrackedObject } from 'tracked-built-ins';

export default class MyComponent extends Component {
  items = new TrackedArray<string>();
  data = new TrackedObject<Record<string, unknown>>();

  @action
  addItem(item: string) {
    this.items.push(item); // Automatically tracked, no new reference needed
  }
}
```

### Auto-tracking Rules
1. Tracked properties trigger re-renders when set
2. Getters that read tracked properties are auto-tracked
3. Arrays/objects must be replaced (new reference) unless using tracked-built-ins
4. Services with tracked properties work across the entire app

## Actions

```typescript
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

export default class MyComponent extends Component {
  @action
  handleClick(event: Event) {
    // Handle the event
  }

  @action
  handleItemClick(item: Item) {
    // Handle item-specific action
  }

  <template>
    <button type="button" {{on "click" this.handleClick}}>Click me</button>
    {{#each @items as |item|}}
      <button type="button" {{on "click" (fn this.handleItemClick item)}}>{{item.name}}</button>
    {{/each}}
  </template>
}
```

## Template Syntax (GTS)

### Conditionals
```gts
{{#if condition}}...{{/if}}
{{#if condition}}...{{else}}...{{/if}}
{{#if condition}}...{{else if other}}...{{else}}...{{/if}}
{{#unless condition}}...{{/unless}}
```

### Iteration
```gts
{{#each @items as |item index|}}
  <div>{{index}}: {{item.name}}</div>
{{/each}}

{{#each-in @object as |key value|}}
  <div>{{key}}: {{value}}</div>
{{/each-in}}
```

### Yielding (Block Components)
```gts
// Parent component
<template>
  <div class="wrapper">
    {{yield this.someData}}
  </div>
</template>

// Usage
<MyWrapper as |data|>
  <p>{{data}}</p>
</MyWrapper>
```

### Named Blocks
```gts
// Component definition
<template>
  <div class="card">
    <div class="card-header">{{yield to="header"}}</div>
    <div class="card-body">{{yield to="body"}}</div>
  </div>
</template>

// Usage
<Card>
  <:header>My Title</:header>
  <:body>My Content</:body>
</Card>
```

### Splattributes
```gts
<template>
  <div class="my-component" ...attributes>
    {{! ...attributes spreads all HTML attributes from the invocation site }}
  </div>
</template>
```

## Modifiers

### Built-in: {{on}}
```gts
import { on } from '@ember/modifier';
<button {{on "click" this.handleClick}}>Click</button>
```

### Custom Modifiers
```typescript
import { modifier } from 'ember-modifier';

const autofocus = modifier((element: HTMLElement) => {
  element.focus();
});

export default autofocus;
```

### Third-party: ember-autoresize-modifier
```gts
import autoresize from 'ember-autoresize-modifier';
<textarea {{autoresize}}></textarea>
```

## Helpers

### Built-in Helpers
```gts
{{concat "Hello" " " "World"}}       {{! String concatenation }}
{{if condition "yes" "no"}}           {{! Inline conditional }}
{{unless condition "fallback"}}       {{! Inline unless }}
{{fn this.method arg1 arg2}}          {{! Partial application }}
{{hash key1="value1" key2="value2"}}  {{! Create object }}
{{array "a" "b" "c"}}                 {{! Create array }}
{{get @model "propertyName"}}         {{! Dynamic property access }}
{{let (compute-something) as |result|}} {{! Local variable binding }}
```

### ember-truth-helpers
```gts
{{and a b}}
{{or a b}}
{{not a}}
{{eq a b}}
{{not-eq a b}}
{{gt a b}}
{{gte a b}}
{{lt a b}}
{{lte a b}}
```

## Loading & Error Substates

### Route Loading Template
```gts
// app/templates/authenticated/my-feature/loading.gts
<template>
  <div class="d-flex justify-content-center py-5">
    <div class="spinner-border" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
</template>
```

### Route Error Template
```gts
// app/templates/authenticated/my-feature/error.gts
<template>
  <div class="alert alert-danger">
    Something went wrong loading this page.
  </div>
</template>
```

## Ember Lifecycle

### Application Boot
1. `app/app.ts` — Application class initialization
2. `ember-load-initializers` — Runs all initializers and instance-initializers
3. `app/router.ts` — Route map defined
4. Route hierarchy resolved based on URL
5. Route model hooks fire in order (parent → child)
6. Templates render with loaded data

### Route Transition
1. `beforeModel()` — Auth checks, redirects
2. `model()` — Data loading
3. `afterModel()` — Post-load processing
4. `setupController()` — Controller setup
5. Template renders
6. On exit: `resetController()` fires

### Component Lifecycle
1. `constructor()` — Initial setup (args available)
2. Template renders
3. `willDestroy()` — Cleanup (remove listeners, cancel tasks)

## Further Investigation

- **Ember Guides**: https://guides.emberjs.com/release/
- **Ember API Docs**: https://api.emberjs.com/ember/release
- **Ember CLI Docs**: https://cli.emberjs.com/release/
- **RFC Tracker**: https://rfcs.emberjs.com/
- **Ember Blog**: https://blog.emberjs.com/
