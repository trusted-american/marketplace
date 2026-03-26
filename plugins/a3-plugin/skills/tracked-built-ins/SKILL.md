---
name: tracked-built-ins
description: tracked-built-ins reference — TrackedArray, TrackedObject, TrackedMap, TrackedSet for deep reactive state in Glimmer components
version: 0.1.0
---

# tracked-built-ins Reference

## Overview

`tracked-built-ins` provides tracked (auto-tracking) versions of JavaScript's built-in data structures: `TrackedArray`, `TrackedObject`, `TrackedMap`, and `TrackedSet`. In Glimmer/Ember, the `@tracked` decorator only detects reassignment of properties. Mutating an array with `.push()` or an object with property assignment does NOT trigger re-renders. `tracked-built-ins` solves this by wrapping mutations so Glimmer's auto-tracking system detects them.

**Package**: `tracked-built-ins`
**Version**: 3.x (used with Ember 5+ / Glimmer)
**Import**: `import { TrackedArray, TrackedObject, TrackedMap, TrackedSet } from 'tracked-built-ins';`

## The Problem tracked-built-ins Solves

### Without tracked-built-ins

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class BrokenExample extends Component {
  @tracked items = ['a', 'b', 'c'];

  addItem = () => {
    this.items.push('d'); // DOES NOT trigger re-render!
    // Glimmer only tracks the reference to `items`, not its contents.
    // push() mutates the array in place without changing the reference.
  };
}
```

The workaround without tracked-built-ins is to create a new reference:

```typescript
addItem = () => {
  this.items = [...this.items, 'd']; // Works but creates a new array every time
};
```

This spread operator pattern works but is:
- Verbose and error-prone (easy to forget)
- Wasteful for large arrays (copies every element)
- Does not work well with deep mutations

### With tracked-built-ins

```typescript
import Component from '@glimmer/component';
import { TrackedArray } from 'tracked-built-ins';

export default class WorkingExample extends Component {
  items = new TrackedArray(['a', 'b', 'c']);

  addItem = () => {
    this.items.push('d'); // Automatically triggers re-render!
  };
}
```

## TrackedArray

`TrackedArray` is a drop-in replacement for JavaScript's `Array` that tracks all mutations. Every method that modifies the array will trigger Glimmer's auto-tracking system.

### Construction

```typescript
import { TrackedArray } from 'tracked-built-ins';

// Empty array
const items = new TrackedArray();

// From existing values
const items = new TrackedArray(['a', 'b', 'c']);

// From another iterable
const items = new TrackedArray(new Set([1, 2, 3]));
```

### Tracked Mutating Methods

All of these trigger re-renders in templates:

```typescript
const items = new TrackedArray<string>(['a', 'b', 'c']);

// push — add to end
items.push('d');                  // ['a', 'b', 'c', 'd']

// pop — remove from end
const last = items.pop();         // 'd', items = ['a', 'b', 'c']

// unshift — add to beginning
items.unshift('z');               // ['z', 'a', 'b', 'c']

// shift — remove from beginning
const first = items.shift();      // 'z', items = ['a', 'b', 'c']

// splice — add/remove at index
items.splice(1, 1);               // Remove 1 item at index 1: ['a', 'c']
items.splice(1, 0, 'b');          // Insert 'b' at index 1: ['a', 'b', 'c']

// fill — fill with value
items.fill('x', 0, 2);           // ['x', 'x', 'c']

// copyWithin
items.copyWithin(0, 2, 3);       // ['c', 'x', 'c']

// sort
items.sort();                     // Sorts in place, triggers re-render

// reverse
items.reverse();                  // Reverses in place, triggers re-render

