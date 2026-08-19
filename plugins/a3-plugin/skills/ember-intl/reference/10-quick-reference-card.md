## Quick Reference Card

### Template Helpers

| Helper | Example | Output |
|--------|---------|--------|
| `{{t "key"}}` | `{{t "buttons.save"}}` | Save |
| `{{t "key" arg=val}}` | `{{t "greeting" name="Jo"}}` | Hello, Jo! |
| `{{format-number}}` | `{{format-number 1234 style="currency" currency="USD"}}` | $1,234.00 |
| `{{format-date}}` | `{{format-date @date dateStyle="medium"}}` | Mar 26, 2026 |
| `{{format-time}}` | `{{format-time @time timeStyle="short"}}` | 3:30 PM |
| `{{format-relative}}` | `{{format-relative -3 unit="day"}}` | 3 days ago |
| `{{format-list}}` | `{{format-list @items type="conjunction"}}` | A, B, and C |

### JS/TS API

| Method | Example |
|--------|---------|
| `t(key, args)` | `this.intl.t('enrollments.count', { count: 5 })` |
| `formatNumber(num, opts)` | `this.intl.formatNumber(1234, { style: 'currency', currency: 'USD' })` |
| `formatDate(date, opts)` | `this.intl.formatDate(new Date(), { dateStyle: 'medium' })` |
| `formatRelative(num, opts)` | `this.intl.formatRelative(-3, { unit: 'day' })` |
| `formatList(arr, opts)` | `this.intl.formatList(['a', 'b'], { type: 'conjunction' })` |
| `exists(key)` | `this.intl.exists('some.key')` |
| `lookup(key)` | `this.intl.lookup('some.key')` |
| `setLocale(locales)` | `this.intl.setLocale(['en-us'])` |
| `primaryLocale` | `this.intl.primaryLocale` |

### ICU Message Format

| Feature | Syntax |
|---------|--------|
| Argument | `{name}` |
| Plural | `{count, plural, =0 {none} one {# item} other {# items}}` |
| Select | `{role, select, admin {Admin} other {User}}` |
| Selectordinal | `{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` |
| Number | `{amount, number, ::currency/USD}` |
| Date | `{date, date, medium}` |
| Escape brace | `'{'` |
| Literal apostrophe | `''` |
