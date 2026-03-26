---
name: taia-design-system
description: Complete TAIA design system reference — all 88+ Ember GTS components, design tokens, helpers, modifiers, import patterns, and usage examples from @trusted-american/ember
version: 0.1.0
---

# TAIA Design System Reference

## Overview

The Trusted American Insurance Agency (TAIA) design system is a monorepo providing reusable UI components. A3 uses the Ember package (`@trusted-american/ember`).

**Repo**: https://github.com/trusted-american/design-system
**Local**: `~/Desktop/design-system`
**Docs**: https://taia-design-system.netlify.app
**Packages**:
- `@trusted-american/core` — Design tokens as TypeScript constants (Tailwind classes)
- `@trusted-american/ember` — 88+ Glimmer GTS components for Ember apps
- `@trusted-american/react` — React implementation (not used in A3)

## Installation in A3

```bash
pnpm add @trusted-american/core @trusted-american/ember
```

In `ember-cli-build.js`:
```javascript
app.import('node_modules/bootstrap/dist/css/bootstrap.css');
```

App layout wraps in Frame + Aside + Main:
```gts
import Frame from '@trusted-american/ember/components/frame';
import Aside from '@trusted-american/ember/components/aside';
import Main from '@trusted-american/ember/components/main';
import { theme } from '@trusted-american/ember/helpers/theme';

<template>
  {{theme "light"}}
  <Frame>
    <Aside>{{! Navigation sidebar }}</Aside>
    <Main>{{outlet}}</Main>
  </Frame>
</template>
```

## Design Tokens

