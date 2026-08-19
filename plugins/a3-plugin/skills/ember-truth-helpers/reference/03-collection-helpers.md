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
