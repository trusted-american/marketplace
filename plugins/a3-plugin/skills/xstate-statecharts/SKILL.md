---
name: xstate-statecharts
description: XState 5 and ember-statechart-component reference — state machine patterns for complex UI workflows in A3
version: 0.1.0
---

# XState & Statecharts Reference

## Overview

A3 uses XState 5 with ember-statechart-component for managing complex UI state machines. This is used for multi-step workflows, form wizards, and complex interaction patterns. Statecharts are an extension of finite state machines that add hierarchy (nested states), orthogonality (parallel states), and history, making them suitable for modeling real-world application behavior that would be unwieldy with simple boolean flags or enum-based state tracking.

This reference covers the full XState 5 API surface, integration with Ember/Glimmer via ember-statechart-component, A3-specific patterns, testing strategies, and TypeScript typing.

---

## 1. XState 5 Core Concepts

### createMachine

`createMachine` is the primary factory function for defining a state machine. It accepts a single configuration object describing every aspect of the machine's behavior.

```typescript
import { createMachine } from 'xstate';

const machine = createMachine({
  // Unique identifier for this machine. Used for logging, devtools, and
  // generating stable state IDs (e.g., '#enrollment.selectClient').
  id: 'enrollment',

  // The initial child state the machine enters when started.
  initial: 'idle',

  // Extended state — arbitrary typed data that persists across transitions.
  context: {
    step: 0,
    data: {},
    errors: [] as string[],
  },

  // State node definitions — the finite states of the machine.
  states: {
    idle: {
      // 'on' maps event types to transitions.
      on: {
        START: { target: 'selectClient' },
      },
      // 'entry' actions fire when entering this state.
      entry: ['logEntry'],
      // 'exit' actions fire when leaving this state.
      exit: ['logExit'],
      // 'tags' — metadata labels you can query with state.hasTag('busy').
      tags: ['initial'],
      // 'meta' — arbitrary metadata attached to this state node.
      meta: {
        description: 'Waiting for the user to begin enrollment',
      },
    },
    selectClient: {
      on: {
        SELECT_CLIENT: 'selectCarrier',
        BACK: 'idle',
      },
      // 'always' — eventless (transient) transitions evaluated immediately
      // on entry; the first whose guard passes wins.
      always: [
        { target: 'selectCarrier', guard: 'clientAlreadySelected' },
      ],
    },
    selectCarrier: {
      on: {
        SELECT_CARRIER: 'enterDetails',
        BACK: 'selectClient',
      },
      // 'after' — delayed (timed) transitions.
      after: {
        // After 300000ms (5 min) of inactivity in this state, go to timeout.
        300000: { target: 'timeout' },
      },
    },
    enterDetails: {
      on: {
        SUBMIT: 'submitting',
        BACK: 'selectCarrier',
      },
    },
    submitting: {
      // 'invoke' — spawn an async service/actor tied to this state's lifecycle.
      invoke: {
        id: 'submitEnrollment',
        src: 'submitEnrollment',
        onDone: { target: 'success' },
        onError: { target: 'enterDetails' },
      },
    },
    success: {
      // 'type: final' marks this state as a terminal state.
      type: 'final',
    },
    timeout: {
      type: 'final',
    },
  },
});
```

#### Key top-level properties

| Property   | Purpose |
|------------|---------|
| `id`       | Machine identifier string. Shows in devtools and is used to build fully qualified state IDs like `#enrollment.selectClient`. |
| `initial`  | The key of the child state the machine enters on start. Required for compound state nodes. |
| `context`  | The extended (quantitative) state. Can be any serializable value. Updated exclusively through `assign` actions. |
| `states`   | An object whose keys are state names and whose values are state node configs. |
| `on`       | Global event handlers — transitions that apply regardless of which child state is active. |
| `type`     | `'atomic'` (default), `'compound'` (has children), `'parallel'`, `'final'`, or `'history'`. |
| `entry`    | Action(s) executed when the machine itself is entered (i.e., on start). |
| `exit`     | Action(s) executed when the machine reaches a final state. |
| `always`   | Eventless transitions evaluated on every microstep. |
| `after`    | Delayed transitions — maps of milliseconds to transitions. |
| `invoke`   | Actors/services to spawn when this state is entered and stop when exited. |
| `tags`     | Array of string tags queryable via `state.hasTag()`. |
| `meta`     | Arbitrary metadata object. |

---

### State Nodes

XState supports five types of state nodes, each serving a distinct modeling purpose.

#### Atomic States

The simplest state node. Has no child states. This is the default when `states` is omitted.

```typescript
states: {
  idle: {
    // No 'states' property — this is atomic.
    on: { START: 'active' },
  },
  active: {
    on: { STOP: 'idle' },
  },
}
```

#### Compound (Nested) States

A state that contains child states. Requires an `initial` property to specify which child is entered first.

```typescript
states: {
  editing: {
    initial: 'name',
    states: {
      name: {
        on: { NEXT: 'address' },
      },
      address: {
        on: {
          NEXT: 'review',
          BACK: 'name',
        },
      },
      review: {
        on: { BACK: 'address' },
      },
    },
    // Events defined here apply to ALL child states of 'editing'.
    on: {
      CANCEL: '#enrollment.idle', // absolute target using machine id
    },
  },
}
```

Compound states let you model hierarchical behavior. Any event handler on a parent state applies to all descendants unless overridden. This is how statecharts avoid the combinatorial explosion of flat state machines.

#### Parallel States

A state where ALL child regions are active simultaneously. There is no `initial` property because every region starts.

