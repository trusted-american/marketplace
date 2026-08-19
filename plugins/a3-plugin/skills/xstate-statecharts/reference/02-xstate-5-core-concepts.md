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
