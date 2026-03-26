---
name: dayjs
description: Day.js date/time library reference — used in 39 A3 files (35 frontend + 4 backend). Parsing, formatting, manipulation, comparison, and relative time
version: 0.1.0
---

# Day.js — Complete A3 Reference

Used in 39 A3 files (35 frontend, 4 backend Cloud Functions). Day.js is a lightweight (2KB)
date/time library with an API compatible with Moment.js. A3 uses Day.js for all date parsing,
formatting, manipulation, and comparison.

**Import:** `import dayjs from 'dayjs';`

---

## Parsing

### From Various Input Types

```ts
import dayjs from 'dayjs';

// Current date/time
dayjs();

// From ISO 8601 string (most common in A3)
dayjs('2024-03-15');
dayjs('2024-03-15T10:30:00.000Z');
dayjs('2024-03-15T10:30:00-05:00');

// From JavaScript Date object
dayjs(new Date());
dayjs(new Date(2024, 2, 15)); // March 15, 2024

// From Unix timestamp (milliseconds)
dayjs(1710489600000);

// From Unix timestamp (seconds) — requires unix plugin or multiply
dayjs.unix(1710489600);

// From another Day.js instance (clone)
const original = dayjs('2024-03-15');
const clone = dayjs(original);

// From object (requires objectSupport plugin)
dayjs({ year: 2024, month: 2, day: 15 }); // month is 0-indexed
```

### Parsing with Custom Format

Requires `customParseFormat` plugin (used in A3):

```ts
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

dayjs('15-03-2024', 'DD-MM-YYYY');
dayjs('March 15, 2024', 'MMMM D, YYYY');
dayjs('3/15/24', 'M/D/YY');
dayjs('10:30 AM', 'h:mm A');
dayjs('2024-03-15 10:30', 'YYYY-MM-DD HH:mm');
```

### Parsing Firestore Timestamps (Critical A3 Pattern)

Firestore stores dates as `Timestamp` objects with `seconds` and `nanoseconds` fields. These
must be converted before passing to Day.js:

```ts
import dayjs from 'dayjs';

// Firestore Timestamp has .toDate() method (frontend with Ember Cloud Firestore)
const firestoreTimestamp = record.createdAt; // Firestore Timestamp
const date = dayjs(firestoreTimestamp.toDate());

// In Cloud Functions, Firestore Timestamp from admin SDK
import { Timestamp } from 'firebase-admin/firestore';

function parseFirestoreDate(timestamp: Timestamp): dayjs.Dayjs {
  return dayjs(timestamp.toDate());
}

// Sometimes Firestore returns plain objects (e.g., from REST API or serialized)
// { seconds: 1710489600, nanoseconds: 0 }
function parseTimestampObject(ts: { seconds: number; nanoseconds: number }): dayjs.Dayjs {
  return dayjs(new Date(ts.seconds * 1000));
}
```

**Common A3 pattern for safe date parsing:**
```ts
function safeParseDate(value: unknown): dayjs.Dayjs | null {
  if (!value) return null;

  // Firestore Timestamp
  if (typeof value === 'object' && 'toDate' in (value as object)) {
    return dayjs((value as { toDate(): Date }).toDate());
  }

  // Plain timestamp object
  if (typeof value === 'object' && 'seconds' in (value as object)) {
    return dayjs(new Date((value as { seconds: number }).seconds * 1000));
  }

  // String or Date
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed : null;
}
```

### Validation

```ts
dayjs('2024-03-15').isValid();         // true
dayjs('not a date').isValid();          // false
dayjs('2024-02-30').isValid();          // false (Feb 30 doesn't exist)
dayjs(null).isValid();                  // false
dayjs(undefined).isValid();             // false
dayjs('').isValid();                    // false
```

**Always validate in A3 before formatting:**
```ts
const date = dayjs(record.hireDate?.toDate());
const display = date.isValid() ? date.format('MMM D, YYYY') : 'N/A';
```

---

## Formatting

### Format Tokens — Complete Reference

