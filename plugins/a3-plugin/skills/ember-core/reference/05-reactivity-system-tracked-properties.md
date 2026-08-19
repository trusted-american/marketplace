## 5. Reactivity System (Tracked Properties)

### 5.1 Basic Tracked State

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CounterComponent extends Component {
  @tracked count = 0;
  @tracked name = '';
  @tracked items: string[] = [];

  // Getters that read tracked properties are auto-tracked
  get doubleCount(): number {
    return this.count * 2;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  @action increment(): void {
    this.count++;  // Triggers re-render of anything reading this.count or doubleCount
  }

  @action addItem(item: string): void {
    // MUST create a new array reference for tracking to detect the change
    this.items = [...this.items, item];
  }

  @action removeItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }
}
```

### 5.2 tracked-built-ins

For deep tracking of arrays, objects, maps, and sets without creating new references:

```typescript
import { TrackedArray, TrackedObject, TrackedMap, TrackedSet } from 'tracked-built-ins';

export default class MyComponent extends Component {
  items = new TrackedArray<string>();
  data = new TrackedObject<Record<string, unknown>>();
  lookup = new TrackedMap<string, number>();
  tags = new TrackedSet<string>();

  @action addItem(item: string): void {
    this.items.push(item);         // Mutation is tracked automatically
  }

  @action setData(key: string, value: unknown): void {
    this.data[key] = value;        // Property set is tracked
  }

  @action updateLookup(key: string, val: number): void {
    this.lookup.set(key, val);     // Map.set is tracked
  }
}
```

### 5.3 Auto-tracking Rules

1. **Tracked properties** trigger re-renders when their value is set (even to the same value)
2. **Getters** that read tracked properties are automatically tracked — no decoration needed
3. **Plain arrays/objects** require a new reference (`this.arr = [...this.arr, item]`)
4. **TrackedArray/TrackedObject** allow in-place mutation
5. **Services** with tracked properties trigger re-renders across the entire app
6. **Args** (`this.args.foo`) are auto-tracked — changes from the parent re-render the child
7. **Two reads in one render cycle** always return the same value (consistency guarantee)

---
