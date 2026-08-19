## ember-page-title

**Package:** `ember-page-title`
**Import (GTS):** `import { pageTitle } from 'ember-page-title';`

### Overview

The `{{pageTitle}}` helper sets the document title (`<title>` tag) declaratively from route
templates. Titles compose hierarchically — nested routes prepend their title to the parent's
title, separated by a configurable separator.

### Basic Usage

**Template signature (GTS):**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "My Page Title"}}
</template>
```

**Classic `.hbs` template:**
```hbs
{{page-title "My Page Title"}}
```

> Note: In GTS strict mode the import is `pageTitle` (camelCase). In classic `.hbs` files the
> helper name is `page-title` (dasherized). Both refer to the same helper.

### How Title Composition Works

ember-page-title builds the document title by collecting `{{pageTitle}}` calls from all
currently active route templates, from leaf to root. The titles are joined with a separator
(default: `" | "`).

**Example route hierarchy:**
```
application.hbs:     {{pageTitle "A3"}}
admin.hbs:           {{pageTitle "Admin"}}
admin.employees.hbs: {{pageTitle "Employees"}}
```

**Resulting document title:** `Employees | Admin | A3`

The most specific (deepest) route's title appears first.

### Configuration

Configure the separator and other options in `config/environment.js`:

```js
// config/environment.js
module.exports = function (environment) {
  let ENV = {
    // ...
    pageTitle: {
      separator: ' | ',    // Default separator between title segments
      prepend: true,        // If true, child titles come before parent (default: true)
      replace: false,       // If true, child title replaces parent entirely
    },
  };
  return ENV;
};
```

### A3 Route Template Patterns

**Standard route with static title:**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Employees"}}

  <div class="page-content">
    {{outlet}}
  </div>
</template>
```

**Route with dynamic title from model:**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle @model.employee.name}}

  <div class="employee-detail">
    <h1>{{@model.employee.name}}</h1>
    {{outlet}}
  </div>
</template>
```

**Route with computed/conditional title:**
```gts
import { pageTitle } from 'ember-page-title';
import { or } from 'ember-truth-helpers';

<template>
  {{pageTitle (or @model.employee.name "New Employee")}}

  <EmployeeForm @model={{@model.employee}} />
</template>
```

**Route that replaces the full title (no composition):**
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Login | A3" replace=true}}

  <LoginForm />
</template>
```

When `replace=true` is used, this title completely replaces any parent titles. Useful for
special pages like login, error pages, or landing pages.

**Route with front position (append instead of prepend):**
```gts
<template>
  {{pageTitle "Dashboard" prepend=false}}
</template>
```

With `prepend=false`, this title goes after the parent: `A3 | Dashboard` instead of
`Dashboard | A3`.

### Dynamic Title Updates

The `{{pageTitle}}` helper is reactive. If the value passed to it is a tracked property or
a model attribute, the document title updates automatically when the value changes:

```gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { pageTitle } from 'ember-page-title';

export default class EmployeeRoute extends Component {
  // If @model.employee.name changes (e.g., after an edit), the document title updates
  <template>
    {{pageTitle @model.employee.name}}
    <EmployeeDetail @employee={{@model.employee}} />
  </template>
}
```

### Title with Separator Override

You can override the separator for a specific title segment:

```gts
<template>
  {{pageTitle "Employee Details" separator=" - "}}
</template>
```

This would produce `Employee Details - A3` instead of `Employee Details | A3`.

### Multiple `{{pageTitle}}` in One Template

Only the LAST `{{pageTitle}}` in a single template takes effect. Do not use multiple
`{{pageTitle}}` calls in the same template — use conditional logic instead:

```gts
{{! WRONG — only the second one takes effect }}
{{pageTitle "Title A"}}
{{pageTitle "Title B"}}

{{! RIGHT — use conditional }}
{{pageTitle (if @isEditing "Edit Employee" "View Employee")}}
```

---