| Token | Output | Description |
|-------|--------|-------------|
| `YY` | `24` | Two-digit year |
| `YYYY` | `2024` | Four-digit year |
| `M` | `1-12` | Month (no padding) |
| `MM` | `01-12` | Month (zero-padded) |
| `MMM` | `Jan-Dec` | Abbreviated month name |
| `MMMM` | `January-December` | Full month name |
| `D` | `1-31` | Day of month (no padding) |
| `DD` | `01-31` | Day of month (zero-padded) |
| `d` | `0-6` | Day of week (0=Sunday) |
| `dd` | `Su-Sa` | Min day of week name |
| `ddd` | `Sun-Sat` | Short day of week name |
| `dddd` | `Sunday-Saturday` | Full day of week name |
| `H` | `0-23` | 24-hour hour (no padding) |
| `HH` | `00-23` | 24-hour hour (zero-padded) |
| `h` | `1-12` | 12-hour hour (no padding) |
| `hh` | `01-12` | 12-hour hour (zero-padded) |
| `m` | `0-59` | Minute (no padding) |
| `mm` | `00-59` | Minute (zero-padded) |
| `s` | `0-59` | Second (no padding) |
| `ss` | `00-59` | Second (zero-padded) |
| `SSS` | `000-999` | Millisecond |
| `Z` | `+05:30` | UTC offset |
| `ZZ` | `+0530` | UTC offset (compact) |
| `A` | `AM/PM` | Upper meridiem |
| `a` | `am/pm` | Lower meridiem |
| `X` | `1710489600` | Unix timestamp (seconds) |
| `x` | `1710489600000` | Unix timestamp (ms) |

### Common A3 Format Patterns

```ts
import dayjs from 'dayjs';

const d = dayjs('2024-03-15T10:30:00Z');

// Date display formats used in A3
d.format('MMM D, YYYY');         // "Mar 15, 2024" — most common in A3
d.format('MMMM D, YYYY');       // "March 15, 2024" — detail views
d.format('MM/DD/YYYY');          // "03/15/2024" — form inputs, exports
d.format('YYYY-MM-DD');          // "2024-03-15" — API, sorting, storage
d.format('M/D/YY');              // "3/15/24" — compact tables

// Date + time formats
d.format('MMM D, YYYY h:mm A'); // "Mar 15, 2024 10:30 AM" — timestamps
d.format('MM/DD/YYYY HH:mm');   // "03/15/2024 10:30" — 24h format
d.format('h:mm A');              // "10:30 AM" — time only

// ISO format
d.toISOString();                 // "2024-03-15T10:30:00.000Z"
d.format();                      // "2024-03-15T10:30:00+00:00" (ISO 8601)
```

### A3 Date Display Utilities

A common A3 pattern is a utility function for consistent date formatting:

```ts
// app/utils/format-date.ts
import dayjs from 'dayjs';

export type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'iso' | 'input';

export function formatDate(
  value: Date | { toDate(): Date } | string | null | undefined,
  format: DateFormat = 'short'
): string {
  if (!value) return '';

  const date = typeof value === 'object' && 'toDate' in value
    ? dayjs(value.toDate())
    : dayjs(value);

  if (!date.isValid()) return '';

  switch (format) {
    case 'short':    return date.format('MMM D, YYYY');
    case 'long':     return date.format('MMMM D, YYYY');
    case 'datetime': return date.format('MMM D, YYYY h:mm A');
    case 'time':     return date.format('h:mm A');
    case 'iso':      return date.format('YYYY-MM-DD');
    case 'input':    return date.format('YYYY-MM-DD');
    default:         return date.format('MMM D, YYYY');
  }
}
```

---

## Manipulation

### Add / Subtract

```ts
const d = dayjs('2024-03-15');

// Add
d.add(7, 'day');          // March 22, 2024
d.add(1, 'month');        // April 15, 2024
d.add(1, 'year');         // March 15, 2025
d.add(2, 'hour');
d.add(30, 'minute');
d.add(1, 'week');         // March 22, 2024

// Subtract
d.subtract(7, 'day');     // March 8, 2024
d.subtract(1, 'month');   // February 15, 2024
d.subtract(1, 'year');    // March 15, 2023

// Chaining
d.add(1, 'month').subtract(1, 'day');  // April 14, 2024
```

