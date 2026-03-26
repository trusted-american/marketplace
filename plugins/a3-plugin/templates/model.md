---
name: model
description: Template for generating Ember Data models with A3 base model inheritance and Firestore-compatible attributes
---

# Ember Data Model Template

```typescript
// app/models/{{modelName}}.ts
import { attr, belongsTo, hasMany } from '@ember-data/model';
import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';
import BaseModel from './base';
{{#each relationshipImports}}
import type {{TypeName}} from './{{fileName}}';
{{/each}}

export default class {{ClassName}} extends BaseModel {
  // Attributes
  {{#each stringAttrs}}
  @attr('string') declare {{name}}: string;
  {{/each}}
  {{#each numberAttrs}}
  @attr('number') declare {{name}}: number;
  {{/each}}
  {{#each booleanAttrs}}
  @attr('boolean') declare {{name}}: boolean;
  {{/each}}
  {{#each dateAttrs}}
  @attr('date') declare {{name}}: Date;
  {{/each}}
  {{#each nullableDateAttrs}}
  @attr('null-timestamp') declare {{name}}: Date | null;
  {{/each}}

  // Relationships
  {{#each belongsToRelations}}
  @belongsTo('{{modelName}}', { async: true, inverse: {{inverse}} })
  declare {{name}}: AsyncBelongsTo<{{TypeName}}>;
  {{/each}}
  {{#each hasManyRelations}}
  @hasMany('{{modelName}}', { async: true, inverse: '{{inverse}}' })
  declare {{name}}: AsyncHasMany<{{TypeName}}>;
  {{/each}}

  // Computed getters
  {{#each getters}}
  get {{name}}(): {{returnType}} {
    {{body}}
  }
  {{/each}}
}
```

## Companion File Model ({{modelName}}-file.ts)

```typescript
import { attr, belongsTo } from '@ember-data/model';
import type { AsyncBelongsTo } from '@ember-data/model';
import BaseModel from './base';
import type {{ParentClassName}} from './{{parentModelName}}';

export default class {{ClassName}}File extends BaseModel {
  @attr('string') declare name: string;
  @attr('string') declare url: string;
  @attr('string') declare type: string;
  @attr('number') declare size: number;

  @belongsTo('{{parentModelName}}', { async: true, inverse: 'files' })
  declare {{parentName}}: AsyncBelongsTo<{{ParentClassName}}>;
}
```

## Companion Note Model ({{modelName}}-note.ts)

```typescript
import { attr, belongsTo } from '@ember-data/model';
import type { AsyncBelongsTo } from '@ember-data/model';
import BaseModel from './base';
import type {{ParentClassName}} from './{{parentModelName}}';

export default class {{ClassName}}Note extends BaseModel {
  @attr('string') declare body: string;

  @belongsTo('{{parentModelName}}', { async: true, inverse: 'notes' })
  declare {{parentName}}: AsyncBelongsTo<{{ParentClassName}}>;
}
```
