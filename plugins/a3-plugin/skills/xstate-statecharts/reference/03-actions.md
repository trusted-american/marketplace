## 2. Actions

Actions are fire-and-forget side effects executed during transitions or on state entry/exit. XState 5 provides a rich set of built-in action creators.

### assign — Updating Context

`assign` is the ONLY way to update a machine's context. It returns a new context object (immutable update).

#### Functional Form (recommended)

```typescript
import { assign } from 'xstate';

// Update a single property using a function.
assign({
  step: ({ context }) => context.step + 1,
})

// Update multiple properties at once.
assign({
  clientId: ({ context, event }) => event.clientId,
  step: ({ context }) => context.step + 1,
  errors: () => [], // reset errors
})

// Full replacer form — receives context and event, returns partial context.
assign(({ context, event }) => ({
  ...context,
  clientId: event.clientId,
  step: context.step + 1,
}))
```

#### Property Form

```typescript
// Set a property to a static value.
assign({
  errors: () => [],
  step: () => 0,
})
```

#### Common assign Patterns

```typescript
// Append to an array.
assign({
  errors: ({ context, event }) => [...context.errors, event.error],
})

// Remove from an array.
assign({
  items: ({ context, event }) => context.items.filter(i => i.id !== event.itemId),
})

// Toggle a boolean.
assign({
  isExpanded: ({ context }) => !context.isExpanded,
})

// Merge objects.
assign({
  formData: ({ context, event }) => ({ ...context.formData, ...event.data }),
})
```

### raise — Sending Events to Self

`raise` sends an event to the machine itself. The event is processed in the current microstep (before external events).

```typescript
import { raise } from 'xstate';

states: {
  validating: {
    entry: raise({ type: 'VALIDATE' }),
    on: {
      VALIDATE: [
        { target: 'valid', guard: 'isFormValid' },
        { target: 'invalid' },
      ],
    },
  },
}
```

Use `raise` when you need a state to immediately trigger its own transition logic without waiting for external input.

### sendTo — Sending Events to Other Actors

`sendTo` sends an event to another actor by its ID. Useful for communicating between parent and child machines, or between sibling actors.

```typescript
import { sendTo } from 'xstate';

// Send an event to a child actor by its invoke ID.
actions: sendTo('childMachine', { type: 'PARENT_READY' })

// Dynamic target and event.
actions: sendTo(
  ({ context }) => context.childRef,
  ({ context, event }) => ({
    type: 'DATA_UPDATED',
    payload: event.data,
  })
)
```

### log — Logging

`log` writes a message to the console (or a custom logger). Useful for debugging state transitions.

```typescript
import { log } from 'xstate';

entry: log('Entered the submitting state')

// Dynamic log message.
entry: log(({ context, event }) => `Processing ${event.type} with step=${context.step}`)
```

### emit — Emitting Events to Parent

`emit` sends an event upward to the parent actor (the actor that spawned or invoked this machine).

```typescript
import { emit } from 'xstate';

actions: emit({ type: 'ENROLLMENT_COMPLETE', enrollmentId: '456' })

// Dynamic emission.
actions: emit(({ context }) => ({
  type: 'STATUS_CHANGED',
  status: context.currentStatus,
}))
```

### stop — Stopping Child Actors

`stop` terminates a running child actor.

```typescript
import { stop } from 'xstate';

// Stop a specific child actor by ID.
actions: stop('pollingActor')

// Stop a dynamic actor reference from context.
actions: stop(({ context }) => context.activeWorker)
```

### cancel — Canceling Delayed Transitions

`cancel` cancels a pending delayed transition or delayed `sendTo` by its ID.

```typescript
import { cancel } from 'xstate';

states: {
  active: {
    after: {
      5000: { target: 'timeout', id: 'activityTimeout' },
    },
    on: {
      USER_ACTIVITY: {
        // Reset the timeout by canceling and re-entering.
        actions: cancel('activityTimeout'),
        target: 'active',
        reenter: true,
      },
    },
  },
}
```

### enqueueActions — Dynamically Choosing Actions

`enqueueActions` lets you conditionally enqueue actions at transition time. This replaces the deprecated `pure` action.

```typescript
import { enqueueActions } from 'xstate';

actions: enqueueActions(({ context, event, enqueue }) => {
  enqueue(assign({ lastEvent: () => event.type }));

  if (context.attempts > 3) {
    enqueue(raise({ type: 'MAX_ATTEMPTS' }));
  }

  if (event.shouldNotify) {
    enqueue(sendTo('notificationActor', { type: 'NOTIFY' }));
  }

  enqueue(log(`Processed ${event.type}`));
})
```

### forwardTo — Forwarding Events to Child Actors

`forwardTo` passes the current event directly to a child actor.

```typescript
import { forwardTo } from 'xstate';

on: {
  '*': {
    actions: forwardTo('childMachine'),
  },
}
```

### escalate — Escalating Errors to Parent

`escalate` reports an error to the parent actor, causing the parent's `onError` handler to trigger.

```typescript
import { escalate } from 'xstate';

states: {
  failure: {
    entry: escalate({ message: 'Enrollment submission failed', code: 'SUBMIT_ERROR' }),
  },
}
```

### pure (Deprecated)

`pure` was used for conditional actions in XState 4. In XState 5, use `enqueueActions` instead.

```typescript
// DEPRECATED — do not use in new code.
import { pure } from 'xstate';

actions: pure(({ context }) => {
  if (context.shouldLog) {
    return [log('Conditional log')];
  }
  return [];
})
```

### Entry and Exit Actions on States

Entry actions fire when a state is entered. Exit actions fire when a state is exited. They are declared directly on state nodes.

```typescript
states: {
  loading: {
    entry: [
      assign({ isLoading: () => true }),
      log('Loading started'),
      'trackLoadingAnalytics',
    ],
    exit: [
      assign({ isLoading: () => false }),
      log('Loading ended'),
    ],
    invoke: {
      src: 'fetchData',
      onDone: 'success',
      onError: 'error',
    },
  },
}
```

Entry/exit actions are one of the most important patterns in statecharts. They let you colocate setup and teardown logic with the state that needs it, rather than scattering it across transitions.

---
