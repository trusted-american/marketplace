---
name: csv-excel-export
description: CSV and Excel export reference — papaparse, excellentexport, exceljs, export-to-csv, node-xlsx, xlsx used across A3 for data import/export
version: 0.1.0
---

# CSV and Excel Export Reference

A3 uses six different libraries for CSV/Excel operations across frontend and backend. This reference covers all six, when to use each, and the A3 service patterns.

## Decision Matrix: Which Library to Use

| Library          | Side     | Format   | Best For                                    |
|------------------|----------|----------|---------------------------------------------|
| papaparse        | Both     | CSV      | Parsing CSV (import), robust CSV generation  |
| excellentexport  | Frontend | XLSX/CSV | Quick export from HTML tables                |
| exceljs          | Backend  | XLSX     | Rich Excel generation (styling, formulas)    |
| export-to-csv    | Frontend | CSV      | Simple CSV download from JS objects          |
| node-xlsx        | Backend  | XLSX     | Simple read/write XLSX on Node               |
| xlsx (SheetJS)   | Both     | XLSX/CSV | Full-featured spreadsheet manipulation       |

---

## 1. papaparse

The go-to library for CSV parsing and generation. Works in browser and Node.

### Installation

```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```

### Parsing CSV (Import)

```typescript
import Papa from 'papaparse';

// Parse a CSV string
const result = Papa.parse(csvString, {
  header: true,           // First row as keys
  dynamicTyping: true,    // Auto-convert numbers/booleans
  skipEmptyLines: true,
  trimHeaders: true,
  transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  complete: (results) => {
    console.log(results.data);   // Array of objects
    console.log(results.errors); // Parse errors
    console.log(results.meta);   // Column info
  },
});
```

### Parsing a File Upload

```typescript
const fileInput = document.querySelector<HTMLInputElement>('#csv-upload');

fileInput?.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    worker: true,           // Use web worker for large files
    chunk: (results, parser) => {
      // Process in chunks for large files
      processChunk(results.data);
    },
    complete: () => {
      console.log('Parsing complete');
    },
    error: (error) => {
      console.error('Parse error:', error.message);
    },
  });
});
```

### Generating CSV (Export)

```typescript
const data = [
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
];

const csv = Papa.unparse(data, {
  quotes: true,           // Quote all fields
  delimiter: ',',
  newline: '\r\n',
  header: true,
  columns: ['name', 'email', 'age'], // Control column order
});

// Download
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'export.csv';
link.click();
URL.revokeObjectURL(url);
```

---

## 2. excellentexport

Frontend library that exports HTML tables or JS arrays directly to XLSX/CSV. Zero dependencies.

### Installation

```bash
pnpm add excellentexport
```

### Export HTML Table to XLSX

```typescript
import ExcellentExport from 'excellentexport';

const anchor = document.createElement('a');
const table = document.getElementById('data-table');

ExcellentExport.convert(
  { anchor, filename: 'report', format: 'xlsx' },
  [
    {
      name: 'Sheet1',              // Sheet name
      from: { table },             // Source HTML table element
      fixValue: (value, row, col) => {
        // Transform cell values before export
        return value?.toString().trim() ?? '';
      },
    },
  ]
);

anchor.click();
```

### Export from Array Data

```typescript
ExcellentExport.convert(
  { anchor, filename: 'export', format: 'xlsx' },
  [
    {
      name: 'Data',
      from: {
        array: [
          ['Name', 'Email', 'Status'],      // Header row
          ['John Doe', 'john@ex.com', 'Active'],
          ['Jane Smith', 'jane@ex.com', 'Pending'],
        ],
      },
    },
  ]
);
```

---

## 3. exceljs

Full-featured Excel generation for Node.js (backend/Cloud Functions). Supports styling, formulas, images, and streaming.

### Installation

```bash
pnpm add exceljs
```

### Creating a Workbook

```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
workbook.creator = 'A3 Platform';
workbook.created = new Date();

const worksheet = workbook.addWorksheet('Enrollments', {
  properties: { tabColor: { argb: '1a73e8' } },
  pageSetup: { orientation: 'landscape', fitToPage: true },
});
```

### Defining Columns and Adding Rows

```typescript
worksheet.columns = [
  { header: 'Name', key: 'name', width: 25 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Enrolled', key: 'enrolledAt', width: 20 },
  { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '$#,##0.00' } },
];

// Add rows
worksheet.addRow({ name: 'John Doe', email: 'john@ex.com', status: 'Active', enrolledAt: new Date(), amount: 1500 });
worksheet.addRows(dataArray); // Bulk add
```

### Styling

```typescript
// Style header row
const headerRow = worksheet.getRow(1);
headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1a73e8' } };
headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
headerRow.height = 25;

// Conditional styling per cell
worksheet.eachRow((row, rowNumber) => {
  if (rowNumber > 1) {
    const statusCell = row.getCell('status');
    if (statusCell.value === 'Active') {
      statusCell.font = { color: { argb: '34a853' } };
    }
  }
});

// Borders
worksheet.eachRow((row) => {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
});

// Auto-filter
worksheet.autoFilter = 'A1:E1';

// Freeze header row
worksheet.views = [{ state: 'frozen', ySplit: 1 }];
```

### Saving (Cloud Functions)

```typescript
// Write to buffer
const buffer = await workbook.xlsx.writeBuffer();

// Write to file
await workbook.xlsx.writeFile('/tmp/report.xlsx');

// In Cloud Functions — return as response
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
res.send(Buffer.from(buffer));
```

