---
name: ember-power-select
description: ember-power-select reference — advanced searchable select component used via @trusted-american/ember Form::PowerSelect in A3
version: 0.1.0
---

# ember-power-select Reference

## Overview

`ember-power-select` is a feature-rich, composable select component for Ember. A3 uses it extensively via the `Form::PowerSelect` wrapper from the `@trusted-american/ember` design system for all dropdown selects that need search, async loading, multiple selection, or custom option rendering. It replaces native `<select>` elements throughout the application.

**Package**: `ember-power-select`
**Version**: 8.x (compatible with Ember 5+ and Glimmer components)
**Design System Wrapper**: `Form::PowerSelect` from `@trusted-american/ember`

## Basic Usage

### Direct ember-power-select

```gts
import PowerSelect from 'ember-power-select/components/power-select';

<template>
  <PowerSelect
    @options={{this.statusOptions}}
    @selected={{this.selectedStatus}}
    @onChange={{this.updateStatus}}
    @placeholder="Select a status..."
    as |status|
  >
    {{status.label}}
  </PowerSelect>
</template>
```

### Via A3 Design System Wrapper

```gts
import Form from '@trusted-american/ember/components/form';

<template>
  <Form::PowerSelect
    @label="Status"
    @options={{this.statusOptions}}
    @selected={{this.selectedStatus}}
    @onChange={{this.updateStatus}}
    @placeholder="Select a status..."
    @errors={{get @model.errors "status"}}
    as |status|
  >
    {{status.label}}
  </Form::PowerSelect>
</template>
```

The design system wrapper adds:
- `@label` — renders a `<label>` element above the select
- `@errors` — renders validation errors below the select
- `@helpText` — renders helper text below the select
- `@required` — shows a required indicator on the label
- Consistent styling matching the A3 design system

## Core API

### @options

The list of options to display. Can be an array of primitives, objects, or a promise.

```typescript
// Array of strings
statusOptions = ['Active', 'Pending', 'Terminated', 'COBRA'];

// Array of objects
statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'cobra', label: 'COBRA' },
];

// Ember Data records
get carrierOptions() {
  return this.store.findAll('carrier');
}
```

### @selected

The currently selected value. Must be a reference-equal item from the `@options` array (or `null`/`undefined` for no selection).

```typescript
@tracked selectedStatus: StatusOption | null = null;

// For Ember Data models, the selected must be the same object reference
@tracked selectedCarrier: CarrierModel | null = null;
```

### @onChange

Called when the user selects an option. Receives the selected option as the argument.

```typescript
updateStatus = (status: StatusOption) => {
  this.selectedStatus = status;
  // Or update the model directly:
  this.args.model.status = status.value;
};

// For Ember Data relationships
updateCarrier = (carrier: CarrierModel) => {
  this.args.model.carrier = carrier;
};
```

### @searchEnabled

Enables the search input inside the dropdown. Defaults to `true` for PowerSelect, `false` for PowerSelectMultiple.

```gts
<PowerSelect
  @options={{this.options}}
  @selected={{this.selected}}
  @onChange={{this.update}}
  @searchEnabled={{true}}
  as |option|
>
  {{option.label}}
</PowerSelect>
```

### @searchField

When options are objects, specifies which property to search against:

```gts
<PowerSelect
  @options={{this.carrierOptions}}
  @selected={{this.selectedCarrier}}
  @onChange={{this.updateCarrier}}
  @searchEnabled={{true}}
  @searchField="name"
  as |carrier|
>
  {{carrier.name}}
</PowerSelect>
```

### @placeholder

Text shown when no option is selected:

```gts
<PowerSelect
  @placeholder="Choose a carrier..."
  ...
/>
```

### @disabled

Disables the select:

```gts
<PowerSelect
  @disabled={{this.isReadOnly}}
  ...
/>
```

### @allowClear

Shows a clear button (x) to deselect the current value:

```gts
<PowerSelect
  @allowClear={{true}}
  ...
/>
```

When cleared, `@onChange` is called with `null`.

### @loadingMessage

Text shown while options are loading (when `@options` is a promise):

```gts
<PowerSelect
  @loadingMessage="Loading carriers..."
  ...
/>
```

### @noMatchesMessage

Text shown when search yields no results:

```gts
<PowerSelect
  @noMatchesMessage="No carriers found"
  ...
/>
```

### @renderInPlace

Renders the dropdown in-place instead of in the document body. Useful inside modals:

```gts
<PowerSelect
  @renderInPlace={{true}}
  ...
/>
```

### @searchMessage

