## Firestore-Specific Patterns

### Collection References

In Firestore, collections are top-level or subcollections:
- `clients` — top-level collection
- `clients/{id}/notes` — subcollection
- `clients/{id}/files` — subcollection

The ember-cloud-firestore-adapter maps:
- `belongsTo` — document reference field
- `hasMany` — subcollection query OR reference array

### Real-Time Updates

The ember-cloud-firestore-adapter supports real-time listeners:
- Records fetched with `findRecord` can receive live updates
- The store auto-updates when Firestore documents change
- Components re-render automatically via tracked properties
- Listeners are automatically cleaned up when records are unloaded

### Firestore Query Limitations

- **No JOINs** — must load related records separately
- **No OR queries across fields** — use composite indexes or multiple queries
- **Inequality filters** on only one field per query
- **orderBy** requires matching indexes for filtered queries
- **Pagination** via startAfter/limit, not offset (A3's n+1 pattern wraps this)
- **Array membership** — `array-contains` for single value, `array-contains-any` for up to 10 values
- **In queries** — `in` for up to 10 values on a single field

### Index Requirements

Complex queries need composite indexes defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "enrollments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

When a query requires an index that does not exist, Firestore returns an error with a direct link to create the index in the Firebase console.

---