```typescript
states: {
  filling: {
    type: 'parallel',
    states: {
      personalInfo: {
        initial: 'incomplete',
        states: {
          incomplete: {
            on: { COMPLETE_PERSONAL: 'complete' },
          },
          complete: { type: 'final' },
        },
      },
      employmentInfo: {
        initial: 'incomplete',
        states: {
          incomplete: {
            on: { COMPLETE_EMPLOYMENT: 'complete' },
          },
          complete: { type: 'final' },
        },
      },
    },
    // onDone fires when ALL parallel regions reach their final states.
    onDone: 'review',
  },
}
```

#### Final States

A terminal state from which no transitions are possible. When a final state is reached inside a compound state, the parent receives a `done` event.

```typescript
states: {
  success: {
    type: 'final',
    // You can attach output data to a final state.
    output: ({ context }) => ({
      enrollmentId: context.enrollmentId,
    }),
  },
}
```

#### History States

A pseudo-state that remembers which child state was last active. Used to return to a previous state configuration after an interruption.

```typescript
states: {
  editing: {
    initial: 'step1',
    states: {
      step1: { on: { NEXT: 'step2' } },
      step2: { on: { NEXT: 'step3' } },
      step3: {},
      // Shallow history — remembers the immediate child (step1, step2, or step3).
      hist: {
        type: 'history',
        history: 'shallow', // default
      },
      // Deep history — remembers the entire nested state configuration.
      deepHist: {
        type: 'history',
        history: 'deep',
      },
    },
    on: {
      INTERRUPT: 'interrupted',
    },
  },
  interrupted: {
    on: {
      // Resume returns to whichever step was active before interruption.
      RESUME: 'editing.hist',
    },
  },
}
```

**Shallow vs. deep history**: Shallow history remembers only the immediate child state of the parent containing the history node. Deep history remembers the entire nested state tree. Use deep history when your states have multiple levels of nesting and you want full restoration.

---

### Events

Events are the inputs that drive transitions. In XState 5, events are always objects with a `type` string property.

#### Typed Events

```typescript
// Simple event — just a type string.
machine.send({ type: 'START' });

// Event with payload.
machine.send({
  type: 'SELECT_CLIENT',
  client: { id: '123', name: 'Acme Corp' },
});

// Event with multiple payload fields.
machine.send({
  type: 'UPDATE_FIELD',
  field: 'firstName',
  value: 'Jane',
});
```

#### Shorthand vs. Object Targets

In `on` handlers you can use a string shorthand for simple transitions:

```typescript
on: {
  // Shorthand — just a target.
  START: 'active',

  // Object form — allows actions, guards, description.
  START: {
    target: 'active',
    actions: 'logStart',
    guard: 'isReady',
    description: 'Begin the enrollment flow',
  },

  // Array form — multiple candidate transitions (first match wins).
  START: [
    { target: 'express', guard: 'isExpressEligible' },
    { target: 'standard' },
  ],
}
```

#### Eventless Transitions (always)

Eventless transitions are evaluated automatically whenever a state is entered (or re-entered). They do not wait for an external event. The first transition whose guard passes is taken.

```typescript
states: {
  checking: {
    always: [
      { target: 'approved', guard: 'meetsThreshold' },
      { target: 'needsReview', guard: 'requiresManualReview' },
      { target: 'rejected' }, // fallback — no guard
    ],
  },
}
```

Use `always` for routing logic: enter a transient state, evaluate conditions, and immediately transition to the correct destination.

---

### Context

Context is the extended (quantitative) state of a machine. While finite states represent qualitative modes (idle, loading, error), context holds the data that varies within those modes.

#### Defining Typed Context

```typescript
interface EnrollmentContext {
  step: number;
  clientId: string | null;
  carrierId: string | null;
  formData: Record<string, unknown>;
  errors: string[];
  attempts: number;
}

const machine = createMachine({
  id: 'enrollment',
  initial: 'idle',
  context: {
    step: 0,
    clientId: null,
    carrierId: null,
    formData: {},
    errors: [],
    attempts: 0,
  } satisfies EnrollmentContext,
  // ...
});
```

#### Reading Context in Guards

```typescript
guards: {
  hasClient: ({ context }) => context.clientId !== null,
  maxAttemptsReached: ({ context }) => context.attempts >= 3,
  isValidForm: ({ context }) => {
    return Object.keys(context.formData).length > 0 && context.errors.length === 0;
  },
}
```

#### Reading Context in Actions

```typescript
actions: {
  logAttempt: ({ context }) => {
    console.log(`Attempt ${context.attempts} for client ${context.clientId}`);
  },
}
```

#### Dynamic Initial Context

If you need the initial context to depend on runtime values, use the `input` mechanism:

```typescript
const machine = createMachine({
  context: ({ input }: { input: { clientId: string } }) => ({
    clientId: input.clientId,
    step: 0,
    errors: [],
  }),
  // ...
});

// When creating the actor:
const actor = createActor(machine, { input: { clientId: '123' } });
```

---

### Transitions

A transition describes what happens when an event occurs in a given state. Transitions can specify a target state, actions to execute, guards to check, and more.

```typescript
on: {
  SUBMIT: {
    // 'target' — the destination state. Can be:
    //   - a sibling: 'submitting'
    //   - a child: '.loading'
    //   - absolute: '#enrollment.submitting'
    //   - undefined (self-transition with no state change)
    target: 'submitting',

    // 'actions' — side effects to execute during the transition.
    actions: [
      assign({ attempts: ({ context }) => context.attempts + 1 }),
      'logSubmission',
    ],

    // 'guard' — a condition that must be true for this transition to be taken.
    guard: 'isValidForm',

    // 'description' — human-readable description for devtools and documentation.
    description: 'Submit the enrollment form for processing',

    // 'reenter' — if true, the target state's entry/exit actions fire even
    // if the machine is already in that state (self-transition).
    reenter: true,
  },
}
```

#### Self-Transitions

A transition with no target (or target equal to the current state) is a self-transition. By default it does NOT re-enter the state (entry/exit actions do not fire). Set `reenter: true` to force re-entry.

