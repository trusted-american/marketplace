## @ember/object

### `action` — Bind Action Context

**Import:** `import { action } from '@ember/object';`

**What it does:** A decorator that binds a method's `this` context to the class instance.
This ensures the method works correctly when passed as a callback to child components or
DOM event handlers.

**JavaScript signature:**
```ts
class MyComponent extends Component {
  @action
  handleClick() {
    // `this` is guaranteed to be the component instance
  }
}
```

**When to use:**
- Any method that will be passed to a child component as an argument
- Any method used with the `{{on}}` modifier
- Any method used with `{{fn}}`

**When NOT to use:**
- Arrow function class fields already have bound context — `@action` is redundant on them
- Private methods that are only called internally via `this.methodName()`

**A3 patterns:**

Standard action pattern in A3 components:
```gts
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class EmployeeFilter extends Component {
  @tracked searchTerm = '';

  @action
  updateSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.args.onSearch?.(this.searchTerm);
  }

  @action
  clearSearch() {
    this.searchTerm = '';
    this.args.onSearch?.('');
  }

  <template>
    <div class="filter-bar">
      <input
        value={{this.searchTerm}}
        {{on "input" this.updateSearch}}
      />
      <button {{on "click" this.clearSearch}}>Clear</button>
    </div>
  </template>
}
```

**Arrow functions as alternative (also common in A3):**
```gts
export default class EmployeeFilter extends Component {
  @tracked searchTerm = '';

  updateSearch = (event: Event) => {
    this.searchTerm = (event.target as HTMLInputElement).value;
  };
}
```

Both patterns are used in A3. The `@action` decorator is the traditional approach;
arrow function fields are becoming more common in newer code.

**Common mistakes:**
- Forgetting `@action` and then getting `this is undefined` errors in callbacks.
- Using `@action` on getters — it only applies to methods.

---
