---
name: ember-helpers
description: Deep reference for all Ember.js helper imports used in A3 — @ember/helper (fn, hash, array, get, concat), @ember/modifier (on), @ember/object (action), @ember/service, @ember/routing, @ember/string, and @ember/owner
version: 0.1.0
---

# Ember Helpers — Complete A3 Reference

This is the most imported category in the A3 codebase. 498 files import from `@ember/helper`,
457 from `@ember/service`, 200 from `@ember/modifier`, 192 from `@ember/object`, and 24 from
`@ember/routing`. This reference covers every function in exhaustive detail.

---

## @ember/helper

### `fn` — Partial Application Helper

**Import:** `import { fn } from '@ember/helper';`

**What it does:** Creates a new function that partially applies arguments to an existing function.
The returned function, when called, invokes the original with the pre-applied arguments followed
by any additional arguments provided at call time.

**Template signature:**
```hbs
{{fn myFunction arg1 arg2 ...}}
```

**When to use:**
- Passing arguments to action handlers in templates
- Creating callbacks with pre-bound arguments for child components
- Binding loop iteration values to event handlers

**When NOT to use:**
- If no arguments need binding, pass the function reference directly
- For complex logic, define a dedicated method on the component class instead

**A3 patterns:**

Binding a model ID to a row click handler:
```gts
// app/components/employee-table.gts
import { fn } from '@ember/helper';

<template>
  {{#each @employees as |employee|}}
    <tr {{on "click" (fn @onSelect employee.id)}}>
      <td>{{employee.name}}</td>
    </tr>
  {{/each}}
</template>
```

Chaining with hash for complex event data:
```gts
<template>
  <Button {{on "click" (fn @onAction (hash type="approve" id=@model.id))}} />
</template>
```

Passing index from each loop:
```gts
<template>
  {{#each @items as |item index|}}
    <SortableItem @onReorder={{fn @onReorder index}} />
  {{/each}}
</template>
```

**Common mistakes:**
- Calling the function instead of referencing it: `{{fn (this.doThing) arg}}` is WRONG.
  Use `{{fn this.doThing arg}}`.
- Wrapping in extra parens when unnecessary: `{{on "click" (fn (this.save))}}` — the inner
  parens invoke `this.save` immediately. Write `{{on "click" (fn this.save)}}` or just
  `{{on "click" this.save}}` if no args.

---

### `hash` — Create POJO in Templates

**Import:** `import { hash } from '@ember/helper';`

**Template signature:**
```hbs
{{hash key1=value1 key2=value2 ...}}
```

**What it does:** Creates a plain JavaScript object from named key-value pairs directly in a
template. The resulting object is reactive — if any value is a tracked property, changes will
propagate.

**When to use:**
- Passing multiple related values as a single argument to a component
- Creating option objects inline for contextual components
- Grouping parameters for yield

**A3 patterns:**

Yielding grouped context from a provider component:
```gts
<template>
  {{yield (hash
    isOpen=this.isOpen
    toggle=this.toggle
    close=this.close
  )}}
</template>
```

Passing config to a form field:
```gts
<template>
  <FormField @config={{hash
    label="Employee Name"
    required=true
    maxLength=100
    placeholder="Enter full name"
  }} />
</template>
```

Combining with `fn` for rich event payloads:
```gts
<template>
  <Button {{on "click" (fn @onAction (hash type="delete" id=@record.id))}} />
</template>
```

**Common mistakes:**
- Attempting to use spread syntax — `hash` does not support `...obj` spreading.
- Using `hash` to create objects in loops when a component class getter would be more performant.

---

### `array` — Create Array in Templates

**Import:** `import { array } from '@ember/helper';`

**Template signature:**
```hbs
{{array item1 item2 item3 ...}}
```

**What it does:** Creates a JavaScript array from positional arguments in a template.

**When to use:**
- Passing a small list of static values to a component
- Creating option sets inline for select dropdowns
- Providing fallback values

