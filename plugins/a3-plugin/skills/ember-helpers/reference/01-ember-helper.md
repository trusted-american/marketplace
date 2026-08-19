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
