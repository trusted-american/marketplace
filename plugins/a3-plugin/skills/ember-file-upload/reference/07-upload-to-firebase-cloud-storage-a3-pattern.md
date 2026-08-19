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
