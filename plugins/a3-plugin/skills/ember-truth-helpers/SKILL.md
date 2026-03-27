---
name: ember-truth-helpers
description: Complete ember-truth-helpers reference — used in 240 A3 files. Boolean, comparison, and collection helpers for templates
version: 0.1.0
---

# ember-truth-helpers — Complete A3 Reference

Used in 240 A3 files. This addon provides boolean logic, comparison, and collection helpers
that are essential for template-level conditional rendering. These helpers eliminate the need
for computed properties or getters for simple boolean expressions.

**Install:** `ember install ember-truth-helpers`
**Import (GTS):** `import { and, or, not, eq, notEq, gt, gte, lt, lte, isArray, isEmpty, isEqual } from 'ember-truth-helpers';`

---

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

## Comparison Helpers

### `eq` — Strict Equality

**Template signature:**
```hbs
{{eq value1 value2}}
```

**Behavior:** Returns `true` if `value1 === value2` (strict equality). This does NOT perform
type coercion.

**A3 patterns:**

Conditional rendering based on status:
```gts
<template>
  {{#if (eq @employee.status "active")}}
    <ActiveBadge />
  {{else if (eq @employee.status "inactive")}}
    <InactiveBadge />
  {{else if (eq @employee.status "pending")}}
    <PendingBadge />
  {{/if}}
</template>
```

Active tab indicator:
```gts
<template>
  {{#each @tabs as |tab|}}
    <button
      class={{if (eq @activeTab tab.id) "tab-active" "tab-inactive"}}
      {{on "click" (fn @onTabChange tab.id)}}
    >
      {{tab.label}}
    </button>
  {{/each}}
</template>
```

Role-based UI:
```gts
<template>
  {{#if (eq @currentUser.role "admin")}}
    <AdminDashboard />
  {{else if (eq @currentUser.role "manager")}}
    <ManagerDashboard />
  {{else}}
    <EmployeeDashboard />
  {{/if}}
</template>
```

Highlighting selected row:
```gts
<template>
  {{#each @items as |item|}}
    <tr class={{if (eq item.id @selectedId) "row-selected" ""}}>
      <td>{{item.name}}</td>
    </tr>
  {{/each}}
</template>
```

**Common mistakes:**
- Comparing numbers from inputs (strings) to numeric values: `{{eq "5" 5}}` is `false`.
  Ensure consistent types.
- Comparing objects by reference: `{{eq obj1 obj2}}` checks reference identity, not deep equality.

---

### `not-eq` — Strict Inequality

**Template signature:**
```hbs
{{not-eq value1 value2}}
```

**GTS import name:** `notEq`

**Behavior:** Returns `true` if `value1 !== value2`. The inverse of `eq`.

**A3 patterns:**

Hide element for a specific status:
```gts
import { notEq } from 'ember-truth-helpers';

<template>
  {{#if (notEq @status "archived")}}
    <EditButton @onClick={{@onEdit}} />
  {{/if}}
</template>
```

Filter display:
```gts
<template>
  {{#each @employees as |employee|}}
    {{#if (notEq employee.status "terminated")}}
      <EmployeeRow @employee={{employee}} />
    {{/if}}
  {{/each}}
</template>
```

---

### `gt` — Greater Than

**Template signature:**
```hbs
{{gt value1 value2}}
```

**Behavior:** Returns `true` if `value1 > value2`.

**A3 patterns:**

Show count badge when items exist:
```gts
<template>
  {{#if (gt @notifications.length 0)}}
    <span class="badge">{{@notifications.length}}</span>
  {{/if}}
</template>
```

Pagination controls:
```gts
<template>
  {{#if (gt @totalPages 1)}}
    <PaginationControls @currentPage={{@page}} @totalPages={{@totalPages}} />
  {{/if}}
</template>
```

Warn on excessive count:
```gts
<template>
  {{#if (gt @overtimeHours 40)}}
    <WarningBanner @message="Overtime exceeds 40 hours" />
  {{/if}}
</template>
```

---

### `gte` — Greater Than or Equal

**Template signature:**
```hbs
{{gte value1 value2}}
```

