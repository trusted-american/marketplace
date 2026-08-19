## Testing

### Handling localStorage in Tests

In tests, localStorage persists between test runs (within the same browser session). Always
clean up in test setup/teardown:

```ts
// tests/helpers/setup-local-storage.ts
export function setupLocalStorage(hooks: NestedHooks) {
  hooks.beforeEach(function () {
    // Store original state
    this.originalStorage = { ...localStorage };
    localStorage.clear();
  });

  hooks.afterEach(function () {
    localStorage.clear();
    // Restore original state if needed
    Object.entries(this.originalStorage).forEach(([key, value]) => {
      localStorage.setItem(key, value as string);
    });
  });
}
```

### Seeding localStorage in Tests

```ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';

module('Integration | Component | sidebar', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    localStorage.clear();
  });

  hooks.afterEach(function () {
    localStorage.clear();
  });

  test('it restores collapsed state from localStorage', async function (assert) {
    // Seed the stored state
    localStorage.setItem('sidebar-collapsed', 'true');

    await render(hbs`<AppSidebar />`);

    assert.dom('.sidebar').hasClass('sidebar--collapsed');
  });

  test('it defaults to expanded when no stored state', async function (assert) {
    await render(hbs`<AppSidebar />`);

    assert.dom('.sidebar').hasClass('sidebar--expanded');
  });

  test('it persists collapsed state on toggle', async function (assert) {
    await render(hbs`<AppSidebar />`);
    await click('.sidebar-toggle');

    assert.strictEqual(localStorage.getItem('sidebar-collapsed'), 'true');
  });
});
```

---
