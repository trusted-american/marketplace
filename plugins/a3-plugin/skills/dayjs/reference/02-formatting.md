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
