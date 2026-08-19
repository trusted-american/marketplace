## 10. Testing Statecharts

### Unit Testing Machines with createActor

XState 5 provides `createActor` for running machines in tests. Use `getSnapshot` to inspect current state.

```typescript
import { createActor } from 'xstate';
import { enrollmentMachine } from './enrollment-machine';

module('Unit | Machine | enrollment', function () {
  test('starts in idle state', function (assert) {
    const actor = createActor(enrollmentMachine);
    actor.start();

    assert.strictEqual(actor.getSnapshot().value, 'idle');

    actor.stop();
  });

  test('transitions from idle to selectClient on START', function (assert) {
    const actor = createActor(enrollmentMachine);
    actor.start();

    actor.send({ type: 'START' });

    assert.strictEqual(actor.getSnapshot().value, 'selectClient');

    actor.stop();
  });

  test('updates context on SELECT_CLIENT', function (assert) {
    const actor = createActor(enrollmentMachine);
    actor.start();

    actor.send({ type: 'START' });
    actor.send({ type: 'SELECT_CLIENT', clientId: '123' });

    const snapshot = actor.getSnapshot();
    assert.strictEqual(snapshot.value, 'selectCarrier');
    assert.strictEqual(snapshot.context.data.clientId, '123');

    actor.stop();
  });
});
```

### Testing Transitions

Verify that the machine transitions correctly for various event sequences.

```typescript
test('full happy path through wizard', function (assert) {
  const actor = createActor(enrollmentMachine.provide({
    actors: {
      submitEnrollment: fromPromise(async () => ({ id: 'enroll-001' })),
    },
  }));
  actor.start();

  actor.send({ type: 'START' });
  assert.strictEqual(actor.getSnapshot().value, 'selectClient');

  actor.send({ type: 'SELECT_CLIENT', clientId: 'c1' });
  assert.strictEqual(actor.getSnapshot().value, 'selectCarrier');

  actor.send({ type: 'SELECT_CARRIER', carrierId: 'cr1' });
  assert.strictEqual(actor.getSnapshot().value, 'enterDetails');

  actor.send({ type: 'SUBMIT' });
  assert.strictEqual(actor.getSnapshot().value, 'submitting');

  actor.stop();
});

test('BACK navigation works at each step', function (assert) {
  const actor = createActor(enrollmentMachine);
  actor.start();

  actor.send({ type: 'START' });
  actor.send({ type: 'SELECT_CLIENT', clientId: 'c1' });
  actor.send({ type: 'BACK' });

  assert.strictEqual(actor.getSnapshot().value, 'selectClient');

  actor.stop();
});

test('ignores invalid events in current state', function (assert) {
  const actor = createActor(enrollmentMachine);
  actor.start();

  // SUBMIT is not valid in 'idle' state.
  actor.send({ type: 'SUBMIT' });
  assert.strictEqual(actor.getSnapshot().value, 'idle');

  actor.stop();
});
```

### Testing Guards

```typescript
test('SUBMIT is blocked when form is invalid', function (assert) {
  const actor = createActor(
    formMachine.provide({
      guards: {
        isFormValid: () => false, // override guard to always fail
      },
    })
  );
  actor.start();

  // Navigate to a state where SUBMIT is guarded.
  actor.send({ type: 'INITIALIZE', values: {} });
  actor.send({ type: 'SUBMIT' });

  // Should NOT transition to submitting because guard returned false.
  assert.notStrictEqual(actor.getSnapshot().value, 'submitting');

  actor.stop();
});

test('SUBMIT proceeds when form is valid', function (assert) {
  const actor = createActor(
    formMachine.provide({
      guards: {
        isFormValid: () => true,
      },
      actors: {
        validateForm: fromPromise(async () => ({ errors: {} })),
        submitForm: fromPromise(async () => ({ success: true })),
      },
    })
  );
  actor.start();

  actor.send({ type: 'INITIALIZE', values: { name: 'Test' } });
  actor.send({ type: 'SUBMIT' });

  // Should transition to validating (then eventually submitting).
  assert.strictEqual(actor.getSnapshot().value, 'validating');

  actor.stop();
});
```

