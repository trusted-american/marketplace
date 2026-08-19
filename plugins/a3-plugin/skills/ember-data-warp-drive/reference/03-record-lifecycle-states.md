## Record Lifecycle States

Every Ember Data record has internal state flags. Understanding them is critical for building UIs that respond to data flow.

### State Flags

| Flag | Type | Description |
|------|------|-------------|
| `isNew` | `boolean` | `true` for records created via `createRecord()` that have not yet been saved. Becomes `false` after the first successful `save()`. |
| `hasDirtyAttributes` | `boolean` | `true` when any attribute has been changed since the last successful save or load. Does NOT track relationship changes. |
| `isDeleted` | `boolean` | `true` after `deleteRecord()` is called. The record is marked for deletion but not yet persisted. After `save()`, it remains `true`. |
| `isSaving` | `boolean` | `true` while a `save()` or `destroyRecord()` is in-flight. Goes back to `false` when the promise resolves or rejects. |
| `isValid` | `boolean` | `true` by default. Becomes `false` when the adapter returns validation errors (an `InvalidError`). |
| `isLoaded` | `boolean` | `true` once the record has been fully loaded from the server or pushed into the store. |
| `isEmpty` | `boolean` | `true` for records that exist in the identity map but have no data loaded yet (placeholder state). |
| `isError` | `boolean` | `true` when the last adapter operation (find, save, etc.) failed. |
| `isReloading` | `boolean` | `true` while a `reload()` is in progress. |
| `adapterError` | `AdapterError \| null` | The error object from the last failed adapter operation. `null` when no error. |

### State Transitions

```
[empty] --findRecord()--> [loading] --success--> [loaded.saved]
                                    --failure--> [error]

[loaded.saved] --set attribute--> [loaded.updated.uncommitted]
               --deleteRecord()--> [deleted.uncommitted]
               --reload()--> [loaded.saved] (isReloading: true)

[loaded.updated.uncommitted] --save()--> [loaded.updated.inFlight] (isSaving: true)
                             --rollbackAttributes()--> [loaded.saved]

[loaded.updated.inFlight] --success--> [loaded.saved]
                          --failure--> [loaded.updated.uncommitted] (isError: true)

[deleted.uncommitted] --save()--> [deleted.inFlight] (isSaving: true)
                      --rollbackAttributes()--> [loaded.saved] (undeletes!)

[deleted.inFlight] --success--> [deleted.saved]
                   --failure--> [deleted.uncommitted] (isError: true)

createRecord() --> [loaded.created.uncommitted] (isNew: true)
  --save()--> [loaded.created.inFlight] (isSaving: true)
  --success--> [loaded.saved] (isNew: false)
  --failure--> [loaded.created.uncommitted] (isError: true)
```

### Using State in Templates

```handlebars
{{#if @record.isSaving}}
  <Spinner />
{{/if}}

{{#if @record.hasDirtyAttributes}}
  <button {{on "click" this.save}}>Save Changes</button>
  <button {{on "click" this.rollback}}>Discard</button>
{{/if}}

{{#if @record.isError}}
  <ErrorBanner @error={{@record.adapterError}} />
{{/if}}

{{#if @record.isNew}}
  <span class="badge">New</span>
{{/if}}
```

---
