---
name: route-template
description: Template for generating Ember route files and GTS route templates following A3 conventions
---

# Route + GTS Template

## Route File (app/routes/{{routePath}}.ts)

```typescript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type StoreService from 'a3/services/store';

export default class {{RouteName}}Route extends Route {
  @service declare store: StoreService;

  async model({{#if hasParams}}params: { {{paramTypes}} }{{/if}}) {
    {{#if isList}}
    return this.store.query('{{modelName}}', {
      filter: { {{filters}} },
      page: { limit: 25, offset: 0 },
    });
    {{else}}
    return this.store.findRecord('{{modelName}}', params.id);
    {{/if}}
  }
}
```

## GTS Route Template (app/templates/{{routePath}}.gts)

```gts
import type {{RouteName}}Route from 'a3/routes/{{routePath}}';
import type { ModelFrom } from '@warp-drive/core';
import { pageTitle } from 'ember-page-title';
import { t } from 'ember-intl';
{{#each componentImports}}
import {{ComponentName}} from 'a3/components/{{componentPath}}';
{{/each}}

export type Model = ModelFrom<{{RouteName}}Route>;

<template>
  {{pageTitle (t "{{translationKey}}.title")}}

  <div class="container-fluid py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h3 mb-0">{{t "{{translationKey}}.title"}}</h1>
      {{! Action buttons here }}
    </div>

    {{! Main content - render components with @model }}
  </div>
</template>
```

## Variables

- `{{routePath}}` — File path (e.g., "authenticated/enrollments")
- `{{RouteName}}` — PascalCase route name (e.g., "AuthenticatedEnrollments")
- `{{modelName}}` — Ember Data model name (e.g., "enrollment")
- `{{translationKey}}` — i18n namespace (e.g., "enrollments")
