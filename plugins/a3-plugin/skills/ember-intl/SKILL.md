---
name: ember-intl
description: ember-intl internationalization reference — translation keys, ICU message format, pluralization, date/number formatting, and A3 i18n conventions
version: 0.1.0
---

# ember-intl Reference

## Overview

A3 uses ember-intl v8 for internationalization. This is the single most imported package in the entire A3 codebase, used across 855+ files. All user-facing strings MUST use translation keys — never hardcoded English text. ember-intl implements the ICU MessageFormat standard, providing pluralization, gender-aware text, number/date/time formatting, and rich argument interpolation.

The package provides:
- Template helpers (`{{t}}`, `{{format-number}}`, `{{format-date}}`, `{{format-time}}`, `{{format-relative}}`, `{{format-list}}`)
- A programmatic JavaScript/TypeScript API via the `intl` service
- ICU MessageFormat parsing for complex message patterns
- YAML-based translation file management
- Locale-aware formatting for numbers, dates, times, and relative time

---

## 1. ICU Message Format (Exhaustive Reference)

ICU MessageFormat is the syntax used inside translation strings. Every translation value in A3's YAML files is parsed as an ICU message.

### 1.1 Simple Argument Replacement

The most basic feature: insert a named variable into a string.

```yaml
greeting: "Hello, {name}!"
welcome: "Welcome to {appName}, {userName}."
fileInfo: "File {fileName} is {fileSize} bytes."
```

Usage:
```gts
<template>
  {{t "greeting" name="John"}}
  {{! Output: Hello, John! }}
</template>
```

```typescript
this.intl.t('greeting', { name: 'John' });
// "Hello, John!"
```

Arguments are positional by name — order in the string does not matter. You can use the same argument multiple times:

```yaml
repeat: "{name} said: 'My name is {name}.'"
```

### 1.2 Pluralization (`plural`)

Pluralization selects a sub-message based on a numeric value. This is one of the most critical features for A3 since counts appear everywhere (enrollment counts, client counts, policy counts, etc.).

#### Syntax

```
{argName, plural, [=value {message}]... [category {message}]...}
```

#### Plural Categories

ICU defines six plural categories. Which categories a locale uses depends on the language's plural rules:

| Category | Description | Used by English? | Example languages that use it |
|----------|-------------|------------------|-------------------------------|
| `zero`   | Zero quantity | No (use `=0` instead) | Arabic, Latvian, Welsh |
| `one`    | Singular | Yes (exactly 1) | English, German, French, Spanish |
| `two`    | Dual | No | Arabic, Hebrew, Slovenian |
| `few`    | Paucal / small quantity | No | Polish (2-4), Russian (2-4), Czech |
| `many`   | Large quantity | No | Polish (5+), Russian (5+), Arabic (11-99) |
| `other`  | General / catch-all (REQUIRED) | Yes (everything except 1) | All languages |

IMPORTANT: `other` is ALWAYS required. It is the fallback for any value that does not match another category.

#### Exact Value Matching with `=N`

You can match exact numeric values with `=N`. These take priority over category matches:

```yaml
items: "{count, plural, =0 {No items} =1 {Exactly one item} =42 {The answer!} one {1 item} other {{count} items}}"
```

`=0` is preferred over the `zero` category for English because English does not grammatically have a "zero" plural form.

#### The `#` Symbol

Inside a plural message, `#` is replaced with the formatted numeric value:

```yaml
notifications: "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}"
```

`#` is equivalent to `{count, number}` — it formats the number using the locale's number formatting rules (e.g., `1,234` in English).

#### Full English Example for A3

```yaml
enrollments:
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"

clients:
  count: "{count, plural, =0 {No clients found} one {1 client found} other {{count} clients found}}"

policies:
  selected: "{count, plural, =0 {No policies selected} one {1 policy selected} other {# policies selected}}"
```

#### Multi-Locale Example (Arabic — uses zero, one, two, few, many, other)

```yaml
# Arabic plural rules use ALL six categories
items: "{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {{count} عناصر} many {{count} عنصرًا} other {{count} عنصر}}"
```

### 1.3 Select

