---
name: fontawesome
description: FontAwesome 7 reference — icon library used across A3 via @fortawesome packages and the design system Icon component
version: 0.1.0
---

# FontAwesome 7 Reference

## Overview

A3 uses FontAwesome 7 icons via the `@fortawesome` npm packages, rendered through the design system's `Icon` component from `@trusted-american/ember`. Icons are SVG-based (not font-based), tree-shakeable, and individually imported to minimize bundle size. The two icon sets used are **solid** (`fas`) and **brands** (`fab`).

**Packages**:
- `@fortawesome/fontawesome-svg-core` — core SVG rendering engine
- `@fortawesome/free-solid-svg-icons` — solid icons (fas prefix)
- `@fortawesome/free-brands-svg-icons` — brand icons (fab prefix)

## Package Architecture

### @fortawesome/fontawesome-svg-core

The core library that handles SVG icon rendering, the icon library registry, and DOM manipulation. All other `@fortawesome` packages depend on this.

```typescript
import { library, dom, config } from '@fortawesome/fontawesome-svg-core';
```

Key exports:
- `library` — the global icon registry. Icons must be added to the library before use.
- `dom` — DOM utilities (watch for icon elements, convert `<i>` to `<svg>`)
- `config` — global configuration (autoReplaceSVG, observeMutations, etc.)

### @fortawesome/free-solid-svg-icons

Contains all solid-style icons. These have the prefix `fas` and are the most commonly used set in A3.

```typescript
import {
  faUser,
  faCheck,
  faXmark,
  faPlus,
  faTrash,
  faPen,
  faEnvelope,
  faPhone,
  // ... etc
} from '@fortawesome/free-solid-svg-icons';
```

### @fortawesome/free-brands-svg-icons

Contains brand/logo icons. These have the prefix `fab`.

```typescript
import {
  faGoogle,
  faApple,
  faStripe,
  faGithub,
  faSlack,
} from '@fortawesome/free-brands-svg-icons';
```

## Icon Registration

Icons must be imported and added to the FontAwesome library before they can be used. In A3, this is done in an application initializer or the app entry point:

```typescript
// app/initializers/fontawesome.ts
import { library } from '@fortawesome/fontawesome-svg-core';

// Solid icons
import {
  faUser,
  faUsers,
  faCheck,
  faXmark,
  faPlus,
  faMinus,
  faTrash,
  faPen,
  faPenToSquare,
  faEnvelope,
  faPhone,
  faBuilding,
  faFileContract,
  faChartLine,
  faChartBar,
  faChartPie,
  faDashboard,
  faSearch,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faArrowDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faCircleCheck,
  faCircleXmark,
  faCircleInfo,
  faTriangleExclamation,
  faSpinner,
  faCloudArrowUp,
  faDownload,
  faUpload,
  faEye,
  faEyeSlash,
  faLock,
  faUnlock,
  faGear,
  faBell,
  faCalendar,
  faCalendarDays,
  faClock,
  faClipboard,
  faCopy,
  faPrint,
  faFileExport,
  faFilePdf,
  faFileExcel,
  faFileCsv,
  faHome,
  faBars,
  faEllipsisVertical,
  faGripVertical,
  faExternalLink,
  faSignOut,
  faDollarSign,
  faPercent,
  faHashtag,
} from '@fortawesome/free-solid-svg-icons';

// Brand icons
import {
  faGoogle,
  faStripe,
} from '@fortawesome/free-brands-svg-icons';

export function initialize() {
  library.add(
    // Solid
    faUser, faUsers, faCheck, faXmark, faPlus, faMinus, faTrash, faPen,
    faPenToSquare, faEnvelope, faPhone, faBuilding, faFileContract,
    faChartLine, faChartBar, faChartPie, faDashboard, faSearch, faFilter,
    faSort, faSortUp, faSortDown, faArrowLeft, faArrowRight, faArrowUp,
    faArrowDown, faChevronLeft, faChevronRight, faChevronUp, faChevronDown,
    faCircleCheck, faCircleXmark, faCircleInfo, faTriangleExclamation,
    faSpinner, faCloudArrowUp, faDownload, faUpload, faEye, faEyeSlash,
    faLock, faUnlock, faGear, faBell, faCalendar, faCalendarDays, faClock,
    faClipboard, faCopy, faPrint, faFileExport, faFilePdf, faFileExcel,
    faFileCsv, faHome, faBars, faEllipsisVertical, faGripVertical,
    faExternalLink, faSignOut, faDollarSign, faPercent, faHashtag,
    // Brands
    faGoogle, faStripe,
  );
}

export default {
  initialize,
};
```

## The Design System Icon Component

A3 renders icons through the `Icon` component from `@trusted-american/ember`. This component wraps FontAwesome's SVG rendering with a consistent API.

### Basic Usage

