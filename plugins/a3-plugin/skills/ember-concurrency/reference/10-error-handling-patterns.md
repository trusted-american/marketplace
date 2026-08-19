## Error Handling Patterns

### try/catch Inside Tasks

The most common pattern. Catch errors inside the task function itself.

```typescript
saveTask = task(async () => {
  try {
    await this.args.model.save();
    this.flashMessages.success('Saved');
    this.args.onSave?.();
  } catch (error) {
    this.flashMessages.danger('Save failed');
    // Optionally re-throw if you want lastErrored to be set
    throw error;
  }
}).drop();
```

**Note:** If you catch the error and do NOT re-throw it, the task instance is considered **successful** (`isSuccessful: true`). If you want `lastErrored` to reflect the failure, you must re-throw.

### Using .lastErrored for Displaying Errors

```typescript
saveTask = task(async () => {
  // No try/catch — let errors propagate
  await this.args.model.save();
  this.flashMessages.success('Saved');
}).drop();
```

```gts
<template>
  {{#if this.saveTask.lastErrored}}
    <div class="alert alert-danger" data-test-save-error>
      {{this.saveTask.lastErrored.error.message}}
    </div>
  {{/if}}

  <button
    {{on "click" this.saveTask.perform}}
    disabled={{this.saveTask.isRunning}}
  >
    {{#if this.saveTask.lastErrored}}
      Retry Save
    {{else}}
      Save
    {{/if}}
  </button>
</template>
```

### Difference Between Task Errors and Cancellation

Not all "rejections" are errors. Cancellation also causes rejection. Always distinguish them.

```typescript
import { didCancel } from 'ember-concurrency';

// Inside a task — cancellation does NOT hit catch blocks
myTask = task(async () => {
  try {
    await this.doWork();
  } catch (error) {
    // Cancellation does NOT arrive here inside a task.
    // Only real errors hit this catch block.
    this.handleError(error);
  }
});

// Outside a task — cancellation DOES hit catch blocks
async externalCaller() {
  try {
    await this.myTask.perform();
  } catch (error) {
    if (didCancel(error)) {
      // Task was cancelled — usually ignore
      return;
    }
    // Real error
    this.handleError(error);
  }
}
```

### Error Propagation to Parent Tasks

When a child task errors, the error propagates to the parent task (just like awaiting a rejected promise).

```typescript
parentTask = task(async () => {
  try {
    await this.childTask.perform(); // If child throws, error propagates here
  } catch (error) {
    // Handle error from child task
    this.flashMessages.danger('Child operation failed');
  }
});

childTask = task(async () => {
  throw new Error('Something went wrong');
});
```

### onError Callback

For tasks where you want a centralized error handler without try/catch:

```typescript
import { task } from 'ember-concurrency';

export default class MyComponent extends Component {
  saveTask = task(async () => {
    await this.args.model.save();
  }).drop();

  // Handle errors from any task perform
  handleSaveError = async () => {
    try {
      await this.saveTask.perform();
    } catch (error) {
      if (!didCancel(error)) {
        this.errorReporter.captureException(error);
        this.flashMessages.danger('An unexpected error occurred');
      }
    }
  };
}
```

---
