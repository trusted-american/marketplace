## 7. Common A3 Patterns

### 7.1 Flash Messages with Intl

Always use translated strings for flash messages:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';

export default class EnrollmentController extends Controller {
  @service declare intl: IntlService;
  @service declare flashMessages: FlashMessageService;

  @action
  async save() {
    try {
      await this.model.save();
      this.flashMessages.success(this.intl.t('messages.saved'));
    } catch (error) {
      this.flashMessages.danger(this.intl.t('messages.saveFailed'));
    }
  }

  @action
  async delete() {
    await this.model.destroyRecord();
    this.flashMessages.success(this.intl.t('messages.deleted'));
  }
}
```

### 7.2 Form Labels

```gts
import { t } from 'ember-intl';

<template>
  <FormInput @label={{t "clients.fields.firstName"}} @value={{@model.firstName}} />
  <FormInput @label={{t "clients.fields.lastName"}} @value={{@model.lastName}} />
  <FormInput @label={{t "clients.fields.email"}} @value={{@model.email}} type="email" />
  <FormInput @label={{t "clients.fields.phone"}} @value={{@model.phone}} type="tel" />
  <FormInput @label={{t "enrollments.fields.effectiveDate"}} @value={{@model.effectiveDate}} type="date" />
</template>
```

### 7.3 Status Badges with Dynamic Key Construction

```gts
import { t } from 'ember-intl';
import { concat } from '@ember/helper';

<template>
  {{! Dynamic translation key based on status value }}
  <StatusBadge @label={{t (concat "enrollments.status." @status)}} @status={{@status}} />

  {{! This resolves to t("enrollments.status.active"), t("enrollments.status.pending"), etc. }}
</template>
```

In JavaScript:
```typescript
get statusLabel() {
  return this.intl.t(`enrollments.status.${this.args.status}`);
}
```

### 7.4 Page Titles

```gts
import { t } from 'ember-intl';
import pageTitle from 'ember-page-title/helpers/page-title';

<template>
  {{pageTitle (t "enrollments.title")}}

  <h1>{{t "enrollments.title"}}</h1>
</template>
```

### 7.5 Pluralized Counts

```gts
import { t } from 'ember-intl';

<template>
  <div class="results-header">
    {{t "enrollments.count" count=@items.length}}
    {{! With 0 items:  "No enrollments" }}
    {{! With 1 item:   "1 enrollment" }}
    {{! With 5 items:  "5 enrollments" }}
  </div>
</template>
```

Translation:
```yaml
enrollments:
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"
```

### 7.6 Currency Display

```gts
import { formatNumber } from 'ember-intl';

<template>
  {{! Monthly premium }}
  <span class="premium">
    {{format-number @premium style="currency" currency="USD"}}
  </span>
  {{! Output: $1,234.56 }}

  {{! Annual premium }}
  <span class="annual">
    {{format-number @annualPremium style="currency" currency="USD" minimumFractionDigits=0 maximumFractionDigits=0}}
  </span>
  {{! Output: $14,815 }}
</template>
```

### 7.7 Date Display

```gts
<template>
  {{! Effective date }}
  <span>{{format-date @effectiveDate dateStyle="medium"}}</span>
  {{! Output: Mar 26, 2026 }}

  {{! Created at with time }}
  <span>{{format-date @createdAt dateStyle="medium" timeStyle="short"}}</span>
  {{! Output: Mar 26, 2026, 3:30 PM }}

  {{! Short date for tables }}
  <td>{{format-date @date dateStyle="short"}}</td>
  {{! Output: 3/26/26 }}
</template>
```

### 7.8 Relative Time

```gts
<template>
  {{! Days until expiration }}
  {{format-relative @daysUntilExpiry unit="day"}}
  {{! Output: "in 30 days" or "3 days ago" }}

  {{! Last updated }}
  {{format-relative @daysSinceUpdate unit="day" numeric="auto"}}
  {{! Output: "yesterday" or "3 days ago" }}

  {{! Recently modified }}
  {{format-relative @hoursSinceModified unit="hour" numeric="auto"}}
  {{! Output: "2 hours ago" }}
</template>
```

---
