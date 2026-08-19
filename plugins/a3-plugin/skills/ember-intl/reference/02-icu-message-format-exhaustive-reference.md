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