Select chooses a sub-message based on a string value. Commonly used for gender, role, status, or any categorical value.

#### Syntax

```
{argName, select, value1 {message1} value2 {message2} other {defaultMessage}}
```

#### Examples

```yaml
# Gender
profileUpdate: "{gender, select, male {He updated his profile} female {She updated her profile} other {They updated their profile}}"

# Role
roleLabel: "{role, select, admin {Administrator} agent {Insurance Agent} manager {Account Manager} other {User}}"

# Status
statusMessage: "{status, select, active {This enrollment is currently active} pending {This enrollment is awaiting approval} cancelled {This enrollment has been cancelled} other {Unknown status}}"
```

Usage:
```gts
<template>
  {{t "profileUpdate" gender=@user.gender}}
  {{t "roleLabel" role=@currentUser.role}}
</template>
```

IMPORTANT: `other` is REQUIRED in select — it is the fallback when no match is found.

### 1.4 Selectordinal

Selectordinal is like plural but uses ordinal plural rules (1st, 2nd, 3rd, 4th...).

#### Syntax

```
{argName, selectordinal, one {message} two {message} few {message} other {message}}
```

#### English Ordinal Rules

| Category | Values | Suffix |
|----------|--------|--------|
| `one`    | 1, 21, 31, 41... | st |
| `two`    | 2, 22, 32, 42... | nd |
| `few`    | 3, 23, 33, 43... | rd |
| `other`  | 4-20, 24-30... | th |

```yaml
ranking: "{rank, selectordinal, one {#st place} two {#nd place} few {#rd place} other {#th place}}"
```

Usage:
```gts
<template>
  {{t "ranking" rank=1}}  {{! 1st place }}
  {{t "ranking" rank=2}}  {{! 2nd place }}
  {{t "ranking" rank=3}}  {{! 3rd place }}
  {{t "ranking" rank=4}}  {{! 4th place }}
  {{t "ranking" rank=11}} {{! 11th place }}
  {{t "ranking" rank=21}} {{! 21st place }}
</template>
```

### 1.5 Nested Messages

ICU messages can be nested — you can put a `plural` inside a `select`, a `select` inside a `plural`, etc.

```yaml
# Plural inside Select
taskAssignment: "{gender, select,
  male {{count, plural, =0 {He has no tasks} one {He has # task} other {He has # tasks}}}
  female {{count, plural, =0 {She has no tasks} one {She has # task} other {She has # tasks}}}
  other {{count, plural, =0 {They have no tasks} one {They have # task} other {They have # tasks}}}
}"
```

```yaml
# Select inside Plural
itemOwner: "{count, plural,
  =0 {No items owned by {gender, select, male {him} female {her} other {them}}}
  one {1 item owned by {gender, select, male {him} female {her} other {them}}}
  other {# items owned by {gender, select, male {him} female {her} other {them}}}
}"
```

Usage:
```typescript
this.intl.t('taskAssignment', { gender: 'female', count: 3 });
// "She has 3 tasks"
```

### 1.6 Inline Number Formatting

Format numbers directly within a message using the `number` type with ICU number skeletons:

```yaml
# Basic number
fileSize: "Size: {size, number} bytes"

# Currency with skeleton
premium: "Premium: {amount, number, ::currency/USD}"

# Percentage
rate: "Rate: {rate, number, ::percent}"

# Compact notation
followers: "{count, number, ::compact-short} followers"

# With grouping
largeNumber: "Population: {pop, number, ::group-min2}"
```

#### Number Skeleton Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `currency/XXX` | Format as currency | `::currency/USD` |
| `percent` | Format as percentage | `::percent` |
| `compact-short` | Compact display (1K, 1M) | `::compact-short` |
| `compact-long` | Compact long (1 thousand) | `::compact-long` |
| `.00` | Minimum 2 fraction digits | `::.00` |
| `.##` | Maximum 2 fraction digits | `::.##` |
| `sign-always` | Always show sign (+/-) | `::sign-always` |

### 1.7 Inline Date Formatting

Format dates directly within a message:

```yaml
created: "Created on {date, date, medium}"
deadline: "Due by {date, date, long}"
timestamp: "Last updated: {date, date, short}"
fullDate: "Meeting on {date, date, full}"
```