```gts
import Icon from '@trusted-american/ember/components/icon';

<template>
  <Icon @icon="user" />
  <Icon @icon="check" />
  <Icon @icon="trash" />
</template>
```

### Icon Component Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `@icon` | `string` | required | The icon name (without prefix for solid, e.g. `"user"` not `"fa-user"`) |
| `@prefix` | `string` | `'fas'` | Icon prefix: `'fas'` for solid, `'fab'` for brands |
| `@size` | `string` | `undefined` | Size class: `'xs'`, `'sm'`, `'lg'`, `'xl'`, `'2xl'`, `'1x'`-`'10x'` |
| `@fixedWidth` | `boolean` | `false` | Fixed-width icon (useful for alignment in lists/menus) |
| `@spin` | `boolean` | `false` | Continuous spinning animation |
| `@pulse` | `boolean` | `false` | Pulsing animation (8-step rotation) |
| `@rotation` | `number` | `undefined` | Rotation in degrees: `90`, `180`, `270` |
| `@flip` | `string` | `undefined` | Flip direction: `'horizontal'`, `'vertical'`, `'both'` |
| `@color` | `string` | `undefined` | Design system color token: `'primary'`, `'success'`, `'danger'`, `'warning'`, `'info'`, `'muted'` |
| `@class` | `string` | `undefined` | Additional CSS classes |
| `@title` | `string` | `undefined` | Accessible title (rendered as `<title>` in SVG) |

### Sizing

```gts
<!-- Relative sizes -->
<Icon @icon="user" @size="xs" />   <!-- 0.75em -->
<Icon @icon="user" @size="sm" />   <!-- 0.875em -->
<Icon @icon="user" />              <!-- 1em (default) -->
<Icon @icon="user" @size="lg" />   <!-- 1.25em -->
<Icon @icon="user" @size="xl" />   <!-- 1.5em -->
<Icon @icon="user" @size="2xl" />  <!-- 2em -->

<!-- Absolute sizes -->
<Icon @icon="user" @size="1x" />   <!-- 1em -->
<Icon @icon="user" @size="2x" />   <!-- 2em -->
<Icon @icon="user" @size="3x" />   <!-- 3em -->
<Icon @icon="user" @size="5x" />   <!-- 5em -->
<Icon @icon="user" @size="10x" />  <!-- 10em -->
```

### Spinning (Loading States)

```gts
<!-- Smooth continuous rotation -->
<Icon @icon="spinner" @spin={{true}} />

<!-- Eight-step rotation -->
<Icon @icon="spinner" @pulse={{true}} />

<!-- Common loading pattern -->
{{#if this.saveTask.isRunning}}
  <Icon @icon="spinner" @spin={{true}} @class="me-1" />
  Saving...
{{else}}
  <Icon @icon="check" @class="me-1" />
  Save
{{/if}}
```

### Color via Design System @color Argument

The `@color` argument maps to design system color tokens, applying the appropriate text color class:

```gts
<Icon @icon="circle-check" @color="success" />    <!-- Green -->
<Icon @icon="circle-xmark" @color="danger" />      <!-- Red -->
<Icon @icon="triangle-exclamation" @color="warning" /> <!-- Yellow/Orange -->
<Icon @icon="circle-info" @color="info" />         <!-- Blue -->
<Icon @icon="user" @color="primary" />             <!-- Primary brand color -->
<Icon @icon="user" @color="muted" />               <!-- Gray/muted text -->
```

Under the hood, `@color="success"` applies a class like `text-success` (Bootstrap) or a design system equivalent.

### Fixed Width

Use `@fixedWidth` when icons need to be vertically aligned in lists, navigation, or tables:

```gts
<ul class="nav flex-column">
  <li class="nav-item">
    <Icon @icon="dashboard" @fixedWidth={{true}} @class="me-2" />
    Dashboard
  </li>
  <li class="nav-item">
    <Icon @icon="users" @fixedWidth={{true}} @class="me-2" />
    Clients
  </li>
  <li class="nav-item">
    <Icon @icon="file-contract" @fixedWidth={{true}} @class="me-2" />
    Contracts
  </li>
  <li class="nav-item">
    <Icon @icon="gear" @fixedWidth={{true}} @class="me-2" />
    Settings
  </li>
</ul>
```

## Icon Prefixes

### fas — Solid (Default)

Solid icons are filled shapes. This is the default prefix when `@prefix` is omitted.

```gts
<Icon @icon="user" />                <!-- Implicitly fas -->
<Icon @icon="user" @prefix="fas" />  <!-- Explicitly fas -->
```

### fab — Brands

Brand icons are logos and trademarks. You MUST specify `@prefix="fab"`.

```gts
<Icon @icon="google" @prefix="fab" />
<Icon @icon="stripe" @prefix="fab" />
<Icon @icon="github" @prefix="fab" />
<Icon @icon="slack" @prefix="fab" />
```

