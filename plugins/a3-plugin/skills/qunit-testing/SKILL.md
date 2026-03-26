---
name: qunit-testing
description: Deep QUnit and ember-qunit testing reference — acceptance, integration, unit tests, qunit-dom assertions, test helpers, and A3-specific testing patterns
version: 0.1.0
---

# QUnit & ember-qunit Testing Reference

## Test Framework Stack

| Package | Purpose |
|---------|---------|
| `qunit` | Core test framework |
| `ember-qunit` | Ember integration (setupTest, setupRenderingTest, setupApplicationTest) |
| `qunit-dom` | DOM assertion helpers |
| `@ember/test-helpers` | Rendering, interaction, routing helpers |
| `@ember/test-waiters` | Async operation waiting |
| `ember-test-selectors` | data-test-* attribute support |
| `testem` | Test runner (browser-based) |

## Test Types

### Acceptance Tests (Full User Flow)
```typescript
import { module, test } from 'qunit';
import { visit, click, fillIn, currentURL, find, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | authenticated | enrollments', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(async function () {
    // Setup: authenticate user, seed data in emulator
  });

  test('visiting /a3/enrollments shows enrollment list', async function (assert) {
    await visit('/a3/enrollments');

    assert.strictEqual(currentURL(), '/a3/enrollments');
    assert.dom('[data-test-enrollment-list]').exists();
    assert.dom('[data-test-enrollment-item]').exists({ count: 5 });
  });

  test('creating a new enrollment', async function (assert) {
    await visit('/a3/enrollments/new');

    await fillIn('[data-test-client-select]', 'John Doe');
    await fillIn('[data-test-carrier-select]', 'BlueCross');
    await fillIn('[data-test-plan-select]', 'Gold Plan');
    await click('[data-test-submit-button]');

    assert.dom('[data-test-flash-success]').exists();
    assert.ok(currentURL().includes('/a3/enrollments/'));
  });

  test('unauthorized user cannot access admin', async function (assert) {
    // Setup non-admin user
    await visit('/admin');
    assert.strictEqual(currentURL(), '/a3'); // Redirected
  });
});
```

### Integration Tests (Components)
```typescript
import { module, test } from 'qunit';
import { render, click, fillIn, triggerEvent } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import MyComponent from 'a3/components/my-component';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders with default state', async function (assert) {
    await render(<template>
      <MyComponent @title="Test Title" />
    </template>);

    assert.dom('[data-test-my-component]').exists();
    assert.dom('[data-test-title]').hasText('Test Title');
  });

  test('it handles click action', async function (assert) {
    let clicked = false;
    const handleClick = () => { clicked = true; };

    await render(<template>
      <MyComponent @title="Test" @onClick={{handleClick}} />
    </template>);

    await click('[data-test-action-button]');
    assert.true(clicked);
  });

  test('it shows loading state', async function (assert) {
    await render(<template>
      <MyComponent @isLoading={{true}} />
    </template>);

    assert.dom('[data-test-loading]').exists();
    assert.dom('[data-test-content]').doesNotExist();
  });

  test('it shows empty state when no items', async function (assert) {
    await render(<template>
      <MyComponent @items={{(array)}} />
    </template>);

    assert.dom('[data-test-empty-state]').exists();
    assert.dom('[data-test-empty-state]').hasText('No items found');
  });

  test('it yields block content', async function (assert) {
    await render(<template>
      <MyComponent @items={{(array "a" "b")}} as |item|>
        <span data-test-item>{{item}}</span>
      </MyComponent>
    </template>);

    assert.dom('[data-test-item]').exists({ count: 2 });
  });
});
```

### Unit Tests

#### Model Tests
```typescript
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | enrollment', function (hooks) {
  setupTest(hooks);

  test('it has correct defaults', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('enrollment');

    assert.strictEqual(model.status, undefined);
    assert.false(model.isActive);
  });

  test('isComplete returns true when status is complete', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('enrollment', { status: 'complete' });

    assert.true(model.isComplete);
  });

  test('displayName formats correctly', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('enrollment', {
      planName: 'Gold Plan',
      carrier: 'BlueCross',
    });

    assert.strictEqual(model.displayName, 'Gold Plan - BlueCross');
  });
});
```

#### Ability Tests
```typescript
module('Unit | Ability | enrollment', function (hooks) {
  setupTest(hooks);

  test('admin can create', function (assert) {
    const ability = this.owner.lookup('ability:enrollment');
    // Mock current user as admin
    ability.currentUser = { user: { isAdmin: true } };

    assert.true(ability.canCreate);
  });

  test('regular user cannot delete', function (assert) {
    const ability = this.owner.lookup('ability:enrollment');
    ability.currentUser = { user: { isAdmin: false, isSuper: false } };

    assert.false(ability.canDelete);
  });

  test('owner can update their own record', function (assert) {
    const ability = this.owner.lookup('ability:enrollment');
    ability.currentUser = { user: { id: 'user_123', isAdmin: false } };
    ability.model = { createdBy: 'user_123' };

    assert.true(ability.canUpdate);
  });
});
```