**Behavior:** Returns `true` if `value1 >= value2`.

**A3 patterns:**

Minimum threshold check:
```gts
<template>
  {{#if (gte @employee.yearsOfService 5)}}
    <LongServiceAward />
  {{/if}}
</template>
```

Budget validation:
```gts
<template>
  <div class={{if (gte @spent @budget) "over-budget" "within-budget"}}>
    ${{@spent}} / ${{@budget}}
  </div>
</template>
```

---

### `lt` — Less Than

**Template signature:**
```hbs
{{lt value1 value2}}
```

**Behavior:** Returns `true` if `value1 < value2`.

**A3 patterns:**

Low inventory warning:
```gts
<template>
  {{#if (lt @stockLevel 10)}}
    <LowStockAlert />
  {{/if}}
</template>
```

Limit visible items:
```gts
<template>
  {{#each @items as |item index|}}
    {{#if (lt index 5)}}
      <ItemCard @item={{item}} />
    {{/if}}
  {{/each}}
  {{#if (gt @items.length 5)}}
    <button {{on "click" @showAll}}>Show {{@items.length}} more</button>
  {{/if}}
</template>
```

---

### `lte` — Less Than or Equal

**Template signature:**
```hbs
{{lte value1 value2}}
```

**Behavior:** Returns `true` if `value1 <= value2`.

**A3 patterns:**

Remaining allowance check:
```gts
<template>
  {{#if (lte @remainingPTO 0)}}
    <NoPTORemaining />
  {{else}}
    <span>{{@remainingPTO}} days remaining</span>
  {{/if}}
</template>
```

---

## Collection Helpers

### `is-array` — Array Type Check

**Template signature:**
```hbs
{{is-array value}}
```

**GTS import name:** `isArray`

**Behavior:** Returns `true` if the value is a JavaScript array (uses `Array.isArray`).

**A3 patterns:**

Handling polymorphic arguments — sometimes a component receives a single item or an array:
```gts
import { isArray } from 'ember-truth-helpers';

<template>
  {{#if (isArray @items)}}
    {{#each @items as |item|}}
      <ItemCard @item={{item}} />
    {{/each}}
  {{else}}
    <ItemCard @item={{@items}} />
  {{/if}}
</template>
```

Conditional rendering for multi-select vs single value:
```gts
<template>
  {{#if (isArray @selectedValues)}}
    <MultiValueDisplay @values={{@selectedValues}} />
  {{else}}
    <SingleValueDisplay @value={{@selectedValues}} />
  {{/if}}
</template>
```

---

### `is-empty` — Emptiness Check

**Template signature:**
```hbs
{{is-empty value}}
```

**GTS import name:** `isEmpty`

**Behavior:** Returns `true` if the value is `null`, `undefined`, an empty string `""`,
or an empty array `[]`. Uses Ember's `isEmpty` utility under the hood.

**Truthy (empty) cases:**
- `{{is-empty null}}` returns `true`
- `{{is-empty undefined}}` returns `true`
- `{{is-empty ""}}` returns `true`
- `{{is-empty (array)}}` returns `true` (empty array)

**Falsy (not empty) cases:**
- `{{is-empty "hello"}}` returns `false`
- `{{is-empty 0}}` returns `false` (0 is NOT empty)
- `{{is-empty false}}` returns `false` (false is NOT empty)

**A3 patterns:**

Empty state for lists:
```gts
import { isEmpty } from 'ember-truth-helpers';

<template>
  {{#if (isEmpty @employees)}}
    <EmptyState
      @icon="users"
      @title="No Employees"
      @message="Add your first employee to get started."
    />
  {{else}}
    <EmployeeList @employees={{@employees}} />
  {{/if}}
</template>
```

Show placeholder when field is empty:
```gts
<template>
  {{#if (isEmpty @employee.phone)}}
    <span class="text-muted">No phone number</span>
  {{else}}
    <a href="tel:{{@employee.phone}}">{{@employee.phone}}</a>
  {{/if}}
</template>
```

**Common mistakes:**
- `{{is-empty 0}}` is `false` — if you need to treat `0` as empty, use `{{not @value}}` or
  a custom helper.