**A3 patterns:**

Inline options for a dropdown:
```gts
<template>
  <PowerSelect
    @options={{array "Active" "Inactive" "Pending" "Archived"}}
    @selected={{@status}}
    @onChange={{@onStatusChange}}
  as |option|>
    {{option}}
  </PowerSelect>
</template>
```

Passing allowed roles:
```gts
<template>
  <RoleGuard @allowedRoles={{array "admin" "manager" "hr"}} />
</template>
```

**Common mistakes:**
- Using `array` for large or dynamic lists — use a getter on the class instead.
- Forgetting that `array` creates a new array instance on every render cycle.

---

### `get` — Property Lookup Helper

**Import:** `import { get } from '@ember/helper';`

**Template signature:**
```hbs
{{get object "propertyName"}}
{{get object dynamicKey}}
```

**What it does:** Accesses a property on an object using a string key. Essential for dynamic
property access where the key is not known at template-authoring time.

**When to use:**
- Accessing properties with dynamic keys (e.g., column-based table rendering)
- Looking up values from translation objects
- Accessing deeply nested properties with dot-path strings

**A3 patterns:**

Dynamic column rendering in data tables:
```gts
<template>
  {{#each @columns as |column|}}
    <td>{{get @row column.key}}</td>
  {{/each}}
</template>
```

Accessing nested paths:
```gts
<template>
  <span>{{get @employee "department.name"}}</span>
</template>
```

Dynamic field display based on configuration:
```gts
<template>
  {{#each @visibleFields as |field|}}
    <div class="field">
      <label>{{field.label}}</label>
      <span>{{get @model field.path}}</span>
    </div>
  {{/each}}
</template>
```

**Common mistakes:**
- Using `get` when the property name is static: `{{get this.model "name"}}` should just be
  `{{this.model.name}}`.
- Forgetting that `get` does NOT work with array indices like `get myArray "0"` reliably
  across all Ember versions.

---

### `concat` — String Concatenation Helper

**Import:** `import { concat } from '@ember/helper';`

**Template signature:**
```hbs
{{concat str1 str2 str3 ...}}
```

**What it does:** Joins all positional arguments into a single string using simple concatenation
(no separator).

**When to use:**
- Building CSS class strings dynamically
- Constructing IDs or aria attributes
- Combining static text with dynamic values

**A3 patterns:**

Building element IDs:
```gts
<template>
  <div id={{concat "section-" @sectionId}}>
    <input id={{concat "input-" @fieldName}} />
  </div>
</template>
```

Dynamic CSS classes:
```gts
<template>
  <div class={{concat "badge badge-" @status}}>
    {{@label}}
  </div>
</template>
```

Constructing route paths:
```gts
<template>
  <LinkTo @route={{concat "admin." @subRoute}}>
    {{@linkText}}
  </LinkTo>
</template>
```

**Common mistakes:**
- Using `concat` for complex class logic — use a getter or a dedicated class helper instead.
- Forgetting spaces: `{{concat "hello" "world"}}` yields `"helloworld"`, not `"hello world"`.
  Use `{{concat "hello" " " "world"}}`.

---

## @ember/modifier

### `on` — DOM Event Listener Modifier

**Import:** `import { on } from '@ember/modifier';`

**Template signature:**
```hbs
<element {{on "eventName" this.handler}} />
<element {{on "eventName" (fn this.handler arg)}} />
```

**What it does:** Attaches a DOM event listener to the element. The listener is automatically
removed when the element is destroyed. This is the standard way to handle DOM events in
modern Ember / Glimmer templates.

**Supported events (commonly used in A3):**
- Mouse: `click`, `dblclick`, `mousedown`, `mouseup`, `mouseenter`, `mouseleave`, `mousemove`
- Keyboard: `keydown`, `keyup`, `keypress`
- Form: `input`, `change`, `submit`, `focus`, `blur`, `focusin`, `focusout`
- Touch: `touchstart`, `touchmove`, `touchend`
- Drag: `dragstart`, `dragover`, `dragend`, `drop`
- Scroll: `scroll`
- Clipboard: `copy`, `paste`