#### Date Length Options

| Option | English Output Example |
|--------|----------------------|
| `short` | 3/26/26 |
| `medium` | Mar 26, 2026 |
| `long` | March 26, 2026 |
| `full` | Thursday, March 26, 2026 |

#### Time formatting inline

```yaml
meetingTime: "Meeting at {time, time, short}"
exactTime: "Logged at {time, time, medium}"
```

| Option | English Output Example |
|--------|----------------------|
| `short` | 3:30 PM |
| `medium` | 3:30:00 PM |
| `long` | 3:30:00 PM EDT |
| `full` | 3:30:00 PM Eastern Daylight Time |

### 1.8 Escaping Literal Braces with Apostrophes

In ICU MessageFormat, curly braces `{` and `}` are syntax characters. To include literal braces in output, wrap them in apostrophes:

```yaml
# Single apostrophe to escape one brace
codeExample: "Use the '{' character to open a block"

# Escape a range of text (everything between paired apostrophes is literal)
jsonHint: "Format: '{\"key\": \"value\"}'"

# Literal apostrophe — use two apostrophes
possessive: "John''s enrollment"
contractions: "It''s active"
```

Rules:
- `'` before `{`, `}`, or `#` escapes that character
- `''` produces a literal single apostrophe
- `'....'` escapes everything between the apostrophes (quoting)
- Outside of a plural/select context, `{` and `}` that are not part of an argument do not need escaping in some implementations, but it is best practice to always escape them

---

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

## 3. Translation File Organization in A3

### 3.1 File Location and Format

Translations live in the `translations/` directory at the app root:

```
translations/
├── en-us.yaml    # English (US) — primary locale
└── es.yaml       # Spanish (if applicable)
```

A3 uses YAML format (not JSON). YAML is preferred for readability and ease of editing, especially for non-developer translators.

### 3.2 YAML Structure and Namespacing

Translation keys are organized hierarchically. The top-level keys are feature names, and nested keys follow consistent conventions:

```yaml
# translations/en-us.yaml

# ---- Global keys (shared across features) ----
buttons:
  save: "Save"
  cancel: "Cancel"
  delete: "Delete"
  edit: "Edit"
  create: "Create New"
  search: "Search..."
  back: "Back"
  next: "Next"
  previous: "Previous"
  submit: "Submit"
  close: "Close"
  confirm: "Confirm"
  retry: "Retry"
  loadMore: "Load More"
  viewAll: "View All"
  download: "Download"
  upload: "Upload"
  add: "Add"
  remove: "Remove"

messages:
  saved: "Record saved successfully"
  deleted: "Record deleted"
  saveFailed: "Failed to save. Please try again."
  confirmDelete: "Are you sure you want to delete this?"
  loading: "Loading..."
  noResults: "No results found"
  error: "An error occurred. Please try again."
  unauthorized: "You are not authorized to perform this action."
  sessionExpired: "Your session has expired. Please log in again."
  networkError: "Network error. Please check your connection."
  validationError: "Please correct the errors below."

# ---- Feature keys (one top-level key per feature) ----
enrollments:
  title: "Enrollments"
  new: "New Enrollment"
  status:
    active: "Active"
    pending: "Pending"
    cancelled: "Cancelled"
    expired: "Expired"
    draft: "Draft"
  fields:
    planName: "Plan Name"
    carrier: "Carrier"
    effectiveDate: "Effective Date"
    premium: "Monthly Premium"
    enrollee: "Enrollee"
    beneficiary: "Beneficiary"
  empty: "No enrollments found"
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"

clients:
  title: "Clients"
  new: "New Client"
  fields:
    firstName: "First Name"
    lastName: "Last Name"
    email: "Email Address"
    phone: "Phone Number"
    dateOfBirth: "Date of Birth"
    ssn: "Social Security Number"
    address: "Address"
  empty: "No clients found"
  count: "{count, plural, =0 {No clients} one {1 client} other {{count} clients}}"
  search: "Search clients..."

policies:
  title: "Policies"
  fields:
    policyNumber: "Policy Number"
    carrier: "Carrier"
    type: "Policy Type"
    premium: "Premium"
    effectiveDate: "Effective Date"
    expirationDate: "Expiration Date"
  status:
    active: "Active"
    lapsed: "Lapsed"
    cancelled: "Cancelled"
  empty: "No policies found"
```

