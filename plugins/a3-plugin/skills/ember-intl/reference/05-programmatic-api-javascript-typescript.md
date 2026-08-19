## 4. Programmatic API (JavaScript/TypeScript)

### 4.1 Service Injection

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class MyComponent extends Component {
  @service declare intl: IntlService;
}
```

### 4.2 `this.intl.t()` — Translate

The primary method. Looks up a key, substitutes arguments, and returns a formatted string.

```typescript
// Simple
this.intl.t('enrollments.title');
// "Enrollments"

// With arguments
this.intl.t('greeting', { name: 'John' });
// "Hello, John!"

// Pluralization
this.intl.t('enrollments.count', { count: 5 });
// "5 enrollments"

this.intl.t('enrollments.count', { count: 0 });
// "No enrollments"

this.intl.t('enrollments.count', { count: 1 });
// "1 enrollment"

// With htmlSafe
this.intl.t('richMessage', { htmlSafe: true });
// Returns a SafeString that won't be escaped in templates
```

### 4.3 `this.intl.formatNumber()` — Format Numbers

```typescript
// Basic
this.intl.formatNumber(1234567.89);
// "1,234,567.89"

// Currency
this.intl.formatNumber(1234.56, { style: 'currency', currency: 'USD' });
// "$1,234.56"

this.intl.formatNumber(1234.56, {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'name',
});
// "1,234.56 US dollars"

// Percent
this.intl.formatNumber(0.756, { style: 'percent' });
// "76%"

this.intl.formatNumber(0.756, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
// "75.6%"

// Compact
this.intl.formatNumber(1234567, { notation: 'compact' });
// "1.2M"

// Unit
this.intl.formatNumber(100, { style: 'unit', unit: 'mile' });
// "100 mi"

// Significant digits
this.intl.formatNumber(0.00456, {
  minimumSignificantDigits: 2,
  maximumSignificantDigits: 3,
});
// "0.00456"

// Accounting sign
this.intl.formatNumber(-1234.56, {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting',
});
// "($1,234.56)"
```

### 4.4 `this.intl.formatDate()` — Format Dates

```typescript
const date = new Date('2026-03-26T15:30:00');

// Predefined styles
this.intl.formatDate(date, { dateStyle: 'short' });
// "3/26/26"

this.intl.formatDate(date, { dateStyle: 'medium' });
// "Mar 26, 2026"

this.intl.formatDate(date, { dateStyle: 'long' });
// "March 26, 2026"

this.intl.formatDate(date, { dateStyle: 'full' });
// "Thursday, March 26, 2026"

// With time
this.intl.formatDate(date, { dateStyle: 'medium', timeStyle: 'short' });
// "Mar 26, 2026, 3:30 PM"

// Custom components
this.intl.formatDate(date, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});
// "Thursday, March 26, 2026"

// With timezone
this.intl.formatDate(date, {
  dateStyle: 'long',
  timeStyle: 'long',
  timeZone: 'America/New_York',
});
// "March 26, 2026 at 3:30:00 PM EDT"
```

### 4.5 `this.intl.formatRelative()` — Relative Time

```typescript
// Negative = past, Positive = future
this.intl.formatRelative(-3, { unit: 'day' });
// "3 days ago"

this.intl.formatRelative(2, { unit: 'hour' });
// "in 2 hours"

this.intl.formatRelative(-1, { unit: 'day', numeric: 'auto' });
// "yesterday"

this.intl.formatRelative(0, { unit: 'day', numeric: 'auto' });
// "today"

this.intl.formatRelative(1, { unit: 'day', numeric: 'auto' });
// "tomorrow"

this.intl.formatRelative(-1, { unit: 'week', numeric: 'auto' });
// "last week"

this.intl.formatRelative(-1, { unit: 'month', numeric: 'auto' });
// "last month"

this.intl.formatRelative(-2, { unit: 'year' });
// "2 years ago"

// Style options
this.intl.formatRelative(-3, { unit: 'day', style: 'narrow' });
// "3d ago"

this.intl.formatRelative(-3, { unit: 'day', style: 'short' });
// "3 days ago"
```

### 4.6 `this.intl.formatList()` — List Formatting

```typescript
// Conjunction (and)
this.intl.formatList(['Alice', 'Bob', 'Charlie'], { type: 'conjunction' });
// "Alice, Bob, and Charlie"

// Disjunction (or)
this.intl.formatList(['Active', 'Pending', 'Draft'], { type: 'disjunction' });
// "Active, Pending, or Draft"

// Unit
this.intl.formatList(['10 lb', '5 oz'], { type: 'unit' });
// "10 lb, 5 oz"

// Short style
this.intl.formatList(['Alice', 'Bob', 'Charlie'], {
  type: 'conjunction',
  style: 'short',
});
// "Alice, Bob, & Charlie"
```

### 4.7 Locale Properties

```typescript
// Get the current locale (array of locale identifiers)
this.intl.locale;
// ['en-us']

// Get the primary (first) locale
this.intl.primaryLocale;
// 'en-us'

// Set locale
this.intl.locale = ['es'];

// Set locale with fallback chain
this.intl.locale = ['es-mx', 'es', 'en-us'];
```

### 4.8 `this.intl.exists()` — Check Translation Existence

Returns `true` if a translation key exists in the current locale (or any locale in the fallback chain).

```typescript
this.intl.exists('enrollments.title');
// true

this.intl.exists('nonexistent.key');
// false

// Useful for conditional rendering
if (this.intl.exists(`enrollments.status.${status}`)) {
  return this.intl.t(`enrollments.status.${status}`);
} else {
  return status; // fallback to raw status string
}
```

### 4.9 `this.intl.lookup()` — Raw Lookup Without Formatting

Returns the raw translation string without ICU MessageFormat processing. Returns `undefined` if the key is not found (does not trigger missing translation warnings).

```typescript
this.intl.lookup('enrollments.count');
// "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"

this.intl.lookup('nonexistent.key');
// undefined

// Useful when you need the raw ICU pattern
const pattern = this.intl.lookup('enrollments.count');
if (pattern && pattern.includes('{count, plural')) {
  // This is a pluralized message
}
```

---
