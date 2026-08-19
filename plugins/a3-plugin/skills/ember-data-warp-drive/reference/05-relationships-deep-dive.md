## Relationships — Deep Dive

### async vs sync

All A3 relationships are **async** (`async: true`). This means:
- Accessing a relationship returns a `PromiseProxy` (for `belongsTo`) or `PromiseManyArray` (for `hasMany`).
- In templates, async relationships auto-resolve. `{{@enrollment.client.name}}` works seamlessly.
- In JavaScript, you must `await` the relationship: `const client = await enrollment.client;`

Sync relationships (`async: false`) would return the record directly but require it to already be in the store. A3 does not use sync relationships because Firestore data is always loaded asynchronously.

### inverse Mapping

Every relationship can specify an `inverse` — the name of the corresponding relationship on the other model.

```typescript
// enrollment.ts
@belongsTo('client', { async: true, inverse: 'enrollments' })
declare client: AsyncBelongsTo<Client>;

// client.ts
@hasMany('enrollment', { async: true, inverse: 'client' })
declare enrollments: AsyncHasMany<Enrollment>;
```

When `inverse: null`, the relationship is **unidirectional**. The other model has no back-reference:

```typescript
@belongsTo('carrier', { async: true, inverse: null })
declare carrier: AsyncBelongsTo<Carrier>;
// Carrier model has no 'enrollments' relationship pointing back
```

### Polymorphic Relationships

Used when a relationship can point to multiple model types:

```typescript
// comment.ts
@belongsTo('commentable', { async: true, inverse: 'comments', polymorphic: true })
declare commentable: AsyncBelongsTo<Client | Enrollment>;

// client.ts
@hasMany('comment', { async: true, inverse: 'commentable', as: 'commentable' })
declare comments: AsyncHasMany<Comment>;

// enrollment.ts
@hasMany('comment', { async: true, inverse: 'commentable', as: 'commentable' })
declare comments: AsyncHasMany<Comment>;
```

The `polymorphic: true` flag tells Ember Data the relationship stores both a `type` and `id`. The `as` option on the inverse side declares which polymorphic interface the model fulfills.

### Self-Referential Relationships

A model can relate to itself:

```typescript
// category.ts
@belongsTo('category', { async: true, inverse: 'children' })
declare parent: AsyncBelongsTo<Category>;

@hasMany('category', { async: true, inverse: 'parent' })
declare children: AsyncHasMany<Category>;
```

### Relationship Links vs Sideloading

- **Sideloading**: Related records are included in the same API response. The serializer extracts and pushes them into the store automatically. Common with REST/JSON:API adapters.
- **Links**: The relationship payload contains a URL. Ember Data fetches that URL when the relationship is accessed. Less common in A3's Firestore adapter.
- **A3 pattern**: Firestore relationships use document references. The adapter resolves them by performing separate `getDoc()` calls.

### BelongsToReference API

Access the reference object for fine-grained control:

```typescript
const reference = record.belongsTo('client');
```

| Method | Return | Description |
|--------|--------|-------------|
| `reference.id()` | `string \| null` | The ID of the related record without loading it |
| `reference.value()` | `Model \| null` | The cached record, or `null` if not loaded |
| `reference.load()` | `Promise<Model>` | Fetches the related record (equivalent to `await record.client`) |
| `reference.reload()` | `Promise<Model>` | Forces a fresh fetch of the related record |
| `reference.meta()` | `object \| null` | Metadata from the relationship payload |
| `reference.link()` | `string \| null` | The link URL if provided |

```typescript
// Check if the relationship is loaded without triggering a fetch
const clientRef = enrollment.belongsTo('client');
if (clientRef.value()) {
  // Already in cache
  const client = clientRef.value();
} else {
  // Need to load
  const client = await clientRef.load();
}

// Get the ID without loading the full record
const clientId = enrollment.belongsTo('client').id();
```

### HasManyReference API

```typescript
const reference = record.hasMany('files');
```

| Method | Return | Description |
|--------|--------|-------------|
| `reference.ids()` | `string[]` | Array of IDs of related records |
| `reference.value()` | `Model[] \| null` | Cached records, or `null` if the relationship has never been loaded |
| `reference.load()` | `Promise<ManyArray>` | Fetches the related records |
| `reference.reload()` | `Promise<ManyArray>` | Forces a fresh fetch |
| `reference.meta()` | `object \| null` | Metadata from the relationship payload |
| `reference.links()` | `object \| null` | Links object if provided |

```typescript
const filesRef = enrollment.hasMany('files');
const fileIds = filesRef.ids(); // ['file_abc', 'file_def']

if (filesRef.value()) {
  // Already loaded
} else {
  const files = await filesRef.load();
}
```

---
