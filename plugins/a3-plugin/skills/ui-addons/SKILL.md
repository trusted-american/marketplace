---
name: ui-addons
description: UI component addon reference — PDF generation (pdf-lib, pdfjs-dist), CSV/Excel export (papaparse, excellentexport, exceljs), signature capture (signature_pad), and document preview (docx-preview)
version: 0.1.0
---

# UI & Data Processing Addons Reference

## PDF Generation & Viewing

### pdf-lib (Creating/Modifying PDFs)
```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Create new PDF
const doc = await PDFDocument.create();
const page = doc.addPage([612, 792]); // Letter size
const font = await doc.embedFont(StandardFonts.Helvetica);
page.drawText('Hello World', { x: 50, y: 700, size: 24, font });
const bytes = await doc.save();

// Modify existing PDF
const existingPdf = await PDFDocument.load(existingBytes);
const pages = existingPdf.getPages();
pages[0].drawText('Added text', { x: 50, y: 50 });

// Fill PDF forms
const form = doc.getForm();
form.getTextField('name').setText('John Doe');
form.getCheckBox('agree').check();
```

**Docs**: https://pdf-lib.js.org/

### pdfjs-dist (Viewing PDFs)
```typescript
import * as pdfjsLib from 'pdfjs-dist';

const pdf = await pdfjsLib.getDocument(url).promise;
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.5 });
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.height = viewport.height;
canvas.width = viewport.width;
await page.render({ canvasContext: context, viewport }).promise;
```

**Docs**: https://mozilla.github.io/pdf.js/

## CSV & Excel

### PapaParse (CSV Parsing/Generation)
```typescript
import Papa from 'papaparse';

// Parse CSV
const result = Papa.parse(csvString, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
});
const data = result.data;
const errors = result.errors;

// Generate CSV
const csv = Papa.unparse([
  { name: 'John', email: 'john@test.com' },
  { name: 'Jane', email: 'jane@test.com' },
]);
```

**Docs**: https://www.papaparse.com/docs

### ExcellentExport (Frontend Excel Export)
```typescript
import ExcellentExport from 'excellentexport';

ExcellentExport.convert(
  { anchor: downloadLink, filename: 'export', format: 'xlsx' },
  [{ name: 'Sheet1', from: { table: tableElement } }]
);
```

### ExcelJS (Backend Excel Generation)
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Enrollments');
sheet.columns = [
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Date', key: 'date', width: 20 },
];
sheet.addRow({ name: 'John Doe', status: 'Active', date: new Date() });
const buffer = await workbook.xlsx.writeBuffer();
```

## Signature Capture

### signature_pad (v5)
```typescript
import SignaturePad from 'signature_pad';

const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
const signaturePad = new SignaturePad(canvas, {
  backgroundColor: 'rgb(255, 255, 255)',
  penColor: 'rgb(0, 0, 0)',
});

// Check if empty
signaturePad.isEmpty();

// Get data
const dataUrl = signaturePad.toDataURL(); // PNG base64
const svgData = signaturePad.toSVG();

// Clear
signaturePad.clear();
```

**Docs**: https://github.com/szimek/signature_pad

## Document Preview

### docx-preview
```typescript
import { renderAsync } from 'docx-preview';

const container = document.getElementById('docx-container');
await renderAsync(arrayBuffer, container, null, {
  className: 'docx-preview',
  inWrapper: true,
});
```

## Random Colors

### randomcolor
```typescript
import randomColor from 'randomcolor';

const color = randomColor({ luminosity: 'bright', format: 'hex' });
const colors = randomColor({ count: 10, hue: 'blue' });
```

## Date Handling

### Day.js
```typescript
import dayjs from 'dayjs';

dayjs().format('YYYY-MM-DD');
dayjs('2024-01-15').format('MMM D, YYYY'); // "Jan 15, 2024"
dayjs().subtract(7, 'days').toDate();
dayjs(dateA).isBefore(dateB);
dayjs(dateA).diff(dateB, 'days');
```

**Docs**: https://day.js.org/