```typescript
on: {
  RETRY: {
    // No target — stays in the same state.
    actions: assign({ attempts: ({ context }) => context.attempts + 1 }),
  },
  REFRESH: {
    target: 'loading',  // same state
    reenter: true,       // forces entry/exit to re-fire
  },
}
```

#### Forbidden Transitions

Use `undefined` as the target to explicitly forbid an event in a given state (preventing it from bubbling to a parent handler):

```typescript
on: {
  DELETE: undefined, // explicitly blocked in this state
}
```

---

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

## 3. Guards (Conditional Transitions)

Guards are boolean predicates that determine whether a transition can be taken. If a guard returns `false`, the transition is skipped and the next candidate transition (if any) is evaluated.

### Inline Guards

```typescript
on: {
  SUBMIT: {
    target: 'submitting',
    guard: ({ context }) => context.formData !== null && context.errors.length === 0,
  },
}
```

### Named Guards with Implementations

Named guards are defined in the machine's `guards` configuration and referenced by name. This improves readability and reusability.

```typescript
const machine = createMachine({
  // ...
  on: {
    SUBMIT: {
      target: 'submitting',
      guard: 'isFormValid',
    },
    DELETE: {
      target: 'deleting',
      guard: 'canDelete',
    },
  },
}).provide({
  guards: {
    isFormValid: ({ context }) => {
      return context.formData !== null && context.errors.length === 0;
    },
    canDelete: ({ context }) => {
      return context.status === 'draft' && context.permissions.includes('delete');
    },
  },
});
```

### Guard Combinators: and, or, not

XState 5 provides logical combinators for composing guards.

```typescript
import { and, or, not } from 'xstate';

on: {
  SUBMIT: {
    target: 'submitting',
    guard: and(['isFormValid', 'hasRequiredFields']),
  },
  DELETE: {
    target: 'confirming',
    guard: or(['isAdmin', 'isOwner']),
  },
  ARCHIVE: {
    target: 'archiving',
    guard: not('isArchived'),
  },
  PUBLISH: {
    target: 'publishing',
    // Complex composition: (isAdmin OR isOwner) AND NOT isLocked AND hasContent
    guard: and([
      or(['isAdmin', 'isOwner']),
      not('isLocked'),
      'hasContent',
    ]),
  },
}
```

### Guarded Transitions with Multiple Targets

When an event has multiple candidate transitions, they are evaluated in order. The first transition whose guard passes is taken.

```typescript
on: {
  SUBMIT: [
    {
      target: 'expressProcessing',
      guard: 'isExpressEligible',
      actions: assign({ route: () => 'express' }),
    },
    {
      target: 'manualReview',
      guard: 'requiresReview',
      actions: assign({ route: () => 'manual' }),
    },
    {
      // Fallback — no guard means always true.
      target: 'standardProcessing',
      actions: assign({ route: () => 'standard' }),
    },
  ],
}
```

---

## 4. Invoked Actors and Services

The `invoke` property on a state node spawns an actor when the state is entered and automatically stops it when the state is exited. This is the primary mechanism for handling asynchronous operations.

### invoke with Promise (Async Operations)

The most common pattern. The invoked function returns a Promise. On resolution, `onDone` fires. On rejection, `onError` fires.

```typescript
states: {
  loading: {
    invoke: {
      id: 'fetchEnrollments',
      src: 'fetchEnrollments',
      onDone: {
        target: 'loaded',
        actions: assign({
          enrollments: ({ event }) => event.output,
        }),
      },
      onError: {
        target: 'error',
        actions: assign({
          errorMessage: ({ event }) => event.error.message,
        }),
      },
    },
  },
}

// Provide the implementation:
machine.provide({
  actors: {
    fetchEnrollments: fromPromise(async ({ input }) => {
      const response = await fetch(`/api/enrollments?clientId=${input.clientId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }),
  },
});
```

### invoke with Callback (Long-Running Processes)

Callback actors are long-running processes that can send events back to the parent over time. They receive a `sendBack` function and a `receive` function.

```typescript
import { fromCallback } from 'xstate';

const pollingActor = fromCallback(({ sendBack, receive, input }) => {
  const intervalId = setInterval(() => {
    sendBack({ type: 'POLL_RESULT', data: Date.now() });
  }, input.interval);

  // Listen for events from the parent.
  receive((event) => {
    if (event.type === 'CHANGE_INTERVAL') {
      clearInterval(intervalId);
      // Restart with new interval — simplified example.
    }
  });

  // Cleanup function — called when the invoking state is exited.
  return () => {
    clearInterval(intervalId);
  };
});

states: {
  monitoring: {
    invoke: {
      id: 'poller',
      src: 'pollingActor',
      input: { interval: 5000 },
    },
    on: {
      POLL_RESULT: {
        actions: assign({
          lastPollTime: ({ event }) => event.data,
        }),
      },
    },
  },
}
```

### invoke with Observable

Observable actors emit events over time using an RxJS-compatible observable.

```typescript
import { fromObservable } from 'xstate';
import { interval } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

const timerActor = fromObservable(({ input }) =>
  interval(1000).pipe(
    map(i => ({ type: 'TICK', elapsed: i + 1 })),
    takeWhile(event => event.elapsed <= input.duration)
  )
);

