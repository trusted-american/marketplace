---
name: tailwind-bootstrap
description: Tailwind CSS 4 and Bootstrap 5 styling reference — how A3 uses both frameworks together, utility classes, component styling, and responsive design patterns
version: 0.1.0
---

# Tailwind CSS & Bootstrap Styling Reference

## A3 Styling Stack

A3 uses BOTH Tailwind CSS and Bootstrap:
- **Tailwind CSS 4** — Primary utility-class framework (via @tailwindcss/vite)
- **Bootstrap 5** — UI component framework (modals, forms, grid, dropdowns)
- Both are available in every component

## Tailwind CSS 4

### Configuration
Tailwind is loaded via `@tailwindcss/vite` plugin in `vite.config.mjs`. Entry point is `app/styles/app.css`.

### Common Utility Classes

#### Layout
```
flex, inline-flex, block, inline-block, grid, hidden
items-center, items-start, items-end
justify-center, justify-between, justify-start, justify-end
flex-col, flex-row, flex-wrap
gap-1 through gap-12
```

#### Spacing
```
p-0 through p-12 (padding)
px-4, py-2 (horizontal/vertical padding)
m-0 through m-12 (margin)
mx-auto (center horizontally)
mt-3, mb-4 (specific side margin)
space-x-2, space-y-3 (child spacing)
```

#### Typography
```
text-sm, text-base, text-lg, text-xl, text-2xl
font-bold, font-semibold, font-medium, font-normal
text-gray-500, text-gray-700, text-gray-900
text-center, text-left, text-right
truncate, line-clamp-2
```

#### Colors (A3 Palette)
```
text-primary, bg-primary (Bootstrap's primary color)
text-muted, text-secondary
bg-white, bg-gray-50, bg-gray-100
border-gray-200, border-gray-300
```

#### Borders & Rounded
```
border, border-0, border-t, border-b
rounded, rounded-md, rounded-lg, rounded-full
shadow-sm, shadow, shadow-md, shadow-lg
```

#### Width & Height
```
w-full, w-1/2, w-1/3, w-auto
h-full, h-screen, h-auto
max-w-md, max-w-lg, max-w-xl
min-h-screen
```

#### Responsive Prefixes
```
sm:  (≥640px)
md:  (≥768px)
lg:  (≥1024px)
xl:  (≥1280px)
2xl: (≥1536px)

Example: "hidden md:block" — hidden on mobile, visible on md+
```

## Bootstrap 5

### Grid System
```html
<div class="container-fluid">
  <div class="row">
    <div class="col-12 col-md-6 col-lg-4">Column</div>
    <div class="col-12 col-md-6 col-lg-8">Column</div>
  </div>
</div>
```

### Forms
```html
<div class="mb-3">
  <label class="form-label">Email</label>
  <input type="email" class="form-control" />
  <div class="form-text">Helper text</div>
</div>

<div class="mb-3">
  <label class="form-label">Status</label>
  <select class="form-select">
    <option>Active</option>
    <option>Inactive</option>
  </select>
</div>

<div class="form-check">
  <input type="checkbox" class="form-check-input" />
  <label class="form-check-label">Remember me</label>
</div>
```

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-outline-primary">Outline</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-lg">Large</button>
```

### Alerts
```html
<div class="alert alert-success">Success message</div>
<div class="alert alert-danger">Error message</div>
<div class="alert alert-warning">Warning message</div>
<div class="alert alert-info">Info message</div>
```

### Badges
```html
<span class="badge bg-primary">Primary</span>
<span class="badge bg-success">Active</span>
<span class="badge bg-danger">Cancelled</span>
<span class="badge bg-warning text-dark">Pending</span>
```

### Cards
```html
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body">
    <h5 class="card-title">Card Title</h5>
    <p class="card-text">Content</p>
  </div>
  <div class="card-footer">Footer</div>
</div>
```

### Tables
```html
<table class="table table-striped table-hover">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td><span class="badge bg-success">Active</span></td>
    </tr>
  </tbody>
</table>
```

### Modals (Bootstrap JS)
```html
<div class="modal show d-block">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Title</h5>
        <button class="btn-close"></button>
      </div>
      <div class="modal-body">Content</div>
      <div class="modal-footer">
        <button class="btn btn-secondary">Cancel</button>
        <button class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>
</div>
```

### Spinners
```html
<div class="spinner-border" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
<div class="spinner-border spinner-border-sm"></div>
```

## A3 Styling Conventions

1. **Prefer Tailwind** for new components (layout, spacing, typography)
2. **Use Bootstrap** for form controls, buttons, badges, modals, tables, cards
3. **Mixing is OK** — `class="card p-4 flex items-center"` (Bootstrap card + Tailwind spacing)
4. **Responsive design** — mobile-first, use Tailwind responsive prefixes
5. **Dark mode** — check if A3 supports dark mode before adding dark: prefixes
6. **No custom CSS** unless absolutely necessary — prefer utility classes

## Further Investigation

- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Bootstrap 5 Docs**: https://getbootstrap.com/docs/5.3/
