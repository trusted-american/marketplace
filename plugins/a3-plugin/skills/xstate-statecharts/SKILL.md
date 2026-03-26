---
name: xstate-statecharts
description: XState 5 and ember-statechart-component reference — state machine patterns for complex UI workflows in A3
version: 0.1.0
---

# XState & Statecharts Reference

## Overview

A3 uses XState 5 with ember-statechart-component for managing complex UI state machines. This is used for multi-step workflows, form wizards, and complex interaction patterns.

## Basic Machine Definition

```typescript
import { createMachine, assign } from 'xstate';

const enrollmentMachine = createMachine({
  id: 'enrollment',
  initial: 'idle',
  context: {
    step: 0,
    data: {},
    errors: [],
  },
  states: {
    idle: {
      on: { START: 'selectClient' },
    },
    selectClient: {
      on: {
        SELECT_CLIENT: {
          target: 'selectCarrier',
          actions: assign({ client: (_, event) => event.client }),
        },
        BACK: 'idle',
      },
    },
    selectCarrier: {
      on: {
        SELECT_CARRIER: {
          target: 'enterDetails',
          actions: assign({ carrier: (_, event) => event.carrier }),
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
        onDone: 'success',
        onError: {
          target: 'enterDetails',
          actions: assign({ errors: (_, event) => [event.data.message] }),
        },
      },
    },
    success: {
      type: 'final',
    },
  },
});
```

## Using with ember-statechart-component

```typescript
import { useMachine } from 'ember-statechart-component';

export default class EnrollmentWizard extends Component {
  machine = useMachine(this, () => ({
    machine: enrollmentMachine,
    services: {
      submitEnrollment: async (context) => {
        const enrollment = this.store.createRecord('enrollment', context.data);
        await enrollment.save();
        return enrollment;
      },
    },
  }));

  get currentStep() {
    return this.machine.state.value;
  }

  @action
  next(event: string, data?: Record<string, unknown>) {
    this.machine.send({ type: event, ...data });
  }
}
```

## Common Patterns in A3

### Multi-Step Form Wizard
State machines are ideal for A3's complex enrollment and onboarding flows where:
- Steps must be completed in order
- Some steps are conditional
- Back navigation preserves state
- Async submission with error recovery

### Status-Driven UI
For entities with complex status workflows (enrollments, contracts, tickets):
- Define valid status transitions as a state machine
- Prevent invalid transitions in UI
- Show available actions based on current state

## Further Investigation

- **XState Docs**: https://stately.ai/docs
- **ember-statechart-component**: https://github.com/NullVoxPopuli/ember-statechart-component
- **Stately Visual Editor**: https://stately.ai/editor
