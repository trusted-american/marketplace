---
name: ember-local-storage
description: ember-local-storage-decorator reference — used in 32 A3 files for persisting UI state to localStorage with tracked reactivity
version: 0.1.0
---


# ember-local-storage-decorator — Complete A3 Reference

Used in 32 A3 files. The `@localStorage` decorator provides a simple, reactive way to persist
UI state to the browser's localStorage. It integrates with Glimmer's tracking system so that
changes to localStorage-backed properties automatically trigger template re-renders.

**Package:** `ember-local-storage-decorator`
**Import:** `import { localStorage } from 'ember-local-storage-decorator';`

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-api-reference.md` | API Reference |
| `reference/04-a3-usage-patterns.md` | A3 Usage Patterns |
| `reference/08-testing.md` | Testing |

## Core Concept

The `@localStorage` decorator creates a class property that:
1. Reads its initial value from `localStorage` (if a stored value exists)
2. Falls back to a default value if nothing is stored
3. Writes to `localStorage` whenever the property is set
4. Is tracked (reactive) — template bindings update when the value changes
5. Handles serialization/deserialization automatically (JSON.stringify/parse)

This is the A3 standard for persisting UI preferences that should survive page refreshes
but do not belong in the database (they are user-device-specific, not user-account-specific).

---
## Supported Value Types

The `@localStorage` decorator serializes values with `JSON.stringify` and deserializes with
`JSON.parse`. This means it supports all JSON-serializable types:

### Booleans

```ts
@localStorage('sidebar-collapsed')
isCollapsed: boolean = false;

@localStorage('dark-mode')
isDarkMode: boolean = false;

@localStorage('show-advanced-filters')
showAdvancedFilters: boolean = false;
```

### Strings

```ts
@localStorage('preferred-language')
language: string = 'en';

@localStorage('last-viewed-route')
lastRoute: string = 'dashboard';

@localStorage('theme')
theme: string = 'light';
```

### Numbers

```ts
@localStorage('items-per-page')
pageSize: number = 25;

@localStorage('sidebar-width')
sidebarWidth: number = 280;

@localStorage('font-size')
fontSize: number = 14;
```

### Arrays

```ts
@localStorage('visible-columns')
visibleColumns: string[] = ['name', 'email', 'department', 'status'];

@localStorage('recent-searches')
recentSearches: string[] = [];

@localStorage('pinned-employee-ids')
pinnedIds: string[] = [];
```

### Objects

```ts
@localStorage('table-sort')
sortConfig: { column: string; direction: 'asc' | 'desc' } = {
  column: 'name',
  direction: 'asc',
};

@localStorage('filter-preferences')
filters: Record<string, string> = {};

@localStorage('column-widths')
columnWidths: Record<string, number> = {};
```

### Null

```ts
@localStorage('last-selected-id')
lastSelectedId: string | null = null;
```

---
## Reactivity / Tracked Integration

The `@localStorage` decorator integrates with Glimmer's tracking system. This means:

1. **Templates auto-update:** When you set a `@localStorage` property, any template that reads
   it will re-render automatically.

2. **Getters that depend on localStorage properties are reactive:**
   ```ts
   @localStorage('visible-columns')
   savedColumns: string[] = ['name', 'email'];

   // This getter re-computes when savedColumns changes
   get columnCount(): number {
     return this.savedColumns.length;
   }
   ```

3. **The property is tracked under the hood.** You do not need `@tracked` in addition to
   `@localStorage`. Using both is redundant (and may cause issues).

### Important: Immutable Updates for Objects and Arrays

Like `@tracked`, reactivity for objects and arrays requires creating a new reference. Mutating
in place does NOT trigger re-renders:

```ts
// WRONG — mutates in place, no re-render, no localStorage write
this.savedColumns.push('phone');

// RIGHT — creates new array, triggers re-render + localStorage write
this.savedColumns = [...this.savedColumns, 'phone'];

// WRONG — mutates object in place
this.sortConfig.direction = 'desc';

// RIGHT — creates new object
this.sortConfig = { ...this.sortConfig, direction: 'desc' };
```

This is the single most common mistake with `@localStorage` in A3.

---
## Namespacing / Key Strategy

### Recommended Key Naming Convention for A3

Use a consistent, descriptive key naming pattern to avoid collisions:

```ts
// Pattern: {section}-{component}-{property}
@localStorage('employees-table-columns')     // Employee table column visibility
@localStorage('employees-table-sort')        // Employee table sort state
@localStorage('employees-table-page-size')   // Employee table pagination
@localStorage('employees-filters-expanded')  // Employee filter panel state
@localStorage('reports-sidebar-collapsed')   // Reports sidebar state
@localStorage('admin-settings-tab')          // Last selected admin settings tab
```

### Avoiding Key Collisions

Since localStorage is shared across the entire origin (domain + port):

1. **Prefix with app name** if multiple apps share a domain:
   ```ts
   @localStorage('a3-sidebar-collapsed')
   ```

2. **Include entity context** for entity-specific preferences:
   ```ts
   @localStorage(`employee-table-${companyId}-columns`)
   ```
   Note: Dynamic keys require special handling since decorators run at class definition time.
   For dynamic keys, use plain `localStorage.getItem/setItem` with `@tracked` manually.

3. **Document all keys** in a central location to prevent accidental reuse.

---
## Clearing Storage

### Clear a Single Key

```ts
// Setting to default value (may or may not remove the key)
this.isCollapsed = false;

