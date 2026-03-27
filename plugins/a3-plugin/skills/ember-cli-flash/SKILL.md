---
name: ember-cli-flash
description: ember-cli-flash reference — toast notification service used across A3 for user feedback messages (success, danger, warning, info)
version: 0.1.0
---

# ember-cli-flash Reference

## Overview

`ember-cli-flash` provides a flash message service for showing toast-style notifications to users. A3 uses it throughout the entire application for feedback on save operations, error reporting, deletion confirmations, and any other user-facing notifications. The service is injected as `flash-messages` and provides methods for each message type: `success`, `danger`, `warning`, and `info`.

**Package**: `ember-cli-flash`
**Service name**: `flash-messages`
**Version**: 5.x (compatible with Ember 5+)

## Service Injection

```typescript
import Component from '@glimmer/component';
import { service } from '@ember/service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';

export default class MyComponent extends Component {
  @service('flash-messages') declare flashMessages: FlashMessageService;
}
```

The service can be injected in components, routes, services, and controllers.

## Message Methods

### success()

Used for confirming successful operations — saves, creates, updates, deletes.

```typescript
this.flashMessages.success('Client saved successfully');

// With options
this.flashMessages.success('Client saved successfully', {
  timeout: 5000,        // Auto-dismiss after 5 seconds (default: 3000)
  sticky: false,        // Whether message stays until dismissed (default: false)
  showProgress: true,   // Show countdown progress bar (default: false)
});
```

### danger()

Used for error messages — failed saves, validation errors, server errors.

```typescript
this.flashMessages.danger('Failed to save client. Please try again.');

// With longer timeout for errors
this.flashMessages.danger('An unexpected error occurred. Please contact support.', {
  timeout: 8000,
  sticky: false,
});
```

### warning()

Used for non-critical warnings — approaching limits, deprecated actions, potential issues.

```typescript
this.flashMessages.warning('This contract expires in 30 days');

this.flashMessages.warning('You have unsaved changes that will be lost', {
  timeout: 6000,
});
```

### info()

Used for neutral informational messages — status updates, tips, non-actionable information.

```typescript
this.flashMessages.info('Report generation has started. You will be notified when complete.');

this.flashMessages.info('Tip: You can use keyboard shortcuts to navigate faster', {
  timeout: 10000,
});
```

## Message Options

All message methods accept an optional second argument with these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `3000` | Milliseconds before auto-dismiss. Set to `0` to disable. |
| `sticky` | `boolean` | `false` | If `true`, message stays until user dismisses it. Overrides `timeout`. |
| `showProgress` | `boolean` | `false` | Shows a countdown progress bar. |
| `extendedTimeout` | `number` | `0` | Additional time on hover before dismiss. |
| `destroyOnClick` | `boolean` | `true` | Whether clicking the message dismisses it. |
| `onDestroy` | `() => void` | `undefined` | Callback fired when message is dismissed. |
| `priority` | `number` | `100` | Higher priority messages appear first. |

### Sticky Messages

For critical information the user must acknowledge:

```typescript
this.flashMessages.danger('Your session will expire in 5 minutes. Please save your work.', {
  sticky: true,          // Won't auto-dismiss
  destroyOnClick: true,  // User must click to dismiss
  priority: 200,         // Show above other messages
});
```

### Extended Timeout on Hover

Gives users more time to read when they hover over the message:

```typescript
this.flashMessages.info('Your report is being generated. This may take a few minutes.', {
  timeout: 5000,
  extendedTimeout: 10000, // Adds 10s when user hovers
});
```

### onDestroy Callback

Run logic when a message is dismissed:

```typescript
this.flashMessages.warning('Undo delete?', {
  timeout: 8000,
  onDestroy: () => {
    // If the user didn't click undo before the message dismissed,
    // finalize the deletion
    this.finalizeDelete();
  },
});
```

## clearMessages()

Remove all active flash messages. Useful when navigating away or resetting state:

```typescript
this.flashMessages.clearMessages();
```

Clear messages of a specific type:

```typescript
// Clear only danger messages
this.flashMessages.queue
  .filter((msg) => msg.type === 'danger')
  .forEach((msg) => msg.destroyMessage());
```

## Flash Message Queue

The service maintains a `queue` array of active messages. You can inspect it:

```typescript
// Number of active messages
this.flashMessages.queue.length;

// Check if there are any error messages showing
this.flashMessages.queue.some((msg) => msg.type === 'danger');

// Get all messages
this.flashMessages.queue.forEach((msg) => {
  console.log(msg.type, msg.message);
});
```

## Rendering Flash Messages in the Template

Flash messages are rendered by the `{{flash-message}}` component, typically placed once in the application layout template. In A3, this is in the main application template or an authenticated layout:

```gts
import FlashMessage from 'ember-cli-flash/components/flash-message';

<template>
  <div class="flash-messages-container" aria-live="polite" role="status">
    {{#each this.flashMessages.arrangedQueue as |flash|}}
      <FlashMessage @flash={{flash}} as |component flash|>
        <div class="d-flex align-items-center">
          {{#if (eq flash.type 'success')}}
            <Icon @icon="circle-check" @class="me-2" />
          {{else if (eq flash.type 'danger')}}
            <Icon @icon="circle-xmark" @class="me-2" />
          {{else if (eq flash.type 'warning')}}
            <Icon @icon="triangle-exclamation" @class="me-2" />
          {{else}}
            <Icon @icon="circle-info" @class="me-2" />
          {{/if}}
          <span>{{flash.message}}</span>
        </div>
        {{#if flash.showProgress}}
          <div class="flash-progress-bar" style={{component.progressDuration}} />
        {{/if}}
      </FlashMessage>
    {{/each}}
  </div>
</template>
```