### Colors
| Name | Value | Usage |
|------|-------|-------|
| `primary` | blue-700 (#0d66fd) | Primary actions, links, active states |
| `secondary` | gray-500 (#6c757d) | Secondary actions, muted text |
| `success` | green-700 (#198754) | Success states, active/approved |
| `danger` | red-700 (#dc3545) | Errors, destructive actions, cancelled |
| `warning` | yellow-500 (#ffc107) | Warnings, pending states |
| `info` | sky-500 (#0dcaf0) | Informational, neutral highlights |
| `upsell` | purple-500 (#a855f7) | Premium/upsell features (custom TAIA color) |

### Sizes
- `sm` — Small variant
- `lg` — Large variant
- Default (no size prop) — Standard size

### CSS Custom Properties
```css
--ds-border-radius: 0.5rem;
--ds-disabled-color: #6c757d;
--ds-upsell: #a855f7;
```

## Complete Component Reference

### Layout

| Component | Import Path | Purpose |
|-----------|------------|---------|
| `Frame` | `frame` | App-level wrapper |
| `Main` | `main` | Main content area |
| `Main::Header` | `main/header` | Page header |
| `Main::TopHeader` | `main/top-header` | Top bar |
| `Main::Body` | `main/body` | Content body |
| `Main::Footer` | `main/footer` | Page footer |
| `Aside` | `aside` | Sidebar navigation |
| `Aside::Group` | `aside/group` | Nav group |
| `Aside::Item` | `aside/item` | Nav item (`@active`) |
| `Aside::Title` | `aside/title` | Section title |

### Buttons & Actions

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Button` | `@color`, `@size`, `@outline`, `@loading`, `@disabled` | Primary action button |
| `ButtonGroup` | — | Group buttons horizontally |
| `ButtonSet` | — | Button set variant |
| `CloseButton` | `@onClick` | Dismiss/close X button |
| `Copy` | `@value` | Copy-to-clipboard button |
| `CopyBox` | `@value` | Input field with copy button |

### Data Display

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Badge` | `@color` | Status/label badge |
| `StatCard` | `@label`, `@value` | Metric/stat display card |
| `PropertyList` | — | Key-value detail list |
| `PropertyList::Item` | `@key`, `@value` | Individual key-value pair |
| `Table` | — | Full-featured data table |
| `BasicTable` | `@columns`, `@rows` | Simple data table |
| `ListGroup` | — | Grouped list |
| `ListFilter` | — | Filter controls |
| `ListSort` | — | Sort controls |
| `FileType` | `@type` | File type icon/indicator |

### Feedback & Status

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Alert` | `@color` | Inline alert message |
| `Alert::Link` | `@href` | Link within alert |
| `Banner` | `@color` | Full-width banner notification |
| `Toast` | `@color`, `@onDismiss` | Temporary notification |
| `ToastContainer` | — | Container for toasts |
| `Spinner` | `@color`, `@size`, `@loading` | Loading spinner |
| `Skeleton` | — | Content loading placeholder |
| `Placeholder` | `@icon`, `@message`, `@buttonLabel`, `@onButtonClick` | Empty state |
| `Progress` | — | Progress bar container |
| `Progress::Bar` | `@value`, `@color` | Individual progress bar |

### Navigation

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Nav` | — | Tab/pill navigation |
| `Nav::Item` | `@active` | Individual nav tab |
| `BreadcrumbTrail` | — | Auto breadcrumbs from routes |
| `Link` | `@href` | Styled link |
| `Pagination` | `@page`, `@totalPages`, `@onChange` | Page navigation |

### Containers

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Card` | `@hoverable` | Card container |
| `Card::Header` | — | Card header |
| `Card::Body` | — | Card body |
| `Card::Footer` | — | Card footer |
| `Accordion` | — | Collapsible sections |
| `Accordion::Item` | — | Individual section |
| `Accordion::Button` | — | Section toggle |
| `Accordion::Body` | — | Section content |
| `Collapse` | `@isOpen` | Collapsible content |
| `Modal` | `@isOpen`, `@onClose`, `@title` | Modal dialog |
| `Dropdown` | `@label` | Dropdown menu |
| `Dropdown::Item` | — | Menu item |
| `Dropdown::Divider` | — | Menu divider |
| `Dropdown::Header` | — | Menu section header |
| `Flyout` | `@isOpen`, `@onClose` | Slide-out panel |

### Typography

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Heading` | `@subtitle` | Page/section heading |
| `Subheading` | — | Secondary heading |
| `Icon` | `@icon`, `@color`, `@spin` | FontAwesome icon wrapper |
| `Avatar` | `@name`, `@size` | User avatar (identicon fallback) |

### Form Components

| Component | Key Args | Purpose |
|-----------|---------|---------|
| `Form::Input` | `@label`, `@value`, `@onChange`, `@required`, `@error`, `@help`, `@size` | Text input |
| `Form::Select` | `@label`, `@value`, `@onChange`, `@options`, `@required` | Dropdown select |
| `Form::Textarea` | `@label`, `@value`, `@onChange`, `@rows` | Multi-line text |
| `Form::Check` | `@label`, `@checked`, `@onChange` | Checkbox |
| `Form::Radio` | `@label`, `@value`, `@onChange` | Radio group |
| `Form::RadioButton` | `@value` | Individual radio option |
| `Form::RadioCard` | `@value`, `@selected` | Card-style radio |
| `Form::DateInput` | `@label`, `@value`, `@onChange` | Date picker |
| `Form::TimeInput` | `@label`, `@value`, `@onChange` | Time picker |
| `Form::PhoneInput` | `@label`, `@value`, `@onChange` | Phone number input |
| `Form::NumberInput` | `@label`, `@value`, `@onChange`, `@step` | Number input |
| `Form::FileInput` | `@label`, `@accept`, `@onFileAdded` | File upload button |
| `Form::FileDropzone` | `@onFileAdded` | Drag-and-drop file zone |
| `Form::HtmlInput` | `@label`, `@value`, `@onChange` | Rich text editor (TipTap) |
| `Form::MarkdownInput` | `@label`, `@value`, `@onChange` | Markdown editor |
| `Form::PowerSelect` | `@label`, `@options`, `@selected`, `@onChange`, `@searchEnabled` | Searchable select |
| `Form::PowerSelectMultiple` | `@label`, `@options`, `@selected`, `@onChange` | Multi-select |
| `Form::Label` | `@required` | Standalone label |
| `Form::Help` | — | Help text |
| `Form::Feedback` | `@type` | Validation feedback |

### Helpers

| Helper | Import | Usage |
|--------|--------|-------|
| `theme` | `helpers/theme` | `{{theme "light"}}` — sets Bootstrap theme |
| `file-size` | `helpers/file-size` | `{{file-size 1048576}}` → "1 MB" |
| `from-now` | `helpers/from-now` | `{{from-now date}}` → "2 hours ago" |
| `timestamp` | `helpers/timestamp` | `{{timestamp date "MMM D, YYYY"}}` → "Jan 15, 2024" |

### Modifiers

| Modifier | Import | Usage |
|----------|--------|-------|
| `collapse` | `modifiers/collapse` | `{{collapse @isOpen}}` — Bootstrap collapse |
| `dropdown` | `modifiers/dropdown` | `{{dropdown onShow=... onHide=...}}` — Bootstrap dropdown |
| `tooltip` | `modifiers/tooltip` | `{{tooltip "Text" placement="top"}}` — Bootstrap tooltip |

## Import Pattern

All components import from `@trusted-american/ember/components/`:

```typescript
import Button from '@trusted-american/ember/components/button';
import Badge from '@trusted-american/ember/components/badge';
import Card from '@trusted-american/ember/components/card';
import CardBody from '@trusted-american/ember/components/card/body';
import FormInput from '@trusted-american/ember/components/form/input';
import FormSelect from '@trusted-american/ember/components/form/select';
import Modal from '@trusted-american/ember/components/modal';
import Spinner from '@trusted-american/ember/components/spinner';
import Placeholder from '@trusted-american/ember/components/placeholder';
```

## When to Read the Source

If you're unsure about exact args or behavior, read the component source directly:
```
~/Desktop/design-system/packages/ember/addon/components/{component-name}.gts
```

The documentation site at https://taia-design-system.netlify.app shows live examples for every component.

## Further Investigation

- **Design System Repo**: https://github.com/trusted-american/design-system
- **Docs Site**: https://taia-design-system.netlify.app
- **Core Tokens Source**: `~/Desktop/design-system/packages/core/src/components/`
- **Ember Components Source**: `~/Desktop/design-system/packages/ember/addon/components/`
- **Bootstrap 5 Docs**: https://getbootstrap.com/docs/5.3/ (underlying framework)
- **TipTap Editor**: https://tiptap.dev/ (powers Form::HtmlInput)
- **FullCalendar**: https://fullcalendar.io/ (powers Calendar component)
