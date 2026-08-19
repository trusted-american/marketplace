## 14. Component Lifecycle (Glimmer)

Glimmer components have a minimal lifecycle compared to classic Ember components.

### 14.1 `constructor(owner, args)`

Called when the component is instantiated. `this.args` is available.

```typescript
import Component from '@glimmer/component';

interface MyComponentSignature {
  Args: {
    initialValue: string;
  };
  Element: HTMLDivElement;
  Blocks: {
    default: [value: string];
  };
}

export default class MyComponent extends Component<MyComponentSignature> {
  localValue: string;

  constructor(owner: Owner, args: MyComponentSignature['Args']) {
    super(owner, args);
    this.localValue = this.args.initialValue;
    // DO: Setup initial state, create non-framework objects
    // DON'T: Access DOM (doesn't exist yet), modify args
  }
}
```

### 14.2 `willDestroy()`

Called when the component is being removed from the DOM.

```typescript
export default class TimerComponent extends Component {
  intervalId: ReturnType<typeof setInterval>;

  constructor(owner: Owner, args: Args) {
    super(owner, args);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  willDestroy(): void {
    super.willDestroy();
    clearInterval(this.intervalId);
    // Clean up: event listeners, timers, subscriptions, WebSockets
  }
}
```

### 14.3 No `didInsertElement` / `didRender` etc.

Glimmer components do NOT have `didInsertElement`, `didRender`, `didUpdate`,
or `didReceiveAttrs`. Use modifiers instead:

```gts
import { modifier } from 'ember-modifier';

const setupChart = modifier((element: HTMLCanvasElement, [data]: [ChartData]) => {
  const chart = new Chart(element, { data });
  return () => chart.destroy();
});

<template>
  <canvas {{setupChart @data}}></canvas>
</template>
```

---
