---
name: ember-file-upload
description: ember-file-upload reference — file upload with drag-drop, progress tracking, and Cloud Storage integration in A3
version: 0.1.0
---


# ember-file-upload Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/04-filedropzone-component.md` | FileDropzone Component |
| `reference/06-file-validation.md` | File Validation |
| `reference/07-upload-to-firebase-cloud-storage-a3-pattern.md` | Upload to Firebase Cloud Storage (A3 Pattern) |
| `reference/11-full-component-example.md` | Full Component Example |

## Overview

`ember-file-upload` provides file upload components with drag-and-drop support, upload progress tracking, file validation, and queue management. A3 uses it for uploading documents (PDFs, images, CSVs) to Firebase Cloud Storage, with wrappers in the `@trusted-american/ember` design system: `Form::FileInput` and `Form::FileDropzone`.

**Package**: `ember-file-upload`
**Version**: 8.x (Ember 5+ compatible, Glimmer components)
**Import**: `import { FileUpload, FileDropzone, Queue } from 'ember-file-upload';`
## Core Concepts

### File Queue

All file uploads go through a **queue**. The queue tracks files across their lifecycle: queued, uploading, uploaded, failed. You create a queue with the `file-queue` helper or service.

```typescript
import { service } from '@ember/service';
import type FileQueueService from 'ember-file-upload/services/file-queue';

export default class UploadComponent extends Component {
  @service declare fileQueue: FileQueueService;

  get queue() {
    return this.fileQueue.findOrCreate('documents');
  }
}
```

### UploadFile Object

Each file in the queue is an `UploadFile` instance with these key properties:

```typescript
interface UploadFile {
  id: string;
  name: string;          // Original filename
  size: number;          // Size in bytes
  type: string;          // MIME type
  extension: string;     // File extension
  loaded: number;        // Bytes uploaded so far
  progress: number;      // Upload progress 0-100
  state: 'queued' | 'uploading' | 'uploaded' | 'failed';
  source: 'browse' | 'drag-and-drop' | 'web' | 'data-url' | 'blob';
  file: File;            // The native File object
  queue: Queue;          // Reference to the parent queue

  // Methods
  upload(url: string, options?: UploadOptions): Promise<Response>;
  uploadBinary(url: string, options?: UploadOptions): Promise<Response>;
  readAsDataURL(): Promise<string>;
  readAsArrayBuffer(): Promise<ArrayBuffer>;
  readAsText(): Promise<string>;
}
```
## FileUpload Component

The `FileUpload` component renders a file input trigger (button or clickable area):

```gts
import { FileUpload } from 'ember-file-upload';

<template>
  <FileUpload
    @queue={{this.queue}}
    @onFileAdded={{this.handleFileAdded}}
    @accept="application/pdf,.pdf"
    @multiple={{false}}
    as |upload|
  >
    <button type="button" class="btn btn-outline-primary" {{upload.selectFiles}}>
      <Icon @icon="upload" @class="me-2" />
      Choose File
    </button>
  </FileUpload>
</template>
```

### FileUpload Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `@queue` | `Queue` | The file queue to add files to |
| `@onFileAdded` | `(file: UploadFile) => void` | Called when a file is added to the queue |
| `@accept` | `string` | Accepted file types (MIME types or extensions) |
| `@multiple` | `boolean` | Allow multiple file selection (default: `false`) |
| `@disabled` | `boolean` | Disable the file input |
| `@capture` | `string` | Camera capture mode on mobile (`'user'`, `'environment'`) |

### Yielded API

The component yields an object with:

```typescript
{
  selectFiles: ModifierLike;  // Apply to an element to make it trigger file selection
}
```
## Upload Progress Tracking

Track upload progress for individual files and the entire queue:

```gts
<template>
  {{#each this.queue.files as |file|}}
    <div class="upload-item">
      <span>{{file.name}}</span>
      <span>{{file.state}}</span>

      {{#if (eq file.state 'uploading')}}
        <div class="progress">
          <div
            class="progress-bar"
            role="progressbar"
            style="width: {{file.progress}}%"
            aria-valuenow={{file.progress}}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {{file.progress}}%
          </div>
        </div>
      {{/if}}

      {{#if (eq file.state 'uploaded')}}
        <Icon @icon="circle-check" @color="success" />
      {{/if}}

      {{#if (eq file.state 'failed')}}
        <Icon @icon="circle-xmark" @color="danger" />
        <button type="button" {{on "click" (fn this.retryUpload file)}}>Retry</button>
      {{/if}}
    </div>
  {{/each}}

  {{#if this.queue.files.length}}
    <p>
      Total progress: {{this.queue.progress}}%
      ({{this.queue.loaded}} / {{this.queue.size}} bytes)
    </p>
  {{/if}}
</template>
```
## Design System Wrappers

### Form::FileInput

A styled file input button with label and error support:

```gts
<Form::FileInput
  @label="Upload Document"
  @queue={{this.queue}}
  @onFileAdded={{this.handleFileAdded}}
  @accept=".pdf,.doc,.docx"
  @multiple={{false}}
  @helpText="PDF or Word documents, max 10 MB"
  @errors={{this.uploadErrors}}
/>
```

### Form::FileDropzone

A styled drag-and-drop zone with label and error support:

```gts
<Form::FileDropzone
  @label="Upload Documents"
  @queue={{this.queue}}
  @onFileAdded={{this.handleFileAdded}}
  @accept=".pdf,image/*"
  @multiple={{true}}
  @helpText="Drag files here or click to browse. Max 10 MB per file."
  @errors={{this.uploadErrors}}
/>
```
## Reading File Contents for Preview

Preview images or read file contents before uploading:

### Image Preview

```typescript
@tracked previewUrl: string | null = null;

handleFileAdded = async (file: UploadFile) => {
  if (file.type.startsWith('image/')) {
    this.previewUrl = await file.readAsDataURL();
  }
  this.uploadTask.perform(file);
};
```

```gts
<template>
  {{#if this.previewUrl}}
    <img src={{this.previewUrl}} alt="Preview" class="img-thumbnail" style="max-width: 200px" />
  {{/if}}
</template>
```

### CSV Preview

```typescript
handleCsvAdded = async (file: UploadFile) => {
  const text = await file.readAsText();
  const lines = text.split('\n');
  this.csvHeaders = lines[0].split(',');
  this.csvPreviewRows = lines.slice(1, 6).map((line) => line.split(','));
};
```

### PDF Preview (Binary)

```typescript
handlePdfAdded = async (file: UploadFile) => {
  const buffer = await file.readAsArrayBuffer();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  this.pdfPreviewUrl = URL.createObjectURL(blob);
};
```
## Queue Management

### Clearing the Queue

```typescript
clearQueue = () => {
  this.queue.flush(); // Remove all files from the queue
};
```

### Removing a Specific File

```typescript
removeFile = (file: UploadFile) => {
  file.queue.remove(file);
};
```

### Queue Properties

```typescript
this.queue.files;       // All files in the queue
this.queue.size;        // Total size of all files in bytes
this.queue.loaded;      // Total bytes uploaded across all files
this.queue.progress;    // Overall progress 0-100
```
## Further Investigation

- **ember-file-upload Docs**: https://ember-file-upload.pages.dev/
- **GitHub**: https://github.com/adopted-ember-addons/ember-file-upload
- **Firebase Cloud Storage**: https://firebase.google.com/docs/storage/web/upload-files
