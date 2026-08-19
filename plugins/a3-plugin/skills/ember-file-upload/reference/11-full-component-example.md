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