**A3 patterns:**

Basic click handler:
```gts
import { on } from '@ember/modifier';

<template>
  <button {{on "click" @onClick}} type="button">
    {{@label}}
  </button>
</template>
```

Form submission with prevention:
```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';

export default class MyForm extends Component {
  handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // process form
  };

  <template>
    <form {{on "submit" this.handleSubmit}}>
      {{yield}}
      <button type="submit">Save</button>
    </form>
  </template>
}
```

Keyboard shortcuts:
```gts
<template>
  <div {{on "keydown" this.handleKeyDown}} tabindex="0">
    {{yield}}
  </div>
</template>
```

Multiple events on the same element:
```gts
<template>
  <div
    {{on "mouseenter" this.showTooltip}}
    {{on "mouseleave" this.hideTooltip}}
    {{on "focus" this.showTooltip}}
    {{on "blur" this.hideTooltip}}
  >
    {{@content}}
  </div>
</template>
```

**Event modifier options:**
The `on` modifier accepts an options hash as the third argument:
```hbs
{{on "click" this.handler capture=true}}
{{on "scroll" this.handleScroll passive=true}}
{{on "click" this.handler once=true}}
```

**Common mistakes:**
- Using `{{action}}` modifier instead of `{{on}}` — `action` is legacy, always use `on`.
- Forgetting `event.preventDefault()` on form submits and link clicks.
- Not using `passive: true` on scroll/touch handlers, which hurts performance.

---

## @ember/object

### `action` — Bind Action Context

**Import:** `import { action } from '@ember/object';`

**What it does:** A decorator that binds a method's `this` context to the class instance.
This ensures the method works correctly when passed as a callback to child components or
DOM event handlers.

**JavaScript signature:**
```ts
class MyComponent extends Component {
  @action
  handleClick() {
    // `this` is guaranteed to be the component instance
  }
}
```

**When to use:**
- Any method that will be passed to a child component as an argument
- Any method used with the `{{on}}` modifier
- Any method used with `{{fn}}`

**When NOT to use:**
- Arrow function class fields already have bound context — `@action` is redundant on them
- Private methods that are only called internally via `this.methodName()`

**A3 patterns:**

Standard action pattern in A3 components:
```gts
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class EmployeeFilter extends Component {
  @tracked searchTerm = '';

  @action
  updateSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.args.onSearch?.(this.searchTerm);
  }

  @action
  clearSearch() {
    this.searchTerm = '';
    this.args.onSearch?.('');
  }

  <template>
    <div class="filter-bar">
      <input
        value={{this.searchTerm}}
        {{on "input" this.updateSearch}}
      />
      <button {{on "click" this.clearSearch}}>Clear</button>
    </div>
  </template>
}
```

**Arrow functions as alternative (also common in A3):**
```gts
export default class EmployeeFilter extends Component {
  @tracked searchTerm = '';

  updateSearch = (event: Event) => {
    this.searchTerm = (event.target as HTMLInputElement).value;
  };
}
```

Both patterns are used in A3. The `@action` decorator is the traditional approach;
arrow function fields are becoming more common in newer code.

**Common mistakes:**
- Forgetting `@action` and then getting `this is undefined` errors in callbacks.
- Using `@action` on getters — it only applies to methods.

---

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

## @ember/routing

### `LinkTo` — Route Link Component

**Import:** `import { LinkTo } from '@ember/routing';`

**Template signature:**
```hbs
<LinkTo @route="routeName" @model={{model}}>Link Text</LinkTo>
<LinkTo @route="routeName" @models={{array model1 model2}}>Link Text</LinkTo>
<LinkTo @route="routeName" @query={{hash key=value}}>Link Text</LinkTo>
```

