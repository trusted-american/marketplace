---
name: signature-pad
description: signature_pad v5 reference — electronic signature capture for enrollment forms and documents in A3
version: 0.1.0
---

# signature_pad v5 Reference

## Package: signature_pad

HTML5 canvas-based smooth signature drawing. Used in A3 for enrollment forms, compliance documents, and any workflow requiring electronic signatures.

### Installation

```bash
pnpm add signature_pad
```

### Basic Import

```typescript
import SignaturePad from 'signature_pad';
```

## SignaturePad Constructor

```typescript
const canvas = document.querySelector<HTMLCanvasElement>('#signature-canvas');
const signaturePad = new SignaturePad(canvas, {
  // Drawing options
  penColor: 'rgb(0, 0, 0)',         // Default: 'black'
  backgroundColor: 'rgb(255, 255, 255)', // Default: 'rgba(0,0,0,0)' (transparent)
  minWidth: 0.5,                     // Minimum stroke width in px
  maxWidth: 2.5,                     // Maximum stroke width in px
  velocityFilterWeight: 0.7,         // How much velocity affects width (0-1)
  throttle: 16,                      // Max ms between points (~60fps)
  minDistance: 5,                    // Min distance (px) between points
  dotSize: 0,                       // Radius of dot on tap (0 = calculated from min/maxWidth)
  compositeOperation: 'source-over', // Canvas composite operation
});
```

### Options Detail

| Option                 | Type   | Default                | Description                                          |
|------------------------|--------|------------------------|------------------------------------------------------|
| `penColor`             | string | `'black'`              | CSS color for the pen stroke                         |
| `backgroundColor`      | string | `'rgba(0,0,0,0)'`     | Background color (set white for JPEG/PDF export)     |
| `minWidth`             | number | `0.5`                  | Minimum line width                                   |
| `maxWidth`             | number | `2.5`                  | Maximum line width                                   |
| `velocityFilterWeight` | number | `0.7`                  | Weight for velocity smoothing                        |
| `throttle`             | number | `16`                   | Throttle drawing to ms (0 = no throttle)             |
| `minDistance`           | number | `5`                    | Minimum distance between points to record            |
| `dotSize`              | number | `0`                    | Size of single-tap dots                              |
| `compositeOperation`   | string | `'source-over'`        | Canvas globalCompositeOperation                      |

## Core Methods

### toDataURL — Export as Image

```typescript
// Export as PNG (default)
const pngDataUrl = signaturePad.toDataURL();
// => 'data:image/png;base64,...'

// Export as JPEG with quality
const jpegDataUrl = signaturePad.toDataURL('image/jpeg', 0.8);

// Export as SVG
const svgDataUrl = signaturePad.toDataURL('image/svg+xml');
```

### toSVG — Export as SVG String

```typescript
const svgString = signaturePad.toSVG();
// Returns raw SVG markup: '<svg xmlns="..." ...>...</svg>'

// With custom options
const svgString = signaturePad.toSVG({ includeBackgroundColor: true });
```

### toData — Export Raw Point Data

```typescript
const pointGroups = signaturePad.toData();
// Returns: PointGroup[] where each group is a stroke
// Each point: { x: number, y: number, pressure: number, time: number }
```

### fromDataURL — Load from Image Data URL

```typescript
// Load a previously saved signature
await signaturePad.fromDataURL(dataUrl);

// With size options (scales the image)
await signaturePad.fromDataURL(dataUrl, {
  width: 400,
  height: 200,
  ratio: 1,   // Pixel ratio override
});
```

**Important:** `fromDataURL` is async. Always await it before doing further operations.

### fromData — Load from Point Data

```typescript
// Restore from saved point data
signaturePad.fromData(pointGroups);

// Append to existing drawing instead of replacing
signaturePad.fromData(pointGroups, { clear: false });
```

### clear — Clear the Canvas

```typescript
signaturePad.clear();
// Clears all strokes and resets to backgroundColor
```

### isEmpty — Check if Signed

```typescript
if (signaturePad.isEmpty()) {
  alert('Please provide a signature before submitting.');
}
```

### on / off — Enable/Disable Drawing

```typescript
// Disable (read-only mode)
signaturePad.off();

// Re-enable
signaturePad.on();
```

## Event Callbacks

```typescript
signaturePad.addEventListener('beginStroke', (event) => {
  // User started drawing a stroke
  console.log('Stroke started');
});

signaturePad.addEventListener('endStroke', (event) => {
  // User finished a stroke
  console.log('Stroke ended');
  autoSave();
});

signaturePad.addEventListener('beforeUpdateStroke', (event) => {
  // Called before each point is added
});

signaturePad.addEventListener('afterUpdateStroke', (event) => {
  // Called after each point is added
});
```