**Valid units:** `year`, `month`, `week`, `day`, `hour`, `minute`, `second`, `millisecond`
(and their short forms: `y`, `M`, `w`, `d`, `h`, `m`, `s`, `ms`)

### Start Of / End Of

```ts
const d = dayjs('2024-03-15T10:30:45');

// Start of
d.startOf('day');     // 2024-03-15 00:00:00.000
d.startOf('month');   // 2024-03-01 00:00:00.000
d.startOf('year');    // 2024-01-01 00:00:00.000
d.startOf('week');    // 2024-03-10 00:00:00.000 (Sunday)
d.startOf('hour');    // 2024-03-15 10:00:00.000

// End of
d.endOf('day');       // 2024-03-15 23:59:59.999
d.endOf('month');     // 2024-03-31 23:59:59.999
d.endOf('year');      // 2024-12-31 23:59:59.999
d.endOf('week');      // 2024-03-16 23:59:59.999
```

**A3 pattern — date range queries:**
```ts
// Get all records for current month
const startOfMonth = dayjs().startOf('month').toDate();
const endOfMonth = dayjs().endOf('month').toDate();

const records = await this.store.query('timesheet', {
  filter: {
    startDate: { gte: startOfMonth },
    endDate: { lte: endOfMonth },
  },
});
```

### Set Specific Values

```ts
const d = dayjs('2024-03-15');

d.year(2025);        // 2025-03-15
d.month(0);          // 2024-01-15 (0-indexed!)
d.date(1);           // 2024-03-01
d.hour(14);          // 2024-03-15 14:00
d.minute(30);        // 2024-03-15 00:30
d.second(0);
d.millisecond(0);
```

**Warning:** `.month()` is 0-indexed! January = 0, December = 11.

---

## Comparison

### isBefore / isAfter / isSame

```ts
const a = dayjs('2024-03-15');
const b = dayjs('2024-03-20');

a.isBefore(b);                    // true
a.isAfter(b);                     // false
a.isSame(b);                      // false

// With granularity
a.isBefore(b, 'month');           // false (same month)
a.isBefore(b, 'day');             // true
a.isSame('2024-03-15', 'day');    // true
a.isSame('2024-03-01', 'month'); // true (same month)
a.isSame('2024-01-01', 'year');  // true (same year)
```

**Granularity options:** `year`, `month`, `week`, `day`, `hour`, `minute`, `second`

### isBetween

Requires `isBetween` plugin:

```ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

const date = dayjs('2024-03-15');
const start = dayjs('2024-03-01');
const end = dayjs('2024-03-31');

date.isBetween(start, end);                   // true
date.isBetween(start, end, 'day');             // true
date.isBetween(start, end, 'day', '[]');       // true (inclusive)
date.isBetween(start, end, 'day', '()');       // true (exclusive, default)
date.isBetween(start, end, 'day', '[)');       // true (start inclusive, end exclusive)
date.isBetween(start, end, 'day', '(]');       // true (start exclusive, end inclusive)
```

**A3 pattern — check if date is in pay period:**
```ts
function isInPayPeriod(date: dayjs.Dayjs, periodStart: dayjs.Dayjs, periodEnd: dayjs.Dayjs): boolean {
  return date.isBetween(periodStart, periodEnd, 'day', '[]');
}
```

### isSameOrBefore / isSameOrAfter

Requires `isSameOrBefore` and `isSameOrAfter` plugins:

```ts
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const d = dayjs('2024-03-15');
d.isSameOrBefore('2024-03-15');  // true
d.isSameOrAfter('2024-03-15');   // true
d.isSameOrBefore('2024-03-14');  // false
```

### Diff

```ts
const a = dayjs('2024-03-15');
const b = dayjs('2024-03-20');

b.diff(a);                // 432000000 (milliseconds)
b.diff(a, 'day');         // 5
b.diff(a, 'week');        // 0 (truncated)
b.diff(a, 'day', true);  // 5 (with floating point)
b.diff(a, 'month');       // 0
b.diff(a, 'hour');        // 120
```

