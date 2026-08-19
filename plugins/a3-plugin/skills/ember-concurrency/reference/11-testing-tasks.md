## Testing Tasks

### Awaiting Task Completion with `settled()`

In tests, use `await settled()` from `@ember/test-helpers` to wait for all tasks to complete.

```typescript
import { settled, click, render } from '@ember/test-helpers';
import { module, test } from 'qunit';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it saves the model', async function (assert) {
    await render(hbs`<MyComponent @model={{this.model}} />`);

    await click('[data-test-save-button]');
    await settled(); // Waits for all tasks to finish

    assert.true(this.model.isSaved);
  });
});
```

### Testing .drop() Behavior

Verify that rapid clicks do not trigger multiple saves.

```typescript
test('.drop() prevents double submit', async function (assert) {
  let saveCount = 0;
  this.model.save = async () => {
    saveCount++;
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  await render(hbs`<MyComponent @model={{this.model}} />`);

  // Click rapidly 3 times
  await click('[data-test-save-button]');
  await click('[data-test-save-button]');
  await click('[data-test-save-button]');
  await settled();

  assert.strictEqual(saveCount, 1, 'Save was only called once despite 3 clicks');
});
```

### Testing .restartable() Behavior

Verify that only the last search executes.

```typescript
test('.restartable() cancels previous searches', async function (assert) {
  let queryLog: string[] = [];
  this.owner.lookup('service:store').query = async (_: string, opts: any) => {
    queryLog.push(opts.filter.search);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  };

  await render(hbs`<SearchComponent />`);

  await fillIn('[data-test-search-input]', 'ab');
  await fillIn('[data-test-search-input]', 'abc');
  await fillIn('[data-test-search-input]', 'abcd');
  await settled();

  // Only the last query should have completed
  // (previous ones were cancelled by .restartable())
  assert.strictEqual(queryLog.length, 1);
  assert.strictEqual(queryLog[0], 'abcd');
});
```

### Testing Cancellation

Verify that tasks clean up properly when the component is destroyed.

```typescript
test('tasks are cancelled on component destroy', async function (assert) {
  let wasCleanedUp = false;

  this.set('showComponent', true);

  // Component with a task that sets a flag in finally
  await render(hbs`
    {{#if this.showComponent}}
      <LongRunningComponent @onCleanup={{fn (mut this.cleanedUp) true}} />
    {{/if}}
  `);

  // Trigger the long-running task
  await click('[data-test-start-button]');

  // Destroy the component while the task is running
  this.set('showComponent', false);
  await settled();

  // The task's finally block should have run
  assert.true(this.cleanedUp);
});
```

### Controlling Timing with Timeout Stubs

For tests that use `timeout()`, you can control timing to avoid slow tests.

```typescript
import { timeout } from 'ember-concurrency';

test('debounced search waits for timeout', async function (assert) {
  // In test environment, timeouts resolve quickly via settled()
  await render(hbs`<SearchComponent />`);

  await fillIn('[data-test-search-input]', 'test query');
  await settled(); // settled() resolves pending timeouts in test mode

  assert.dom('[data-test-result]').exists();
});
```

---
