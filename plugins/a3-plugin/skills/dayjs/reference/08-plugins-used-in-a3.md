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