**A3 pattern — calculate employment duration:**
```ts
function getEmploymentDuration(hireDate: Date): string {
  const years = dayjs().diff(dayjs(hireDate), 'year');
  const months = dayjs().diff(dayjs(hireDate), 'month') % 12;

  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}
```

---

## Getters

```ts
const d = dayjs('2024-03-15T10:30:45.123');

d.year();          // 2024
d.month();         // 2 (0-indexed! March = 2)
d.date();          // 15 (day of month)
d.day();           // 5 (day of week, 0=Sunday, 5=Friday)
d.hour();          // 10
d.minute();        // 30
d.second();        // 45
d.millisecond();   // 123

// Conversion
d.toDate();        // JavaScript Date object
d.toJSON();        // "2024-03-15T10:30:45.123Z"
d.toISOString();   // "2024-03-15T10:30:45.123Z"
d.valueOf();       // 1710498645123 (Unix timestamp in ms)
d.unix();          // 1710498645 (Unix timestamp in seconds)
```

**Month 0-indexing reminder:** This is a constant source of bugs. `dayjs().month()` returns
0 for January, 11 for December. Use `dayjs().format('M')` for 1-indexed month number.

---

## Relative Time Display

Requires `relativeTime` plugin (used in A3):

```ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

dayjs('2024-03-15').fromNow();              // "3 months ago" (example)
dayjs('2024-03-15').from(dayjs('2024-03-20')); // "5 days ago"
dayjs('2024-03-15').toNow();                // "in 3 months" (example)
dayjs('2024-03-15').to(dayjs('2024-03-20'));   // "in 5 days"
```

**Relative time thresholds (defaults):**

| Range | Output |
|-------|--------|
| 0 - 44 seconds | "a few seconds ago" |
| 45 - 89 seconds | "a minute ago" |
| 90s - 44 minutes | "X minutes ago" |
| 45 - 89 minutes | "an hour ago" |
| 90m - 21 hours | "X hours ago" |
| 22 - 35 hours | "a day ago" |
| 36h - 25 days | "X days ago" |
| 26 - 45 days | "a month ago" |
| 46d - 10 months | "X months ago" |
| 11 - 17 months | "a year ago" |
| 18+ months | "X years ago" |

**A3 pattern — activity timestamps:**
```ts
// In a component
get timeAgo(): string {
  const date = this.args.activity.createdAt?.toDate();
  if (!date) return '';
  return dayjs(date).fromNow(); // "2 hours ago", "3 days ago", etc.
}
```

---

## UTC and Timezone Handling

### UTC Plugin

```ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

// Parse as UTC
dayjs.utc('2024-03-15');                    // UTC midnight
dayjs.utc('2024-03-15T10:30:00');           // UTC 10:30

// Convert local to UTC
dayjs('2024-03-15T10:30:00').utc();         // Converts to UTC

// Convert UTC to local
dayjs.utc('2024-03-15T10:30:00').local();   // Converts to local timezone

// Check if UTC mode
dayjs.utc().isUTC();                         // true
dayjs().isUTC();                             // false

// UTC offset
dayjs().utcOffset();                         // e.g., -300 (minutes, for EST)
```

### Timezone Plugin

```ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

// Convert to specific timezone
dayjs('2024-03-15T10:30:00Z').tz('America/New_York');    // EST/EDT
dayjs('2024-03-15T10:30:00Z').tz('America/Los_Angeles'); // PST/PDT
dayjs('2024-03-15T10:30:00Z').tz('Europe/London');       // GMT/BST

// Parse in a specific timezone
dayjs.tz('2024-03-15 10:30', 'America/New_York');

// Get user's timezone
dayjs.tz.guess();  // e.g., "America/New_York"

// Format with timezone abbreviation
dayjs().tz('America/New_York').format('MMM D, YYYY h:mm A z');
// "Mar 15, 2024 6:30 AM EDT"
```

