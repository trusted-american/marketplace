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
