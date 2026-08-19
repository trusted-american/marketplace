## 2. Template Helpers (Exhaustive Reference)

### 2.1 `{{t}}` — Translation Helper

The primary helper. Looks up a translation key and formats it with provided arguments.

#### Basic Usage

```gts
<template>
  {{t "enrollments.title"}}
  {{! Output: Enrollments }}
</template>
```

#### With Named Parameters

```gts
<template>
  {{t "greeting" name=@user.name}}
  {{t "enrollments.count" count=@items.length}}
  {{t "roleLabel" role=@currentUser.role}}
</template>
```

#### With Multiple Parameters

```gts
<template>
  {{t "assignmentMessage" name=@user.name count=@tasks.length date=@dueDate}}
</template>
```

#### With `htmlSafe`

When a translation contains HTML markup, you must mark it as safe. ember-intl escapes HTML by default for security.

```yaml
# Translation with HTML
richMessage: "Please <strong>review</strong> your enrollment before submitting."
linkMessage: "Visit our <a href=\"{url}\">help center</a> for more information."
```

```gts
import { t } from 'ember-intl';

<template>
  {{! WRONG: HTML will be escaped and shown as text }}
  {{t "richMessage"}}

  {{! RIGHT: use htmlSafe=true }}
  {{t "richMessage" htmlSafe=true}}

  {{! With params }}
  {{t "linkMessage" url="https://help.example.com" htmlSafe=true}}
</template>
```

In JavaScript:
```typescript
import { htmlSafe } from '@ember/template';

const message = this.intl.t('richMessage', { htmlSafe: true });
```

WARNING: Only use `htmlSafe` when you control the translation content. Never use it with user-provided data inside translations, as this can lead to XSS vulnerabilities.

### 2.2 `{{format-number}}` — Number Formatting

Formats a number according to the current locale using the Intl.NumberFormat API.

#### Basic Number

```gts
<template>
  {{format-number 1234567.89}}
  {{! Output: 1,234,567.89 (en-US) }}
</template>
```

#### Currency

```gts
<template>
  {{format-number @premium style="currency" currency="USD"}}
  {{! Output: $1,234.56 }}

  {{format-number @premium style="currency" currency="USD" currencyDisplay="name"}}
  {{! Output: 1,234.56 US dollars }}

  {{format-number @premium style="currency" currency="USD" currencyDisplay="code"}}
  {{! Output: USD 1,234.56 }}

  {{format-number @premium style="currency" currency="USD" currencyDisplay="narrowSymbol"}}
  {{! Output: $1,234.56 (narrowSymbol uses $ instead of US$) }}

  {{format-number @premium style="currency" currency="EUR"}}
  {{! Output: EUR 1,234.56 (in en-US locale) }}

  {{format-number @premium style="currency" currency="USD" currencySign="accounting"}}
  {{! Output: ($1,234.56) for negative numbers instead of -$1,234.56 }}
</template>
```

#### Percent

```gts
<template>
  {{format-number 0.756 style="percent"}}
  {{! Output: 76% }}

  {{format-number 0.756 style="percent" minimumFractionDigits=1}}
  {{! Output: 75.6% }}

  {{format-number 0.756 style="percent" maximumFractionDigits=2}}
  {{! Output: 75.6% }}
</template>
```

#### Decimal (default style)

```gts
<template>
  {{format-number 1234567.891 style="decimal"}}
  {{! Output: 1,234,567.891 }}

  {{format-number 1234567 style="decimal" useGrouping=false}}
  {{! Output: 1234567 (no thousand separators) }}
</template>
```

#### Unit

```gts
<template>
  {{format-number 100 style="unit" unit="kilometer"}}
  {{! Output: 100 km }}

  {{format-number 100 style="unit" unit="kilometer" unitDisplay="long"}}
  {{! Output: 100 kilometers }}

  {{format-number 100 style="unit" unit="kilometer" unitDisplay="narrow"}}
  {{! Output: 100km }}

  {{format-number 72 style="unit" unit="kilogram"}}
  {{! Output: 72 kg }}

  {{format-number 98.6 style="unit" unit="fahrenheit"}}
  {{! Output: 98.6 degF }}
</template>
```

#### Compact Notation

```gts
<template>
  {{format-number 1234 notation="compact"}}
  {{! Output: 1.2K }}

  {{format-number 1234567 notation="compact"}}
  {{! Output: 1.2M }}

  {{format-number 1234567 notation="compact" compactDisplay="long"}}
  {{! Output: 1.2 million }}
</template>
```

#### Significant Digits

```gts
<template>
  {{format-number 1234.5 minimumSignificantDigits=3 maximumSignificantDigits=5}}
  {{! Output: 1,234.5 }}

  {{format-number 0.00456 minimumSignificantDigits=2}}
  {{! Output: 0.0046 }}
</template>
```