**A3 timezone pattern:**
```ts
// A3 stores all dates in UTC (Firestore Timestamps are always UTC).
// Display in user's local timezone:
function displayDate(firestoreTimestamp: { toDate(): Date }): string {
  return dayjs(firestoreTimestamp.toDate())
    .tz(dayjs.tz.guess())
    .format('MMM D, YYYY h:mm A');
}
```

---

## Plugins Used in A3

A3 extends Day.js with these plugins. They are typically initialized in an application
initializer or a shared utility module:

```ts
// app/utils/dayjs-setup.ts (or app initializer)
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import duration from 'dayjs/plugin/duration';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(duration);
dayjs.extend(weekOfYear);
```

### Duration Plugin

```ts
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

// Create a duration
const dur = dayjs.duration(90, 'minutes');
dur.hours();    // 1
dur.minutes();  // 30
dur.asHours();  // 1.5
dur.asMinutes(); // 90

// Duration from diff
const diff = dayjs.duration(dayjs('2024-03-20').diff(dayjs('2024-03-15')));
diff.days();    // 5

// Humanize (requires relativeTime plugin too)
dur.humanize();           // "2 hours"
dur.humanize(true);       // "in 2 hours"
```

### WeekOfYear Plugin

```ts
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);

dayjs('2024-03-15').week();  // 11 (week number of the year)
```

---

## Dayjs in Cloud Functions (Backend)

In A3 Cloud Functions, Day.js is used for:

1. **Scheduling logic** — determining if a scheduled task should run
2. **Date calculations** — computing pay periods, leave balances
3. **Formatting for emails** — human-readable dates in notification emails
4. **Firestore queries** — building date range filters

```ts
// functions/src/utils/date-helpers.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Timestamp } from 'firebase-admin/firestore';

dayjs.extend(utc);

export function timestampToDayjs(ts: Timestamp): dayjs.Dayjs {
  return dayjs(ts.toDate());
}

export function dayjsToTimestamp(d: dayjs.Dayjs): Timestamp {
  return Timestamp.fromDate(d.toDate());
}

export function getCurrentPayPeriodRange(): { start: Timestamp; end: Timestamp } {
  const now = dayjs.utc();
  const dayOfMonth = now.date();

  let start: dayjs.Dayjs;
  let end: dayjs.Dayjs;

  if (dayOfMonth <= 15) {
    start = now.startOf('month');
    end = now.date(15).endOf('day');
  } else {
    start = now.date(16).startOf('day');
    end = now.endOf('month');
  }

  return {
    start: Timestamp.fromDate(start.toDate()),
    end: Timestamp.fromDate(end.toDate()),
  };
}
```

---

## Common Mistakes

1. **Mutability assumption:** Day.js objects are IMMUTABLE. Every method returns a NEW instance.
   ```ts
   const d = dayjs('2024-03-15');
   d.add(1, 'day'); // d is STILL March 15!
   const tomorrow = d.add(1, 'day'); // tomorrow is March 16
   ```

2. **Month 0-indexing:** `dayjs().month(2)` is March, not February.

3. **Forgetting plugins:** `dayjs().fromNow()` throws if `relativeTime` is not extended.

4. **Comparing with `===`:** Day.js instances are objects; use `.isSame()`, `.isBefore()`,
   `.isAfter()`, not `===` or `==`.

5. **Firestore Timestamp confusion:** Firestore Timestamps are NOT Day.js objects or JS Dates.
   Always convert with `.toDate()` first.

6. **Timezone ignorance:** `dayjs('2024-03-15')` parses as LOCAL time. Use `dayjs.utc()` for
   UTC, or `dayjs.tz()` for specific timezone.

7. **Invalid date propagation:** Operations on invalid dates return invalid dates silently.
   Always check `.isValid()` after parsing user input.

---

## TypeScript Types

```ts
import dayjs, { Dayjs, ManipulateType, OpUnitType, UnitType } from 'dayjs';

// Function parameter type
function formatDate(date: Dayjs): string { ... }

// Nullable pattern common in A3
function safeFormat(date: Dayjs | null): string {
  return date?.isValid() ? date.format('MMM D, YYYY') : 'N/A';
}

// Return type
function parseDate(input: unknown): Dayjs | null { ... }
```
