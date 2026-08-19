## API Reference

### `@localStorage` Decorator

**Signature:**
```ts
@localStorage(key?: string) propertyName: Type = defaultValue;
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | No | localStorage key. Defaults to the property name if omitted |

**Behavior:**
- On first access, reads from `localStorage.getItem(key)`
- If found, deserializes with `JSON.parse` and returns the stored value
- If not found (or parse fails), returns the default value
- On set, serializes with `JSON.stringify` and calls `localStorage.setItem(key, value)`
- Setting to `undefined` or the default value may remove the key (implementation-dependent)

### Basic Usage

```ts
import Component from '@glimmer/component';
import { localStorage } from 'ember-local-storage-decorator';

export default class SidebarComponent extends Component {
  @localStorage('sidebar-collapsed')
  isCollapsed: boolean = false;
}
```

In this example:
- The property `isCollapsed` is backed by the localStorage key `"sidebar-collapsed"`
- Default value is `false`
- If the user previously collapsed the sidebar, the stored `true` value is restored on reload
- Any change to `this.isCollapsed` is automatically persisted

### Without Explicit Key

When no key argument is provided, the property name is used as the localStorage key:

```ts
export default class ThemeComponent extends Component {
  @localStorage
  darkMode: boolean = false;
  // localStorage key: "darkMode"
}
```

---
