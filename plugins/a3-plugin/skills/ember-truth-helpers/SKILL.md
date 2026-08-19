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

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-boolean-helpers.md` | Boolean Helpers |
| `reference/02-comparison-helpers.md` | Comparison Helpers |
| `reference/03-collection-helpers.md` | Collection Helpers |
| `reference/04-combining-helpers-complex-conditions.md` | Combining Helpers — Complex Conditions |

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
