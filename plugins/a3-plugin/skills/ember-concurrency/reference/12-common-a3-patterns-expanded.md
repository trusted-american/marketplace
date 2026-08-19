## Common A3 Patterns — Expanded

### Form Save with .drop() — Prevent Double Submit

The most common pattern in A3. Prevents multiple submissions, shows loading state, handles errors with flash messages.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';
import type IntlService from 'ember-intl/services/intl';

interface Signature {
  Args: {
    model: Model;
    onSave?: () => void;
  };
}

export default class FormComponent extends Component<Signature> {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;

  saveTask = task(async () => {
    try {
      await this.args.model.save();
      this.flashMessages.success(this.intl.t('messages.saved'));
      this.args.onSave?.();
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.saveFailed'));
    }
  }).drop();
}
```

```gts
<template>
  <form {{on "submit" (prevent-default this.saveTask.perform)}}>
    {{! ...form fields... }}

    <button
      type="submit"
      disabled={{this.saveTask.isRunning}}
      class="btn btn-primary"
      data-test-save-button
    >
      {{#if this.saveTask.isRunning}}
        <span class="spinner-border spinner-border-sm" role="status"></span>
        {{t "buttons.saving"}}
      {{else}}
        {{t "buttons.save"}}
      {{/if}}
    </button>
  </form>
</template>
```

### Search with .restartable() + Timeout Debounce

Autocomplete/search pattern. Each keystroke restarts the task. The `timeout(300)` acts as a debounce — if the user types again within 300ms, the task restarts and the timeout resets, so no network request fires until the user pauses.

```typescript
import Component from '@glimmer/component';
import { task, timeout } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class SearchComponent extends Component {
  @service declare store: StoreService;
  @tracked results: Client[] = [];
  @tracked searchQuery = '';

  searchTask = task(async (event: Event) => {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;

    if (query.length < 2) {
      this.results = [];
      return;
    }

    await timeout(300); // Debounce — cancelled if task restarts

    this.results = await this.store.query('client', {
      filter: { search: query },
      page: { limit: 10 },
    });
  }).restartable();
}
```

```gts
<template>
  <input
    type="search"
    placeholder={{t "placeholders.search"}}
    value={{this.searchQuery}}
    {{on "input" this.searchTask.perform}}
    data-test-search-input
  />

  {{#if this.searchTask.isRunning}}
    <LoadingSpinner @small={{true}} />
  {{/if}}

  {{#each this.results as |client|}}
    <ClientCard @client={{client}} />
  {{/each}}

  {{#if (and this.searchTask.lastSuccessful (eq this.results.length 0))}}
    <p class="text-muted">{{t "messages.noResults"}}</p>
  {{/if}}
</template>
```

### Delete with Confirmation and Rollback

Delete pattern with soft-delete (deleteRecord + save) and rollback on error.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';

interface Signature {
  Args: {
    model: Model;
    returnRoute: string;
  };
}

export default class DeleteButtonComponent extends Component<Signature> {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;
  @service declare router: RouterService;

  deleteTask = task(async () => {
    this.args.model.deleteRecord();
    try {
      await this.args.model.save();
      this.flashMessages.success(this.intl.t('messages.deleted'));
      this.router.transitionTo(this.args.returnRoute);
    } catch (error) {
      this.args.model.rollbackAttributes();
      this.flashMessages.danger(this.intl.t('messages.deleteFailed'));
    }
  }).drop();
}
```

```gts
<template>
  <button
    type="button"
    class="btn btn-danger"
    disabled={{this.deleteTask.isRunning}}
    {{on "click" this.deleteTask.perform}}
    data-test-delete-button
  >
    {{#if this.deleteTask.isRunning}}
      <span class="spinner-border spinner-border-sm"></span>
      {{t "buttons.deleting"}}
    {{else}}
      {{t "buttons.delete"}}
    {{/if}}
  </button>
</template>
```

### Load Data on Component Init

Load data when a component is inserted. The task provides loading/error states for free.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';

interface Signature {
  Args: {
    clientId: string;
  };
}

export default class ClientDetailComponent extends Component<Signature> {
  @service declare store: StoreService;

  constructor(owner: unknown, args: Signature['Args']) {
    super(owner, args);
    this.loadTask.perform();
  }

  loadTask = task(async () => {
    return await this.store.findRecord('client', this.args.clientId, {
      include: 'contacts,addresses',
    });
  });
}
```

```gts
<template>
  {{#if this.loadTask.isRunning}}
    <LoadingSkeleton />
  {{else if this.loadTask.lastErrored}}
    <ErrorState
      @error={{this.loadTask.lastErrored.error}}
      @onRetry={{this.loadTask.perform}}
    />
  {{else if this.loadTask.lastSuccessful}}
    <ClientProfile @client={{this.loadTask.lastSuccessful.value}} />
  {{/if}}
</template>
```

### Polling with .restartable()

Periodically fetch fresh data. The `.restartable()` modifier ensures that if the component is re-rendered or the user triggers a manual refresh, the old polling loop is cancelled and a new one starts.

```typescript
import Component from '@glimmer/component';
import { task, timeout } from 'ember-concurrency';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class LiveDashboardComponent extends Component {
  @service declare store: StoreService;
  @tracked dashboardData: DashboardData | null = null;

  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.pollTask.perform();
  }

  pollTask = task(async () => {
    while (true) {
      try {
        this.dashboardData = await this.store.queryRecord('dashboard', {});
      } catch (error) {
        // Log but don't break the loop — keep polling
        console.error('Poll failed:', error);
      }
      await timeout(30000); // Poll every 30 seconds
    }
  }).restartable();

  // Manual refresh restarts the polling loop
  refreshTask = task(async () => {
    // Cancel the current poll loop and restart it
    this.pollTask.cancelAll();
    await this.pollTask.perform();
  }).drop();
}
```

### File Upload with Progress Tracking

Upload files with concurrency control and progress tracking.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

export default class FileUploadComponent extends Component {
  @tracked uploads: UploadFile[] = [];

  uploadFileTask = task(async (uploadFile: UploadFile) => {
    uploadFile.status = 'uploading';
    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadFile.progress = Math.round((event.loaded / event.total) * 100);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', '/api/uploads');
        xhr.send(formData);
      });

      uploadFile.status = 'complete';
      uploadFile.progress = 100;
    } catch (error) {
      uploadFile.status = 'error';
      throw error;
    }
  }).enqueue().maxConcurrency(3); // Upload up to 3 files at once, queue the rest
}
```

### Chained Tasks (Task A Calls Task B)

Tasks can call other tasks. Cancellation propagates through the chain.

```typescript
import Component from '@glimmer/component';
import { task } from 'ember-concurrency';
import { service } from '@ember/service';

export default class OrderComponent extends Component {
  @service declare store: StoreService;

  // High-level orchestration task
  submitOrderTask = task(async () => {
    const order = await this.validateOrderTask.perform();
    const payment = await this.processPaymentTask.perform(order);
    await this.confirmOrderTask.perform(order, payment);
    this.flashMessages.success('Order submitted!');
  }).drop();

  // If submitOrderTask is cancelled, all child tasks are also cancelled
  validateOrderTask = task(async () => {
    const errors = await this.args.order.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return this.args.order;
  });

  processPaymentTask = task(async (order: Order) => {
    return await this.store.createRecord('payment', {
      order,
      amount: order.total,
    }).save();
  });

  confirmOrderTask = task(async (order: Order, payment: Payment) => {
    order.set('payment', payment);
    order.set('status', 'confirmed');
    await order.save();
  });
}
```

---