### 3.3 Namespacing Conventions

Follow these patterns for ALL new translation keys:

| Pattern | Usage | Example Key |
|---------|-------|-------------|
| `buttons.[action]` | Global button labels | `buttons.save` |
| `messages.[type]` | Global messages (success, error, confirm) | `messages.saved` |
| `[feature].title` | Feature page title | `enrollments.title` |
| `[feature].new` | "New [thing]" label | `enrollments.new` |
| `[feature].fields.[field]` | Form field labels | `enrollments.fields.planName` |
| `[feature].status.[status]` | Status badge labels | `enrollments.status.active` |
| `[feature].empty` | Empty state message | `enrollments.empty` |
| `[feature].count` | Pluralized count | `enrollments.count` |
| `[feature].search` | Search placeholder | `clients.search` |
| `[feature].filters.[filter]` | Filter labels | `enrollments.filters.byStatus` |
| `[feature].actions.[action]` | Feature-specific actions | `enrollments.actions.renew` |
| `[feature].confirm.[action]` | Confirmation messages | `enrollments.confirm.cancel` |
| `[feature].errors.[error]` | Feature-specific errors | `enrollments.errors.invalidDate` |

### 3.4 How to Add New Translations

1. Open `translations/en-us.yaml`
2. Find the appropriate feature section (or create one if it is a new feature)
3. Add the key following the namespacing conventions above
4. Use the key in your template or JavaScript code
5. Run the intl lint to verify the key is used correctly

```yaml
# WRONG: flat keys
enrollmentTitle: "Enrollments"
enrollmentNew: "New Enrollment"

# RIGHT: namespaced keys
enrollments:
  title: "Enrollments"
  new: "New Enrollment"
```

---

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

## 5. Locale Management

### 5.1 Setting Locale on Boot

The locale is typically set during application initialization. In A3, this happens in the application route or an initializer:

```typescript
// app/routes/application.ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;

  beforeModel() {
    // Set locale from user preferences, browser, or default
    const savedLocale = localStorage.getItem('locale') || 'en-us';
    this.intl.setLocale([savedLocale]);
  }
}
```

### 5.2 Switching Locale at Runtime

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import { action } from '@ember/object';

export default class LocaleSwitcher extends Component {
  @service declare intl: IntlService;

  @action
  switchLocale(locale: string) {
    this.intl.setLocale([locale]);
    localStorage.setItem('locale', locale);
    // All {{t}} helpers and format-* helpers will re-render automatically
  }
}
```

When the locale changes, all template helpers that depend on the intl service automatically re-render. No manual refresh is needed.

### 5.3 Fallback Chain Behavior

When you set multiple locales, ember-intl searches for translations in order:

```typescript
this.intl.setLocale(['es-mx', 'es', 'en-us']);
```

Lookup order for `this.intl.t('enrollments.title')`:
1. Look in `es-mx` translations -> if found, use it
2. Look in `es` translations -> if found, use it
3. Look in `en-us` translations -> if found, use it
4. If not found in any locale -> trigger missing translation behavior

This allows you to provide region-specific overrides (e.g., Mexican Spanish) while falling back to generic Spanish and ultimately to English.

### 5.4 Missing Translation Handling

When a translation key is not found in any locale in the fallback chain:

1. **Default behavior**: ember-intl returns a string like `"Missing translation: enrollments.title"` and logs a warning to the console.

2. **Custom missing message handler**: You can configure the intl service to handle missing translations differently:

```typescript
// app/services/intl.ts
import IntlService from 'ember-intl/services/intl';