states: {
  countdown: {
    invoke: {
      src: 'timerActor',
      input: { duration: 10 },
      onDone: 'complete',
    },
    on: {
      TICK: {
        actions: assign({
          timeRemaining: ({ context, event }) => context.totalTime - event.elapsed,
        }),
      },
    },
  },
}
```

### invoke with Another Machine (Child Machine)

You can invoke an entire state machine as a child actor. The parent and child communicate via events.

```typescript
const childMachine = createMachine({
  id: 'validation',
  initial: 'validating',
  context: ({ input }: { input: { formData: Record<string, unknown> } }) => ({
    formData: input.formData,
    results: [] as string[],
  }),
  states: {
    validating: {
      always: [
        { target: 'valid', guard: 'allFieldsValid' },
        { target: 'invalid' },
      ],
    },
    valid: { type: 'final' },
    invalid: { type: 'final' },
  },
  output: ({ context }) => ({
    isValid: context.results.length === 0,
    errors: context.results,
  }),
});

const parentMachine = createMachine({
  states: {
    validating: {
      invoke: {
        id: 'validationMachine',
        src: 'validationMachine',
        input: ({ context }) => ({ formData: context.formData }),
        onDone: [
          {
            target: 'submitting',
            guard: ({ event }) => event.output.isValid,
          },
          {
            target: 'editing',
            actions: assign({
              errors: ({ event }) => event.output.errors,
            }),
          },
        ],
      },
    },
  },
});
```

### onDone and onError Handling

`onDone` fires when an invoked actor completes successfully. `onError` fires when it throws or rejects.

```typescript
invoke: {
  src: 'saveEnrollment',
  onDone: {
    target: 'saved',
    actions: [
      assign({ savedId: ({ event }) => event.output.id }),
      log(({ event }) => `Saved enrollment ${event.output.id}`),
    ],
  },
  onError: {
    target: 'error',
    actions: [
      assign({
        errors: ({ context, event }) => [
          ...context.errors,
          event.error?.message ?? 'Unknown error',
        ],
      }),
      log(({ event }) => `Save failed: ${event.error?.message}`),
    ],
  },
}
```

### Input to Invoked Actors

Pass data from the parent machine's context to an invoked actor using `input`.

```typescript
invoke: {
  src: 'fetchClientDetails',
  input: ({ context }) => ({
    clientId: context.selectedClientId,
    includeHistory: context.showHistory,
  }),
}

// The actor receives input in its factory:
const fetchClientDetails = fromPromise(async ({ input }) => {
  const { clientId, includeHistory } = input;
  return fetch(`/api/clients/${clientId}?history=${includeHistory}`).then(r => r.json());
});
```

### Stopping Invoked Actors

Invoked actors are automatically stopped when the invoking state is exited. You can also manually stop them using the `stop` action:

```typescript
on: {
  CANCEL_UPLOAD: {
    actions: stop('uploadActor'),
    target: 'idle',
  },
}
```

---

## 5. Delayed Transitions

Delayed transitions automatically fire after a specified duration if the machine is still in the given state.

### Static Delays

```typescript
states: {
  notification: {
    after: {
      // After 3 seconds, transition to 'dismissed'.
      3000: { target: 'dismissed' },
    },
    on: {
      DISMISS: 'dismissed', // user can dismiss early
    },
  },
  debouncing: {
    after: {
      // After 300ms, trigger the search.
      300: { target: 'searching' },
    },
    on: {
      INPUT_CHANGE: {
        // Each new keystroke resets the debounce by re-entering.
        target: 'debouncing',
        reenter: true,
        actions: assign({ query: ({ event }) => event.value }),
      },
    },
  },
}
```

### Dynamic Delays

The delay can be a function that returns milliseconds, allowing context-dependent timing.

```typescript
states: {
  retrying: {
    after: {
      retryDelay: {
        target: 'fetching',
      },
    },
  },
}

// In the machine setup:
machine.provide({
  delays: {
    retryDelay: ({ context }) => {
      // Exponential backoff: 1s, 2s, 4s, 8s...
      return Math.min(1000 * Math.pow(2, context.retryCount), 30000);
    },
  },
});
```

### Named Delays and Cancellation

Give a delayed transition an `id` so it can be canceled.

```typescript
states: {
  active: {
    after: {
      60000: {
        target: 'sessionTimeout',
        id: 'sessionTimer',
      },
    },
    on: {
      USER_ACTIVITY: {
        // Cancel and restart the timer.
        actions: cancel('sessionTimer'),
        target: 'active',
        reenter: true,
      },
    },
  },
}
```

---

## 6. Parallel States

Parallel states model orthogonal (independent) concerns that are active simultaneously within a single machine.

```typescript
const formMachine = createMachine({
  id: 'form',
  type: 'parallel',
  states: {
    // Region 1: Field validation
    validation: {
      initial: 'pristine',
      states: {
        pristine: {
          on: { CHANGE: 'dirty' },
        },
        dirty: {
          on: {
            VALIDATE: 'validating',
          },
        },
        validating: {
          invoke: {
            src: 'validateFields',
            onDone: [
              { target: 'valid', guard: ({ event }) => event.output.isValid },
              { target: 'invalid' },
            ],
          },
        },
        valid: {
          on: { CHANGE: 'dirty' },
          type: 'final',
        },
        invalid: {
          on: { CHANGE: 'dirty' },
        },
      },
    },

    // Region 2: Save status
    saveStatus: {
      initial: 'unsaved',
      states: {
        unsaved: {
          on: { SAVE: 'saving' },
        },
        saving: {
          invoke: {
            src: 'saveForm',
            onDone: 'saved',
            onError: 'saveError',
          },
        },
        saved: {
          on: { CHANGE: 'unsaved' },
          type: 'final',
        },
        saveError: {
          on: { SAVE: 'saving' },
        },
      },
    },

    // Region 3: UI state
    ui: {
      initial: 'collapsed',
      states: {
        collapsed: {
          on: { TOGGLE: 'expanded' },
        },
        expanded: {
          on: { TOGGLE: 'collapsed' },
          type: 'final',
        },
      },
    },
  },
});
```

Each region transitions independently. The `CHANGE` event, for example, affects both the `validation` and `saveStatus` regions simultaneously. When all parallel regions reach a final state, the parent's `onDone` is triggered.

---

## 7. History States

History states let a machine "remember" which child state was previously active so it can return there later.

### Shallow History

Remembers only the direct child state of the parent.

```typescript
const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'filling',
  states: {
    filling: {
      initial: 'step1',
      states: {
        step1: {
          on: { NEXT: 'step2' },
        },
        step2: {
          initial: 'substep2a',
          states: {
            substep2a: { on: { NEXT: 'substep2b' } },
            substep2b: { on: { NEXT: '#wizard.filling.step3' } },
          },
          on: { BACK: 'step1' },
        },
        step3: {
          on: { BACK: 'step2' },
        },
        // Shallow history: remembers step1, step2, or step3.
        // If step2 was active, it DOES NOT remember substep2a vs substep2b.
        hist: { type: 'history', history: 'shallow' },
      },
      on: {
        HELP: 'help',
      },
    },
    help: {
      on: {
        BACK: 'filling.hist', // returns to last active step
      },
    },
  },
});
```

### Deep History

Remembers the entire nested state configuration.

```typescript
states: {
  filling: {
    initial: 'step1',
    states: {
      step1: { /* ... */ },
      step2: {
        initial: 'substep2a',
        states: {
          substep2a: { /* ... */ },
          substep2b: { /* ... */ },
        },
      },
      step3: { /* ... */ },
      // Deep history: remembers the full path, e.g., step2.substep2b.
      deepHist: { type: 'history', history: 'deep' },
    },
    on: {
      HELP: 'help',
    },
  },
  help: {
    on: {
      BACK: 'filling.deepHist', // returns to exact nested state
    },
  },
}
```

Use deep history when your nested states themselves have children and you want full restoration of the user's position.

---

## 8. ember-statechart-component Integration

### useMachine

The `useMachine` resource connects an XState machine to an Ember/Glimmer component's lifecycle. The machine starts when the component is created and stops when it is destroyed.

```typescript
import Component from '@glimmer/component';
import { useMachine } from 'ember-statechart-component';
import { action } from '@ember/object';
import { createMachine, assign, fromPromise } from 'xstate';

