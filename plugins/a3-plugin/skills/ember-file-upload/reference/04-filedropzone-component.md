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