---

## 4. export-to-csv

Minimal frontend CSV generator. No parsing capability — export only.

### Installation

```bash
pnpm add export-to-csv
```

### Usage

```typescript
import { mkConfig, generateCsv, download } from 'export-to-csv';

const csvConfig = mkConfig({
  fieldSeparator: ',',
  quoteStrings: true,
  decimalSeparator: '.',
  showLabels: true,
  showTitle: false,
  useTextFile: false,
  useBom: true,              // UTF-8 BOM for Excel compatibility
  useKeysAsHeaders: true,
  filename: 'enrollments',
});

const data = [
  { name: 'John Doe', email: 'john@example.com', plan: 'Premium' },
  { name: 'Jane Smith', email: 'jane@example.com', plan: 'Basic' },
];

const csv = generateCsv(csvConfig)(data);
download(csvConfig)(csv);
```

### Custom Headers

```typescript
const csvConfig = mkConfig({
  useKeysAsHeaders: false,
  columnHeaders: [
    { key: 'name', displayLabel: 'Full Name' },
    { key: 'email', displayLabel: 'Email Address' },
    { key: 'plan', displayLabel: 'Plan Type' },
  ],
  filename: 'enrollments',
});
```

---

## 5. node-xlsx

Lightweight XLSX read/write for Node.js. No styling — just data.

### Installation

```bash
pnpm add node-xlsx
```

### Reading XLSX

```typescript
import xlsx from 'node-xlsx';

const workSheetsFromBuffer = xlsx.parse(buffer);
// Returns: [{ name: 'Sheet1', data: [['A1', 'B1'], ['A2', 'B2']] }]

const firstSheet = workSheetsFromBuffer[0];
const headers = firstSheet.data[0];     // First row
const rows = firstSheet.data.slice(1);  // Data rows
```

### Writing XLSX

```typescript
import xlsx from 'node-xlsx';

const data = [
  ['Name', 'Email', 'Status'],       // Header row
  ['John Doe', 'john@ex.com', 'Active'],
  ['Jane Smith', 'jane@ex.com', 'Pending'],
];

const sheetOptions = {
  '!cols': [{ wch: 20 }, { wch: 30 }, { wch: 15 }], // Column widths
};

const buffer = xlsx.build([
  { name: 'Enrollments', data, options: sheetOptions },
  { name: 'Summary', data: summaryData },
]);

// Write to file or send as response
fs.writeFileSync('/tmp/report.xlsx', buffer);
```

---

## 6. xlsx (SheetJS)

The most comprehensive spreadsheet library. Full read/write for XLSX, CSV, and many other formats.

### Installation

```bash
pnpm add xlsx
```

### Reading Files

```typescript
import * as XLSX from 'xlsx';

// From buffer
const workbook = XLSX.read(buffer, { type: 'buffer' });

// From file (Node)
const workbook = XLSX.readFile('/path/to/file.xlsx');

// Sheet names
console.log(workbook.SheetNames); // ['Sheet1', 'Sheet2']

// Get sheet
const sheet = workbook.Sheets['Sheet1'];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet);
// => [{ Name: 'John', Email: 'john@ex.com' }, ...]

// Convert to array of arrays
const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
```

### Writing Files

```typescript
import * as XLSX from 'xlsx';

// From array of objects
const data = [
  { Name: 'John Doe', Email: 'john@ex.com', Amount: 1500 },
  { Name: 'Jane Smith', Email: 'jane@ex.com', Amount: 2000 },
];

const worksheet = XLSX.utils.json_to_sheet(data);

// Set column widths
worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');

// Write to buffer
const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

// Write to file (Node)
XLSX.writeFile(workbook, '/tmp/report.xlsx');

// Write to binary string (browser download)
const binaryString = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
```

### Browser Download Helper

```typescript
function downloadXlsx(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## A3 Service Patterns

### Frontend CSV Service

```typescript
// app/services/csv.ts
import Service from '@ember/service';
import Papa from 'papaparse';

export default class CsvService extends Service {
  parse(file: File): Promise<{ data: Record<string, unknown>[]; errors: Papa.ParseError[] }> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve({ data: results.data, errors: results.errors }),
      });
    });
  }

  download(data: Record<string, unknown>[], filename: string, columns?: string[]) {
    const csv = Papa.unparse(data, { columns });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

### Backend XLSX Service (Cloud Functions)

```typescript
// functions/src/services/xlsx.ts
import ExcelJS from 'exceljs';

export async function generateReport(
  data: Record<string, unknown>[],
  columns: { key: string; header: string; width?: number }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 20,
  }));

  sheet.addRows(data);

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1a73e8' } };

  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

## Common Pitfalls

1. **UTF-8 BOM:** Excel does not auto-detect UTF-8 in CSV files. Prepend `\ufeff` (BOM) to ensure proper encoding.
2. **Date formatting:** Excel serial dates differ from JS Date. Use exceljs `numFmt` or SheetJS date utilities.
3. **Large datasets:** For 10k+ rows, use papaparse `worker: true` and chunked processing. For exceljs, use streaming mode with `workbook.xlsx.write(stream)`.
4. **Memory on Cloud Functions:** Cloud Functions have limited memory. For very large exports, stream to Cloud Storage instead of building in memory.
5. **Column order:** papaparse and SheetJS may reorder columns alphabetically. Use the `columns` option explicitly to control order.