interface EnrollmentWizardArgs {
  clientId: string;
  onComplete: (enrollmentId: string) => void;
}

const enrollmentMachine = createMachine({
  id: 'enrollment',
  initial: 'idle',
  context: {
    step: 0,
    data: {} as Record<string, unknown>,
    errors: [] as string[],
    enrollmentId: null as string | null,
  },
  states: {
    idle: { on: { START: 'selectClient' } },
    selectClient: {
      on: {
        SELECT_CLIENT: {
          target: 'selectCarrier',
          actions: assign({
            data: ({ context, event }) => ({
              ...context.data,
              clientId: event.clientId,
            }),
          }),
        },
      },
    },
    selectCarrier: {
      on: {
        SELECT_CARRIER: {
          target: 'enterDetails',
          actions: assign({
            data: ({ context, event }) => ({
              ...context.data,
              carrierId: event.carrierId,
            }),
          }),
        },
        BACK: 'selectClient',
      },
    },
    enterDetails: {
      on: {
        SUBMIT: 'submitting',
        BACK: 'selectCarrier',
      },
    },
    submitting: {
      invoke: {
        src: 'submitEnrollment',
        onDone: {
          target: 'success',
          actions: assign({
            enrollmentId: ({ event }) => event.output.id,
          }),
        },
        onError: {
          target: 'enterDetails',
          actions: assign({
            errors: ({ event }) => [event.error.message],
          }),
        },
      },
    },
    success: { type: 'final' },
  },
});

export default class EnrollmentWizard extends Component<{
  Args: EnrollmentWizardArgs;
}> {
  machine = useMachine(this, () => ({
    machine: enrollmentMachine.provide({
      actors: {
        submitEnrollment: fromPromise(async ({ input }) => {
          const enrollment = this.store.createRecord('enrollment', input);
          await enrollment.save();
          return enrollment;
        }),
      },
    }),
  }));

  get currentStep(): string {
    return this.machine.state.value as string;
  }

  get isSubmitting(): boolean {
    return this.machine.state.matches('submitting');
  }

  get errors(): string[] {
    return this.machine.state.context.errors;
  }

  @action
  send(eventType: string, data?: Record<string, unknown>) {
    this.machine.send({ type: eventType, ...data });
  }
}
```

### Accessing State

```typescript
// Current state value — a string for atomic states, an object for compound.
this.machine.state.value;
// For nested: { editing: 'step2' }

// Full context object.
this.machine.state.context;

// Check if machine is in a specific state (supports nested matching).
this.machine.state.matches('submitting');
this.machine.state.matches({ editing: 'step2' });

// Check tags.
this.machine.state.hasTag('busy');

// Get the set of enabled events (events that have valid transitions).
this.machine.state.can({ type: 'SUBMIT' }); // boolean
```

### Sending Events

```typescript
// Simple event.
this.machine.send({ type: 'START' });

// Event with payload.
this.machine.send({ type: 'SELECT_CLIENT', clientId: '123' });

// In templates (using an action helper or modifier):
<button {{on "click" (fn this.send "START")}}>
  Begin Enrollment
</button>

<button {{on "click" (fn this.send "SELECT_CLIENT" (hash clientId=@client.id))}}>
  Select {{@client.name}}
