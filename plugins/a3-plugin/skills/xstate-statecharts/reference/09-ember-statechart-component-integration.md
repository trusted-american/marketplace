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
