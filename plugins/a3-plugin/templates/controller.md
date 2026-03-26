---
name: controller
description: Template for generating Ember controllers — ONLY use when query params or complex page-level state is needed (controllers are becoming deprecated)
---

# Controller Template (Use Sparingly)

**WARNING**: Controllers are becoming deprecated in Ember.js. Only create a controller when:
- Query parameters are needed for URL-driven filtering/searching/pagination
- Complex page-level state cannot reasonably live in a component

If neither applies, use a GTS route template instead.

## Controller File (app/controllers/{{routePath}}.ts)

```typescript
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class {{ControllerName}}Controller extends Controller {
  queryParams = [{{#each queryParams}}'{{name}}'{{#unless @last}}, {{/unless}}{{/each}}];

  {{#each queryParams}}
  @tracked {{name}}: {{type}} = {{defaultValue}};
  {{/each}}

  {{#each computedGetters}}
  get {{name}}(): {{returnType}} {
    {{body}}
  }
  {{/each}}

  {{#each actions}}
  @action
  {{name}}({{params}}) {
    {{body}}
  }
  {{/each}}
}
```

## Common Use Cases

### Search + Filter + Pagination
```typescript
export default class EnrollmentsController extends Controller {
  queryParams = ['search', 'status', 'page'];

  @tracked search = '';
  @tracked status = 'all';
  @tracked page = 1;

  @action
  updateSearch(value: string) {
    this.search = value;
    this.page = 1; // Reset to page 1 on new search
  }

  @action
  updateStatus(value: string) {
    this.status = value;
    this.page = 1;
  }

  @action
  nextPage() {
    this.page = this.page + 1;
  }
}
```
