---
name: ember-keyboard-sortable
description: ember-keyboard (keyboard shortcuts) and ember-sortable (drag-and-drop reordering) reference for A3
version: 0.1.0
---

# ember-keyboard and ember-sortable Reference

Two Ember addons used across A3 for keyboard interaction and drag-and-drop reordering.

---

## Part 1: ember-keyboard

Declarative keyboard shortcut handling for Ember components.

### Installation

```bash
pnpm add ember-keyboard
```

### Basic Usage with Decorators

```typescript
import Component from '@glimmer/component';
import { onKey } from 'ember-keyboard';

export default class MyComponent extends Component {
  // Single key
  @onKey('Escape')
  handleEscape() {
    this.close();
  }

  // Key combo
  @onKey('ctrl+s')
  handleSave(event: KeyboardEvent) {
    event.preventDefault(); // Prevent browser save dialog
    this.save();
  }

  // Modifier keys: ctrl, alt, shift, meta (cmd on Mac)
  @onKey('ctrl+shift+n')
  handleNewItem() {
    this.createItem();
  }

  // Arrow keys
  @onKey('ArrowDown')
  handleDown() {
    this.selectNext();
  }

  @onKey('ArrowUp')
  handleUp() {
    this.selectPrevious();
  }

  // Enter and Space
  @onKey('Enter')
  handleEnter() {
    this.confirm();
  }
}
```

### Key Names

Use standard `KeyboardEvent.key` values:

| Key            | Name           |
|----------------|----------------|
| Escape         | `Escape`       |
| Enter          | `Enter`        |
| Space          | ` ` (space)    |
| Tab            | `Tab`          |
| Backspace      | `Backspace`    |
| Delete         | `Delete`       |
| Arrow keys     | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
| Letters        | `a` through `z` (lowercase) |
| Numbers        | `0` through `9` |
| Function keys  | `F1` through `F12` |

### Event Types

```typescript
// keydown (default)
@onKey('Enter', { event: 'keydown' })
handleEnterDown() {}

// keyup
@onKey('Enter', { event: 'keyup' })
handleEnterUp() {}

// keypress (deprecated, avoid)
@onKey('Enter', { event: 'keypress' })
handleEnterPress() {}
```

### Priority

When multiple components listen for the same key, priority determines which fires first. Higher priority fires first.

```typescript
// Default priority is 0
@onKey('Escape', { priority: 10 })
handleEscapeHighPriority() {
  // This fires before a handler with priority 0
  this.closeModal();
}

// A modal might use high priority to capture Escape before the background
@onKey('Escape', { priority: 100 })
handleModalEscape() {
  this.dismissModal();
}
```

### Activated / Deactivated

Components only receive keyboard events when they are "activated." By default, components are activated when inserted into the DOM.

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { onKey } from 'ember-keyboard';

export default class SearchPanel extends Component {
  // Control activation explicitly
  @tracked keyboardActivated = true;

  @onKey('Enter')
  handleSearch() {
    if (!this.keyboardActivated) return;
    this.performSearch();
  }

  deactivateKeyboard() {
    this.keyboardActivated = false;
  }
}
```

### Using the `on-key` Modifier in Templates

```handlebars
{{! Attach keyboard handler directly in template }}
<div
  {{on-key 'Escape' this.close}}
  {{on-key 'ctrl+Enter' this.submit}}
  tabindex="0"
>
  Content here
</div>
```

### Using the `keyboard` Service

For programmatic keyboard management:

```typescript
import Service, { inject as service } from '@ember/service';
import type { KeyboardService } from 'ember-keyboard';

export default class ShortcutService extends Service {
  @service declare keyboard: KeyboardService;

  registerGlobalShortcuts() {
    // Use the service for app-wide shortcuts
    this.keyboard.listenFor('ctrl+k', this, this.openCommandPalette);
  }

  openCommandPalette() {
    // Show command palette UI
  }

  willDestroy() {
    this.keyboard.stopListeningFor('ctrl+k', this);
  }
}
```

### Common Patterns in A3

```typescript
// Navigation shortcuts
@onKey('ctrl+1') goToDashboard() { this.router.transitionTo('dashboard'); }
@onKey('ctrl+2') goToEnrollments() { this.router.transitionTo('enrollments'); }

// Form shortcuts
@onKey('ctrl+Enter') submitForm() { this.submit(); }
@onKey('Escape') cancelForm() { this.cancel(); }

// List navigation
@onKey('j') nextItem() { this.selectedIndex++; }
@onKey('k') previousItem() { this.selectedIndex--; }
```

---

## Part 2: ember-sortable

Drag-and-drop reordering for lists. Uses HTML5 Drag and Drop or pointer events.

### Installation

```bash
pnpm add ember-sortable
```

### Basic Usage

```handlebars
<SortableGroup
  @onChange={{this.reorderItems}}
  @direction="y"
  @model={{this.items}}
  as |group|