## Canvas Setup and Resize Handling

The canvas must be properly sized for high-DPI displays. Without this, signatures look blurry on retina screens and coordinates are wrong.

```typescript
function resizeCanvas(canvas: HTMLCanvasElement, signaturePad: SignaturePad) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext('2d');
  ctx?.scale(ratio, ratio);

  // Must clear after resize — canvas content is lost
  signaturePad.clear();
}

// Initial setup
resizeCanvas(canvas, signaturePad);

// Handle window resize
window.addEventListener('resize', () => {
  // Save current data
  const data = signaturePad.toData();
  resizeCanvas(canvas, signaturePad);
  // Restore data after resize
  signaturePad.fromData(data);
});
```

### ResizeObserver Pattern (preferred in A3)

```typescript
const observer = new ResizeObserver(() => {
  const data = signaturePad.toData();
  resizeCanvas(canvas, signaturePad);
  signaturePad.fromData(data);
});
observer.observe(canvas.parentElement!);

// Cleanup
observer.disconnect();
```

## Ember Component Integration Pattern

A3 wraps signature_pad in a Glimmer component:

```typescript
// app/components/signature-capture.gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { modifier } from 'ember-modifier';
import SignaturePad from 'signature_pad';

interface SignatureCaptureSignature {
  Args: {
    onSave: (dataUrl: string) => void;
    existingSignature?: string;
    readonly?: boolean;
    penColor?: string;
  };
  Element: HTMLCanvasElement;
}

export default class SignatureCapture extends Component<SignatureCaptureSignature> {
  @tracked signaturePad: SignaturePad | null = null;
  @tracked hasSignature = false;

  setupPad = modifier((canvas: HTMLCanvasElement) => {
    const pad = new SignaturePad(canvas, {
      penColor: this.args.penColor ?? 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
      minWidth: 0.5,
      maxWidth: 2.5,
    });

    this.signaturePad = pad;

    // High-DPI setup
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    // Load existing signature if provided
    if (this.args.existingSignature) {
      pad.fromDataURL(this.args.existingSignature);
      this.hasSignature = true;
    }

    if (this.args.readonly) {
      pad.off();
    }

    pad.addEventListener('endStroke', () => {
      this.hasSignature = !pad.isEmpty();
    });

    // Cleanup
    return () => {
      pad.off();
    };
  });

  @action clear() {
    this.signaturePad?.clear();
    this.hasSignature = false;
  }

  @action save() {
    if (this.signaturePad && !this.signaturePad.isEmpty()) {
      const dataUrl = this.signaturePad.toDataURL('image/png');
      this.args.onSave(dataUrl);
    }
  }
}
```

## Saving Signatures to Cloud Storage

A3 pattern for persisting signatures via Firebase Cloud Storage:

```typescript
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

async function saveSignatureToStorage(
  dataUrl: string,
  path: string // e.g. 'signatures/{userId}/{documentId}.png'
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, path);

  // Upload the base64 data URL directly
  const snapshot = await uploadString(storageRef, dataUrl, 'data_url', {
    contentType: 'image/png',
    customMetadata: {
      signedAt: new Date().toISOString(),
    },
  });

  // Get the download URL for later retrieval
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

// Usage in form submission
const dataUrl = signaturePad.toDataURL();
const signatureUrl = await saveSignatureToStorage(
  dataUrl,
  `signatures/${userId}/${enrollmentId}.png`
);

// Save URL reference in Firestore document
await updateDoc(doc(db, 'enrollments', enrollmentId), {
  signatureUrl,
  signedAt: serverTimestamp(),
});
```

## Converting Data URL to Blob (for file uploads)

```typescript
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
```

## Common Pitfalls

1. **Transparent background:** Default background is transparent. If embedding in a PDF or saving as JPEG, set `backgroundColor: 'rgb(255, 255, 255)'`.
2. **Canvas sizing:** Always set `canvas.width` and `canvas.height` in JavaScript, not just CSS. CSS-only sizing makes drawing coordinates wrong.
3. **High-DPI blur:** Without the devicePixelRatio scaling, signatures look blurry on retina displays.
4. **isEmpty after fromDataURL:** `isEmpty()` returns true even after `fromDataURL` because it only tracks drawn strokes. Use `fromData` or track loading state separately.
5. **Memory:** Large canvases (e.g., 4000x2000) consume significant memory. Keep canvas size reasonable.
