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
