## Request Object — Exhaustive Reference

The `request` object is available in every rule condition and contains everything about the incoming operation.

### request.auth — Authentication Context

```
request.auth                     // null if unauthenticated (anonymous request)
request.auth.uid                 // Firebase Auth UID (string): "abc123xyz"
request.auth.token               // JWT token claims (map)

// Standard token claims:
request.auth.token.email              // "user@example.com"
request.auth.token.email_verified     // true/false
request.auth.token.phone_number       // "+15555555555" (if phone auth)
request.auth.token.name               // Display name
request.auth.token.sub                // Subject (same as auth.uid)
request.auth.token.aud                // Audience (Firebase project ID)
request.auth.token.iss                // Issuer
request.auth.token.iat                // Issued at (timestamp)
request.auth.token.exp                // Expiration (timestamp)
request.auth.token.auth_time          // Time of authentication (timestamp)
request.auth.token.firebase.sign_in_provider  // "password", "google.com", "phone", etc.
request.auth.token.firebase.identities        // Map of identity providers

// Custom claims (set via Firebase Admin SDK):
request.auth.token.admin              // Custom boolean claim
request.auth.token.role               // Custom string claim
request.auth.token.organizationId     // Custom string claim
// Custom claims are set in Cloud Functions:
// admin.auth().setCustomUserClaims(uid, { admin: true, role: 'superadmin' })
```

### request.resource — Incoming Data

```
request.resource                 // The document as it WILL exist after the write
                                 // Available on create, update
                                 // NOT available on read, delete

request.resource.data            // Map of all fields in the incoming document
                                 // For UPDATE: contains the MERGED document (existing + changes)
                                 // For CREATE: contains only the incoming fields

request.resource.data.fieldName  // Access a specific field

// Type checking:
request.resource.data.name is string       // true if field is a string
request.resource.data.count is int         // true if field is an integer
request.resource.data.amount is float      // true if field is a float
request.resource.data.active is bool       // true if field is a boolean
request.resource.data.tags is list         // true if field is an array
request.resource.data.meta is map          // true if field is a map/object
request.resource.data.ref is path          // true if field is a document reference
request.resource.data.when is timestamp    // true if field is a timestamp
request.resource.data.loc is latlng        // true if field is a geo point
request.resource.data.raw is bytes         // true if field is bytes
```

### request.method — Operation Type

```
request.method     // One of: 'get', 'list', 'create', 'update', 'delete'

// Useful for combining rules:
allow read: if request.method == 'get' || isAuthenticated();
// This allows unauthenticated single-doc reads but requires auth for queries
```

### request.path — Document Path

```
request.path       // Full path of the document being accessed
                   // Type: path
                   // Example: /databases/(default)/documents/clients/client_abc

// Can be compared to constructed paths:
request.path == /databases/$(database)/documents/users/$(request.auth.uid)
```

### request.time — Request Timestamp

```
request.time       // Timestamp of when the request was received by Firestore
                   // Type: timestamp

// Useful for time-based rules:
allow create: if request.time < timestamp.date(2025, 12, 31);
allow update: if request.time - resource.data.createdAt < duration.value(24, 'h');
```

### request.query — Query Constraints (list operations only)

```
request.query          // Available only when request.method == 'list'

request.query.limit    // Maximum documents requested (int or null)
request.query.offset   // Offset value (int or null)
request.query.orderBy  // Order-by field (string or null)

// Enforce query limits to prevent expensive scans:
allow list: if request.query.limit != null && request.query.limit <= 100;
```

---
