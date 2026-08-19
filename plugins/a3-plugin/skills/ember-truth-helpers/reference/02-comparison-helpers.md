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
