## Retry Behavior for Background Functions

Event-driven functions (Firestore, PubSub, Storage, Auth, Scheduled) can be configured to retry on failure.

### How Retries Work

```typescript
// Enable retry
export const retriableFunction = onDocumentCreated(
  {
    document: 'enrollments/{enrollmentId}',
    retry: true, // Enable retry
  },
  async (event) => {
    // If this function throws, it will be retried

    // Check if this is a retry using event age
    const eventAge = Date.now() - Date.parse(event.time);
    const MAX_EVENT_AGE_MS = 10 * 60 * 1000; // 10 minutes

    if (eventAge > MAX_EVENT_AGE_MS) {
      console.warn(`Dropping stale event for ${event.params.enrollmentId}`);
      return; // Don't process stale events
    }

    try {
      await riskyOperation();
    } catch (error) {
      console.error('Operation failed, will retry:', error);
      throw error; // Throw to trigger retry
    }
  }
);
```

### Retry behavior details:
- **Firestore triggers**: Retried for up to 7 days with exponential backoff (10s, 20s, 40s, ... up to 600s)
- **PubSub triggers**: Retried with exponential backoff until acknowledged (up to 7 days)
- **Storage triggers**: Retried for up to 7 days
- **Scheduled functions**: Configurable retryCount (default 0)
- **HTTPS functions**: NOT retried (client is responsible for retry)
- **Callable functions**: NOT retried (client is responsible for retry)

### Idempotency is critical:

```typescript
// BAD: Creates duplicates on retry
await db.collection('notifications').add({ message: 'New enrollment' });

// GOOD: Deterministic ID prevents duplicates
await db.doc(`notifications/${enrollmentId}_created`).set(
  { message: 'New enrollment', createdAt: Timestamp.now() },
  { merge: true }
);

// GOOD: Use event.id for deduplication
const eventId = event.id;
const lockRef = db.doc(`_locks/${eventId}`);
const lock = await lockRef.get();
if (lock.exists) {
  console.log('Event already processed, skipping');
  return;
}
await lockRef.set({ processedAt: Timestamp.now() });
// ... process event
```

---