**Key arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `@route` | `string` | Dot-separated route name |
| `@model` | `any` | Single dynamic segment value |
| `@models` | `any[]` | Multiple dynamic segment values |
| `@query` | `object` | Query parameters |
| `@disabled` | `boolean` | Disables the link |
| `@current-when` | `string` | Override active state matching |
| `@activeClass` | `string` | CSS class when active (default: `"active"`) |

**A3 patterns:**

Simple route link:
```gts
<template>
  <LinkTo @route="employees.index">All Employees</LinkTo>
</template>
```

Link with dynamic segment:
```gts
<template>
  <LinkTo @route="employees.employee" @model={{@employee.id}}>
    {{@employee.name}}
  </LinkTo>
</template>
```

Nested route with multiple segments:
```gts
<template>
  <LinkTo @route="admin.companies.company.employees" @models={{array @companyId @departmentId}}>
    View Employees
  </LinkTo>
</template>
```

Link with query params:
```gts
<template>
  <LinkTo @route="employees.index" @query={{hash status="active" page=1}}>
    Active Employees
  </LinkTo>
</template>
```

### `RouterService` — Programmatic Navigation

**Import (type):** `import type RouterService from '@ember/routing/router-service';`

**Key methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `transitionTo` | `(routeName, ...models, options?)` | Navigate to route |
| `replaceWith` | `(routeName, ...models, options?)` | Navigate without history entry |
| `isActive` | `(routeName, ...models, options?)` | Check if route is active |
| `urlFor` | `(routeName, ...models, options?)` | Generate URL string |
| `currentRouteName` | `string` (property) | Current route dot-path |
| `currentURL` | `string` (property) | Current URL string |
| `on` | `(eventName, callback)` | Listen to route events |

**A3 navigation patterns:**

Transition after save:
```ts
@service declare router: RouterService;

@action
async saveEmployee() {
  await this.args.model.save();
  this.router.transitionTo('employees.employee', this.args.model.id);
}
```

Transition with query params:
```ts
this.router.transitionTo('employees.index', { queryParams: { status: 'active' } });
```

Conditional navigation:
```ts
if (this.router.isActive('admin')) {
  this.router.transitionTo('admin.dashboard');
} else {
  this.router.transitionTo('dashboard');
}
```

Route change listener:
```ts
constructor(owner: unknown, args: Args) {
  super(owner, args);
  this.router.on('routeDidChange', this.handleRouteChange);
}

willDestroy() {
  super.willDestroy();
  this.router.off('routeDidChange', this.handleRouteChange);
}
```

---

## @ember/string

**Import:** `import { htmlSafe, dasherize, camelize, capitalize, classify, decamelize, underscore, w } from '@ember/string';`

> Note: `@ember/string` is a standalone package in Ember 4.x+. It must be installed separately.

### `htmlSafe`

**Signature:** `htmlSafe(str: string): SafeString`

Marks a string as safe for raw HTML rendering. The template will NOT escape the content.

```ts
import { htmlSafe } from '@ember/string';

get formattedDescription() {
  return htmlSafe(this.args.model.richTextHtml);
}
```

**DANGER:** Never use `htmlSafe` on user-supplied input without sanitization. Always sanitize
with DOMPurify or equivalent first.

A3 pattern for rendering rich text from Firestore:
```ts
import { htmlSafe } from '@ember/string';
import DOMPurify from 'dompurify';

get safeHtml() {
  return htmlSafe(DOMPurify.sanitize(this.args.content));
}
```

### `dasherize`

**Signature:** `dasherize(str: string): string`

Converts camelCase or underscored strings to dash-case.

```ts
dasherize('employeeName');    // "employee-name"
dasherize('employee_name');   // "employee-name"
dasherize('EmployeeName');    // "employee-name"
```

### `camelize`

**Signature:** `camelize(str: string): string`

