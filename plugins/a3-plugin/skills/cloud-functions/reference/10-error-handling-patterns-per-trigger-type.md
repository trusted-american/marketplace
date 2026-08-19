## Error Handling Patterns Per Trigger Type

### Firestore Triggers — Throw to Retry (if retry enabled)

```typescript
export const onEnrollmentCreated = onDocumentCreated(
  { document: 'enrollments/{enrollmentId}', retry: true },
  async (event) => {
    try {
      await syncToAlgolia(event.data?.data());
      await sendConfirmationEmail(event.data?.data());
    } catch (error) {
      // Log error with context
      console.error('Failed to process enrollment creation', {
        enrollmentId: event.params.enrollmentId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Sentry reporting
      Sentry.captureException(error, {
        extra: { enrollmentId: event.params.enrollmentId },
      });

      // Throw to trigger retry (only if retry is enabled)
      throw error;
    }
  }
);
```

### HTTPS Functions — Return HTTP Status Codes

```typescript
export const apiEndpoint = onRequest(async (req, res) => {
  try {
    const result = await processRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    } else if (error instanceof AuthError) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    } else {
      console.error('Unhandled error:', error);
      Sentry.captureException(error);
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
    }
  }
});
```

### Callable Functions — Throw HttpsError

```typescript
export const myCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  try {
    return await processData(request.data);
  } catch (error) {
    if (error instanceof HttpsError) throw error; // Re-throw HttpsError as-is

    console.error('Callable function error:', error);
    Sentry.captureException(error);
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
});
```

### PubSub — Throw to NACK (retry), Return to ACK

```typescript
export const processQueue = onMessagePublished(
  { topic: 'my-queue', retry: true },
  async (event) => {
    const data = event.data.message.json;

    try {
      await processMessage(data);
      // Returning successfully = message is acknowledged
    } catch (error) {
      if (isTransientError(error)) {
        throw error; // NACK — message will be redelivered
      } else {
        // Permanent failure — log and acknowledge to prevent infinite retries
        console.error('Permanent failure, dropping message:', error);
        Sentry.captureException(error, { extra: { messageData: data } });
        // Return normally to ACK the message
      }
    }
  }
);
```

### Scheduled Functions — Throw to Mark as Failed

```typescript
export const dailyReport = onSchedule(
  { schedule: 'every day 08:00', retryCount: 3 },
  async () => {
    try {
      await generateDailyReport();
    } catch (error) {
      console.error('Daily report generation failed:', error);
      Sentry.captureException(error);

      // Send alert notification
      await sendSlackAlert(`Daily report failed: ${error}`);

      throw error; // Will retry up to retryCount times
    }
  }
);
```

---