## Common Icons Used in A3

### Navigation and Actions

| Icon | Usage |
|------|-------|
| `home` | Home/dashboard link |
| `bars` | Hamburger menu toggle |
| `chevron-left/right` | Back/forward navigation, pagination |
| `arrow-left/right` | Directional navigation |
| `external-link` | Opens in new tab indicator |
| `sign-out` | Logout button |

### CRUD Operations

| Icon | Usage |
|------|-------|
| `plus` | Create/add new item |
| `pen` / `pen-to-square` | Edit/modify item |
| `trash` | Delete item |
| `eye` | View/preview item |
| `copy` | Duplicate/copy item |
| `clipboard` | Copy to clipboard |

### Status and Feedback

| Icon | Usage |
|------|-------|
| `circle-check` | Success state, completed items |
| `circle-xmark` | Error state, failed items |
| `triangle-exclamation` | Warning state |
| `circle-info` | Information state |
| `spinner` (with `@spin`) | Loading state |
| `bell` | Notifications |

### Data and Reports

| Icon | Usage |
|------|-------|
| `chart-line` | Line chart / analytics |
| `chart-bar` | Bar chart / reports |
| `chart-pie` | Pie chart / distribution |
| `dashboard` | Dashboard overview |
| `file-export` | Export data |
| `file-pdf` | PDF document |
| `file-excel` | Excel export |
| `file-csv` | CSV export |
| `download` | Download file |
| `upload` / `cloud-arrow-up` | Upload file |
| `print` | Print page/report |

### Business Domain

| Icon | Usage |
|------|-------|
| `user` | Single person / client |
| `users` | Group of people / team |
| `building` | Agency / company |
| `file-contract` | Contract / agreement |
| `envelope` | Email |
| `phone` | Phone number |
| `calendar` / `calendar-days` | Date / schedule |
| `clock` | Time / history |
| `dollar-sign` | Money / premium / commission |
| `percent` | Percentage / rate |
| `lock` / `unlock` | Security / access control |
| `gear` | Settings |

### Table and List Controls

| Icon | Usage |
|------|-------|
| `search` | Search input |
| `filter` | Filter controls |
| `sort` | Default sort indicator |
| `sort-up` | Ascending sort |
| `sort-down` | Descending sort |
| `ellipsis-vertical` | More actions menu |
| `grip-vertical` | Drag handle for reordering |

## Accessibility

### aria-label for Interactive Icons

When an icon is the only content of a button or link, add an `aria-label` for screen readers:

```gts
<button type="button" aria-label="Delete client" {{on "click" this.deleteClient}}>
  <Icon @icon="trash" @color="danger" />
</button>

<a href={{this.editUrl}} aria-label="Edit client">
  <Icon @icon="pen" />
</a>
```

### @title for Informational Icons

For standalone informational icons, use `@title` to add an accessible label:

```gts
<Icon @icon="circle-check" @color="success" @title="Active" />
<Icon @icon="circle-xmark" @color="danger" @title="Terminated" />
```

This renders a `<title>` element inside the SVG, accessible to screen readers and shown as a tooltip on hover.

### Decorative Icons (role="presentation")

When an icon is purely decorative (next to text that already conveys the meaning), hide it from assistive technology:

```gts
<!-- The text "Save" already conveys meaning, icon is decorative -->
<button type="button" {{on "click" this.save}}>
  <Icon @icon="check" @class="me-1" aria-hidden="true" />
  Save
</button>
```

The Icon component should automatically set `aria-hidden="true"` when no `@title` is provided, but it is good practice to be explicit for clarity.

### Color Accessibility

Never use icon color alone to convey status. Always pair with text or an accessible label:

```gts
<!-- Bad: color alone -->
<Icon @icon="circle" @color="success" />

<!-- Good: color + text -->
<Icon @icon="circle-check" @color="success" @class="me-1" />
<span>Active</span>

<!-- Good: color + title -->
<Icon @icon="circle-check" @color="success" @title="Status: Active" />
```

## Performance: Tree-Shaking

FontAwesome's packages export individual icon objects. By importing only what you need, tree-shaking eliminates unused icons from the bundle:

```typescript
// Good: imports only 3 icons
import { faUser, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';

// Bad: imports entire icon set (huge bundle)
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
```

Each icon import adds roughly 1-3 KB (uncompressed) to the bundle. With tree-shaking, only registered icons are included.

## Further Investigation

- **FontAwesome Docs**: https://docs.fontawesome.com/
- **Icon Search**: https://fontawesome.com/search
- **SVG Core API**: https://docs.fontawesome.com/apis/javascript/methods
- **Accessibility**: https://docs.fontawesome.com/web/dig-deeper/accessibility