- `{{is-empty false}}` is `false` — `false` is not considered "empty".

---

### `is-equal` — Deep Equality Check

**Template signature:**
```hbs
{{is-equal value1 value2}}
```

**GTS import name:** `isEqual`

**Behavior:** Returns `true` if the two values are equal. Uses Ember's `isEqual` utility,
which calls the `.isEqual()` method on objects that implement it, otherwise falls back to
strict equality (`===`).

**Difference from `eq`:**
- `eq` always uses `===`
- `is-equal` checks for an `isEqual()` method first, enabling custom comparison logic on
  Ember Objects and certain Ember Data types

**A3 patterns:**

Comparing Ember Data model instances:
```gts
import { isEqual } from 'ember-truth-helpers';

<template>
  {{#each @departments as |dept|}}
    <option selected={{isEqual dept @selectedDepartment}}>
      {{dept.name}}
    </option>
  {{/each}}
</template>
```

In practice, `eq` is far more common than `is-equal` in A3. Use `is-equal` only when
comparing Ember objects that define custom equality.

---

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

## GTS Import Patterns

In `.gts` files (Glimmer templates with strict mode), you must explicitly import each helper:

```gts
// Import individual helpers as needed
import { and, or, not, eq, notEq, gt, gte, lt, lte, isArray, isEmpty, isEqual } from 'ember-truth-helpers';

// Then use directly in template — no curly-brace subexpression needed for the import,
// but the helpers are used the same way in the template body.
<template>
  {{#if (and @isActive (not @isArchived))}}
    <ActiveContent />
  {{/if}}
</template>
```

**Important:** In `.gts` strict mode, helpers must be imported or they will cause a build error.
In classic `.hbs` templates, they are auto-resolved from the registry.

---

## Performance Considerations

1. **Helpers are re-evaluated on every render cycle** where their inputs change. For complex
   conditions that depend on many tracked properties, consider moving the logic to a getter
   on the component class.

2. **Deeply nested helper expressions** (4+ levels deep) become hard to read. Refactor to
   a getter:
   ```ts
   // Instead of: {{if (and (or (eq a b) (gt c d)) (not (isEmpty e))) ...}}
   get shouldShowPanel(): boolean {
     return (this.a === this.b || this.c > this.d) && !isEmpty(this.e);
   }
   ```

3. **Each helper invocation is a function call.** For hot paths rendered in large `{{#each}}`
   loops (100+ items), prefer a getter or pre-computed array.

---

## Truthiness Reference Table

| Value | `not` | `is-empty` | `eq` (to null) | Notes |
|-------|-------|------------|-----------------|-------|
| `true` | `false` | `false` | `false` | |
| `false` | `true` | `false` | `false` | `false` is NOT empty |
| `null` | `true` | `true` | `true` | |
| `undefined` | `true` | `true` | `false` | Strict equality |
| `0` | `true` | `false` | `false` | `0` is falsy but NOT empty |
| `""` | `true` | `true` | `false` | Empty string is empty |
| `" "` | `false` | `false` | `false` | Whitespace is truthy and not empty |
| `[]` | `false` | `true` | `false` | Empty array is truthy but empty |
| `[1]` | `false` | `false` | `false` | |
| `NaN` | `true` | `false` | `false` | `NaN` is falsy but NOT empty |

---

## Common Mistakes Summary

1. **Using `and`/`or` where `if` suffices:** `{{if @value "yes" "no"}}` does not need
   `{{if (and @value) "yes" "no"}}`.

2. **Forgetting that `or` returns the VALUE, not a boolean:** `{{or @name "default"}}` returns
   `@name` if truthy, not `true`. This is usually fine but matters when the result is used
   as a boolean argument.

3. **Type mismatches with `eq`:** `{{eq @stringValue 5}}` is always false if `@stringValue`
   is `"5"`. Ensure consistent types.

4. **Using `is-empty` for boolean checks:** `{{is-empty false}}` is `false`. Use `{{not @value}}`
   to check for falsy values.

5. **Over-nesting:** More than 3 levels of nesting becomes unreadable. Move complex logic
   to a getter.
