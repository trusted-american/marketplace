## Record Operations — Complete Reference

### save

```typescript
save(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Persists the record. Behavior depends on state:
- **isNew** — calls adapter's `createRecord()`
- **hasDirtyAttributes** — calls adapter's `updateRecord()`
- **isDeleted** — calls adapter's `deleteRecord()`

```typescript
await record.save();
// or with adapter options
await record.save({ adapterOptions: { merge: true } });
```

### destroyRecord

```typescript
destroyRecord(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Shorthand for `deleteRecord()` + `save()` + `unloadRecord()`. This is the preferred way to fully delete and clean up a record.

```typescript
await record.destroyRecord();
// Record is deleted on server AND removed from the store's identity map
```

### deleteRecord

```typescript
deleteRecord(): void
```

Marks the record for deletion. Does **not** persist until `save()` is called. You can undo this with `rollbackAttributes()`.

```typescript
record.deleteRecord();
// record.isDeleted === true
// Not yet persisted — can still rollback

await record.save();
// Now persisted to Firestore
```

### rollbackAttributes

```typescript
rollbackAttributes(): void
```

Reverts all dirty attributes to their last-known server state. Also cancels a pending deletion or undoes `createRecord` (removes the record from the store if it was never saved).

```typescript
record.firstName = 'Changed';
// record.hasDirtyAttributes === true

record.rollbackAttributes();
// record.firstName === 'OriginalValue'
// record.hasDirtyAttributes === false

// Also undoes deleteRecord:
record.deleteRecord();
record.rollbackAttributes();
// record.isDeleted === false
```

### reload

```typescript
reload(options?: { adapterOptions?: Record<string, unknown> }): Promise<Model>
```

Re-fetches the record from the server. The record's `isReloading` flag is `true` during the request.

```typescript
const freshRecord = await record.reload();
```

### changedAttributes

```typescript
changedAttributes(): Record<string, [unknown, unknown]>
```

Returns a hash of attributes that have changed. Each key maps to a tuple of `[oldValue, newValue]`.

```typescript
record.firstName = 'Jane';
record.changedAttributes();
// { firstName: ['John', 'Jane'] }
```

### eachAttribute

```typescript
eachAttribute(callback: (name: string, meta: { type: string; options: object }) => void): void
```

Iterates over every attribute defined on the model. Useful for building dynamic forms or serialization logic.

```typescript
record.eachAttribute((name, meta) => {
  console.log(name, meta.type); // e.g., 'firstName', 'string'
});
```

### eachRelationship

```typescript
eachRelationship(
  callback: (name: string, descriptor: { kind: 'belongsTo' | 'hasMany'; type: string; options: object }) => void
): void
```

Iterates over every relationship defined on the model.

```typescript
record.eachRelationship((name, descriptor) => {
  console.log(name, descriptor.kind, descriptor.type);
  // e.g., 'client', 'belongsTo', 'client'
  // e.g., 'files', 'hasMany', 'enrollment-file'
});
```

### serialize

```typescript
serialize(options?: { includeId?: boolean }): Record<string, unknown>
```

Serializes the record using its serializer. Returns a plain object suitable for sending to an API.

```typescript
const payload = record.serialize();
const payloadWithId = record.serialize({ includeId: true });
```

### toJSON (Deprecated)

```typescript
toJSON(): Record<string, unknown>
```

Legacy method. Prefer `serialize()`.

---