export default class CustomIntlService extends IntlService {
  onMissingTranslation(key: string, locales: string[]): string {
    // Option 1: Return the key itself
    return key;

    // Option 2: Return a user-friendly fallback
    // return `[${key}]`;

    // Option 3: Report to error tracking
    // Sentry.captureMessage(`Missing translation: ${key}`);
    // return key;
  }
}
```

3. **The `onMissingTranslation` hook** is called every time a translation key is not found, making it useful for logging missing translations during development or reporting them in production.

---

## 6. Linting (`@ember-intl/lint`)

### 6.1 What It Checks

The intl linter validates the consistency between your translation files and your code:

- **Missing translations**: Keys used in templates/JS (`{{t "some.key"}}` or `this.intl.t('some.key')`) that do not exist in translation files
- **Unused translations**: Keys defined in translation files that are never referenced in any template or JS file
- **Inconsistent keys across locales**: Keys that exist in one locale file but not another
- **ICU syntax errors**: Malformed ICU MessageFormat patterns (unclosed braces, invalid plural categories, etc.)

### 6.2 A3's Lint Script

A3 includes a lint script in `package.json`:

```bash
# Run intl linting
npm run lint:intl

# Or using the tool directly
npx ember-intl-lint
```

### 6.3 Common Lint Commands

```bash
# Check for missing and unused translations
npx ember-intl-lint

# Auto-fix: remove unused translations from YAML files
npx ember-intl-lint --fix

# Check a specific locale
npx ember-intl-lint --locale en-us

# Output format options
npx ember-intl-lint --format json
npx ember-intl-lint --format stylish
```

### 6.4 Handling Dynamic Keys

The linter cannot detect dynamic keys (keys constructed at runtime). You may need to mark them as used:

```typescript
// The linter will NOT detect this usage:
this.intl.t(`enrollments.status.${status}`);

// You may need an ember-intl-lint ignore comment or a whitelist configuration
```

For dynamic keys, add them to the lint configuration's whitelist or use inline ignore comments as documented by the linter.

---

## 7. Common A3 Patterns

### 7.1 Flash Messages with Intl

Always use translated strings for flash messages:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';

export default class EnrollmentController extends Controller {
  @service declare intl: IntlService;
  @service declare flashMessages: FlashMessageService;

  @action
  async save() {
    try {
      await this.model.save();
      this.flashMessages.success(this.intl.t('messages.saved'));
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.saveFailed'));
    }
  }

  @action
  async delete() {
    await this.model.destroyRecord();
    this.flashMessages.success(this.intl.t('messages.deleted'));
  }
}
```

### 7.2 Form Labels

```gts
import { t } from 'ember-intl';

<template>
  <FormInput @label={{t "clients.fields.firstName"}} @value={{@model.firstName}} />
  <FormInput @label={{t "clients.fields.lastName"}} @value={{@model.lastName}} />
  <FormInput @label={{t "clients.fields.email"}} @value={{@model.email}} type="email" />
  <FormInput @label={{t "clients.fields.phone"}} @value={{@model.phone}} type="tel" />
  <FormInput @label={{t "enrollments.fields.effectiveDate"}} @value={{@model.effectiveDate}} type="date" />
</template>
```

### 7.3 Status Badges with Dynamic Key Construction

```gts
import { t } from 'ember-intl';
import { concat } from '@ember/helper';

<template>
  {{! Dynamic translation key based on status value }}
  <StatusBadge @label={{t (concat "enrollments.status." @status)}} @status={{@status}} />

  {{! This resolves to t("enrollments.status.active"), t("enrollments.status.pending"), etc. }}
</template>
```

In JavaScript:
```typescript
get statusLabel() {
  return this.intl.t(`enrollments.status.${this.args.status}`);
}
```

### 7.4 Page Titles

```gts
import { t } from 'ember-intl';
import pageTitle from 'ember-page-title/helpers/page-title';

<template>
  {{pageTitle (t "enrollments.title")}}

  <h1>{{t "enrollments.title"}}</h1>
</template>
```

### 7.5 Pluralized Counts

```gts
import { t } from 'ember-intl';

<template>
  <div class="results-header">
    {{t "enrollments.count" count=@items.length}}
    {{! With 0 items:  "No enrollments" }}
    {{! With 1 item:   "1 enrollment" }}
    {{! With 5 items:  "5 enrollments" }}
  </div>
</template>
```