// Explicitly remove from localStorage
localStorage.removeItem('sidebar-collapsed');
// Note: The @localStorage property will still hold its current in-memory value
// until the component is re-created
```

### Clear All App Storage

```ts
// Clear ALL localStorage (use carefully — affects ALL apps on this origin)
localStorage.clear();

// Clear only A3 keys (if prefixed)
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key?.startsWith('a3-') || key?.startsWith('pref-')) {
    localStorage.removeItem(key);
  }
}
```

### A3 Pattern — Reset Preferences

```ts
// app/services/ui-preferences.ts
export default class UiPreferencesService extends Service {
  // ... localStorage properties ...

  resetAll() {
    // Reset to defaults by setting each property
    this.sidebarCollapsed = false;
    this.darkMode = false;
    this.compactView = false;
    this.itemsPerPage = 25;
    this.dateFormat = 'MMM D, YYYY';
    this.recentEmployeeIds = [];
    this.favoriteReports = [];
  }
}
```

---
## SSR / FastBoot Considerations

`localStorage` is a browser-only API. It does not exist in Node.js / FastBoot environments.

If A3 ever adopts server-side rendering (SSR) via FastBoot or similar:

1. **The decorator will throw** if `localStorage` is accessed during SSR.
2. **Guard with environment check:**
   ```ts
   import { isFastBoot } from 'ember-cli-fastboot/utils';

   // Or check directly
   const hasLocalStorage = typeof window !== 'undefined' && window.localStorage;
   ```
3. **The preferred approach** is to use FastBoot's `shoebox` for passing server-side state
   and only initialize `@localStorage` properties on the client side.

Currently A3 does NOT use SSR, so this is not a concern, but it is worth noting for
future-proofing.

---
## Storage Limits and Error Handling

### Browser Storage Limits

| Browser | localStorage Limit |
|---------|-------------------|
| Chrome | 5 MB per origin |
| Firefox | 5 MB per origin |
| Safari | 5 MB per origin |
| Edge | 5 MB per origin |

5 MB is approximately 2.5 million characters of JSON. For UI preferences, this is more than
sufficient. A3 typically uses less than 10 KB total.

### Handling Storage Errors

`localStorage.setItem` can throw `QuotaExceededError` if the storage is full. The decorator
may or may not handle this gracefully. For safety in critical paths:

```ts
@action
addRecentItem(item: RecentItem) {
  try {
    this.recentItems = [item, ...this.recentItems.slice(0, 49)];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Storage full — clear old data
      this.recentItems = [item];
    } else {
      throw error;
    }
  }
}
```

### Private Browsing Mode

Some browsers (notably older Safari) throw errors when writing to localStorage in private
browsing mode. Modern browsers generally allow it but clear storage when the session ends.
The `@localStorage` decorator handles this gracefully by falling back to in-memory storage.

---
## When NOT to Use @localStorage

1. **Sensitive data** — Never store tokens, passwords, PII, or session data. Use secure cookies
   or session storage for auth tokens.

2. **Large datasets** — If the data exceeds a few KB, consider IndexedDB or the server.

3. **Cross-device state** — localStorage is device-specific. For preferences that should follow
   the user across devices, store in Firestore on the user document.

4. **Shared state** — If multiple browser tabs need to stay in sync, consider the
   `StorageEvent` API or a shared service worker. The `@localStorage` decorator does NOT
   automatically sync across tabs.

5. **Non-serializable values** — Functions, class instances, Symbols, `Date` objects (stored as
   strings), `undefined` (dropped by JSON.stringify), circular references.

---
## @localStorage vs @tracked vs Firestore

| Concern | `@tracked` | `@localStorage` | Firestore |
|---------|-----------|-----------------|-----------|
| **Persistence** | None (lost on refresh) | Browser only | Server (permanent) |
| **Cross-device** | No | No | Yes |
| **Cross-tab** | No | No (without extra work) | Yes (with listener) |
| **Performance** | Fastest | Fast (sync I/O) | Slow (async network) |
| **Use case** | Ephemeral UI state | Device-specific preferences | Business data, shared state |
| **Examples** | Dropdown open state, form dirty state | Sidebar collapsed, column prefs | Employee records, settings |

### Decision Guide

- "Does this need to survive a page refresh?" No -> `@tracked`. Yes -> continue.
- "Does this need to follow the user across devices?" No -> `@localStorage`. Yes -> Firestore.
- "Is this sensitive data (PII, auth)?" Yes -> Server/secure cookies. No -> `@localStorage` is fine.

---
## Quick Reference

```ts
import { localStorage } from 'ember-local-storage-decorator';

// Boolean with explicit key
@localStorage('sidebar-collapsed')
isCollapsed: boolean = false;

// String with auto key
@localStorage
theme: string = 'light';

// Number
@localStorage('page-size')
pageSize: number = 25;

// Array (always update immutably!)
@localStorage('visible-cols')
columns: string[] = ['name', 'email'];

// Object (always update immutably!)
@localStorage('sort-config')
sort: { col: string; dir: string } = { col: 'name', dir: 'asc' };

// Nullable
@localStorage('last-id')
lastId: string | null = null;
```
