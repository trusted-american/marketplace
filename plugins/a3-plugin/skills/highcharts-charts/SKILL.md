---
name: highcharts-charts
description: Highcharts 12 + ember-highcharts reference — used in 16 A3 files. Chart types, options, theming, responsive charts, and A3 dashboard patterns
version: 0.1.0
---

# Highcharts 12 + ember-highcharts Reference

## Overview

A3 uses Highcharts 12 via the `ember-highcharts` addon to render all dashboard charts and data visualizations. The addon wraps Highcharts in an Ember component (`<HighCharts>`), enabling declarative chart rendering in Glimmer templates. There are 16 files across the app that use Highcharts for analytics dashboards, enrollment reports, revenue breakdowns, and agent performance visualizations.

## ember-highcharts Component Usage

### Basic Usage

```gts
import HighCharts from 'ember-highcharts/components/high-charts';

<template>
  <HighCharts @content={{this.chartOptions}} @chartOptions={{this.chartConfig}} />
</template>
```

### The @content Argument

`@content` receives a `Highcharts.Options` object — the full chart configuration including chart type, series data, axes, title, tooltip, legend, and all other Highcharts options.

```typescript
get chartOptions(): Highcharts.Options {
  return {
    chart: { type: 'line' },
    title: { text: 'Monthly Enrollments' },
    xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'] },
    yAxis: { title: { text: 'Count' } },
    series: [
      {
        name: 'Individual',
        type: 'line',
        data: [120, 135, 148, 162, 180],
      },
      {
        name: 'Group',
        type: 'line',
        data: [80, 92, 104, 115, 130],
      },
    ],
  };
}
```

### The @chartOptions Argument

`@chartOptions` receives a separate config object that controls the component wrapper behavior — not Highcharts API options. Typically used to set the chart class name for styling.

```typescript
get chartConfig() {
  return {
    className: 'enrollment-chart',
  };
}
```

### Accessing the Chart Instance

The component yields the chart instance via `@onChartInstance`:

```gts
<HighCharts
  @content={{this.chartOptions}}
  @chartOptions={{this.chartConfig}}
  @onChartInstance={{this.handleChartInstance}}
/>
```

```typescript
@tracked chartInstance: Highcharts.Chart | null = null;

handleChartInstance = (chart: Highcharts.Chart) => {
  this.chartInstance = chart;
};
```

## Chart Types Used in A3

### Line Chart — Trend over time

```typescript
get lineChartOptions(): Highcharts.Options {
  return {
    chart: { type: 'line' },
    title: { text: 'Enrollment Trends' },
    xAxis: {
      type: 'datetime',
      title: { text: 'Date' },
    },
    yAxis: {
      title: { text: 'Enrollments' },
      min: 0,
    },
    plotOptions: {
      line: {
        dataLabels: { enabled: true },
        enableMouseTracking: true,
      },
    },
    series: [
      {
        name: 'New Enrollments',
        type: 'line',
        data: this.enrollmentData, // [[timestamp, value], ...]
      },
    ],
  };
}
```

### Bar Chart — Comparison across categories

```typescript
get barChartOptions(): Highcharts.Options {
  return {
    chart: { type: 'bar' },
    title: { text: 'Revenue by Product Line' },
    xAxis: {
      categories: ['Health', 'Dental', 'Vision', 'Life', 'Disability'],
    },
    yAxis: {
      title: { text: 'Revenue ($)' },
    },
    series: [
      {
        name: 'Q1',
        type: 'bar',
        data: [45000, 12000, 8000, 15000, 9000],
      },
      {
        name: 'Q2',
        type: 'bar',
        data: [52000, 14500, 9200, 16800, 10200],
      },
    ],
  };
}
```

### Pie Chart — Proportional breakdown

```typescript
get pieChartOptions(): Highcharts.Options {
  return {
    chart: { type: 'pie' },
    title: { text: 'Enrollment Status Distribution' },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f}%',
        },
        showInLegend: true,
      },
    },
    series: [
      {
        name: 'Status',
        type: 'pie',
        data: [
          { name: 'Active', y: 62, color: '#28a745' },
          { name: 'Pending', y: 18, color: '#ffc107' },
          { name: 'Terminated', y: 12, color: '#dc3545' },
          { name: 'COBRA', y: 8, color: '#17a2b8' },
        ],
      },
    ],
  };
}
```

### Area Chart — Volume over time

```typescript
get areaChartOptions(): Highcharts.Options {
  return {
    chart: { type: 'area' },
    title: { text: 'Premium Volume' },
    xAxis: { type: 'datetime' },
    yAxis: {
      title: { text: 'Premium ($)' },
      labels: {
        formatter() {
          return '$' + Highcharts.numberFormat(this.value as number, 0, '.', ',');
        },
      },
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        lineColor: '#666',
        lineWidth: 1,
        marker: { lineWidth: 1, lineColor: '#666' },
      },
    },
    series: [
      { name: 'Medical', type: 'area', data: this.medicalData },
      { name: 'Dental', type: 'area', data: this.dentalData },
      { name: 'Vision', type: 'area', data: this.visionData },
    ],
  };
}
```

