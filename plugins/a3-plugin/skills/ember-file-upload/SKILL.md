---
name: ember-file-upload
description: ember-file-upload reference — file upload with drag-drop, progress tracking, and Cloud Storage integration in A3
version: 0.1.0
---

# ember-file-upload Reference

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

## FileDropzone Component

The `FileDropzone` component creates a drag-and-drop zone:

```gts
import { FileDropzone } from 'ember-file-upload';

<template>
  <FileDropzone
    @queue={{this.queue}}
    @onFileAdded={{this.handleFileAdded}}
    @accept="application/pdf,image/*"
    @multiple={{true}}
    as |dropzone|
  >
    <div
      class="dropzone-area {{if dropzone.active 'dropzone-active'}} {{if dropzone.supported 'dropzone-supported'}}"
    >
      {{#if dropzone.active}}
        <p>Drop files here to upload</p>
      {{else}}
        <p>Drag files here or</p>
        <FileUpload
          @queue={{this.queue}}
          @onFileAdded={{this.handleFileAdded}}
          @accept="application/pdf,image/*"
          @multiple={{true}}
          as |upload|
        >
          <button type="button" class="btn btn-primary" {{upload.selectFiles}}>
            Browse Files
          </button>
        </FileUpload>
      {{/if}}
    </div>
  </FileDropzone>
</template>
```

### FileDropzone Yielded API

```typescript
{
  active: boolean;      // true when files are dragged over the zone
  supported: boolean;   // true if the browser supports drag-and-drop
  queue: Queue;         // Reference to the queue
}
```

### Dropzone Styling

```css
.dropzone-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.2s ease;
  background: #fafafa;
}

.dropzone-area.dropzone-active {
  border-color: #4A90D9;
  background: #e8f0fe;
}

.dropzone-area.dropzone-supported:hover {
  border-color: #999;
  cursor: pointer;
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

## File Validation

### Size Validation

```typescript
handleFileAdded = (file: UploadFile) => {
  const maxSize = 10 * 1024 * 1024; // 10 MB

  if (file.size > maxSize) {
    this.flashMessages.danger(
      this.intl.t('messages.fileTooLarge', {
        name: file.name,
        max: '10 MB',
      })
    );
    file.queue.remove(file);
    return;
  }

  this.uploadFileTask.perform(file);
};
```

### Type Validation

```typescript
handleFileAdded = (file: UploadFile) => {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];

  if (!allowedTypes.includes(file.type)) {
    this.flashMessages.danger(
      this.intl.t('messages.invalidFileType', { name: file.name })
    );
    file.queue.remove(file);
    return;
  }

  this.uploadFileTask.perform(file);
};
```

### Count Validation

```typescript
handleFileAdded = (file: UploadFile) => {
  const maxFiles = 5;

  if (this.queue.files.length > maxFiles) {
    this.flashMessages.danger(
      this.intl.t('messages.tooManyFiles', { max: maxFiles })
    );
    file.queue.remove(file);
    return;
  }

  this.uploadFileTask.perform(file);
};
```

### Combined Validation Helper

```typescript
validateFile(file: UploadFile): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'];
  const maxFiles = 10;

  if (file.size > maxSize) {
    return { valid: false, error: `File "${file.name}" exceeds 10 MB limit` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File "${file.name}" has unsupported type: ${file.type}` };
  }

  if (this.queue.files.length > maxFiles) {
    return { valid: false, error: `Maximum ${maxFiles} files allowed` };
  }

  return { valid: true };
}
```

## Upload to Firebase Cloud Storage (A3 Pattern)

A3 uploads files to Firebase Cloud Storage using the Firebase SDK, NOT the built-in `file.upload()` HTTP method. The `UploadFile` object provides the native `File` for use with the Firebase `uploadBytesResumable` API.

### Upload Pattern

```typescript
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type UploadFile from 'ember-file-upload/upload-file';

export default class DocumentUploadComponent extends Component {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;
  @service declare fileQueue: FileQueueService;

  @tracked uploadedUrl: string | null = null;

  get queue() {
    return this.fileQueue.findOrCreate('documents');
  }

  handleFileAdded = (file: UploadFile) => {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.flashMessages.danger(validation.error!);
      file.queue.remove(file);
      return;
    }
    this.uploadTask.perform(file);
  };

  uploadTask = task(async (file: UploadFile) => {
    try {
      const storage = getStorage();
      const storagePath = `clients/${this.args.clientId}/documents/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file.file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: this.args.currentUserId,
        },
      });

      // Track progress manually since we are not using file.upload()
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Update UI with progress
            this.uploadProgress = Math.round(progress);
          },
          (error) => reject(error),
          () => resolve(),
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);
      this.uploadedUrl = downloadUrl;

      // Save the document reference to Firestore
      const doc = this.store.createRecord('document', {
        name: file.name,
        url: downloadUrl,
        storagePath,
        contentType: file.type,
        size: file.size,
        client: this.args.model,
      });
      await doc.save();

      this.flashMessages.success(this.intl.t('messages.fileUploaded', { name: file.name }));
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.uploadFailed', { name: file.name }));
    }
  }).enqueue();
}
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