### arrangedQueue vs queue

- `queue` is the raw array of messages.
- `arrangedQueue` is the sorted/filtered version respecting priorities and position. Always use `arrangedQueue` in templates.

## Styling Flash Messages

A3 styles flash messages using Bootstrap alert classes mapped to flash types:

```css
/* In A3, flash messages are styled to match the design system */
.flash-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
  animation: slideInRight 0.3s ease-out;
}

.flash-message.success { @extend .alert-success; }
.flash-message.danger  { @extend .alert-danger; }
.flash-message.warning { @extend .alert-warning; }
.flash-message.info    { @extend .alert-info; }

.flash-progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.7);
  transition: width linear;
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

## Configuration

Flash message defaults are configured in `config/environment.js`:

```javascript
// config/environment.js
module.exports = function (environment) {
  const ENV = {
    // ...
    flashMessageDefaults: {
      timeout: 3000,
      extendedTimeout: 0,
      priority: 100,
      sticky: false,
      showProgress: false,
      type: 'info',
      types: ['success', 'info', 'warning', 'danger'],
      injectionFactories: ['route', 'controller', 'component', 'service'],
    },
  };
  return ENV;
};
```

## Common A3 Patterns

### Save Success / Error Pattern

The most common pattern in A3 — used in virtually every form component:

```typescript
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { task } from 'ember-concurrency';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';
import type { IntlService } from 'ember-intl';

export default class ClientFormComponent extends Component {
  @service('flash-messages') declare flashMessages: FlashMessageService;
  @service declare intl: IntlService;

  saveTask = task(async () => {
    const isValid = this.args.model.validate();
    if (!isValid) {
      this.flashMessages.danger(this.intl.t('messages.validationFailed'));
      return;
    }

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

### Delete with Confirmation Feedback

```typescript
deleteTask = task(async () => {
  this.args.model.deleteRecord();
  try {
    await this.args.model.save();
    this.flashMessages.success(this.intl.t('messages.deleted'));
    this.router.transitionTo('authenticated.clients');
  } catch (error) {
    this.args.model.rollbackAttributes();
    this.flashMessages.danger(this.intl.t('messages.deleteFailed'));
  }
}).drop();
```

### Bulk Operation Feedback

```typescript
bulkUpdateTask = task(async () => {
  let successCount = 0;
  let failCount = 0;

  for (const item of this.selectedItems) {
    try {
      item.status = 'active';
      await item.save();
      successCount++;
    } catch {
      failCount++;
    }
  }

  if (failCount === 0) {
    this.flashMessages.success(
      this.intl.t('messages.bulkUpdateSuccess', { count: successCount })
    );
  } else {
    this.flashMessages.warning(
      this.intl.t('messages.bulkUpdatePartial', { success: successCount, fail: failCount })
    );
  }
}).drop();
```

### Copy to Clipboard Feedback

```typescript
copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    this.flashMessages.success(this.intl.t('messages.copiedToClipboard'));
  } catch {
    this.flashMessages.danger(this.intl.t('messages.copyFailed'));
  }
};
```

### Clear Messages on Route Transition

In A3, flash messages are cleared when navigating to a new route to avoid stale messages:

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';

export default class ApplicationRoute extends Route {
  @service('flash-messages') declare flashMessages: FlashMessageService;

  beforeModel() {
    this.router.on('routeWillChange', () => {
      this.flashMessages.clearMessages();
    });
  }
}
```

## i18n Integration with ember-intl

A3 uses ember-intl for all user-facing strings, including flash messages. Translation keys are passed through the `intl.t()` method:

```typescript
// In component
this.flashMessages.success(this.intl.t('messages.saved'));
this.flashMessages.danger(this.intl.t('messages.saveFailed'));
```

```yaml
# translations/en-us.yaml
messages:
  saved: "Changes saved successfully"
  saveFailed: "Failed to save changes. Please try again."
  deleted: "Record deleted successfully"
  deleteFailed: "Failed to delete record. Please try again."
  validationFailed: "Please fix the errors before saving"
  copiedToClipboard: "Copied to clipboard"
  copyFailed: "Failed to copy to clipboard"
  bulkUpdateSuccess: "{count} records updated successfully"
  bulkUpdatePartial: "{success} records updated, {fail} failed"
```

With interpolation:

```typescript
this.flashMessages.success(
  this.intl.t('messages.clientCreated', { name: model.fullName })
);
```

```yaml
messages:
  clientCreated: "Client {name} created successfully"
```

## Accessibility

- The flash message container should have `aria-live="polite"` and `role="status"` so screen readers announce new messages.
- For `danger` messages that require immediate attention, use `aria-live="assertive"`.
- Ensure messages have sufficient color contrast and do not rely solely on color to convey meaning (use icons alongside color).

## Further Investigation

- **ember-cli-flash GitHub**: https://github.com/poteto/ember-cli-flash
- **ember-cli-flash API Docs**: https://github.com/poteto/ember-cli-flash#api
- **WAI-ARIA Live Regions**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