Text shown before the user starts typing (when search is enabled):

```gts
<PowerSelect
  @searchMessage="Type to search..."
  ...
/>
```

### @triggerId

Sets the id attribute on the trigger element (useful for label `for` association):

```gts
<label for="carrier-select">Carrier</label>
<PowerSelect
  @triggerId="carrier-select"
  ...
/>
```

## PowerSelectMultiple

For multi-selection, use `PowerSelectMultiple`:

```gts
import PowerSelectMultiple from 'ember-power-select/components/power-select-multiple';

<template>
  <PowerSelectMultiple
    @options={{this.stateOptions}}
    @selected={{this.selectedStates}}
    @onChange={{this.updateStates}}
    @searchEnabled={{true}}
    @searchField="name"
    @placeholder="Select states..."
    as |state|
  >
    {{state.name}} ({{state.code}})
  </PowerSelectMultiple>
</template>
```

```typescript
import { TrackedArray } from 'tracked-built-ins';

// selectedStates must be an array
selectedStates = new TrackedArray<StateOption>();

updateStates = (states: StateOption[]) => {
  this.selectedStates.splice(0, this.selectedStates.length, ...states);
};
```

Via design system:

```gts
<Form::PowerSelectMultiple
  @label="Licensed States"
  @options={{this.stateOptions}}
  @selected={{this.selectedStates}}
  @onChange={{this.updateStates}}
  @searchField="name"
  @errors={{get @model.errors "states"}}
  as |state|
>
  {{state.name}}
</Form::PowerSelectMultiple>
```

## Async Search with ember-concurrency

For options that should be loaded on-demand as the user types (e.g., searching clients from the API):

```gts
import PowerSelect from 'ember-power-select/components/power-select';

<template>
  <PowerSelect
    @search={{perform this.searchTask}}
    @selected={{this.selectedClient}}
    @onChange={{this.selectClient}}
    @searchEnabled={{true}}
    @loadingMessage="Searching clients..."
    @noMatchesMessage="No clients found"
    @searchMessage="Type to search clients..."
    as |client|
  >
    {{client.firstName}} {{client.lastName}} — {{client.email}}
  </PowerSelect>
</template>
```

```typescript
import { task, timeout } from 'ember-concurrency';

searchTask = task(async (query: string) => {
  await timeout(300); // Debounce 300ms
  if (query.length < 2) return [];
  return this.store.query('client', {
    filter: { search: query },
    page: { limit: 20 },
  });
}).restartable();

selectClient = (client: ClientModel) => {
  this.selectedClient = client;
  this.args.model.client = client;
};
```

When using `@search`, the `@options` argument is ignored. The search function must return the options array (or a promise that resolves to one).

## Custom Option Rendering

The block form allows full control over how each option is rendered:

```gts
<PowerSelect
  @options={{this.agents}}
  @selected={{this.selectedAgent}}
  @onChange={{this.selectAgent}}
  @searchField="fullName"
  as |agent|
>
  <div class="d-flex align-items-center">
    <img
      src={{agent.avatarUrl}}
      alt=""
      class="rounded-circle me-2"
      width="24"
      height="24"
    />
    <div>
      <strong>{{agent.fullName}}</strong>
      <br />
      <small class="text-muted">{{agent.email}}</small>
    </div>
  </div>
</PowerSelect>
```

### Custom Trigger Rendering

Customize how the selected value appears in the trigger:

```gts
<PowerSelect
  @options={{this.agents}}
  @selected={{this.selectedAgent}}
  @onChange={{this.selectAgent}}
  as |agent|
>
  {{agent.fullName}}
</PowerSelect>
```

For different trigger vs dropdown rendering, use the `@selectedItemComponent` and `@optionsComponent` arguments or conditional logic in the block based on the yielded state.

## Grouping Options

Group options into labeled sections:

```typescript
get groupedOptions() {
  return [
    {
      groupName: 'Medical',
      options: [
        { id: '1', name: 'PPO Gold' },
        { id: '2', name: 'HMO Silver' },
      ],
    },
    {
      groupName: 'Dental',
      options: [
        { id: '3', name: 'Dental Basic' },
        { id: '4', name: 'Dental Premium' },
      ],
    },
    {
      groupName: 'Vision',
      options: [
        { id: '5', name: 'Vision Standard' },
      ],
    },
  ];
}
```

```gts
<PowerSelect
  @options={{this.groupedOptions}}
  @selected={{this.selectedPlan}}
  @onChange={{this.selectPlan}}
  as |plan|
>
  {{plan.name}}
</PowerSelect>
```

The groups are rendered with headers automatically.