Translation:
```yaml
enrollments:
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"
```

### 7.6 Currency Display

```gts
import { formatNumber } from 'ember-intl';

<template>
  {{! Monthly premium }}
  <span class="premium">
    {{format-number @premium style="currency" currency="USD"}}
  </span>
  {{! Output: $1,234.56 }}

  {{! Annual premium }}
  <span class="annual">
    {{format-number @annualPremium style="currency" currency="USD" minimumFractionDigits=0 maximumFractionDigits=0}}
  </span>
  {{! Output: $14,815 }}
</template>
```

### 7.7 Date Display

```gts
<template>
  {{! Effective date }}
  <span>{{format-date @effectiveDate dateStyle="medium"}}</span>
  {{! Output: Mar 26, 2026 }}

  {{! Created at with time }}
  <span>{{format-date @createdAt dateStyle="medium" timeStyle="short"}}</span>
  {{! Output: Mar 26, 2026, 3:30 PM }}

  {{! Short date for tables }}
  <td>{{format-date @date dateStyle="short"}}</td>
  {{! Output: 3/26/26 }}
</template>
```

### 7.8 Relative Time

```gts
<template>
  {{! Days until expiration }}
  {{format-relative @daysUntilExpiry unit="day"}}
  {{! Output: "in 30 days" or "3 days ago" }}

  {{! Last updated }}
  {{format-relative @daysSinceUpdate unit="day" numeric="auto"}}
  {{! Output: "yesterday" or "3 days ago" }}

  {{! Recently modified }}
  {{format-relative @hoursSinceModified unit="hour" numeric="auto"}}
  {{! Output: "2 hours ago" }}
</template>
```

---

## 8. Advanced Patterns

### 8.1 HTML in Translations

When translations need to contain HTML markup:

```yaml
terms: "By submitting, you agree to our <a href=\"/terms\">Terms of Service</a>."
emphasis: "This action is <strong>irreversible</strong>."
richMessage: "Your enrollment for <em>{planName}</em> has been submitted."
```

```gts
<template>
  {{t "terms" htmlSafe=true}}
  {{t "emphasis" htmlSafe=true}}
  {{t "richMessage" planName=@enrollment.planName htmlSafe=true}}
</template>
```

IMPORTANT: Never put user-provided content into an htmlSafe translation. If the translation contains user data, sanitize it first or use a component-based approach (see next section).

### 8.2 Translations with Components (Wrapping Translated Text in Links)

When you need interactive elements (links, buttons) within translated text, use a component-based approach rather than HTML in translations:

#### Approach 1: Split the translation around the link

```yaml
termsPrefix: "By submitting, you agree to our "
termsLink: "Terms of Service"
termsSuffix: "."
```

```gts
<template>
  {{t "termsPrefix"}}<a href="/terms">{{t "termsLink"}}</a>{{t "termsSuffix"}}
</template>
```

#### Approach 2: Use htmlSafe with a URL parameter

```yaml
termsAgreement: "By submitting, you agree to our <a href=\"{termsUrl}\">Terms of Service</a>."
```

```gts
<template>
  {{t "termsAgreement" termsUrl="/terms" htmlSafe=true}}
</template>
```

#### Approach 3: Use a placeholder pattern and replace after translation

```yaml
contactSupport: "If the issue persists, please {contactLink}."
contactLinkText: "contact support"
```

```gts
<template>
  {{! Build the full message with a component }}
  If the issue persists, please <LinkTo @route="support">{{t "contactLinkText"}}</LinkTo>.
</template>
```

### 8.3 Dynamic Translation Keys (Computed Key Names)

When the translation key depends on a runtime value:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class StatusLabel extends Component<{ Args: { status: string } }> {
  @service declare intl: IntlService;

  get label() {
    const key = `enrollments.status.${this.args.status}`;

    // Always check existence when using dynamic keys
    if (this.intl.exists(key)) {
      return this.intl.t(key);
    }

    // Fallback: capitalize the raw status string
    return this.args.status.charAt(0).toUpperCase() + this.args.status.slice(1);
  }
}
```

In templates using `concat`:

```gts
import { t } from 'ember-intl';
import { concat } from '@ember/helper';

