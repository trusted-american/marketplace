## Boolean Helpers

### `and` — Logical AND

**Template signature:**
```hbs
{{and value1 value2 ...}}
```

**Behavior:** Returns the last truthy value if ALL arguments are truthy, or the first falsy
value encountered. This follows JavaScript's `&&` semantics exactly.

**Return values (important):**
- `{{and true true}}` returns `true`
- `{{and "hello" "world"}}` returns `"world"` (last truthy value)
- `{{and false true}}` returns `false` (first falsy value)
- `{{and null "hello"}}` returns `null` (first falsy value)
- `{{and 0 "hello"}}` returns `0` (first falsy value — 0 is falsy)
- `{{and "" "hello"}}` returns `""` (first falsy value — empty string is falsy)

**A3 patterns:**

Show element only when multiple conditions are met:
```gts
import { and } from 'ember-truth-helpers';

<template>
  {{#if (and @isAuthenticated @hasPermission @isActive)}}
    <AdminPanel />
  {{/if}}
</template>
```

Conditionally enable a button:
```gts
<template>
  <button
    disabled={{not (and @isValid @isDirty (not @isSaving))}}
    {{on "click" @onSave}}
  >
    Save
  </button>
</template>
```

Compound condition for visibility:
```gts
<template>
  {{#if (and @employee.isActive @employee.department (not @employee.isOnLeave))}}
    <AssignTaskButton @employee={{@employee}} />
  {{/if}}
</template>
```

Two-argument `and` in class binding:
```gts
<template>
  <div class={{if (and @isSelected @isEditable) "selected-editable" "default"}}>
    {{yield}}
  </div>
</template>
```

---

### `or` — Logical OR

**Template signature:**
```hbs
{{or value1 value2 ...}}
```

**Behavior:** Returns the first truthy value encountered, or the last falsy value if none
are truthy. This follows JavaScript's `||` semantics exactly.

**Return values:**
- `{{or false true}}` returns `true`
- `{{or null "fallback"}}` returns `"fallback"`
- `{{or "" "default"}}` returns `"default"`
- `{{or 0 42}}` returns `42`
- `{{or false null undefined}}` returns `undefined` (last falsy value)

**A3 patterns:**

Fallback display value:
```gts
<template>
  <span>{{or @employee.nickname @employee.firstName "Unknown"}}</span>
</template>
```

Show section if any condition is true:
```gts
<template>
  {{#if (or @canEdit @canDelete @canArchive)}}
    <ActionsMenu>
      {{#if @canEdit}}<EditButton />{{/if}}
      {{#if @canDelete}}<DeleteButton />{{/if}}
      {{#if @canArchive}}<ArchiveButton />{{/if}}
    </ActionsMenu>
  {{/if}}
</template>
```

Default CSS class:
```gts
<template>
  <div class={{or @customClass "default-container"}}>
    {{yield}}
  </div>
</template>
```

Conditional route based on role:
```gts
<template>
  {{#if (or (eq @role "admin") (eq @role "hr"))}}
    <ConfidentialSection />
  {{/if}}
</template>
```

---

### `not` — Logical NOT

**Template signature:**
```hbs
{{not value}}
```

**Behavior:** Returns `true` if the value is falsy, `false` if truthy. Equivalent to
JavaScript's `!` operator.

**Falsy values:** `false`, `null`, `undefined`, `0`, `""`, `NaN`

**A3 patterns:**

Invert a boolean for disabled state:
```gts
<template>
  <button disabled={{not @isValid}} {{on "click" @onSubmit}}>
    Submit
  </button>
</template>
```

Show empty state:
```gts
<template>
  {{#if (not @employees.length)}}
    <EmptyState @message="No employees found" />
  {{else}}
    <EmployeeTable @data={{@employees}} />
  {{/if}}
</template>
```

Toggle inverse class:
```gts
<template>
  <div class={{if (not @isCollapsed) "expanded" "collapsed"}}>
    {{yield}}
  </div>
</template>
```

Double negation for boolean coercion (rare but valid):
```gts
<template>
  {{! Ensures a strict boolean, not a truthy/falsy value }}
  <ToggleSwitch @checked={{not (not @value)}} />
</template>
```

---
