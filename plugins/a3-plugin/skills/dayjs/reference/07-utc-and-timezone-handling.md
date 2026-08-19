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