## Creating New Options (power-select-with-create)

The `ember-power-select-with-create` addon allows users to create new options on the fly:

```gts
import PowerSelectWithCreate from 'ember-power-select-with-create/components/power-select-with-create';

<template>
  <PowerSelectWithCreate
    @options={{this.tagOptions}}
    @selected={{this.selectedTag}}
    @onChange={{this.selectTag}}
    @onCreate={{this.createTag}}
    @searchEnabled={{true}}
    @showCreateWhen={{this.showCreateOption}}
    @suggestedOptionComponent={{this.createSuggestion}}
    @buildSuggestion={{this.buildSuggestion}}
    as |tag|
  >
    {{tag.name}}
  </PowerSelectWithCreate>
</template>
```

```typescript
createTag = async (tagName: string) => {
  const newTag = this.store.createRecord('tag', { name: tagName });
  await newTag.save();
  this.selectedTag = newTag;
};

showCreateOption = (term: string) => {
  // Only show "Create" option if no existing option matches exactly
  return !this.tagOptions.find(
    (tag) => tag.name.toLowerCase() === term.toLowerCase()
  );
};

buildSuggestion = (term: string) => {
  return { name: `Create "${term}"` };
};
```

## Integration with Ember Data Models

### belongsTo Relationship

```typescript
// model: EnrollmentModel with belongsTo('carrier')
@tracked selectedCarrier: CarrierModel | null = null;

constructor(owner: unknown, args: Signature['Args']) {
  super(owner, args);
  // Initialize selected from model relationship
  this.selectedCarrier = this.args.model.carrier;
}

updateCarrier = (carrier: CarrierModel) => {
  this.selectedCarrier = carrier;
  this.args.model.carrier = carrier;
};
```

### hasMany Relationship

```typescript
get selectedPlans() {
  return this.args.model.plans.slice(); // Convert to plain array
}

updatePlans = (plans: PlanModel[]) => {
  this.args.model.plans = plans;
};
```

## Common A3 Patterns

### Status Filter Select

```gts
<Form::PowerSelect
  @label={{t "fields.status"}}
  @options={{this.statusOptions}}
  @selected={{this.selectedStatus}}
  @onChange={{this.filterByStatus}}
  @allowClear={{true}}
  @placeholder={{t "placeholders.allStatuses"}}
  as |status|
>
  {{t (concat "statuses." status)}}
</Form::PowerSelect>
```

### State Dropdown

```gts
<Form::PowerSelect
  @label={{t "fields.state"}}
  @options={{this.usStates}}
  @selected={{this.selectedState}}
  @onChange={{this.updateState}}
  @searchEnabled={{true}}
  @searchField="name"
  @required={{true}}
  @errors={{get @model.errors "state"}}
  as |state|
>
  {{state.name}} ({{state.code}})
</Form::PowerSelect>
```

### Carrier Search with Async Loading

```gts
<Form::PowerSelect
  @label={{t "fields.carrier"}}
  @search={{perform this.searchCarriersTask}}
  @selected={{this.selectedCarrier}}
  @onChange={{this.updateCarrier}}
  @searchEnabled={{true}}
  @loadingMessage={{t "loading.carriers"}}
  @noMatchesMessage={{t "messages.noCarriersFound"}}
  @required={{true}}
  as |carrier|
>
  {{carrier.name}} — {{carrier.state}}
</Form::PowerSelect>
```

## Keyboard Navigation

PowerSelect supports full keyboard navigation out of the box:
- **Arrow Up/Down** — navigate options
- **Enter** — select highlighted option
- **Escape** — close dropdown
- **Typing** — filters options when search is enabled
- **Tab** — selects highlighted option and moves focus
- **Backspace** — removes last selected item in multiple mode

## Styling

PowerSelect uses BEM-style class names that can be overridden:

```css
.ember-power-select-trigger { /* The clickable trigger */ }
.ember-power-select-dropdown { /* The dropdown container */ }
.ember-power-select-option { /* Each option */ }
.ember-power-select-option--highlighted { /* Highlighted option */ }
.ember-power-select-option--selected { /* Selected option */ }
.ember-power-select-search-input { /* Search input */ }
.ember-power-select-group { /* Group container */ }
.ember-power-select-group-name { /* Group header */ }
```

A3's design system applies custom styles to match the overall theme.

## Further Investigation

- **ember-power-select Docs**: https://ember-power-select.com/
- **API Reference**: https://ember-power-select.com/docs/api-reference
- **ember-power-select-with-create**: https://github.com/poteto/ember-power-select-with-create
