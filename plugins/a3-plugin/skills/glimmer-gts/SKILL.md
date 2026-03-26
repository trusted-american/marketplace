---
name: glimmer-gts
description: Deep Glimmer component and GTS/GJS template-tag format reference — component signatures, template syntax, patterns, and A3-specific conventions
version: 0.1.0
---

# Glimmer Components & GTS Reference

## GTS Format (Glimmer TypeScript)

GTS is the single-file component format used by A3. It combines TypeScript logic and template in one `.gts` file.

### Basic Component
```gts
import Component from '@glimmer/component';

interface MyComponentSignature {
  Args: {
    name: string;
    count?: number;
  };
  Blocks: {
    default: [];
  };
  Element: HTMLDivElement;
}

export default class MyComponent extends Component<MyComponentSignature> {
  <template>
    <div ...attributes>
      Hello, {{@name}}! Count: {{@count}}
      {{yield}}
    </div>
  </template>
}
```

### Template-Only Component
```gts
// No class needed — just a template
<template>
  <div class="badge bg-primary" ...attributes>
    {{@label}}
  </div>
</template>
```

### Component Signature Interface

Every typed component should define a signature:

```typescript
interface Signature {
  // Required and optional arguments passed to the component
  Args: {
    required: string;
    optional?: number;
  };

  // Block definitions with yielded values
  Blocks: {
    default: [item: MyType, index: number];  // Positional yield params
    header: [];                               // Named block with no params
    footer: [summary: string];                // Named block with param
  };

  // The root element type (for ...attributes typing)
  Element: HTMLDivElement;
}
```

### Accessing Args
```gts
// In template: use @argName
<template>
  <p>{{@name}}</p>
  <p>{{@count}}</p>
</template>

// In class: use this.args.argName
export default class MyComponent extends Component<Signature> {
  get greeting() {
    return `Hello, ${this.args.name}`;
  }
}
```

## GTS Template Syntax

### Expressions
```gts
{{this.localProperty}}        // Component property
{{@argName}}                  // Passed argument
{{helper-name arg1 arg2}}     // Helper invocation
```

### HTML Attributes
```gts
<div class={{this.className}}>              // Dynamic class
<div class="static {{if @active 'on'}}">    // Mixed static + dynamic
<input value={{@value}} />                   // Dynamic attribute
<button disabled={{@isDisabled}}>            // Boolean attribute
<div ...attributes>                         // Spread caller's attributes
```

### Component Invocation
```gts
<MyComponent @arg1="value" @arg2={{this.data}} />

// With block
<MyComponent @items={{@data}} as |item|>
  <p>{{item.name}}</p>
</MyComponent>

// With named blocks
<Card>
  <:header>Title</:header>
  <:body>Content</:body>
</Card>
```

### Event Handling
```gts
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

<template>
  // Simple handler
  <button {{on "click" this.handleClick}}>Click</button>

  // With argument
  <button {{on "click" (fn this.selectItem @item)}}>Select</button>

  // Prevent default
  <form {{on "submit" this.handleSubmit}}>...</form>

  // Multiple events
  <input
    {{on "input" this.handleInput}}
    {{on "focus" this.handleFocus}}
    {{on "blur" this.handleBlur}}
  />
</template>
```

### Conditional Rendering
```gts
{{#if this.isVisible}}
  <div>Visible content</div>
{{else if this.isAlternate}}
  <div>Alternate content</div>
{{else}}
  <div>Fallback content</div>
{{/if}}

{{#unless this.isHidden}}
  <div>Shown when not hidden</div>
{{/unless}}

// Inline conditional
<div class={{if @isActive "active" "inactive"}}>
```

### Loops
```gts
{{#each @items as |item index|}}
  <div data-test-item={{index}}>
    {{item.name}}
  </div>
{{else}}
  <div data-test-empty-state>No items found</div>
{{/each}}
```

### let Helper (Local Variables)
```gts
{{#let (compute-something @data) as |result|}}
  <p>{{result}}</p>
{{/let}}
```

## Component Patterns