// Direct index assignment
items[0] = 'new value';          // Triggers re-render
```

### Non-Mutating Methods (Also Tracked for Reads)

These methods are tracked for consumption, meaning if the underlying data changes, any computed property or template that called these will also update:

```typescript
// All standard array read methods work and are tracked:
items.length;
items.includes('a');
items.indexOf('b');
items.find((item) => item === 'c');
items.findIndex((item) => item === 'c');
items.filter((item) => item !== 'b');
items.map((item) => item.toUpperCase());
items.reduce((acc, item) => acc + item, '');
items.every((item) => item.length > 0);
items.some((item) => item === 'a');
items.forEach((item) => console.log(item));
items.at(0);
items.flat();
items.flatMap((item) => [item, item]);
items.entries();
items.keys();
items.values();
items.join(', ');
items.slice(0, 2);
items.concat(['d', 'e']);
```

### Common A3 Pattern: Managing a List of Selected Items

```typescript
import Component from '@glimmer/component';
import { TrackedArray } from 'tracked-built-ins';

export default class MultiSelectComponent extends Component {
  selectedIds = new TrackedArray<string>();

  toggleSelection = (id: string) => {
    const index = this.selectedIds.indexOf(id);
    if (index === -1) {
      this.selectedIds.push(id);
    } else {
      this.selectedIds.splice(index, 1);
    }
  };

  get hasSelection(): boolean {
    return this.selectedIds.length > 0;
  }

  isSelected = (id: string): boolean => {
    return this.selectedIds.includes(id);
  };

  clearSelection = () => {
    this.selectedIds.splice(0, this.selectedIds.length);
  };
}
```

## TrackedObject

`TrackedObject` is a drop-in replacement for plain JavaScript objects (`{}`) that tracks property reads and writes.

### Construction

```typescript
import { TrackedObject } from 'tracked-built-ins';

// Empty object
const data = new TrackedObject();

// From existing object
const data = new TrackedObject({ firstName: 'John', lastName: 'Doe' });

// Type-safe
const data = new TrackedObject<{ name: string; count: number }>({ name: 'test', count: 0 });
```

### Tracked Operations

```typescript
const data = new TrackedObject<Record<string, unknown>>({ name: 'John', age: 30 });

// Property set — triggers re-render
data.name = 'Jane';

// Property add — triggers re-render
data.email = 'jane@example.com';

// Property delete — triggers re-render
delete data.age;

// Reading properties is tracked for consumption
data.name; // Tracked — will re-render if name changes
```

### Common A3 Pattern: Form State Object

```typescript
import Component from '@glimmer/component';
import { TrackedObject } from 'tracked-built-ins';

interface FilterState {
  search: string;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export default class FilterComponent extends Component {
  filters = new TrackedObject<FilterState>({
    search: '',
    status: null,
    dateFrom: null,
    dateTo: null,
  });

  updateFilter = (key: keyof FilterState, value: string | null) => {
    this.filters[key] = value;  // Triggers re-render automatically
  };

  resetFilters = () => {
    this.filters.search = '';
    this.filters.status = null;
    this.filters.dateFrom = null;
    this.filters.dateTo = null;
  };

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.dateFrom || this.filters.dateTo);
  }
}
```

## TrackedMap

`TrackedMap` is a tracked version of JavaScript's `Map`. All mutations and reads are auto-tracked.

### Construction and Usage

```typescript
import { TrackedMap } from 'tracked-built-ins';

const cache = new TrackedMap<string, unknown>();

// set — triggers re-render
cache.set('client-123', { name: 'John' });

// get — tracked for consumption
const client = cache.get('client-123');

// has — tracked for consumption
cache.has('client-123'); // true

// delete — triggers re-render
cache.delete('client-123');

// clear — triggers re-render
cache.clear();

// size — tracked for consumption
cache.size; // 0

// Iteration — all tracked
cache.forEach((value, key) => { /* ... */ });
[...cache.entries()];
[...cache.keys()];
[...cache.values()];
```

### Common A3 Pattern: Caching Loaded Resources

```typescript
import Component from '@glimmer/component';
import { TrackedMap } from 'tracked-built-ins';
import { task } from 'ember-concurrency';

export default class CachedLoaderComponent extends Component {
  loadedAgencies = new TrackedMap<string, AgencyModel>();