</button>
```

### Providing Services/Actors to the Machine

Services are provided through the `.provide()` method, which allows the machine to reference functions that live in the component scope (accessing `this`, injected services, etc.).

```typescript
machine = useMachine(this, () => ({
  machine: enrollmentMachine.provide({
    actors: {
      submitEnrollment: fromPromise(async ({ input }) => {
        // Access Ember service via component's 'this'.
        const enrollment = this.store.createRecord('enrollment', input.formData);
        await enrollment.save();
        return { id: enrollment.id };
      }),
      fetchCarriers: fromPromise(async ({ input }) => {
        return this.store.query('carrier', { clientId: input.clientId });
      }),
    },
    guards: {
      isFormValid: ({ context }) => {
        return context.errors.length === 0;
      },
      hasPermission: () => {
        // Access component args.
        return this.args.permissions?.includes('enrollment.create') ?? false;
      },
    },
    actions: {
      notifyComplete: ({ context }) => {
        // Call a passed-in callback.
        this.args.onComplete?.(context.enrollmentId);
      },
      trackAnalytics: ({ context, event }) => {
        this.analytics.track('enrollment_step', {
          step: context.step,
          event: event.type,
        });
      },
    },
  }),
}));
```

### Reactivity: How State Changes Trigger Glimmer Re-renders

`useMachine` returns a tracked object. When the machine transitions to a new state, the tracked `state` property is updated, which triggers Glimmer's reactivity system to re-render any templates or getters that depend on it.

```typescript
// This getter will re-compute whenever the machine transitions.
get stepLabel(): string {
  const step = this.machine.state.value;
  const labels: Record<string, string> = {
    idle: 'Not Started',
    selectClient: 'Select Client',
    selectCarrier: 'Select Carrier',
    enterDetails: 'Enter Details',
    submitting: 'Submitting...',
    success: 'Complete',
  };
  return labels[step as string] ?? 'Unknown';
}

