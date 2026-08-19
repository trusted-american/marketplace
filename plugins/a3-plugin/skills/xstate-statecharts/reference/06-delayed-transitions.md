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
