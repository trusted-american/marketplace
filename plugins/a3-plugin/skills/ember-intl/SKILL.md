---
name: ember-intl
description: ember-intl internationalization reference — translation keys, ICU message format, pluralization, date/number formatting, and A3 i18n conventions
version: 0.1.0
---

# ember-intl Reference

## Overview

A3 uses ember-intl v8 for internationalization. All user-facing strings should use translation keys, never hardcoded English text.

## Translation Files

Located in `translations/` directory:
```
translations/
├── en-us.yaml    # English (US) — primary
└── es.yaml       # Spanish (if applicable)
```

### Translation Format (YAML)
```yaml
# translations/en-us.yaml
buttons:
  save: "Save"
  cancel: "Cancel"
  delete: "Delete"
  edit: "Edit"
  create: "Create New"
  search: "Search..."

messages:
  saved: "Record saved successfully"
  deleted: "Record deleted"
  saveFailed: "Failed to save. Please try again."
  confirmDelete: "Are you sure you want to delete this?"

enrollments:
  title: "Enrollments"
  new: "New Enrollment"
  status:
    active: "Active"
    pending: "Pending"
    cancelled: "Cancelled"
  fields:
    planName: "Plan Name"
    carrier: "Carrier"
    effectiveDate: "Effective Date"
    premium: "Monthly Premium"
  empty: "No enrollments found"
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"
```

## Using in Templates

### Basic Translation
```gts
import { t } from 'ember-intl';

<template>
  <h1>{{t "enrollments.title"}}</h1>
  <button>{{t "buttons.save"}}</button>
</template>
```

### With Parameters
```gts
<template>
  {{t "enrollments.count" count=@items.length}}
  {{! Output: "5 enrollments" or "No enrollments" or "1 enrollment" }}
</template>
```

### ICU Message Format
```yaml
# Pluralization
items: "{count, plural, =0 {No items} one {{count} item} other {{count} items}}"

# Select
role: "{role, select, admin {Administrator} agent {Insurance Agent} other {User}}"

# Number formatting
amount: "Premium: {amount, number, ::currency/USD}"

# Date formatting
date: "Created on {date, date, medium}"
```

## Using in JavaScript

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class MyComponent extends Component {
  @service declare intl: IntlService;

  get greeting() {
    return this.intl.t('messages.welcome', { name: this.args.user.name });
  }

  @action
  save() {
    this.flashMessages.success(this.intl.t('messages.saved'));
  }
}
```

## A3 Conventions

1. **Always use `t` helper** for user-facing text — never hardcode strings
2. **Namespace by feature**: `enrollments.title`, `clients.fields.email`
3. **Buttons and messages** are global: `buttons.save`, `messages.saved`
4. **Status labels** under feature: `enrollments.status.active`
5. **Field labels** under feature: `enrollments.fields.planName`
6. **Empty states** under feature: `enrollments.empty`

## Further Investigation

- **ember-intl Docs**: https://ember-intl.github.io/ember-intl/
- **ICU Message Format**: https://unicode-org.github.io/icu/userguide/format_parse/messages/