// In the template:
// <p>Current Step: {{this.stepLabel}}</p>
// <div class={{if this.isSubmitting "opacity-50 pointer-events-none"}}>
//   ...form content...
// </div>
```

Because Glimmer's tracking is pull-based, you do NOT need to manually call `notifyPropertyChange` or use `@tracked`. The `useMachine` resource handles tracking automatically.

### Guards with Component Context

A powerful pattern: guards that reference the component's `this` (args, services, etc.) via `.provide()`.

```typescript
machine = useMachine(this, () => ({
  machine: wizardMachine.provide({
    guards: {
      canProceed: ({ context }) => {
        // Use component arg to control behavior.
        if (this.args.mode === 'express') {
          return true; // skip validation in express mode
        }
        return context.errors.length === 0;
      },
      isAdmin: () => {
        return this.session.currentUser?.role === 'admin';
      },
      hasUnsavedChanges: ({ context }) => {
        return JSON.stringify(context.formData) !== JSON.stringify(context.savedData);
      },
    },
  }),
}));
```

---

## 9. A3 Use Cases

### Multi-Step Enrollment Wizard

The most common A3 use case for statecharts. Each step is a state, navigation is event-driven, and async submission is an invoked service.

```typescript
const enrollmentWizardMachine = createMachine({
  id: 'enrollmentWizard',
  initial: 'clientSelection',
  context: {
    clientId: null as string | null,
    carrierId: null as string | null,
    planId: null as string | null,
    members: [] as Array<{ name: string; dob: string }>,
    formData: {} as Record<string, unknown>,
    errors: [] as string[],
    enrollmentId: null as string | null,
  },
  states: {
    clientSelection: {
      on: {
        SELECT_CLIENT: {
          target: 'carrierSelection',
          actions: assign({ clientId: ({ event }) => event.clientId }),
        },
      },
    },
    carrierSelection: {
      on: {
        SELECT_CARRIER: {
          target: 'planSelection',
          actions: assign({ carrierId: ({ event }) => event.carrierId }),
        },
        BACK: 'clientSelection',
      },
    },
    planSelection: {
      on: {
        SELECT_PLAN: {
          target: 'memberInfo',
          actions: assign({ planId: ({ event }) => event.planId }),
        },
        BACK: 'carrierSelection',
      },
    },
    memberInfo: {
      on: {
        ADD_MEMBER: {
          actions: assign({
            members: ({ context, event }) => [...context.members, event.member],
          }),
        },
        REMOVE_MEMBER: {
          actions: assign({
            members: ({ context, event }) =>
              context.members.filter((_, i) => i !== event.index),
          }),
        },
        NEXT: { target: 'review', guard: 'hasMembers' },
        BACK: 'planSelection',
      },
    },
    review: {
      on: {
        SUBMIT: 'submitting',
        BACK: 'memberInfo',
        EDIT_STEP: [
          { target: 'clientSelection', guard: ({ event }) => event.step === 'client' },
          { target: 'carrierSelection', guard: ({ event }) => event.step === 'carrier' },
          { target: 'planSelection', guard: ({ event }) => event.step === 'plan' },
          { target: 'memberInfo', guard: ({ event }) => event.step === 'members' },
        ],
      },
    },
    submitting: {
      invoke: {
        src: 'submitEnrollment',
        onDone: {
          target: 'success',
          actions: assign({ enrollmentId: ({ event }) => event.output.id }),
        },
        onError: {
          target: 'review',
          actions: assign({ errors: ({ event }) => [event.error.message] }),
        },
      },
    },
    success: { type: 'final' },
  },
});
```

### Status Workflows

Model entity lifecycle states as a machine. Prevents invalid transitions and drives the UI.

```typescript
const enrollmentStatusMachine = createMachine({
  id: 'enrollmentStatus',
  initial: 'draft',
  context: {
    enrollmentId: '' as string,
    statusHistory: [] as Array<{ from: string; to: string; at: Date }>,
    reason: null as string | null,
  },
  states: {
    draft: {
      on: {
        SUBMIT_FOR_REVIEW: {
          target: 'pending',
          guard: 'isComplete',
        },
        DELETE: 'deleted',
      },
    },
    pending: {
      on: {
        APPROVE: {
          target: 'active',
          guard: 'hasApprovalAuthority',
        },
        REJECT: {
          target: 'draft',
          actions: assign({ reason: ({ event }) => event.reason }),
        },
        CANCEL: 'cancelled',
      },
    },
    active: {
      on: {
        SUSPEND: 'suspended',
        TERMINATE: {
          target: 'terminated',
          actions: assign({ reason: ({ event }) => event.reason }),
        },
        RENEW: 'renewing',
      },
    },
    suspended: {
      on: {
        REINSTATE: 'active',
        TERMINATE: 'terminated',
      },
    },
    renewing: {
      invoke: {
        src: 'processRenewal',
        onDone: 'active',
        onError: {
          target: 'active',
          actions: assign({ reason: ({ event }) => event.error.message }),
        },
      },
    },
    terminated: { type: 'final' },
    cancelled: { type: 'final' },
    deleted: { type: 'final' },
  },
});
```

### Form State Management

A generic form machine handling the full lifecycle: idle, editing, validating, submitting, and outcome states.

```typescript
const formMachine = createMachine({
  id: 'form',
  initial: 'idle',
  context: {
    initialValues: {} as Record<string, unknown>,
    values: {} as Record<string, unknown>,
    errors: {} as Record<string, string>,
    touched: {} as Record<string, boolean>,
    isDirty: false,
    submitCount: 0,
  },
  states: {
    idle: {
      on: {
        INITIALIZE: {
          target: 'editing',
          actions: assign({
            initialValues: ({ event }) => event.values,
            values: ({ event }) => event.values,
          }),
        },
      },
    },
    editing: {
      on: {
        CHANGE: {
          actions: [
            assign({
              values: ({ context, event }) => ({
                ...context.values,
                [event.field]: event.value,
              }),
              touched: ({ context, event }) => ({
                ...context.touched,
                [event.field]: true,
              }),
              isDirty: () => true,
            }),
          ],
        },
        BLUR: {
          actions: assign({
            touched: ({ context, event }) => ({
              ...context.touched,
              [event.field]: true,
            }),
          }),
        },
        VALIDATE: 'validating',
        SUBMIT: 'validating',
        RESET: {
          actions: assign({
            values: ({ context }) => context.initialValues,
            errors: () => ({}),
            touched: () => ({}),
            isDirty: () => false,
          }),
        },
      },
    },
    validating: {
      invoke: {
        src: 'validateForm',
        onDone: [
          {
            target: 'submitting',
            guard: ({ event }) => Object.keys(event.output.errors).length === 0,
          },
          {
            target: 'editing',
            actions: assign({ errors: ({ event }) => event.output.errors }),
          },
        ],
      },
    },
    submitting: {
      entry: assign({ submitCount: ({ context }) => context.submitCount + 1 }),
      invoke: {
        src: 'submitForm',
        onDone: 'success',
        onError: {
          target: 'error',
          actions: assign({
            errors: ({ event }) => ({ _form: event.error.message }),
          }),
        },
      },
    },
    success: {
      on: {
        EDIT: 'editing',
        RESET: {
          target: 'idle',
          actions: assign({
            values: () => ({}),
            errors: () => ({}),
            touched: () => ({}),
            isDirty: () => false,
          }),
        },
      },
    },
    error: {
      on: {
        RETRY: 'submitting',
        EDIT: 'editing',
      },
    },
  },
});
```

### Complex UI Interactions

Statecharts excel at managing UI components with multiple interdependent states.

#### Modal Dialog Machine

```typescript
const modalMachine = createMachine({
  id: 'modal',
  initial: 'closed',
  context: {
    data: null as unknown,
    result: null as unknown,
  },
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'opening',
          actions: assign({ data: ({ event }) => event.data }),
        },
      },
    },
    opening: {
      // Allow animation to complete.
      after: {
        300: 'open',
      },
    },
    open: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CONFIRM: 'confirming',
            EDIT: 'editing',
          },
        },
        editing: {
          on: {
            SAVE: 'saving',
            CANCEL: 'idle',
          },
        },
        saving: {
          invoke: {
            src: 'saveData',
            onDone: {
              target: 'idle',
              actions: assign({ result: ({ event }) => event.output }),
            },
            onError: 'idle',
          },
        },
        confirming: {
          on: {
            YES: '#modal.closing',
            NO: 'idle',
          },
        },
      },
      on: {
        CLOSE: 'closing',
        ESCAPE: 'closing',
      },
    },
    closing: {
      after: {
        300: {
          target: 'closed',
          actions: assign({ data: () => null }),
        },
      },
    },
  },
});
```

#### Flyout / Side Panel Machine

```typescript
const flyoutMachine = createMachine({
  id: 'flyout',
  initial: 'closed',
  context: {
    contentType: null as string | null,
    contentId: null as string | null,
    width: 400,
  },
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'open',
          actions: assign({
            contentType: ({ event }) => event.contentType,
            contentId: ({ event }) => event.contentId,
            width: ({ event }) => event.width ?? 400,
          }),
        },
      },
    },
    open: {
      on: {
        CLOSE: 'closed',
        RESIZE: {
          actions: assign({ width: ({ event }) => event.width }),
        },
        NAVIGATE: {
          actions: assign({
            contentType: ({ event }) => event.contentType,
            contentId: ({ event }) => event.contentId,
          }),
          reenter: true,
        },
      },
    },
  },
});
```

#### Accordion Machine

```typescript
const accordionMachine = createMachine({
  id: 'accordion',
  initial: 'ready',
  context: {
    openSections: new Set<string>(),
    allowMultiple: false,
  },
  states: {
    ready: {
      on: {
        TOGGLE_SECTION: {
          actions: assign({
            openSections: ({ context, event }) => {
              const next = new Set(context.openSections);
              if (next.has(event.sectionId)) {
                next.delete(event.sectionId);
              } else {
                if (!context.allowMultiple) {
                  next.clear();
                }
                next.add(event.sectionId);
              }
              return next;
            },
          }),
        },
        EXPAND_ALL: {
          actions: assign({
            openSections: ({ event }) => new Set(event.allSectionIds),
          }),
          guard: ({ context }) => context.allowMultiple,
        },
        COLLAPSE_ALL: {
          actions: assign({ openSections: () => new Set<string>() }),
        },
      },
    },
  },
});
```

---

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

## 11. Stately.ai Visual Editor

The [Stately Visual Editor](https://stately.ai/editor) is a drag-and-drop tool for designing state machines visually. It is the recommended way to prototype and document complex machines before (or alongside) writing code.

### Designing Machines Visually

1. Open https://stately.ai/editor and create a new machine.
2. Add states by clicking the canvas. Name them to match your domain (e.g., "selectClient", "enterDetails").
3. Draw transitions between states by clicking a source state and dragging to a target.
4. Add events to transitions by naming them (e.g., "SELECT_CLIENT").
5. Add actions, guards, and context through the property panel on the right.
6. Use the "Simulate" tab to step through the machine interactively, verifying correct behavior.

### Exporting to Code

1. Click "Export" in the top menu.
2. Select "XState v5" as the output format.
3. Copy the generated TypeScript code.
4. Paste into your project and customize (add typed context, provide real actor implementations, etc.).

The exported code is valid `createMachine()` syntax that can be used directly with ember-statechart-component.

### Inspecting Running Machines

Use the `@statelyai/inspect` package to visualize running machines in your development environment.

```typescript
import { createBrowserInspector } from '@statelyai/inspect';

