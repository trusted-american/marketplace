## TaskGroup — Coordinating Multiple Tasks

TaskGroups let multiple tasks share a single concurrency constraint. When tasks are in a group, the group's modifier and `maxConcurrency` apply across all tasks collectively.

### Defining a Task Group

```typescript
import Component from '@glimmer/component';
import { task, taskGroup } from 'ember-concurrency';

export default class MyComponent extends Component {
  // Define the group with a modifier
  operations = taskGroup().drop();

  // Tasks that belong to the group
  saveTask = task({ group: 'operations' }, async () => {
    await this.args.model.save();
  });

  deleteTask = task({ group: 'operations' }, async () => {
    this.args.model.deleteRecord();
    await this.args.model.save();
  });

  archiveTask = task({ group: 'operations' }, async () => {
    this.args.model.set('isArchived', true);
    await this.args.model.save();
  });
}
```

In the above example, if `saveTask` is running and the user clicks delete, the `deleteTask.perform()` will be dropped because the group uses `.drop()`. This prevents conflicting operations from running simultaneously.

### TaskGroup Properties

TaskGroups expose the same derived state as tasks:

```typescript
this.operations.isRunning;     // true if ANY task in the group is running
this.operations.isIdle;        // true if NO tasks in the group are running
this.operations.isQueued;      // true if any tasks are queued in the group
```

### When to Use TaskGroups

- **Multiple mutually exclusive actions** — save, delete, and archive buttons that should not overlap
- **Shared concurrency pools** — multiple upload tasks sharing a `maxConcurrency(3)` limit
- **Unified loading state** — a single `isRunning` check covers all related operations

```gts
<template>
  {{! Disable ALL action buttons when ANY operation is in progress }}
  <button disabled={{this.operations.isRunning}} {{on "click" this.saveTask.perform}}>
    Save
  </button>
  <button disabled={{this.operations.isRunning}} {{on "click" this.deleteTask.perform}}>
    Delete
  </button>
  <button disabled={{this.operations.isRunning}} {{on "click" this.archiveTask.perform}}>
    Archive
  </button>
</template>
```

---