  loadAgencyTask = task(async (agencyId: string) => {
    if (this.loadedAgencies.has(agencyId)) {
      return this.loadedAgencies.get(agencyId);
    }
    const agency = await this.store.findRecord('agency', agencyId);
    this.loadedAgencies.set(agencyId, agency);
    return agency;
  });

  get agencyCount(): number {
    return this.loadedAgencies.size;
  }
}
```

## TrackedSet

`TrackedSet` is a tracked version of JavaScript's `Set`. All mutations and reads are auto-tracked.

### Construction and Usage

```typescript
import { TrackedSet } from 'tracked-built-ins';

const selectedIds = new TrackedSet<string>();

// add — triggers re-render
selectedIds.add('client-123');
selectedIds.add('client-456');

// has — tracked for consumption
selectedIds.has('client-123'); // true

// delete — triggers re-render
selectedIds.delete('client-123');

// clear — triggers re-render
selectedIds.clear();

// size — tracked for consumption
selectedIds.size; // 0

// Iteration — all tracked
selectedIds.forEach((id) => { /* ... */ });
[...selectedIds.values()];
[...selectedIds.entries()];
```

### Common A3 Pattern: Multi-Select with Set

```typescript
import Component from '@glimmer/component';
import { TrackedSet } from 'tracked-built-ins';

export default class BulkActionComponent extends Component {
  selectedIds = new TrackedSet<string>();

  toggle = (id: string) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  };

  selectAll = () => {
    for (const item of this.args.items) {
      this.selectedIds.add(item.id);
    }
  };

  deselectAll = () => {
    this.selectedIds.clear();
  };

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allSelected(): boolean {
    return this.selectedIds.size === this.args.items.length;
  }

  get selectedItems() {
    return this.args.items.filter((item) => this.selectedIds.has(item.id));
  }
}
```

## When to Use tracked-built-ins vs @tracked with Spread

### Use tracked-built-ins When:

- You mutate collections frequently (adding/removing items in a list)
- You need deep tracking on objects with dynamic keys
- Performance matters with large arrays (avoid copying on every mutation)
- The array or object is a long-lived piece of component state that accumulates changes

### Use @tracked with Spread/Reassignment When:

- The value is replaced wholesale (not mutated)
- The value is simple and small (a few items)
- You want to signal immutability semantics

```typescript
// Prefer @tracked with reassignment for wholesale replacement:
@tracked status = 'idle';          // Simple scalar
@tracked items = ['a', 'b', 'c']; // Replaced entirely via setter

// Prefer tracked-built-ins for in-place mutation:
selectedIds = new TrackedSet<string>();     // Grows/shrinks over time
formState = new TrackedObject<FormState>(); // Individual keys change
rows = new TrackedArray<RowData>();         // Rows added/removed/reordered
```

## Performance Considerations

- `TrackedArray` is more efficient than `@tracked` + spread for frequent mutations on large arrays because it avoids copying the entire array on each change.
- `TrackedObject` avoids creating new object references on each property change.
- `TrackedMap` and `TrackedSet` have the same O(1) lookup characteristics as their native counterparts.
- Do NOT nest tracked-built-ins unnecessarily. A `TrackedArray` of `TrackedObject` items adds tracking overhead to every item. Only track what needs to trigger re-renders.
- If you only need to track the array reference itself (and always replace it wholesale), a simple `@tracked` property is cheaper.

## Template Usage

tracked-built-ins work seamlessly in templates:

```gts
<template>
  <ul>
    {{#each this.items as |item index|}}
      <li>{{index}}: {{item}}</li>
    {{/each}}
  </ul>

  <p>Count: {{this.items.length}}</p>

  <button type="button" {{on "click" this.addItem}}>Add Item</button>
</template>
```

Glimmer will re-render the `{{#each}}` block and `{{this.items.length}}` whenever the `TrackedArray` is mutated via any tracked method.

## Further Investigation

- **tracked-built-ins GitHub**: https://github.com/tracked-tools/tracked-built-ins
- **Ember Auto-tracking**: https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/
- **Glimmer Tracking Guide**: https://tutorial.glimdown.com/