Converts dash-case or underscored strings to camelCase.

```ts
camelize('employee-name');    // "employeeName"
camelize('employee_name');    // "employeeName"
camelize('Employee name');    // "employeeName"
```

### `capitalize`

**Signature:** `capitalize(str: string): string`

Capitalizes the first letter of a string.

```ts
capitalize('employee');       // "Employee"
capitalize('hello world');    // "Hello world"
```

### `classify`

**Signature:** `classify(str: string): string`

Converts to UpperCamelCase (PascalCase).

```ts
classify('employee-name');    // "EmployeeName"
classify('employee_name');    // "EmployeeName"
classify('employee name');    // "EmployeeName"
```

### `decamelize`

**Signature:** `decamelize(str: string): string`

Converts camelCase to underscore_case.

```ts
decamelize('employeeName');   // "employee_name"
decamelize('innerHTML');      // "inner_html"
```

### `underscore`

**Signature:** `underscore(str: string): string`

Converts any casing to underscore_case.

```ts
underscore('EmployeeName');   // "employee_name"
underscore('employee-name');  // "employee_name"
```

### `w`

**Signature:** `w(str: string): string[]`

Splits a string on whitespace into an array of words.

```ts
w('one two three');           // ["one", "two", "three"]
w('  spaced   out  ');       // ["spaced", "out"]
```

A3 pattern — defining CSS class lists:
```ts
import { w } from '@ember/string';
const STATUS_CLASSES = w('active inactive pending archived');
```

---

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

## Quick Import Reference

```ts
// @ember/helper — template helpers
import { fn, hash, array, get, concat } from '@ember/helper';

// @ember/modifier — DOM modifiers
import { on } from '@ember/modifier';

// @ember/object — decorators
import { action } from '@ember/object';

// @ember/service — dependency injection
import { service } from '@ember/service';

// @ember/routing — navigation
import { LinkTo } from '@ember/routing';
import type RouterService from '@ember/routing/router-service';

// @ember/string — string utilities
import { htmlSafe, dasherize, camelize, capitalize, classify, decamelize, underscore, w } from '@ember/string';

// @ember/owner — DI container access
import { getOwner, setOwner } from '@ember/owner';
```

---

## Combining Helpers — Advanced Template Patterns

Helpers compose naturally in Ember templates via subexpressions (parentheses):

```gts
<template>
  {{! Nested: fn + hash + array + concat }}
  <DataTable
    @onRowAction={{fn @onAction (hash
      type="edit"
      columns=(array "name" "email" "department")
      prefix=(concat @tableName "-row")
    )}}
  />

  {{! Dynamic property from computed key }}
  <span>{{get @model (concat "field" @index)}}</span>

  {{! Conditional event binding with fn }}
  {{#if @editable}}
    <div {{on "dblclick" (fn this.editField @fieldName)}}>
      {{get @model @fieldName}}
    </div>
  {{/if}}
</template>
```

---

## TypeScript Considerations

In `.gts` files with Glint, template helpers are type-checked. Ensure:

1. Functions passed to `fn` match expected callback signatures.
2. `get` returns `unknown` — cast or narrow the type when using the result.
3. `hash` returns a POJO — define an interface for the shape if passing to typed components.
4. Services use `declare` keyword: `@service declare myService: MyServiceType;`
5. `RouterService` import is a type import: `import type RouterService from '@ember/routing/router-service';`

---

## Migration Notes

| Legacy | Modern | Notes |
|--------|--------|-------|
| `{{action "name"}}` | `{{on "click" this.name}}` | Modifier form |
| `(action this.name)` | `(fn this.name)` or direct ref | Subexpression form |
| `inject as service` | `service` | Direct import in Ember 4.x+ |
| `this.transitionToRoute()` | `this.router.transitionTo()` | Routes/Controllers |
| `Ember.String.dasherize()` | `import { dasherize } from '@ember/string'` | Module import |
