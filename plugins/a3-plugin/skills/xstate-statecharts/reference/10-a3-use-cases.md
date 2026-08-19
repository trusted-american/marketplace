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
