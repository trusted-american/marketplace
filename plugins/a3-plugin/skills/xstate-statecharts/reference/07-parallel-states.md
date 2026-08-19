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
