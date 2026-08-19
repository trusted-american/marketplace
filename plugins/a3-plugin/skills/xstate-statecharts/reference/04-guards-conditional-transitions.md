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
