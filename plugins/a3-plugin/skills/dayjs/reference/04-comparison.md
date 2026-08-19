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
