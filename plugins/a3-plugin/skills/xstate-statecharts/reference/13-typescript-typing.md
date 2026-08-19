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
