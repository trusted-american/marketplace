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

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-ember-helper.md` | @ember/helper |
| `reference/02-ember-modifier.md` | @ember/modifier |
| `reference/03-ember-object.md` | @ember/object |
| `reference/04-ember-service.md` | @ember/service |
| `reference/05-ember-routing.md` | @ember/routing |
| `reference/06-ember-string.md` | @ember/string |
| `reference/07-ember-owner.md` | @ember/owner |

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
