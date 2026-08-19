## Logging Best Practices

### Structured Logging (JSON)

Cloud Functions running on Cloud Run support structured logging via JSON.

```typescript
// Simple structured log (appears in Cloud Logging with proper severity)
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'Enrollment processed successfully',
  enrollmentId: 'enr_abc',
  agencyId: 'agency_xyz',
  duration: 1234,
}));

// Using console methods maps to severity levels:
console.log('...');    // DEFAULT severity
console.info('...');   // INFO severity
console.warn('...');   // WARNING severity
console.error('...');  // ERROR severity
console.debug('...');  // DEBUG severity
```

### Severity Levels

| Method | Severity | When to Use |
|--------|----------|-------------|
| `console.debug()` | DEBUG | Verbose debugging info, disabled in production |
| `console.log()` | DEFAULT | General information |
| `console.info()` | INFO | Noteworthy events (function started, completed) |
| `console.warn()` | WARNING | Potential issues, deprecated usage, slow queries |
| `console.error()` | ERROR | Errors that need attention |

### A3 Logging Pattern

```typescript
// Consistent structured logging across all functions
interface LogEntry {
  message: string;
  functionName: string;
  eventId?: string;
  documentPath?: string;
  userId?: string;
  agencyId?: string;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: any;
}

function logInfo(entry: LogEntry) {
  console.info(JSON.stringify({ severity: 'INFO', ...entry }));
}

function logError(entry: LogEntry) {
  console.error(JSON.stringify({ severity: 'ERROR', ...entry }));
}

// Usage in functions
export const onEnrollmentCreated = onDocumentCreated(
  'enrollments/{enrollmentId}',
  async (event) => {
    const startTime = Date.now();
    const enrollmentId = event.params.enrollmentId;

    logInfo({
      message: 'Processing new enrollment',
      functionName: 'onEnrollmentCreated',
      eventId: event.id,
      documentPath: `enrollments/${enrollmentId}`,
      enrollmentId,
    });

    try {
      await processEnrollment(event.data?.data());

      logInfo({
        message: 'Enrollment processed successfully',
        functionName: 'onEnrollmentCreated',
        enrollmentId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logError({
        message: 'Failed to process enrollment',
        functionName: 'onEnrollmentCreated',
        enrollmentId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
);
```

### Cloud Logging Queries

```
# Find all errors for a specific function
resource.type="cloud_run_revision"
severity>=ERROR
jsonPayload.functionName="onEnrollmentCreated"

# Find slow functions (over 5 seconds)
resource.type="cloud_run_revision"
jsonPayload.duration>5000

# Find by enrollment ID
resource.type="cloud_run_revision"
jsonPayload.enrollmentId="enr_abc"
```

---
