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
