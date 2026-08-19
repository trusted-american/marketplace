## 11. Stately.ai Visual Editor

The [Stately Visual Editor](https://stately.ai/editor) is a drag-and-drop tool for designing state machines visually. It is the recommended way to prototype and document complex machines before (or alongside) writing code.

### Designing Machines Visually

1. Open https://stately.ai/editor and create a new machine.
2. Add states by clicking the canvas. Name them to match your domain (e.g., "selectClient", "enterDetails").
3. Draw transitions between states by clicking a source state and dragging to a target.
4. Add events to transitions by naming them (e.g., "SELECT_CLIENT").
5. Add actions, guards, and context through the property panel on the right.
6. Use the "Simulate" tab to step through the machine interactively, verifying correct behavior.

### Exporting to Code

1. Click "Export" in the top menu.
2. Select "XState v5" as the output format.
3. Copy the generated TypeScript code.
4. Paste into your project and customize (add typed context, provide real actor implementations, etc.).

The exported code is valid `createMachine()` syntax that can be used directly with ember-statechart-component.

### Inspecting Running Machines

Use the `@statelyai/inspect` package to visualize running machines in your development environment.

```typescript
import { createBrowserInspector } from '@statelyai/inspect';

// In development only:
const inspector = createBrowserInspector();

const actor = createActor(machine, {
  inspect: inspector.inspect,
});
actor.start();
```

This opens a panel showing the current state, context, event log, and a live state chart diagram. It is invaluable for debugging complex machines during development.

---