### Form Component
```gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { task } from 'ember-concurrency';
import type IntlService from 'ember-intl/services/intl';

interface FormSignature {
  Args: {
    model: MyModel;
    onSave?: () => void;
  };
  Element: HTMLFormElement;
}

export default class MyForm extends Component<FormSignature> {
  @service declare intl: IntlService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  saveTask = task(async () => {
    try {
      await this.args.model.save();
      this.flashMessages.success(this.intl.t('messages.saved'));
      this.args.onSave?.();
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.error'));
    }
  });

  <template>
    <form ...attributes {{on "submit" (fn this.saveTask.perform)}}>
      <div class="mb-3">
        <label class="form-label">{{t "fields.name"}}</label>
        <input
          type="text"
          class="form-control"
          value={{@model.name}}
          {{on "input" (fn (mut @model.name) value="target.value")}}
          data-test-name-input
        />
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        disabled={{this.saveTask.isRunning}}
        data-test-save-button
      >
        {{#if this.saveTask.isRunning}}
          <span class="spinner-border spinner-border-sm" role="status"></span>
          {{t "buttons.saving"}}
        {{else}}
          {{t "buttons.save"}}
        {{/if}}
      </button>
    </form>
  </template>
}
```

### List Component with Loading/Empty States
```gts
interface ListSignature {
  Args: {
    items: MyModel[];
    isLoading: boolean;
  };
  Element: HTMLDivElement;
}

export default class MyList extends Component<ListSignature> {
  <template>
    <div ...attributes data-test-my-list>
      {{#if @isLoading}}
        <div class="text-center py-4" data-test-loading>
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      {{else if @items.length}}
        <div class="list-group">
          {{#each @items as |item|}}
            <div class="list-group-item" data-test-list-item>
              {{item.name}}
            </div>
          {{/each}}
        </div>
      {{else}}
        <div class="text-muted text-center py-4" data-test-empty-state>
          No items found
        </div>
      {{/if}}
    </div>
  </template>
}
```

### Badge Component (A3 Pattern)
```gts
// A3 has 48+ badge components following this pattern
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success',
  inactive: 'bg-secondary',
  pending: 'bg-warning',
  cancelled: 'bg-danger',
};

interface StatusBadgeSignature {
  Args: { status: string };
  Element: HTMLSpanElement;
}

<template>
  <span
    class="badge {{get STATUS_COLORS @status}}"
    ...attributes
    data-test-status-badge
  >
    {{@status}}
  </span>
</template>
```

### Modal Component Pattern
```gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

interface ModalSignature {
  Args: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
  };
  Blocks: {
    body: [];
    footer: [];
  };
  Element: HTMLDivElement;
}

export default class Modal extends Component<ModalSignature> {
  @action
  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.args.onClose();
    }
  }

  <template>
    {{#if @isOpen}}
      <div class="modal show d-block" {{on "click" this.handleBackdropClick}} data-test-modal>
        <div class="modal-dialog">
          <div class="modal-content" ...attributes>
            <div class="modal-header">
              <h5 class="modal-title">{{@title}}</h5>
              <button type="button" class="btn-close" {{on "click" @onClose}} data-test-modal-close></button>
            </div>
            <div class="modal-body">
              {{yield to="body"}}
            </div>
            <div class="modal-footer">
              {{yield to="footer"}}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    {{/if}}
  </template>
}
```

## Imports in GTS

### Core Imports
```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn, hash, array, concat, get } from '@ember/helper';
import { LinkTo } from '@ember/routing';
```

### A3-Specific Imports
```typescript
import { t } from 'ember-intl';
import { can } from 'ember-can';
import { task } from 'ember-concurrency';
import { pageTitle } from 'ember-page-title';
import PowerSelect from 'ember-power-select/components/power-select';
import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';
import FaIcon from '@fortawesome/ember-fontawesome';
```

## Further Investigation

- **Glimmer Component API**: https://api.emberjs.com/ember/release/modules/@glimmer%2Fcomponent
- **Template Tag RFC**: https://rfcs.emberjs.com/id/0779-first-class-component-templates/
- **Glint (type checking)**: https://typed-ember.gitbook.io/glint/
