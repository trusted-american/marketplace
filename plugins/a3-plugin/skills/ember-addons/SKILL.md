---
name: ember-addons
description: Reference for all Ember addons used in A3 — ember-simple-auth, ember-can, ember-power-select, ember-basic-dropdown, ember-file-upload, ember-keyboard, ember-sortable, ember-shepherd, ember-shiki, and more
version: 0.1.0
---

# Ember Addons Reference

## ember-simple-auth (v8)
Authentication/session management. See auth-permissions skill for details.

## ember-can (v8)
Authorization/abilities. See auth-permissions skill for details.

## ember-concurrency (v5)
Async task management. See ember-concurrency skill for details.

## ember-intl (v8)
Internationalization. See ember-intl skill for details.

## ember-power-select (v8)

Advanced select/dropdown component:
```gts
import PowerSelect from 'ember-power-select/components/power-select';

<template>
  <PowerSelect
    @options={{this.carrierOptions}}
    @selected={{@model.carrier}}
    @onChange={{fn (mut @model.carrier)}}
    @searchEnabled={{true}}
    @searchField="name"
    @placeholder={{t "fields.selectCarrier"}}
    as |carrier|
  >
    {{carrier.name}}
  </PowerSelect>
</template>
```

### Multiple Select
```gts
import PowerSelectMultiple from 'ember-power-select/components/power-select-multiple';

<template>
  <PowerSelectMultiple
    @options={{this.tagOptions}}
    @selected={{@model.tags}}
    @onChange={{fn (mut @model.tags)}}
    as |tag|
  >
    {{tag.name}}
  </PowerSelectMultiple>
</template>
```

**Docs**: https://ember-power-select.com/

## ember-basic-dropdown (v8)

Low-level dropdown primitive (used by ember-power-select internally):
```gts
import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown';

<template>
  <BasicDropdown as |dd|>
    <dd.Trigger>
      <button>Open Menu</button>
    </dd.Trigger>
    <dd.Content>
      <ul class="dropdown-menu show">
        <li><button {{on "click" (fn this.select "option1")}}>Option 1</button></li>
        <li><button {{on "click" (fn this.select "option2")}}>Option 2</button></li>
      </ul>
    </dd.Content>
  </BasicDropdown>
</template>
```

**Docs**: https://ember-basic-dropdown.com/

## ember-file-upload (v9)

File upload with drag-and-drop:
```gts
import FileUpload from 'ember-file-upload/components/file-upload';
import FileDropzone from 'ember-file-upload/components/file-dropzone';

<template>
  <FileDropzone @name="documents" as |dropzone|>
    {{#if dropzone.active}}
      <div class="dropzone-active">Drop files here</div>
    {{/if}}

    <FileUpload
      @name="documents"
      @accept="application/pdf,image/*"
      @onFileAdded={{this.handleFileAdded}}
    >
      <button class="btn btn-outline-primary">Upload File</button>
    </FileUpload>
  </FileDropzone>
</template>
```

**Docs**: https://ember-file-upload.pages.dev/

## ember-keyboard (v9)

Keyboard shortcut handling:
```typescript
import { onKey } from 'ember-keyboard';

export default class MyComponent extends Component {
  @onKey('ctrl+s')
  save() {
    this.saveTask.perform();
  }

  @onKey('Escape')
  close() {
    this.args.onClose?.();
  }
}
```

**Docs**: https://adopted-ember-addons.github.io/ember-keyboard/

## ember-sortable (v5)

Drag-and-drop reordering:
```gts
import SortableGroup from 'ember-sortable/components/sortable-group';
import SortableItem from 'ember-sortable/components/sortable-item';

<template>
  <SortableGroup @onChange={{this.reorder}} as |group|>
    {{#each @items as |item|}}
      <SortableItem @model={{item}} @group={{group}}>
        <div class="sortable-item">{{item.name}}</div>
      </SortableItem>
    {{/each}}
  </SortableGroup>
</template>
```

**Docs**: https://github.com/adopted-ember-addons/ember-sortable

## ember-shepherd (v17)

User onboarding tours:
```typescript
import { service } from '@ember/service';
import type TourService from 'a3/services/tour';

export default class MyComponent extends Component {
  @service declare tour: TourService;

  @action
  startTour() {
    this.tour.addSteps([
      {
        id: 'step-1',
        text: 'Welcome! This is the enrollment list.',
        attachTo: { element: '[data-test-enrollment-list]', on: 'bottom' },
      },
      {
        id: 'step-2',
        text: 'Click here to create a new enrollment.',
        attachTo: { element: '[data-test-new-button]', on: 'bottom' },
      },
    ]);
    this.tour.start();
  }
}
```

**Docs**: https://github.com/rwwagner90/ember-shepherd

## ember-page-title (v9)

Page title management:
```gts
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Enrollments"}}
  {{! Sets document.title to "Enrollments | A3" }}
</template>
```

## ember-breadcrumb-trail (v2)

Breadcrumb navigation:
```typescript
// In route
export default class MyRoute extends Route {
  breadcrumb = { title: 'Enrollments' };
}
```

## ember-cli-flash (v6)

Toast notification messages:
```typescript
this.flashMessages.success('Record saved!');
this.flashMessages.danger('Something went wrong.');
this.flashMessages.warning('Please review your input.');
this.flashMessages.info('New updates available.');
```

## ember-model-validator (v4)

Model-level validation:
```typescript
import { validatePresence, validateFormat } from 'ember-model-validator';

export default class Client extends BaseModel {
  validations = {
    firstName: { presence: true },
    email: { presence: true, format: { with: /^[^@]+@[^@]+$/ } },
    phone: { format: { with: /^\d{10}$/, allowBlank: true } },
  };
}
```

## ember-local-storage-decorator (v0.3)

Local storage backed properties:
```typescript
import { localStorage } from 'ember-local-storage-decorator';

export default class MyComponent extends Component {
  @localStorage('sidebar-collapsed') declare isCollapsed: boolean;
}
```

## ember-highcharts (v7)

Highcharts integration:
```gts
import HighCharts from 'ember-highcharts/components/high-charts';

<template>
  <HighCharts @content={{this.chartOptions}} @chartOptions={{this.highchartsConfig}} />
</template>
```

## ember-shiki (v0.3)

Code syntax highlighting:
```gts
import Shiki from 'ember-shiki/components/shiki';

<template>
  <Shiki @code={{this.codeSnippet}} @language="typescript" />
</template>
```

## @fortawesome/ember-fontawesome

FontAwesome icons:
```gts
import FaIcon from '@fortawesome/ember-fontawesome';

<template>
  <FaIcon @icon="check" @prefix="fas" />
  <FaIcon @icon="github" @prefix="fab" />
  <FaIcon @icon="spinner" @prefix="fas" @spin={{true}} />
</template>
```