>
  {{#each this.items as |item|}}
    <group.item @model={{item}}>
      <div class="sortable-item">
        {{item.name}}
      </div>
    </group.item>
  {{/each}}
</SortableGroup>
```

### SortableGroup Component

The container that holds sortable items.

```handlebars
<SortableGroup
  @model={{this.items}}           {{! The array being reordered }}
  @onChange={{this.reorderItems}}  {{! Called when order changes }}
  @direction="y"                  {{! 'y' (vertical) or 'x' (horizontal) }}
  @groupName="my-list"            {{! For restricting drag between groups }}
  @disabled={{this.isLocked}}     {{! Disable sorting }}
  as |group|
>
  {{! items go here }}
</SortableGroup>
```

### SortableItem Component

Each draggable item within a group.

```handlebars
<group.item
  @model={{item}}                  {{! The model this item represents }}
  @disabled={{item.isLocked}}      {{! Disable dragging this specific item }}
  @onDragStart={{this.onDragStart}} {{! Callback when drag starts }}
  @onDragStop={{this.onDragStop}}   {{! Callback when drag ends }}
>
  <div class="list-item {{if group.item.isDragging 'is-dragging'}}">
    {{item.name}}
  </div>
</group.item>
```

### SortableHandle Component

Restrict dragging to a specific handle element instead of the entire item.

```handlebars
<group.item @model={{item}}>
  <div class="list-item">
    <group.item.handle>
      <span class="drag-handle">&#9776;</span> {{! hamburger icon }}
    </group.item.handle>
    <span>{{item.name}}</span>
  </div>
</group.item>
```

### The onChange Callback

The `onChange` callback receives the reordered array of models:

```typescript
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class MyListComponent extends Component {
  @tracked items = [
    { id: '1', name: 'First', order: 0 },
    { id: '2', name: 'Second', order: 1 },
    { id: '3', name: 'Third', order: 2 },
  ];

  @action
  reorderItems(sortedItems: typeof this.items) {
    // sortedItems is the new order
    this.items = sortedItems;
  }
}
```

### Horizontal Sorting

```handlebars
<SortableGroup
  @onChange={{this.reorder}}
  @direction="x"
  @model={{this.columns}}
  as |group|
>
  {{#each this.columns as |column|}}
    <group.item @model={{column}}>
      <div class="column-item">{{column.title}}</div>
    </group.item>
  {{/each}}
</SortableGroup>
```

### Visual Feedback (CSS)

```css
/* Default state */
.sortable-item {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: grab;
  transition: box-shadow 0.2s, transform 0.2s;
  user-select: none;
}

/* While being dragged */
.sortable-item.is-dragging {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
  opacity: 0.9;
  z-index: 100;
  cursor: grabbing;
}

/* Drop target indicator */
.sortable-item.is-dropping {
  transition: all 0.2s ease;
}

/* Handle styling */
.drag-handle {
  cursor: grab;
  color: #999;
  padding: 4px 8px;
  margin-right: 8px;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Disabled state */
.sortable-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Accessibility

ember-sortable has built-in keyboard support:

- **Space/Enter** on a focused item picks it up
- **Arrow keys** move the picked-up item
- **Space/Enter** drops the item
- **Escape** cancels the move

Ensure items are focusable:

```handlebars
<group.item @model={{item}}>
  <div
    class="sortable-item"
    tabindex="0"
    role="listitem"
    aria-label="{{item.name}}, position {{item.order}} of {{this.items.length}}"
    aria-roledescription="sortable item"
  >
    {{item.name}}
  </div>
</group.item>
```

Add screen reader announcements:

```handlebars
<SortableGroup
  @onChange={{this.reorder}}
  @direction="y"
  @model={{this.items}}
  @a11yAnnouncementConfig={{hash
    lift="Picked up {{item.name}}"
    move="{{item.name}} moved to position {{position}}"
    drop="{{item.name}} dropped at position {{position}}"
    cancel="Reorder cancelled"
  }}
  as |group|
>
```

### Persisting Order to Firestore

After reordering, persist the new order to Firestore:

```typescript
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { writeBatch, doc } from 'firebase/firestore';

export default class SortableListComponent extends Component {
  @service declare firestore: FirestoreService;

  @action
  async reorderItems(sortedItems: Item[]) {
    // Update local state immediately for responsiveness
    this.items = sortedItems;

    // Batch update order field in Firestore
    const batch = writeBatch(this.firestore.db);

    sortedItems.forEach((item, index) => {
      const ref = doc(this.firestore.db, 'items', item.id);
      batch.update(ref, { order: index });
    });

    try {
      await batch.commit();
    } catch (error) {
      // Revert on failure
      console.error('Failed to persist order:', error);
      this.loadItems(); // Reload from Firestore
    }
  }
}
```

### Drag Between Groups

```handlebars
<div class="kanban-board">
  <SortableGroup
    @onChange={{fn this.moveToColumn "todo"}}
    @direction="y"
    @groupName="kanban"
    @model={{this.todoItems}}
    as |group|
  >
    {{#each this.todoItems as |item|}}
      <group.item @model={{item}}>{{item.title}}</group.item>
    {{/each}}
  </SortableGroup>

  <SortableGroup
    @onChange={{fn this.moveToColumn "done"}}
    @direction="y"
    @groupName="kanban"
    @model={{this.doneItems}}
    as |group|
  >
    {{#each this.doneItems as |item|}}
      <group.item @model={{item}}>{{item.title}}</group.item>
    {{/each}}
  </SortableGroup>
</div>
```

## Combined Pattern: Keyboard + Sortable

A3 uses both addons together for power-user list management:

```typescript
import { onKey } from 'ember-keyboard';

export default class TaskList extends Component {
  @tracked selectedIndex = 0;

  @onKey('ArrowDown') selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
  }

  @onKey('ArrowUp') selectPrevious() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
  }

  @onKey('alt+ArrowUp') moveUp() {
    if (this.selectedIndex <= 0) return;
    const items = [...this.items];
    [items[this.selectedIndex - 1], items[this.selectedIndex]] =
      [items[this.selectedIndex], items[this.selectedIndex - 1]];
    this.items = items;
    this.selectedIndex--;
    this.persistOrder(items);
  }

  @onKey('alt+ArrowDown') moveDown() {
    if (this.selectedIndex >= this.items.length - 1) return;
    const items = [...this.items];
    [items[this.selectedIndex], items[this.selectedIndex + 1]] =
      [items[this.selectedIndex + 1], items[this.selectedIndex]];
    this.items = items;
    this.selectedIndex++;
    this.persistOrder(items);
  }
}
```