### Column Chart — Categorical comparison (vertical)

```typescript
get columnChartOptions(): Highcharts.Options {
  return {
    chart: { type: 'column' },
    title: { text: 'Agent Performance' },
    xAxis: {
      categories: this.agentNames,
      crosshair: true,
    },
    yAxis: {
      min: 0,
      title: { text: 'Policies Sold' },
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0,
      },
    },
    series: [
      { name: 'This Month', type: 'column', data: this.currentMonthData },
      { name: 'Last Month', type: 'column', data: this.lastMonthData },
    ],
  };
}
```

## Series Data Formats

### Array of Values
```typescript
data: [10, 20, 30, 40, 50]
```

### Array of [x, y] Pairs (datetime or numeric x-axis)
```typescript
data: [
  [Date.UTC(2024, 0, 1), 120],
  [Date.UTC(2024, 1, 1), 135],
  [Date.UTC(2024, 2, 1), 148],
]
```

### Array of Point Objects
```typescript
data: [
  { name: 'Active', y: 62, color: '#28a745' },
  { name: 'Pending', y: 18, sliced: true, selected: true },
]
```

## Axes Configuration

### xAxis

```typescript
xAxis: {
  type: 'datetime',           // 'linear', 'logarithmic', 'datetime', 'category'
  title: { text: 'Date' },
  categories: ['Jan', 'Feb'], // For category axis
  labels: {
    rotation: -45,
    style: { fontSize: '11px' },
    format: '{value:%b %Y}',  // Datetime format
  },
  tickInterval: 30 * 24 * 3600 * 1000, // Monthly ticks for datetime
  gridLineWidth: 1,
  crosshair: true,
}
```

### yAxis

```typescript
yAxis: {
  title: { text: 'Revenue ($)' },
  min: 0,
  labels: {
    formatter() {
      return '$' + Highcharts.numberFormat(this.value as number, 0, '.', ',');
    },
  },
  plotLines: [
    {
      value: 50000,
      color: 'red',
      dashStyle: 'Dash',
      width: 2,
      label: { text: 'Target', align: 'right' },
    },
  ],
  stackLabels: { enabled: true }, // For stacked charts
}
```

### Multiple Y-Axes

```typescript
yAxis: [
  { title: { text: 'Enrollments' } },
  { title: { text: 'Revenue ($)' }, opposite: true },
],
series: [
  { name: 'Enrollments', type: 'column', yAxis: 0, data: [...] },
  { name: 'Revenue', type: 'line', yAxis: 1, data: [...] },
],
```

## Tooltip Formatting

```typescript
tooltip: {
  shared: true,               // Show all series at once
  useHTML: true,               // Allow HTML in tooltip
  headerFormat: '<b>{point.key}</b><br/>',
  pointFormat: '{series.name}: <b>{point.y:,.0f}</b><br/>',
  // Or custom formatter:
  formatter() {
    return `<b>${this.x}</b><br/>
      ${this.series.name}: <b>$${Highcharts.numberFormat(this.y!, 2, '.', ',')}</b>`;
  },
  valuePrefix: '$',
  valueSuffix: ' USD',
  dateTimeLabelFormats: {
    month: '%B %Y',
    day: '%b %e, %Y',
  },
}
```

## Legend Configuration

```typescript
legend: {
  enabled: true,
  layout: 'horizontal',       // 'horizontal' | 'vertical'
  align: 'center',            // 'left' | 'center' | 'right'
  verticalAlign: 'bottom',    // 'top' | 'middle' | 'bottom'
  itemStyle: { fontSize: '12px', fontWeight: 'normal' },
  itemHoverStyle: { color: '#333' },
  symbolRadius: 0,
  maxHeight: 80,              // Scrollable if too many items
}
```

## A3 Highcharts Theme Helper

A3 centralizes chart theming through a `highcharts-theme` helper so all charts share a consistent look. This helper returns a base `Highcharts.Options` object that is merged with individual chart options.

```typescript
// utils/highcharts-theme.ts
import Highcharts from 'highcharts';

export function getA3Theme(): Highcharts.Options {
  return {
    colors: ['#4A90D9', '#50C878', '#FF6B6B', '#FFD93D', '#6C5CE7', '#A29BFE'],
    chart: {
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: {
      style: { color: '#333', fontSize: '16px', fontWeight: '600' },
    },
    credits: { enabled: false },
    exporting: { enabled: false }, // Disable default export button
    legend: {
      itemStyle: { color: '#555', fontWeight: 'normal', fontSize: '12px' },
    },
    xAxis: {
      labels: { style: { color: '#666' } },
      lineColor: '#ccc',
      tickColor: '#ccc',
    },
    yAxis: {
      labels: { style: { color: '#666' } },
      gridLineColor: '#e6e6e6',
      title: { style: { color: '#666' } },
    },
  };
}

export function applyA3Theme() {
  Highcharts.setOptions(getA3Theme());
}
```

