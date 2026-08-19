## Combining Helpers — Complex Conditions

The real power of ember-truth-helpers emerges when combining them into complex expressions.

### Pattern: Multi-condition visibility

```gts
import { and, or, not, eq, gt } from 'ember-truth-helpers';

<template>
  {{! Show the action panel when:
      - User is admin OR (user is manager AND owns this department)
      - AND the employee is active
      - AND there are pending items }}
  {{#if (and
    (or
      (eq @currentUser.role "admin")
      (and (eq @currentUser.role "manager") (eq @currentUser.departmentId @employee.departmentId))
    )
    (eq @employee.status "active")
    (gt @pendingItems.length 0)
  )}}
    <ActionPanel @employee={{@employee}} @items={{@pendingItems}} />
  {{/if}}
</template>
```

### Pattern: Ternary-like conditional classes

```gts
<template>
  <div class={{if (and @isActive (not @isDisabled)) "active" (if @isDisabled "disabled" "inactive")}}>
    {{yield}}
  </div>
</template>
```

### Pattern: Show/hide with fallback content

```gts
<template>
  {{#if (and @employee (not (isEmpty @employee.name)))}}
    <h2>{{@employee.name}}</h2>
  {{else}}
    <h2 class="text-muted">Unnamed Employee</h2>
  {{/if}}
</template>
```

### Pattern: Form validation indicators

```gts
<template>
  <div class={{if (and @isDirty (not @isValid)) "field-error" (if @isValid "field-valid" "field-default")}}>
    <label>{{@label}}</label>
    <input value={{@value}} {{on "input" @onChange}} />
    {{#if (and @isDirty (not @isValid))}}
      <span class="error-message">{{@errorMessage}}</span>
    {{/if}}
  </div>
</template>
```

### Pattern: Permission-gated actions

```gts
<template>
  <div class="employee-actions">
    {{#if (and (or (eq @role "admin") (eq @role "hr")) (not @employee.isArchived))}}
      <button {{on "click" (fn @onAction "edit")}}>Edit</button>
    {{/if}}

    {{#if (and (eq @role "admin") (not-eq @employee.id @currentUser.id))}}
      <button {{on "click" (fn @onAction "delete")}}>Delete</button>
    {{/if}}

    {{#if (and (not (eq @employee.status "terminated")) (gte @employee.yearsOfService 1))}}
      <button {{on "click" (fn @onAction "promote")}}>Promote</button>
    {{/if}}
  </div>
</template>
```

---
