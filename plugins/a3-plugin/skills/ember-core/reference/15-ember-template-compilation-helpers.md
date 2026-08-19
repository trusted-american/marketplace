## 15. @ember/template Compilation Helpers

These are helpers and utilities used in template compilation and resolution.

### 15.1 Template-Only Components

```typescript
import templateOnlyComponent from '@ember/component/template-only';

// Explicitly declare a template-only component (no class)
// In GTS, simply export a <template> without a class:
<template>
  <div class="badge" ...attributes>{{yield}}</div>
</template>
```

### 15.2 Helper Functions

```typescript
import { helper } from '@ember/component/helper';

// Function-based helper
const formatCurrency = helper(function ([value]: [number], { currency }: { currency?: string }) {
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  });
  return fmt.format(value);
});

export default formatCurrency;
```

Usage in templates:
```gts
<template>
  <span>{{formatCurrency @amount currency="EUR"}}</span>
</template>
```

### 15.3 The `{{component}}` Helper (Dynamic Components)

```gts
{{! Render a component dynamically by name or reference }}
{{#let (component "my-component") as |MyDynamic|}}
  <MyDynamic @arg="value" />
{{/let}}

{{! With curry: pre-bind arguments }}
{{#let (component "form-field" type="text" required=true) as |TextField|}}
  <TextField @label="Name" @value={{this.name}} />
  <TextField @label="Email" @value={{this.email}} />
{{/let}}
```

### 15.4 The `{{modifier}}` and `{{helper}}` Currying Helpers

```gts
{{! Curry a modifier }}
{{#let (modifier "on" "click") as |onClick|}}
  <button {{onClick this.handleSave}}>Save</button>
  <button {{onClick this.handleCancel}}>Cancel</button>
{{/let}}

{{! Curry a helper }}
{{#let (helper "format-date" format="short") as |shortDate|}}
  <span>{{shortDate @startDate}}</span>
  <span>{{shortDate @endDate}}</span>
{{/let}}
```

---
