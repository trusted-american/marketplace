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