## Full Component Example

```gts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { FileUpload, FileDropzone } from 'ember-file-upload';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

export default class DocumentUploader extends Component {
  @service declare fileQueue: FileQueueService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  @tracked uploadProgress = 0;

  get queue() {
    return this.fileQueue.findOrCreate('client-documents');
  }

  handleFileAdded = (file: UploadFile) => {
    if (file.size > 10 * 1024 * 1024) {
      this.flashMessages.danger('File exceeds 10 MB limit');
      file.queue.remove(file);
      return;
    }
    this.uploadTask.perform(file);
  };

  uploadTask = task(async (file: UploadFile) => {
    // Upload to Firebase Cloud Storage...
  }).enqueue();

  removeFile = (file: UploadFile) => {
    file.queue.remove(file);
  };

  <template>
    <FileDropzone
      @queue={{this.queue}}
      @onFileAdded={{this.handleFileAdded}}
      @accept=".pdf,image/*"
      @multiple={{true}}
      as |dropzone|
    >
      <div class="dropzone-area {{if dropzone.active 'active'}}">
        {{#if dropzone.active}}
          <p>Drop files here</p>
        {{else}}
          <Icon @icon="cloud-arrow-up" class="fs-1 text-muted mb-2" />
          <p>Drag files here or click to browse</p>
          <FileUpload
            @queue={{this.queue}}
            @onFileAdded={{this.handleFileAdded}}
            @accept=".pdf,image/*"
            @multiple={{true}}
            as |upload|
          >
            <button type="button" class="btn btn-primary" {{upload.selectFiles}}>
              Browse Files
            </button>
          </FileUpload>
        {{/if}}
      </div>
    </FileDropzone>

    {{#each this.queue.files as |file|}}
      <div class="d-flex align-items-center mt-2">
        <span class="me-2">{{file.name}}</span>
        <span class="badge bg-secondary me-2">{{file.state}}</span>
        {{#if (eq file.state 'uploading')}}
          <div class="progress flex-grow-1 me-2">
            <div class="progress-bar" style="width: {{file.progress}}%"></div>
          </div>
        {{/if}}
        <button type="button" class="btn btn-sm btn-outline-danger" {{on "click" (fn this.removeFile file)}}>
          <Icon @icon="xmark" />
        </button>
      </div>
    {{/each}}
  </template>
}
```

## Further Investigation

- **ember-file-upload Docs**: https://ember-file-upload.pages.dev/
- **GitHub**: https://github.com/adopted-ember-addons/ember-file-upload
- **Firebase Cloud Storage**: https://firebase.google.com/docs/storage/web/upload-files
