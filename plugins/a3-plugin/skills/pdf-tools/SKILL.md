---
name: pdf-tools
description: PDF generation and viewing reference — pdf-lib for creating/modifying PDFs, pdfjs-dist for viewing/rendering PDFs in A3
version: 0.1.0
---

# PDF Tools Reference

A3 uses two complementary PDF libraries:
- **pdf-lib** — Create, modify, and fill PDF documents (write-side)
- **pdfjs-dist** — Render and extract text from PDFs (read-side)

## pdf-lib

### Installation

```bash
pnpm add pdf-lib
```

### Creating a New PDF

```typescript
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

const pdfDoc = await PDFDocument.create();

// Add a blank page (Letter size by default)
const page = pdfDoc.addPage(PageSizes.Letter); // [612, 792]
// Or custom size: pdfDoc.addPage([600, 400])

const { width, height } = page.getSize();
```

### Drawing Text

```typescript
// Embed a standard font
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

page.drawText('Hello World', {
  x: 50,
  y: height - 50,    // PDF origin is bottom-left
  size: 24,
  font: boldFont,
  color: rgb(0, 0, 0),
  maxWidth: width - 100,
  lineHeight: 28,
  opacity: 1,
});

// Multi-line text: drawText handles line breaks with maxWidth
page.drawText('This is a longer paragraph that will wrap automatically when maxWidth is set.', {
  x: 50,
  y: height - 100,
  size: 12,
  font,
  color: rgb(0.2, 0.2, 0.2),
  maxWidth: width - 100,
  lineHeight: 16,
});
```

### Drawing Shapes

```typescript
// Rectangle
page.drawRectangle({
  x: 50,
  y: height - 200,
  width: 200,
  height: 50,
  color: rgb(0.95, 0.95, 0.95),
  borderColor: rgb(0.8, 0.8, 0.8),
  borderWidth: 1,
});

// Line
page.drawLine({
  start: { x: 50, y: height - 250 },
  end: { x: width - 50, y: height - 250 },
  thickness: 1,
  color: rgb(0.8, 0.8, 0.8),
});

// Circle
page.drawCircle({
  x: 100,
  y: 400,
  size: 25,
  color: rgb(0.1, 0.5, 0.8),
});
```

### Embedding Images

```typescript
// From bytes
const pngImageBytes = await fetch('/logo.png').then((r) => r.arrayBuffer());
const pngImage = await pdfDoc.embedPng(pngImageBytes);
// or: const jpgImage = await pdfDoc.embedJpg(jpgBytes);

const pngDims = pngImage.scale(0.5); // Scale to 50%

page.drawImage(pngImage, {
  x: 50,
  y: height - 150,
  width: pngDims.width,
  height: pngDims.height,
});

// Embed from base64 data URL (e.g., signature)
const base64 = signatureDataUrl.split(',')[1];
const signatureBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const signatureImage = await pdfDoc.embedPng(signatureBytes);

page.drawImage(signatureImage, {
  x: 50,
  y: 100,
  width: 200,
  height: 60,
});
```

### Custom Fonts

```typescript
import { fontkit } from '@pdf-lib/fontkit';

pdfDoc.registerFontkit(fontkit);

const fontBytes = await fetch('/fonts/Roboto-Regular.ttf').then((r) => r.arrayBuffer());
const customFont = await pdfDoc.embedFont(fontBytes);

page.drawText('Custom font text', {
  font: customFont,
  size: 14,
});
```

### Form Filling

A3 uses this extensively for pre-filling enrollment and compliance PDFs.

```typescript
// Load an existing PDF with form fields
const existingPdfBytes = await fetch('/templates/enrollment.pdf').then((r) => r.arrayBuffer());
const pdfDoc = await PDFDocument.load(existingPdfBytes);

const form = pdfDoc.getForm();

// Text fields
const nameField = form.getTextField('applicant_name');
nameField.setText('John Doe');

const addressField = form.getTextField('address');
addressField.setText('123 Main St, Springfield, IL 62701');

// Checkbox
const agreeField = form.getCheckBox('agree_terms');
agreeField.check();

// Dropdown
const stateField = form.getDropdown('state');
stateField.select('Illinois');

// Radio group
const planField = form.getRadioGroup('plan_type');
planField.select('premium');

// Flatten form fields (make non-editable)
form.flatten();

const filledPdfBytes = await pdfDoc.save();
```

### Getting All Form Fields

```typescript
const form = pdfDoc.getForm();
const fields = form.getFields();

fields.forEach((field) => {
  const name = field.getName();
  const type = field.constructor.name; // PDFTextField, PDFCheckBox, etc.
  console.log(`${name}: ${type}`);
});
```

### Merging PDFs

