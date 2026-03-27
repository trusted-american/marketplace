---
name: glimmer-component
description: Template for generating Glimmer GTS components following A3 conventions
---

# Glimmer GTS Component Template

```gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';
import type IntlService from 'ember-intl/services/intl';
import type StoreService from '{{appName}}/services/store';

interface {{ComponentName}}Signature {
  Args: {
    {{#each requiredArgs}}
    {{argName}}: {{argType}};
    {{/each}}
    {{#each optionalArgs}}
    {{argName}}?: {{argType}};
    {{/each}}
  };
  Blocks: {
    default: [];
  };
  Element: {{rootElement}};
}

export default class {{ComponentName}} extends Component<{{ComponentName}}Signature> {
  @service declare intl: IntlService;

  {{#each trackedProperties}}
  @tracked {{name}} = {{defaultValue}};
  {{/each}}

  {{#each computedGetters}}
  get {{name}}(): {{returnType}} {
    {{body}}
  }
  {{/each}}

  {{#each actions}}
  @action
  {{name}}({{params}}) {
    {{body}}
  }
  {{/each}}

  <template>
    <{{rootTag}} class="{{cssClasses}}" ...attributes data-test-{{kebabName}}>
      {{! Component content here }}
    </{{rootTag}}>
  </template>
}
```

## Variables

- `{{ComponentName}}` — PascalCase component class name
- `{{kebabName}}` — kebab-case for data-test attribute
- `{{rootElement}}` — HTML element type (HTMLDivElement, HTMLFormElement, etc.)
- `{{rootTag}}` — HTML tag (div, form, section, etc.)
- `{{cssClasses}}` — Tailwind/Bootstrap classes
- `{{appName}}` — Always "a3" for A3 imports