<template>
  {{! Simple dynamic key }}
  {{t (concat "enrollments.status." @status)}}

  {{! Dynamic feature + field }}
  {{t (concat @featureName ".fields." @fieldName)}}

  {{! Dynamic action button }}
  {{t (concat "buttons." @actionName)}}
</template>
```

Common patterns for dynamic keys in A3:
- Status labels: `[feature].status.[statusValue]`
- Column headers: `[feature].fields.[fieldName]`
- Tab labels: `[feature].tabs.[tabName]`
- Filter labels: `[feature].filters.[filterName]`

### 8.4 Lazy Loading Translations

For large applications, you can load translations on demand rather than bundling all locales upfront:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;

  async beforeModel() {
    const locale = this.determineLocale();

    // Load translations dynamically
    const translations = await fetch(`/translations/${locale}.json`).then((r) =>
      r.json()
    );

    this.intl.addTranslations(locale, translations);
    this.intl.setLocale([locale]);
  }

  determineLocale() {
    return localStorage.getItem('locale') || navigator.language || 'en-us';
  }
}
```

You can also add translations incrementally (e.g., per-route translations for code splitting):

```typescript
// In a feature route
async model() {
  // Load feature-specific translations
  const translations = await fetch('/translations/enrollments-en-us.json').then(
    (r) => r.json()
  );
  this.intl.addTranslations('en-us', translations);
}
```

### 8.5 Testing with Intl

#### Setting Locale in Tests

```typescript
import { setupIntl } from 'ember-intl/test-support';

module('Integration | Component | enrollment-card', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  test('it renders the enrollment title', async function (assert) {
    await render(hbs`<EnrollmentCard />`);
    assert.dom('h1').hasText('Enrollments');
  });
});
```

#### Testing with a Specific Locale

```typescript
module('Integration | Component | enrollment-card (Spanish)', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'es');

  test('it renders in Spanish', async function (assert) {
    await render(hbs`<EnrollmentCard />`);
    assert.dom('h1').hasText('Inscripciones');
  });
});
```

#### Adding Test-Specific Translations

```typescript
import { setupIntl, addTranslations } from 'ember-intl/test-support';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  test('it uses custom translations', async function (assert) {
    addTranslations('en-us', {
      test: {
        greeting: 'Hello, {name}!',
      },
    });

    this.set('name', 'World');
    await render(hbs`{{t "test.greeting" name=this.name}}`);
    assert.dom().hasText('Hello, World!');
  });
});
```

#### Asserting Translated Text

```typescript
test('it shows the correct count', async function (assert) {
  this.set('items', [1, 2, 3]);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('3 enrollments');
});

test('it shows empty state', async function (assert) {
  this.set('items', []);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('No enrollments');
});

test('it shows singular', async function (assert) {
  this.set('items', [1]);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('1 enrollment');
});
```

#### Testing Flash Messages with Intl

```typescript
test('it shows success message on save', async function (assert) {
  await render(hbs`<EnrollmentForm @model={{this.model}} />`);
  await click('[data-test-save]');

  // Assert the flash message contains the translated text
  assert.dom('.flash-message.success').hasText('Record saved successfully');
});
```

#### Testing Format Helpers

```typescript
test('it formats currency correctly', async function (assert) {
  this.set('amount', 1234.56);
  await render(hbs`{{format-number this.amount style="currency" currency="USD"}}`);
  assert.dom().hasText('$1,234.56');
});

test('it formats dates correctly', async function (assert) {
  this.set('date', new Date('2026-03-26'));
  await render(hbs`{{format-date this.date dateStyle="medium"}}`);
  assert.dom().hasText('Mar 26, 2026');
});
```

---

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

## Further Investigation

- **ember-intl Docs**: https://ember-intl.github.io/ember-intl/
- **ICU Message Format**: https://unicode-org.github.io/icu/userguide/format_parse/messages/
- **ECMA-402 Intl API**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- **Unicode CLDR Plural Rules**: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
- **ICU Number Skeletons**: https://unicode-org.github.io/icu/userguide/format_parse/numbers/skeletons.html