```typescript
const pdf1Bytes = await fetch('/doc1.pdf').then((r) => r.arrayBuffer());
const pdf2Bytes = await fetch('/doc2.pdf').then((r) => r.arrayBuffer());

const pdf1 = await PDFDocument.load(pdf1Bytes);
const pdf2 = await PDFDocument.load(pdf2Bytes);

const mergedPdf = await PDFDocument.create();

// Copy all pages from pdf1
const pdf1Pages = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
pdf1Pages.forEach((page) => mergedPdf.addPage(page));

// Copy specific pages from pdf2 (e.g., first two pages)
const pdf2Pages = await mergedPdf.copyPages(pdf2, [0, 1]);
pdf2Pages.forEach((page) => mergedPdf.addPage(page));

const mergedBytes = await mergedPdf.save();
```

### Modifying Existing PDFs

```typescript
const pdfBytes = await fetch('/existing.pdf').then((r) => r.arrayBuffer());
const pdfDoc = await PDFDocument.load(pdfBytes);

// Get existing page
const pages = pdfDoc.getPages();
const firstPage = pages[0];

// Add watermark
firstPage.drawText('DRAFT', {
  x: 200,
  y: 400,
  size: 80,
  font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  color: rgb(0.9, 0.1, 0.1),
  opacity: 0.15,
  rotate: { angle: 45, type: 0 }, // degrees
});

// Set metadata
pdfDoc.setTitle('Enrollment Form');
pdfDoc.setAuthor('A3 Platform');
pdfDoc.setCreationDate(new Date());
```

### Saving the PDF

```typescript
// As Uint8Array
const pdfBytes = await pdfDoc.save();

// Trigger browser download
const blob = new Blob([pdfBytes], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'enrollment.pdf';
link.click();
URL.revokeObjectURL(url);

// Upload to Cloud Storage
import { getStorage, ref, uploadBytes } from 'firebase/storage';
const storageRef = ref(getStorage(), `documents/${docId}.pdf`);
await uploadBytes(storageRef, pdfBytes, { contentType: 'application/pdf' });
```

---

## pdfjs-dist (PDF.js)

Mozilla's PDF rendering library. A3 uses it for in-browser PDF viewing.

### Installation

```bash
pnpm add pdfjs-dist
```

### Worker Setup

PDF.js requires a web worker for parsing. Configure the worker source:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// Or use CDN
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

### Loading a Document

```typescript
// From URL
const loadingTask = pdfjsLib.getDocument('/path/to/document.pdf');
const pdf = await loadingTask.promise;

// From ArrayBuffer
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// From base64
const pdf = await pdfjsLib.getDocument({ data: atob(base64String) }).promise;

console.log(`Pages: ${pdf.numPages}`);
```

### Rendering a Page to Canvas

```typescript
const pageNumber = 1;
const page = await pdf.getPage(pageNumber);

const scale = 1.5;
const viewport = page.getViewport({ scale });

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d')!;
canvas.width = viewport.width;
canvas.height = viewport.height;

const renderContext = {
  canvasContext: context,
  viewport,
};

await page.render(renderContext).promise;
// Canvas now contains the rendered page
```

### Rendering All Pages

```typescript
async function renderAllPages(pdf: pdfjsLib.PDFDocumentProxy, container: HTMLElement) {
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.marginBottom = '10px';

    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;

    container.appendChild(canvas);
  }
}
```

### Text Extraction

```typescript
const page = await pdf.getPage(1);
const textContent = await page.getTextContent();

const text = textContent.items
  .filter((item): item is { str: string } => 'str' in item)
  .map((item) => item.str)
  .join(' ');

console.log(text);
```

### Text Layer (for selectable text overlay)

```typescript
import { TextLayer } from 'pdfjs-dist';

const textContent = await page.getTextContent();
const textLayer = new TextLayer({
  textContentSource: textContent,
  container: textLayerDiv,
  viewport,
});
await textLayer.render();
```

## A3 PDF Service Pattern

A3 centralizes PDF operations in an Ember service:

```typescript
// app/services/pdf.ts
import Service from '@ember/service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export default class PdfService extends Service {
  async fillTemplate(templateUrl: string, data: Record<string, string>): Promise<Uint8Array> {
    const templateBytes = await fetch(templateUrl).then((r) => r.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    for (const [fieldName, value] of Object.entries(data)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
      } catch {
        // Field not found — skip
      }
    }

    form.flatten();
    return pdfDoc.save();
  }

  async renderPreview(pdfBytes: Uint8Array, canvas: HTMLCanvasElement, pageNum = 1) {
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
    }).promise;
  }
}
```

## Common Pitfalls

1. **PDF coordinate system:** Origin is bottom-left, not top-left. Y increases upward.
2. **Font embedding:** Standard fonts work without fontkit. Custom fonts (TTF/OTF) require `@pdf-lib/fontkit`.
3. **Form field names:** Must match exactly. Use `form.getFields()` to discover names.
4. **pdfjs-dist worker:** Always configure the worker before calling `getDocument`. Missing worker causes silent failures.
5. **Memory:** Large PDFs (100+ pages) can consume significant memory when rendered. Render pages on demand, not all at once.
