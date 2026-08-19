## 8. Modifiers

### 8.1 Built-in: {{on}}

```gts
import { on } from '@ember/modifier';

<template>
  <button {{on "click" this.handleClick}}>Click</button>
  <input {{on "input" this.handleInput}} {{on "focus" this.handleFocus}} />

  {{! With event options }}
  <form {{on "submit" this.handleSubmit}}>
    <button type="submit">Submit</button>
  </form>
</template>
```

The `{{on}}` modifier accepts event options as named arguments:
```gts
<div {{on "scroll" this.handleScroll passive=true}}>...</div>
<a {{on "click" this.handleClick capture=true}}>...</a>
<form {{on "submit" this.handleSubmit once=true}}>...</form>
```

### 8.2 Custom Modifiers (Functional)

```typescript
import { modifier } from 'ember-modifier';

// Simple — runs once on insert, cleanup on destroy
const autofocus = modifier((element: HTMLElement) => {
  element.focus();
});

// With cleanup — return a destructor function
const onResize = modifier(
  (element: HTMLElement, [callback]: [(entry: ResizeObserverEntry) => void]) => {
    const observer = new ResizeObserver((entries) => {
      callback(entries[0]);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }
);

// With tracked dependencies — re-runs when args change
const tooltip = modifier(
  (element: HTMLElement, [text]: [string], { placement }: { placement?: string }) => {
    const instance = createTooltip(element, { text, placement: placement ?? 'top' });

    return () => {
      instance.destroy();
    };
  }
);

export { autofocus, onResize, tooltip };
```

### 8.3 Custom Modifiers (Class-based)

For complex modifiers that need lifecycle control:

```typescript
import Modifier from 'ember-modifier';

interface ClickOutsideSignature {
  Element: HTMLElement;
  Args: {
    Positional: [() => void];
    Named: { except?: HTMLElement };
  };
}

export default class ClickOutsideModifier extends Modifier<ClickOutsideSignature> {
  handler: ((event: MouseEvent) => void) | null = null;

  modify(
    element: HTMLElement,
    [callback]: [() => void],
    { except }: { except?: HTMLElement }
  ): void {
    // Remove previous handler
    if (this.handler) {
      document.removeEventListener('click', this.handler);
    }

    this.handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && (!except || !except.contains(target))) {
        callback();
      }
    };

    document.addEventListener('click', this.handler);
  }

  willDestroy(): void {
    if (this.handler) {
      document.removeEventListener('click', this.handler);
    }
  }
}
```

---