### Testing Actions

Verify that actions update context correctly.

```typescript
test('SELECT_CLIENT assigns clientId to context', function (assert) {
  const actor = createActor(enrollmentMachine);
  actor.start();

  actor.send({ type: 'START' });
  actor.send({ type: 'SELECT_CLIENT', clientId: 'abc-123' });

  assert.strictEqual(actor.getSnapshot().context.data.clientId, 'abc-123');

  actor.stop();
});

test('RESET clears form data', function (assert) {
  const actor = createActor(formMachine);
  actor.start();

  actor.send({ type: 'INITIALIZE', values: { name: 'Original' } });
  actor.send({ type: 'CHANGE', field: 'name', value: 'Modified' });

  assert.true(actor.getSnapshot().context.isDirty);

  actor.send({ type: 'RESET' });

  assert.false(actor.getSnapshot().context.isDirty);
  assert.deepEqual(actor.getSnapshot().context.values, { name: 'Original' });

  actor.stop();
});
```

### Testing Async Invocations

```typescript
test('submitting resolves to success', async function (assert) {
  const actor = createActor(
    enrollmentMachine.provide({
      actors: {
        submitEnrollment: fromPromise(async () => ({ id: 'enroll-999' })),
      },
    })
  );

  // Subscribe to state changes to detect when we reach 'success'.
  const done = new Promise<void>((resolve) => {
    actor.subscribe((snapshot) => {
      if (snapshot.value === 'success') {
        assert.strictEqual(snapshot.context.enrollmentId, 'enroll-999');
        resolve();
      }
    });
  });

  actor.start();
  actor.send({ type: 'START' });
  actor.send({ type: 'SELECT_CLIENT', clientId: 'c1' });
  actor.send({ type: 'SELECT_CARRIER', carrierId: 'cr1' });
  actor.send({ type: 'SUBMIT' });

  await done;
  actor.stop();
});

test('submitting handles errors and returns to enterDetails', async function (assert) {
  const actor = createActor(
    enrollmentMachine.provide({
      actors: {
        submitEnrollment: fromPromise(async () => {
          throw new Error('Network failure');
        }),
      },
    })
  );

  const done = new Promise<void>((resolve) => {
    actor.subscribe((snapshot) => {
      if (snapshot.value === 'enterDetails' && snapshot.context.errors.length > 0) {
        assert.deepEqual(snapshot.context.errors, ['Network failure']);
        resolve();
      }
    });
  });

  actor.start();
  actor.send({ type: 'START' });
  actor.send({ type: 'SELECT_CLIENT', clientId: 'c1' });
  actor.send({ type: 'SELECT_CARRIER', carrierId: 'cr1' });
  actor.send({ type: 'SUBMIT' });

  await done;
  actor.stop();
});
```

### Integration Testing with Ember Components

```typescript
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | enrollment-wizard', function (hooks) {
  setupRenderingTest(hooks);

  test('renders initial idle state', async function (assert) {
    await render(hbs`<EnrollmentWizard />`);

    assert.dom('[data-test-step="idle"]').exists();
    assert.dom('[data-test-start-button]').exists();
  });

  test('navigates through wizard steps', async function (assert) {
    await render(hbs`<EnrollmentWizard />`);

    await click('[data-test-start-button]');
    assert.dom('[data-test-step="selectClient"]').exists();

    await click('[data-test-client="123"]');
    assert.dom('[data-test-step="selectCarrier"]').exists();

    await click('[data-test-back-button]');
    assert.dom('[data-test-step="selectClient"]').exists();
  });

  test('shows loading state during submission', async function (assert) {
    await render(hbs`<EnrollmentWizard />`);

    // Navigate to the submit step...
    await click('[data-test-start-button]');
    await click('[data-test-client="123"]');
    await click('[data-test-carrier="456"]');
    await fillIn('[data-test-details-input]', 'Test data');
    await click('[data-test-submit-button]');

    assert.dom('[data-test-step="submitting"]').exists();
    assert.dom('[data-test-spinner]').exists();
  });
});
```

---
