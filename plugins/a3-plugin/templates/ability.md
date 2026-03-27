---
name: ability
description: Template for generating ember-can ability files and corresponding Firestore security rules
---

# Ability + Firestore Rules Template

## Ability File (app/abilities/{{modelName}}.ts)

```typescript
import BaseAbility from './-ability';

export default class {{ClassName}}Ability extends BaseAbility {
  get canCreate(): boolean {
    return this.isAdmin || this.hasPermission('{{modelName}}.create');
  }

  get canRead(): boolean {
    return this.isAuthenticated;
  }

  get canUpdate(): boolean {
    if (this.isAdmin) return true;
    if (this.hasPermission('{{modelName}}.update')) return true;
    {{#if ownerScoped}}
    if (this.model && this.model.createdBy === this.currentUser.user?.id) return true;
    {{/if}}
    return false;
  }

  get canDelete(): boolean {
    return this.isSuper;
  }

  {{#each customPermissions}}
  get {{name}}(): boolean {
    {{body}}
  }
  {{/each}}
}
```

## Firestore Rules Addition (append to firestore.rules)

```
match /{{collection}}/{docId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin() || hasPermission('{{modelName}}.create');
  allow update: if isAdmin() || hasPermission('{{modelName}}.update'){{#if ownerScoped}} || isOwner(resource){{/if}};
  allow delete: if isSuper();

  {{#if hasNotes}}
  match /notes/{noteId} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }
  {{/if}}

  {{#if hasFiles}}
  match /files/{fileId} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }
  {{/if}}
}
```

## Variables

- `{{modelName}}` — kebab-case model name (e.g., "enrollment")
- `{{ClassName}}` — PascalCase class name (e.g., "Enrollment")
- `{{collection}}` — Firestore collection name (usually same as modelName pluralized)
- `{{ownerScoped}}` — boolean, whether owner can edit their own records