// In development only:
const inspector = createBrowserInspector();

const actor = createActor(machine, {
  inspect: inspector.inspect,
});
actor.start();
```

This opens a panel showing the current state, context, event log, and a live state chart diagram. It is invaluable for debugging complex machines during development.

---

## 12. TypeScript Typing

XState 5 has first-class TypeScript support. Proper typing ensures type-safe events, context, and actions.

### Typed Events

```typescript
type EnrollmentEvent =
  | { type: 'START' }
  | { type: 'SELECT_CLIENT'; clientId: string }
  | { type: 'SELECT_CARRIER'; carrierId: string }
  | { type: 'SELECT_PLAN'; planId: string; planName: string }
  | { type: 'ADD_MEMBER'; member: { name: string; dob: string } }
  | { type: 'REMOVE_MEMBER'; index: number }
  | { type: 'SUBMIT' }
  | { type: 'BACK' }
  | { type: 'RESET' };
```

### Typed Context

```typescript
interface EnrollmentContext {
  step: number;
  clientId: string | null;
  carrierId: string | null;
  planId: string | null;
  members: Array<{ name: string; dob: string }>;
  errors: string[];
  enrollmentId: string | null;
}
```

### Typing createMachine

In XState 5, types are inferred from the machine configuration, but you can provide explicit types using the `types` property:

```typescript
const machine = createMachine({
  types: {} as {
    context: EnrollmentContext;
    events: EnrollmentEvent;
    input: { initialClientId?: string };
    output: { enrollmentId: string };
    guards:
      | { type: 'isFormValid' }
      | { type: 'hasMembers' }
      | { type: 'canSubmit' };
    actions:
      | { type: 'logStep' }
      | { type: 'notifyComplete' }
      | { type: 'trackAnalytics' };
    actors:
      | { type: 'submitEnrollment' }
      | { type: 'fetchCarriers' }
      | { type: 'validateForm' };
  },
  id: 'enrollment',
  initial: 'idle',
  context: ({ input }) => ({
    step: 0,
    clientId: input?.initialClientId ?? null,
    carrierId: null,
    planId: null,
    members: [],
    errors: [],
    enrollmentId: null,
  }),
  states: {
    // ... state definitions with full type checking
  },
});
```

### Type-Safe send()

With properly typed events, `send()` will enforce correct payloads:

```typescript
const actor = createActor(machine);
actor.start();

// Correct — TypeScript validates the event shape.
actor.send({ type: 'SELECT_CLIENT', clientId: '123' });

// Error — 'clientId' is missing.
// actor.send({ type: 'SELECT_CLIENT' });

// Error — 'INVALID_EVENT' is not in the union.
// actor.send({ type: 'INVALID_EVENT' });

// Error — wrong payload type.
// actor.send({ type: 'SELECT_CLIENT', clientId: 123 });
```

### Typing Guards and Actions

```typescript
machine.provide({
  guards: {
    // TypeScript knows context is EnrollmentContext and event is EnrollmentEvent.
    isFormValid: ({ context }) => {
      return context.errors.length === 0 && context.clientId !== null;
    },
    hasMembers: ({ context }) => {
      return context.members.length > 0;
    },
  },
  actions: {
    logStep: ({ context, event }) => {
      // context and event are fully typed here.
      console.log(`Step: ${context.step}, Event: ${event.type}`);
    },
  },
});
```

### Typing Invoked Actors

```typescript
import { fromPromise } from 'xstate';

const submitEnrollment = fromPromise<
  { id: string },             // output type
  { formData: Record<string, unknown> } // input type
>(async ({ input }) => {
  const response = await fetch('/api/enrollments', {
    method: 'POST',
    body: JSON.stringify(input.formData),
  });
  return response.json() as Promise<{ id: string }>;
});
```

---

## Further Reading

- **XState v5 Docs**: https://stately.ai/docs
- **ember-statechart-component**: https://github.com/NullVoxPopuli/ember-statechart-component
- **Stately Visual Editor**: https://stately.ai/editor
- **XState TypeScript Guide**: https://stately.ai/docs/typescript
- **Statecharts (original paper concept)**: https://statecharts.dev
- **@statelyai/inspect**: https://stately.ai/docs/inspector
