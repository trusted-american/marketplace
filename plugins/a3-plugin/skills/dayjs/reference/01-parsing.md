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