#### All `format-number` Options

| Option | Values | Description |
|--------|--------|-------------|
| `style` | `"decimal"`, `"currency"`, `"percent"`, `"unit"` | Number format style |
| `currency` | ISO 4217 code (`"USD"`, `"EUR"`, etc.) | Currency code (required when style is currency) |
| `currencyDisplay` | `"symbol"`, `"narrowSymbol"`, `"code"`, `"name"` | How to display the currency |
| `currencySign` | `"standard"`, `"accounting"` | Accounting uses parentheses for negatives |
| `unit` | ECMA-402 unit (`"kilometer"`, `"kilogram"`, etc.) | Unit for unit style |
| `unitDisplay` | `"short"`, `"narrow"`, `"long"` | How to display the unit |
| `notation` | `"standard"`, `"scientific"`, `"engineering"`, `"compact"` | Notation style |
| `compactDisplay` | `"short"`, `"long"` | Used with compact notation |
| `useGrouping` | `true`, `false` | Whether to use grouping separators (commas) |
| `minimumIntegerDigits` | 1-21 | Minimum integer digits |
| `minimumFractionDigits` | 0-20 | Minimum fraction digits |
| `maximumFractionDigits` | 0-20 | Maximum fraction digits |
| `minimumSignificantDigits` | 1-21 | Minimum significant digits |
| `maximumSignificantDigits` | 1-21 | Maximum significant digits |
| `signDisplay` | `"auto"`, `"never"`, `"always"`, `"exceptZero"` | When to display the sign |
| `roundingMode` | `"ceil"`, `"floor"`, `"expand"`, `"trunc"`, `"halfCeil"`, `"halfFloor"`, `"halfExpand"`, `"halfTrunc"`, `"halfEven"` | Rounding behavior |

### 2.3 `{{format-date}}` — Date Formatting

Formats a Date object or timestamp according to the current locale.

#### Predefined Styles

```gts
<template>
  {{format-date @createdAt dateStyle="short"}}
  {{! Output: 3/26/26 }}

  {{format-date @createdAt dateStyle="medium"}}
  {{! Output: Mar 26, 2026 }}

  {{format-date @createdAt dateStyle="long"}}
  {{! Output: March 26, 2026 }}

  {{format-date @createdAt dateStyle="full"}}
  {{! Output: Thursday, March 26, 2026 }}
</template>
```

#### With Time

```gts
<template>
  {{format-date @createdAt dateStyle="medium" timeStyle="short"}}
  {{! Output: Mar 26, 2026, 3:30 PM }}

  {{format-date @createdAt dateStyle="long" timeStyle="long"}}
  {{! Output: March 26, 2026 at 3:30:00 PM EDT }}
</template>
```

#### Custom Component Options

When you need fine-grained control, specify individual date components instead of `dateStyle`:

```gts
<template>
  {{! Year and month only }}
  {{format-date @date year="numeric" month="long"}}
  {{! Output: March 2026 }}

  {{! Month and day only }}
  {{format-date @date month="short" day="numeric"}}
  {{! Output: Mar 26 }}

  {{! Weekday }}
  {{format-date @date weekday="long" month="long" day="numeric"}}
  {{! Output: Thursday, March 26 }}

  {{! Two-digit year }}
  {{format-date @date year="2-digit" month="2-digit" day="2-digit"}}
  {{! Output: 03/26/26 }}
</template>
```

#### All `format-date` Options

| Option | Values | Description |
|--------|--------|-------------|
| `dateStyle` | `"short"`, `"medium"`, `"long"`, `"full"` | Quick date style (cannot combine with component options) |
| `timeStyle` | `"short"`, `"medium"`, `"long"`, `"full"` | Quick time style |
| `weekday` | `"narrow"`, `"short"`, `"long"` | Weekday display |
| `era` | `"narrow"`, `"short"`, `"long"` | Era display (BC/AD) |
| `year` | `"numeric"`, `"2-digit"` | Year display |
| `month` | `"numeric"`, `"2-digit"`, `"narrow"`, `"short"`, `"long"` | Month display |
| `day` | `"numeric"`, `"2-digit"` | Day display |
| `hour` | `"numeric"`, `"2-digit"` | Hour display |
| `minute` | `"numeric"`, `"2-digit"` | Minute display |
| `second` | `"numeric"`, `"2-digit"` | Second display |
| `timeZoneName` | `"short"`, `"long"`, `"shortOffset"`, `"longOffset"`, `"shortGeneric"`, `"longGeneric"` | Time zone name |
| `timeZone` | IANA timezone string | Override timezone |
| `hour12` | `true`, `false` | Force 12/24 hour |
| `hourCycle` | `"h11"`, `"h12"`, `"h23"`, `"h24"` | Hour cycle |
| `calendar` | `"gregory"`, `"islamic"`, etc. | Calendar system |

