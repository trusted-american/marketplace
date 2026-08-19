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

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-parsing.md` | Parsing |
| `reference/02-formatting.md` | Formatting |
| `reference/03-manipulation.md` | Manipulation |
| `reference/04-comparison.md` | Comparison |
| `reference/07-utc-and-timezone-handling.md` | UTC and Timezone Handling |
| `reference/08-plugins-used-in-a3.md` | Plugins Used in A3 |

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