#### Service Tests
```typescript
module('Unit | Service | csv', function (hooks) {
  setupTest(hooks);

  test('it generates CSV from data', function (assert) {
    const service = this.owner.lookup('service:csv');
    const result = service.generate([
      { name: 'John', email: 'john@test.com' },
      { name: 'Jane', email: 'jane@test.com' },
    ]);

    assert.ok(result.includes('name,email'));
    assert.ok(result.includes('John,john@test.com'));
  });
});
```

#### Utility Tests
```typescript
module('Unit | Utility | phone-number', function () {
  test('it formats US phone numbers', function (assert) {
    assert.strictEqual(formatPhone('5551234567'), '(555) 123-4567');
    assert.strictEqual(formatPhone('+15551234567'), '(555) 123-4567');
  });

  test('it handles empty input', function (assert) {
    assert.strictEqual(formatPhone(''), '');
    assert.strictEqual(formatPhone(null), '');
  });
});
```

## qunit-dom Assertions

```typescript
// Existence
assert.dom('[data-test-element]').exists();
assert.dom('[data-test-element]').exists({ count: 3 });
assert.dom('[data-test-element]').doesNotExist();

// Text content
assert.dom('[data-test-title]').hasText('Exact text');
assert.dom('[data-test-body]').containsText('partial');
assert.dom('[data-test-empty]').hasNoText();
assert.dom('[data-test-title]').hasText(/regex pattern/);

// Attributes
assert.dom('[data-test-input]').hasAttribute('disabled');
assert.dom('[data-test-input]').hasAttribute('type', 'email');
assert.dom('[data-test-link]').hasAttribute('href', '/a3/clients');
assert.dom('[data-test-input]').doesNotHaveAttribute('readonly');

// CSS Classes
assert.dom('[data-test-badge]').hasClass('bg-success');
assert.dom('[data-test-badge]').doesNotHaveClass('bg-danger');
assert.dom('[data-test-element]').hasStyle({ display: 'none' });

// Values (inputs)
assert.dom('[data-test-input]').hasValue('expected value');
assert.dom('[data-test-select]').hasValue('option-1');

// Visibility
assert.dom('[data-test-modal]').isVisible();
assert.dom('[data-test-hidden]').isNotVisible();

// Focus
assert.dom('[data-test-input]').isFocused();
assert.dom('[data-test-input]').isNotFocused();

// Checked (checkboxes/radios)
assert.dom('[data-test-checkbox]').isChecked();
assert.dom('[data-test-checkbox]').isNotChecked();

// Disabled
assert.dom('[data-test-button]').isDisabled();
assert.dom('[data-test-button]').isNotDisabled();
```

## Test Helpers

### Interaction Helpers
```typescript
import {
  click,
  doubleClick,
  fillIn,
  triggerEvent,
  triggerKeyEvent,
  focus,
  blur,
  tap,
  typeIn,
  select,
} from '@ember/test-helpers';

await click('[data-test-button]');
await doubleClick('[data-test-item]');
await fillIn('[data-test-input]', 'new value');
await typeIn('[data-test-input]', 'typed text'); // Character by character
await select('[data-test-select]', 'option-value');
await triggerEvent('[data-test-file-input]', 'change', { files: [file] });
await triggerKeyEvent('[data-test-input]', 'keydown', 'Enter');
await focus('[data-test-input]');
await blur('[data-test-input]');
```

### Routing Helpers
```typescript
import { visit, currentURL, currentRouteName } from '@ember/test-helpers';

await visit('/a3/clients');
assert.strictEqual(currentURL(), '/a3/clients');
assert.strictEqual(currentRouteName(), 'authenticated.clients.index');
```

### Async Helpers
```typescript
import { settled, waitFor, waitUntil } from '@ember/test-helpers';

// Wait for all async operations to complete
await settled();

// Wait for an element to appear
await waitFor('[data-test-result]');

// Wait for a condition
await waitUntil(() => find('[data-test-loaded]') !== null);
```

### Step Assertions (for callbacks)
```typescript
test('it calls actions in order', async function (assert) {
  assert.expect(3); // Expect exactly 3 assertions

  this.set('onOpen', () => assert.step('opened'));
  this.set('onSave', () => assert.step('saved'));
  this.set('onClose', () => assert.step('closed'));

  // ... render and interact ...

  assert.verifySteps(['opened', 'saved', 'closed']);
});
```

## Data Test Selectors

A3 uses `data-test-*` attributes for reliable test targeting:

```gts
// Component
<template>
  <div data-test-enrollment-card>
    <h3 data-test-enrollment-title>{{@enrollment.planName}}</h3>
    <span data-test-enrollment-status>{{@enrollment.status}}</span>
    <button data-test-edit-button {{on "click" this.edit}}>Edit</button>
  </div>
</template>

// Test
assert.dom('[data-test-enrollment-card]').exists();
assert.dom('[data-test-enrollment-title]').hasText('Gold Plan');
await click('[data-test-edit-button]');
```

In production builds, `data-test-*` attributes are automatically stripped by `ember-test-selectors`.

## Further Investigation

- **QUnit Docs**: https://qunitjs.com/
- **ember-qunit**: https://github.com/emberjs/ember-qunit
- **qunit-dom**: https://github.com/mainmatter/qunit-dom
- **@ember/test-helpers**: https://github.com/emberjs/ember-test-helpers
- **Ember Testing Guides**: https://guides.emberjs.com/release/testing/