Usage in the application initializer or the component:

```typescript
import { getA3Theme } from 'a3/utils/highcharts-theme';
import merge from 'lodash/merge';

get chartOptions(): Highcharts.Options {
  return merge({}, getA3Theme(), {
    chart: { type: 'line' },
    title: { text: 'My Chart' },
    series: [{ type: 'line', data: this.data }],
  });
}
```

## Responsive Rules

```typescript
responsive: {
  rules: [
    {
      condition: { maxWidth: 500 },
      chartOptions: {
        legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom' },
        yAxis: { title: { text: null } },
        chart: { height: 300 },
      },
    },
    {
      condition: { maxWidth: 350 },
      chartOptions: {
        legend: { enabled: false },
        xAxis: { labels: { rotation: -90 } },
      },
    },
  ],
}
```

## Real-Time Data Updates

When data changes (e.g., new enrollment comes in via Firestore listener), update the chart without full re-render:

```typescript
// Approach 1: Recompute @content — ember-highcharts redraws automatically
// The computed getter recalculates when tracked dependencies change.
@tracked enrollmentCounts: number[] = [];

get chartOptions(): Highcharts.Options {
  return {
    chart: { type: 'line' },
    series: [{ type: 'line', name: 'Enrollments', data: this.enrollmentCounts }],
  };
}

// Approach 2: Direct chart API for performance-critical updates
updateChart(newPoint: number) {
  if (this.chartInstance) {
    this.chartInstance.series[0].addPoint(newPoint, true, true);
  }
}
```

## Exporting Charts

Highcharts has built-in export to PNG, JPEG, SVG, and PDF. While A3 disables the default export button via the theme, you can trigger exports programmatically:

```typescript
exportChart() {
  if (this.chartInstance) {
    this.chartInstance.exportChart(
      { type: 'application/pdf', filename: 'enrollment-report' },
      { title: { text: 'Enrollment Report — ' + dayjs().format('MMMM YYYY') } }
    );
  }
}
```

Requires loading the exporting module:

```typescript
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';

HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
```

## Accessibility

Highcharts 12 has built-in accessibility support. Ensure it is not disabled:

```typescript
accessibility: {
  enabled: true,
  description: 'Chart showing monthly enrollment trends for the current year',
  point: {
    valueDescriptionFormat: '{index}. {xDescription}, {point.y}.',
  },
  keyboardNavigation: {
    enabled: true,
    order: ['series', 'zoom', 'rangeSelector', 'legend', 'chartMenu'],
  },
}
```

## A3 Dashboard Pattern

A typical A3 dashboard component that renders multiple charts:

```gts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import HighCharts from 'ember-highcharts/components/high-charts';
import merge from 'lodash/merge';
import { getA3Theme } from 'a3/utils/highcharts-theme';

export default class DashboardCharts extends Component {
  @service declare store: StoreService;
  @tracked enrollmentData: number[] = [];
  @tracked revenueData: number[] = [];

  constructor(owner: unknown, args: object) {
    super(owner, args);
    this.loadDataTask.perform();
  }

  loadDataTask = task(async () => {
    const stats = await this.store.query('dashboard-stat', {});
    this.enrollmentData = stats.map((s) => s.enrollmentCount);
    this.revenueData = stats.map((s) => s.revenue);
  });

  get enrollmentChart(): Highcharts.Options {
    return merge({}, getA3Theme(), {
      chart: { type: 'column', height: 300 },
      title: { text: 'Monthly Enrollments' },
      xAxis: { categories: this.months },
      series: [{ type: 'column', name: 'Enrollments', data: this.enrollmentData }],
    });
  }

  get revenueChart(): Highcharts.Options {
    return merge({}, getA3Theme(), {
      chart: { type: 'area', height: 300 },
      title: { text: 'Revenue Trend' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'Revenue ($)' } },
      series: [{ type: 'area', name: 'Revenue', data: this.revenueData }],
    });
  }

  <template>
    <div class="row">
      <div class="col-md-6">
        <HighCharts @content={{this.enrollmentChart}} />
      </div>
      <div class="col-md-6">
        <HighCharts @content={{this.revenueChart}} />
      </div>
    </div>
  </template>
}
```

## Further Investigation

- **Highcharts API Reference**: https://api.highcharts.com/highcharts/
- **ember-highcharts Addon**: https://github.com/ahmadsoe/ember-highcharts
- **Highcharts Accessibility**: https://www.highcharts.com/docs/accessibility/accessibility-module
- **Highcharts Responsive**: https://www.highcharts.com/docs/chart-concepts/responsive
