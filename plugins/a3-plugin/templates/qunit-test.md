---
name: qunit-test
description: Templates for generating QUnit tests — acceptance, integration, and unit test patterns
---

# QUnit Test Templates

## Acceptance Test

```typescript
// tests/acceptance/{{routePath}}-test.ts
import { module, test } from 'qunit';
import { visit, click, fillIn, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | {{modulePath}}', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(async function () {
    // Authenticate user and seed test data
  });

  test('it renders the page', async function (assert) {
    await visit('{{routeUrl}}');

    assert.strictEqual(currentURL(), '{{routeUrl}}');
    assert.dom('[data-test-{{pageSelector}}]').exists();
  });

  test('it displays data correctly', async function (assert) {
    await visit('{{routeUrl}}');

    assert.dom('[data-test-{{listSelector}}]').exists({ count: {{expectedCount}} });
  });

  {{#if hasCreateFlow}}
  test('it creates a new record', async function (assert) {
    await visit('{{routeUrl}}/new');

    {{#each formFields}}
    await fillIn('[data-test-{{fieldName}}-input]', '{{testValue}}');
    {{/each}}
    await click('[data-test-save-button]');

    assert.dom('[data-test-flash-success]').exists();
  });
  {{/if}}
});
```

## Integration (Component) Test

```typescript
// tests/integration/components/{{componentPath}}-test.ts
import { module, test } from 'qunit';
import { render, click } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import {{ComponentName}} from 'a3/components/{{componentPath}}';

module('Integration | Component | {{componentPath}}', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders with required args', async function (assert) {
    await render(<template>
      <{{ComponentName}} @{{primaryArg}}={{this.{{primaryArg}}}} />
    </template>);

    assert.dom('[data-test-{{componentSelector}}]').exists();
  });

  test('it handles empty state', async function (assert) {
    await render(<template>
      <{{ComponentName}} @items={{(array)}} />
    </template>);

    assert.dom('[data-test-empty-state]').exists();
  });

  test('it handles loading state', async function (assert) {
    await render(<template>
      <{{ComponentName}} @isLoading={{true}} />
    </template>);

    assert.dom('[data-test-loading]').exists();
  });
});
```

## Unit Test (Model)

```typescript
// tests/unit/models/{{modelName}}-test.ts
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | {{modelName}}', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('{{modelName}}');
    assert.ok(model);
  });

  {{#each computedGetters}}
  test('{{getterName}} computes correctly', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('{{modelName}}', { {{testData}} });
    assert.strictEqual(model.{{getterName}}, {{expectedValue}});
  });
  {{/each}}
});
```

## Unit Test (Ability)

```typescript
// tests/unit/abilities/{{modelName}}-test.ts
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Ability | {{modelName}}', function (hooks) {
  setupTest(hooks);

  test('admin can create', function (assert) {
    const ability = this.owner.lookup('ability:{{modelName}}');
    ability.currentUser = { user: { isAdmin: true } };
    assert.true(ability.canCreate);
  });

  test('non-admin cannot create without permission', function (assert) {
    const ability = this.owner.lookup('ability:{{modelName}}');
    ability.currentUser = { user: { isAdmin: false, permissions: [] } };
    assert.false(ability.canCreate);
  });

  test('super can delete', function (assert) {
    const ability = this.owner.lookup('ability:{{modelName}}');
    ability.currentUser = { user: { isSuper: true } };
    assert.true(ability.canDelete);
  });

  test('non-super cannot delete', function (assert) {
    const ability = this.owner.lookup('ability:{{modelName}}');
    ability.currentUser = { user: { isSuper: false } };
    assert.false(ability.canDelete);
  });
});
```