### 2.4 `{{format-time}}` — Time Formatting

Formats the time portion of a Date object. Identical API to `format-date` but defaults to showing only time components.

```gts
<template>
  {{format-time @timestamp}}
  {{! Output: 3:30:00 PM }}

  {{format-time @timestamp timeStyle="short"}}
  {{! Output: 3:30 PM }}

  {{format-time @timestamp timeStyle="medium"}}
  {{! Output: 3:30:00 PM }}

  {{format-time @timestamp timeStyle="long"}}
  {{! Output: 3:30:00 PM EDT }}

  {{format-time @timestamp timeStyle="full"}}
  {{! Output: 3:30:00 PM Eastern Daylight Time }}

  {{format-time @timestamp hour="numeric" minute="numeric" hour12=false}}
  {{! Output: 15:30 }}

  {{format-time @timestamp hour="numeric" minute="numeric" second="numeric" timeZoneName="short"}}
  {{! Output: 3:30:00 PM EDT }}
</template>
```

### 2.5 `{{format-relative}}` — Relative Time Formatting

Formats a numeric value as a relative time string (e.g., "3 days ago", "in 2 hours").

#### Basic Usage

```gts
<template>
  {{format-relative -3 unit="day"}}
  {{! Output: 3 days ago }}

  {{format-relative 2 unit="hour"}}
  {{! Output: in 2 hours }}

  {{format-relative -1 unit="day"}}
  {{! Output: yesterday (with numeric="auto") }}

  {{format-relative 0 unit="day"}}
  {{! Output: today (with numeric="auto") }}

  {{format-relative 1 unit="day"}}
  {{! Output: tomorrow (with numeric="auto") }}
</template>
```

#### `numeric` Option

| Value | Effect | Example for -1 day |
|-------|--------|---------------------|
| `"always"` (default) | Always use numeric | "1 day ago" |
| `"auto"` | Use named values when available | "yesterday" |

```gts
<template>
  {{format-relative -1 unit="day" numeric="always"}}
  {{! Output: 1 day ago }}

  {{format-relative -1 unit="day" numeric="auto"}}
  {{! Output: yesterday }}

  {{format-relative -1 unit="week" numeric="auto"}}
  {{! Output: last week }}

  {{format-relative 1 unit="month" numeric="auto"}}
  {{! Output: next month }}
</template>
```

#### All Unit Options

| Unit | Negative example | Positive example |
|------|------------------|------------------|
| `"second"` | 3 seconds ago | in 3 seconds |
| `"minute"` | 5 minutes ago | in 5 minutes |
| `"hour"` | 2 hours ago | in 2 hours |
| `"day"` | 3 days ago | in 3 days |
| `"week"` | 2 weeks ago | in 2 weeks |
| `"month"` | 4 months ago | in 4 months |
| `"quarter"` | 2 quarters ago | in 2 quarters |
| `"year"` | 1 year ago | in 1 year |

#### `style` Option

```gts
<template>
  {{format-relative -3 unit="day" style="long"}}
  {{! Output: 3 days ago }}

  {{format-relative -3 unit="day" style="short"}}
  {{! Output: 3 days ago }}

  {{format-relative -3 unit="day" style="narrow"}}
  {{! Output: 3d ago }}
</template>
```

### 2.6 `{{format-list}}` — List Formatting

Formats an array of strings as a human-readable list with locale-appropriate conjunctions.

#### Conjunction (and)

```gts
<template>
  {{format-list (array "Alice" "Bob" "Charlie") type="conjunction"}}
  {{! Output: Alice, Bob, and Charlie }}

  {{format-list (array "Alice" "Bob") type="conjunction"}}
  {{! Output: Alice and Bob }}

  {{format-list (array "Alice") type="conjunction"}}
  {{! Output: Alice }}
</template>
```

#### Disjunction (or)

```gts
<template>
  {{format-list (array "Active" "Pending" "Draft") type="disjunction"}}
  {{! Output: Active, Pending, or Draft }}
</template>
```

#### Unit (simple list, no conjunction/disjunction)

```gts
<template>
  {{format-list (array "10 lb" "5 oz") type="unit"}}
  {{! Output: 10 lb, 5 oz }}
</template>
```

#### Style Options

| Style | Conjunction example | Disjunction example |
|-------|-------------------|---------------------|
| `"long"` (default) | A, B, and C | A, B, or C |
| `"short"` | A, B, & C | A, B, or C |
| `"narrow"` | A, B, C | A, B, or C |

```gts
<template>
  {{format-list @names type="conjunction" style="short"}}
  {{! Output: Alice, Bob, & Charlie }}
</template>
```

---
