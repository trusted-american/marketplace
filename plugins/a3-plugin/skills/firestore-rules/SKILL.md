---
name: firestore-rules
description: Firestore security rules reference — rule syntax, helper functions, A3's permission model, and common patterns for collection-level access control
version: 0.2.0
---

# Firestore Security Rules Reference

## Overview

Firestore security rules control who can read/write documents. In A3, the rules file (`firestore.rules`) is ~101KB covering all collections. Rules are deployed with `firebase deploy --only firestore:rules`. Every read and write operation that flows through `ember-cloud-firestore-adapter` is evaluated against these rules server-side.

**Rules version**: `rules_version = '2';` (required for collection group queries and recursive wildcards)

---

## Rule Structure

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions defined here (available to all rules below)
    function isAuthenticated() { ... }
    function isAdmin() { ... }

    // Collection-level rules
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || isOwner(resource);
      allow delete: if isSuper();

      // Subcollection rules
      match /notes/{noteId} {
        allow read, write: if isAuthenticated();
      }
    }
  }
}
```

---

## Match Statements — Exhaustive Reference

### Specific Document Match

```
match /clients/{clientId} {
  // clientId is a wildcard variable bound to the document ID
  // Only matches documents directly in the 'clients' collection
  // Does NOT match subcollection documents (clients/abc/notes/def)
}
```

### Subcollection Match

```
match /clients/{clientId}/notes/{noteId} {
  // Matches documents in the 'notes' subcollection
  // Both clientId and noteId are available as variables
  // You can use clientId to reference the parent document
}
```

### Recursive Wildcard Match

```
match /clients/{clientId}/{document=**} {
  // Matches ALL documents in ALL subcollections under clients/{clientId}
  // Includes: clients/abc/notes/def, clients/abc/files/ghi, etc.
  // {document=**} captures the entire remaining path
  // Use sparingly — overly broad rules are a security risk
}
```

### Collection Group Match

```
match /{path=**}/notes/{noteId} {
  // Matches 'notes' documents regardless of their parent path
  // Enables collection group queries across all 'notes' subcollections
  // Required when using collectionGroup('notes') in the SDK
}
```

### Nested Match Statements

```
match /agencies/{agencyId} {
  allow read: if isAuthenticated();

  match /members/{memberId} {
    // Rules here can reference agencyId from the parent match
    allow read: if isAuthenticated();
    allow write: if isAgencyAdmin(agencyId);
  }

  match /settings/{settingId} {
    allow read: if isAgencyMember(agencyId);
    allow write: if isAgencyAdmin(agencyId);
  }
}
```

---

## Operations — Complete Reference

### Read Operations

```
allow read;    // Shorthand for get + list

allow get;     // Single document reads: getDoc(), findRecord()
               // Applies when client requests a specific document by path

allow list;    // Collection queries: getDocs(), query(), findAll()
               // Applies when client queries a collection with filters/ordering
               // IMPORTANT: 'get' and 'list' are evaluated independently.
               // A user can have 'get' access but NOT 'list' access, meaning
               // they can read a document by ID but cannot query the collection.
```

### Write Operations

```
allow write;    // Shorthand for create + update + delete

allow create;   // New document creation: setDoc() on non-existent doc, createRecord()
                // request.resource.data contains the incoming data
                // resource is null (document does not exist yet)

allow update;   // Modify existing document: updateDoc(), record.save() on existing
                // request.resource.data contains the COMPLETE document after merge
                // resource.data contains the CURRENT document data before change

allow delete;   // Remove document: deleteDoc(), record.deleteRecord() + save()
                // request.resource is null (no incoming data)
                // resource.data contains the document being deleted
```

---

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

## Resource Object — Exhaustive Reference

The `resource` object represents the CURRENT state of the document in the database.

```
resource                   // null for create operations (document doesn't exist yet)
                           // Available for get, list, update, delete

resource.data              // Map of all current field values
resource.data.fieldName    // Access a specific field value

resource.id                // Document ID (string): "client_abc"
                           // Same as the wildcard variable in the match statement

resource.__name__          // Full document path (path type)
                           // Example: /databases/(default)/documents/clients/client_abc
```

---

## Built-In Functions — Complete Reference

### get() — Read Another Document

```
get(/databases/$(database)/documents/users/$(request.auth.uid))

// Returns a Resource object for the specified document path
// Returns null if the document does not exist
// Each get() call counts as 1 read toward billing
// LIMIT: Maximum 10 get() calls per rule evaluation (across all rules in the chain)

// Usage pattern — check user role from their profile document:
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

// Cache with let to avoid multiple get() calls:
function isAdminOrManager() {
  let userData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
  return userData.role == 'admin' || userData.role == 'manager';
}
```

### exists() — Check Document Existence

```
exists(/databases/$(database)/documents/users/$(request.auth.uid))

// Returns true if the document exists, false otherwise
// Counts as 1 read toward billing (same as get)
// More efficient than get() when you only need to check existence

// Example: ensure a user profile exists before allowing actions
allow create: if exists(/databases/$(database)/documents/users/$(request.auth.uid));
```

### getAfter() — Read Document After Batch/Transaction Write

```
getAfter(/databases/$(database)/documents/clients/$(clientId))

// Returns the document as it WILL exist after all writes in the current
// batch or transaction are applied. Used to validate cross-document
// consistency in atomic operations.
//
// Only works within batch writes and transactions.
// Returns the projected state, not the current state.

// Example: ensure a counter is updated consistently
allow update: if
  getAfter(/databases/$(database)/documents/counters/clientCount).data.count ==
  get(/databases/$(database)/documents/counters/clientCount).data.count + 1;
```

### existsAfter() — Check Existence After Batch/Transaction Write

```
existsAfter(/databases/$(database)/documents/clients/$(clientId))

// Returns true if the document will exist after the batch/transaction completes
// Used to validate that dependent documents are created together

// Example: ensure related documents are created atomically
allow create: if existsAfter(/databases/$(database)/documents/client-notes/$(noteId));
```

### math Functions

```
math.abs(x)        // Absolute value: math.abs(-5) == 5
math.ceil(x)       // Ceiling: math.ceil(1.2) == 2
math.floor(x)      // Floor: math.floor(1.8) == 1
math.round(x)      // Round: math.round(1.5) == 2
math.isInfinite(x) // Check infinity: math.isInfinite(1.0/0.0) == true
math.isNaN(x)      // Check NaN: math.isNaN(0.0/0.0) == true
```

### string Functions

```
// String operations available on string values:
"hello".size()                    // Length: 5
"hello".matches('hel.*')          // Regex match: true
"HELLO".lower()                   // Lowercase: "hello"
"hello".upper()                   // Uppercase: "HELLO"
"hello world".split(' ')          // Split: ["hello", "world"]
"hello".trim()                    // Trim whitespace
"hello world".replace('world', 'there')  // Replace: "hello there"

// Common validation patterns:
request.resource.data.email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
request.resource.data.phone.matches('^\\+?[0-9]{10,15}$')
request.resource.data.zipCode.matches('^[0-9]{5}(-[0-9]{4})?$')
request.resource.data.ssn.matches('^[0-9]{3}-[0-9]{2}-[0-9]{4}$')
```

### list Functions

```
// List/array operations:
['a', 'b', 'c'].size()           // Length: 3
['a', 'b', 'c'].hasAll(['a','b'])  // Contains all: true
['a', 'b', 'c'].hasAny(['a','z'])  // Contains any: true
['a', 'b', 'c'].hasOnly(['a','b','c','d'])  // Only contains from set: true
['a', 'b', 'c'][0]               // Index access: 'a'
['a', 'b'] + ['c']               // Concatenation: ['a', 'b', 'c']
'a' in ['a', 'b', 'c']           // Membership: true

// Validate that a list field contains only allowed values:
request.resource.data.tags.hasOnly(['vip', 'priority', 'enterprise', 'standard'])

// Validate list length:
request.resource.data.items.size() <= 50
request.resource.data.items.size() > 0
```

### map Functions

```
// Map/object operations:
{'a': 1, 'b': 2}.keys()          // Keys list: ['a', 'b']
{'a': 1, 'b': 2}.values()        // Values list: [1, 2]
{'a': 1, 'b': 2}.size()          // Number of entries: 2
'a' in {'a': 1, 'b': 2}          // Key membership: true

// Validate allowed fields (prevent extra fields):
request.resource.data.keys().hasOnly([
  'firstName', 'lastName', 'email', 'status', 'createdBy', 'modifiedBy',
  'createdAt', 'modifiedAt', 'agency'
])

// Validate required fields:
request.resource.data.keys().hasAll(['firstName', 'lastName', 'email'])

// Get with default:
request.resource.data.get('optionalField', 'defaultValue')
```

### timestamp Functions

```
// Timestamp construction:
timestamp.date(2025, 1, 1)       // January 1, 2025 at 00:00:00 UTC
timestamp.value(1704067200)      // From Unix epoch seconds

// Timestamp operations on timestamp fields:
resource.data.createdAt.toMillis()       // Milliseconds since epoch
resource.data.createdAt.date()           // Date component
resource.data.createdAt.year()           // Year: 2025
resource.data.createdAt.month()          // Month: 1-12
resource.data.createdAt.day()            // Day: 1-31
resource.data.createdAt.hours()          // Hour: 0-23
resource.data.createdAt.minutes()        // Minute: 0-59
resource.data.createdAt.seconds()        // Second: 0-59
resource.data.createdAt.nanos()          // Nanoseconds

// Timestamp comparison:
request.time > timestamp.date(2025, 1, 1)
resource.data.expiresAt < request.time
```

### duration Functions

```
// Duration construction:
duration.value(30, 'd')          // 30 days
duration.value(24, 'h')          // 24 hours
duration.value(60, 'm')          // 60 minutes
duration.value(30, 's')          // 30 seconds
duration.value(1000, 'ms')       // 1000 milliseconds
duration.value(1000000, 'ns')    // 1000000 nanoseconds

// Duration arithmetic with timestamps:
request.time - resource.data.createdAt < duration.value(24, 'h')
// "Document was created less than 24 hours ago"

resource.data.expiresAt > request.time + duration.value(7, 'd')
// "Document expires more than 7 days from now"
```

### latlng Functions

```
// GeoPoint construction:
latlng.value(37.7749, -122.4194)   // San Francisco

// GeoPoint operations:
resource.data.location.latitude()   // Latitude value
resource.data.location.longitude()  // Longitude value

// Distance calculation:
latlng.value(37.7749, -122.4194).distance(latlng.value(34.0522, -118.2437))
// Returns distance in meters between two points
```

### path Functions

```
// Path construction:
path('/databases/' + database + '/documents/users/' + request.auth.uid)

// Path from string:
/databases/$(database)/documents/users/$(request.auth.uid)

// Path comparison:
resource.__name__ == /databases/$(database)/documents/clients/$(clientId)
```

---

## Data Validation Patterns

### Field Existence Validation

```
// Required fields on create:
allow create: if
  request.resource.data.keys().hasAll(['firstName', 'lastName', 'email', 'status']) &&
  request.resource.data.firstName != '' &&
  request.resource.data.lastName != '';

// Prevent additional unexpected fields:
allow create: if
  request.resource.data.keys().hasOnly([
    'firstName', 'lastName', 'email', 'phone', 'status',
    'agency', 'createdBy', 'modifiedBy', 'createdAt', 'modifiedAt'
  ]);
```

### Type Checking

```
allow create: if
  request.resource.data.firstName is string &&
  request.resource.data.age is int &&
  request.resource.data.premium is float &&
  request.resource.data.isActive is bool &&
  request.resource.data.tags is list &&
  request.resource.data.metadata is map &&
  request.resource.data.agency is path &&
  request.resource.data.createdAt is timestamp;
```

### Value Range Validation

```
allow create: if
  request.resource.data.age >= 0 &&
  request.resource.data.age <= 150 &&
  request.resource.data.premium >= 0 &&
  request.resource.data.premium <= 100000 &&
  request.resource.data.firstName.size() >= 1 &&
  request.resource.data.firstName.size() <= 100 &&
  request.resource.data.tags.size() <= 20;
```

### String Pattern Validation

```
allow create: if
  // Email format
  request.resource.data.email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$') &&
  // Phone format (US)
  request.resource.data.phone.matches('^\\+1[0-9]{10}$') &&
  // Status enum
  request.resource.data.status in ['active', 'inactive', 'pending', 'cancelled'] &&
  // No HTML/script injection
  !request.resource.data.firstName.matches('.*<script.*');
```

### Immutable Fields (Cannot Change After Creation)

```
// Ensure specific fields cannot be modified after initial creation:
allow update: if
  request.resource.data.createdBy == resource.data.createdBy &&
  request.resource.data.createdAt == resource.data.createdAt &&
  request.resource.data.id == resource.data.id;

// Alternative: check that only allowed fields changed
allow update: if
  request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    'firstName', 'lastName', 'email', 'phone', 'status', 'modifiedBy', 'modifiedAt'
  ]);
```

### Cross-Document Validation

```
// Ensure the referenced agency exists before allowing enrollment creation:
allow create: if
  exists(/databases/$(database)/documents/agencies/$(request.resource.data.agencyId));

// Ensure the user is a member of the agency they're writing to:
allow create: if
  exists(/databases/$(database)/documents/agencies/$(request.resource.data.agencyId)/members/$(request.auth.uid));
```

---

## Rate Limiting Patterns

```
// Time-based write limiting:
// Prevent updates more frequently than once per minute
allow update: if
  request.time - resource.data.modifiedAt > duration.value(1, 'm');

// Prevent creation more frequently than once per second per user
// (requires a "last-action" document per user)
allow create: if
  !exists(/databases/$(database)/documents/rate-limits/$(request.auth.uid)) ||
  request.time - get(/databases/$(database)/documents/rate-limits/$(request.auth.uid)).data.lastCreate > duration.value(1, 's');

// Query limit enforcement to prevent expensive scans:
allow list: if
  request.query.limit != null &&
  request.query.limit <= 100;
```

---

## Batch/Transaction Rule Evaluation

When a client sends a batch write or transaction, each document operation in the batch is evaluated independently against the rules. All operations must pass for the batch to succeed.

```
// Batch write with 3 operations:
// 1. Create /clients/client_abc       → evaluated against /clients/{clientId} create rules
// 2. Update /counters/clientCount     → evaluated against /counters/{counterId} update rules
// 3. Create /activities/activity_xyz  → evaluated against /activities/{activityId} create rules
// ALL THREE must pass, or the entire batch is rejected.

// getAfter() is useful here — validate state AFTER all batch operations:
match /counters/{counterId} {
  allow update: if
    getAfter(/databases/$(database)/documents/counters/$(counterId)).data.count ==
    get(/databases/$(database)/documents/counters/$(counterId)).data.count + 1;
}
```

**Transaction-specific behavior:**
- Transactions are retried up to 5 times if there's a contention conflict
- Rules are re-evaluated on each retry
- `getAfter()` reflects the projected state after ALL writes in the transaction
- `exists()` and `get()` reflect the state BEFORE the transaction (pre-transaction reads)

---

## Security Anti-Patterns to Avoid

### 1. Overly Permissive Rules

```
// DANGEROUS — never do this in production:
match /{document=**} {
  allow read, write: if true;
}

// DANGEROUS — allows any authenticated user full access:
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

### 2. Client-Controlled Admin Flag

```
// DANGEROUS — users can set their own admin flag:
allow write: if request.resource.data.isAdmin == true;

// SAFE — check admin status from a separate, protected document:
allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
```

### 3. Missing Validation on Create

```
// DANGEROUS — allows any data shape:
allow create: if request.auth != null;

// SAFE — validate required fields and types:
allow create: if
  request.auth != null &&
  request.resource.data.keys().hasAll(['name', 'status']) &&
  request.resource.data.name is string &&
  request.resource.data.name.size() > 0 &&
  request.resource.data.status in ['active', 'pending'];
```

### 4. Forgetting list vs get Distinction

```
// DANGEROUS — allows unrestricted collection scans:
allow read: if isAuthenticated();

// SAFER — restrict list queries:
allow get: if isAuthenticated();
allow list: if isAuthenticated() && request.query.limit <= 100;
```

### 5. Recursive Wildcard Without Constraints

```
// DANGEROUS — applies to ALL current and future subcollections:
match /clients/{clientId}/{document=**} {
  allow read, write: if isAuthenticated();
}

// SAFE — explicitly match each subcollection:
match /clients/{clientId}/notes/{noteId} { ... }
match /clients/{clientId}/files/{fileId} { ... }
```

### 6. Not Protecting createdBy Field

```
// DANGEROUS — users can claim they are someone else:
allow create: if request.auth != null;

// SAFE — enforce createdBy matches the authenticated user:
allow create: if
  request.auth != null &&
  request.resource.data.createdBy == request.auth.uid;
```

---

## Testing Rules with Emulator

### Starting the Emulator

```bash
# Start Firestore emulator only
firebase emulators:start --only firestore

# Start with rules file specified
firebase emulators:start --only firestore --rules=firestore.rules

# The emulator provides:
# - Rules evaluation with detailed error messages
# - Request/response logging
# - Rules coverage reports
# - Hot-reloading of rules file changes
```

### Unit Testing with @firebase/rules-unit-testing

```typescript
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'a3-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

// Test authenticated read
test('authenticated user can read clients', async () => {
  const db = testEnv.authenticatedContext('user_abc').firestore();
  await assertSucceeds(getDoc(doc(db, 'clients', 'client_123')));
});

// Test unauthenticated read is blocked
test('unauthenticated user cannot read clients', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'clients', 'client_123')));
});

// Test admin-only write
test('non-admin cannot create client', async () => {
  // Seed the user document WITHOUT admin flag
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'user_abc'), {
      isAdmin: false,
      permissions: [],
    });
  });

  const db = testEnv.authenticatedContext('user_abc').firestore();
  await assertFails(setDoc(doc(db, 'clients', 'client_new'), {
    firstName: 'John',
    lastName: 'Doe',
    createdBy: 'user_abc',
  }));
});

// Test admin CAN create client
test('admin can create client', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'user_admin'), {
      isAdmin: true,
      permissions: ['clients.create'],
    });
  });

  const db = testEnv.authenticatedContext('user_admin').firestore();
  await assertSucceeds(setDoc(doc(db, 'clients', 'client_new'), {
    firstName: 'John',
    lastName: 'Doe',
    createdBy: 'user_admin',
  }));
});
```

### Rules Coverage Report

```bash
# After running tests, access the coverage report:
# http://localhost:8080/emulator/v1/projects/a3-test:ruleCoverage.html
#
# The report shows:
# - Which rules were evaluated (green)
# - Which rules were never evaluated (yellow = not tested)
# - Which rules blocked access (red)
# - Percentage of rule coverage
```

---

## A3's Complete Helper Function Library

A3 defines reusable functions at the top of `firestore.rules`. These functions encapsulate common permission checks and are used throughout all collection rules.

```
// ──────────────────────────────────────────────────
// Authentication
// ──────────────────────────────────────────────────

function isAuthenticated() {
  return request.auth != null;
}

// ──────────────────────────────────────────────────
// Role-Based Access
// ──────────────────────────────────────────────────

function getUserDoc() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid));
}

function isAdmin() {
  return isAuthenticated() &&
    getUserDoc().data.isAdmin == true;
}

function isSuper() {
  return isAuthenticated() &&
    getUserDoc().data.isSuper == true;
}

function isAdminOrSuper() {
  return isAdmin() || isSuper();
}

// ──────────────────────────────────────────────────
// Ownership
// ──────────────────────────────────────────────────

function isOwner(res) {
  return isAuthenticated() &&
    res.data.createdBy == request.auth.uid;
}

function isCreator() {
  return isAuthenticated() &&
    request.resource.data.createdBy == request.auth.uid;
}

// ──────────────────────────────────────────────────
// Permission-Based Access
// ──────────────────────────────────────────────────

function hasPermission(permission) {
  return isAuthenticated() &&
    permission in getUserDoc().data.permissions;
}

function hasAnyPermission(permissions) {
  return isAuthenticated() &&
    getUserDoc().data.permissions.hasAny(permissions);
}

// ──────────────────────────────────────────────────
// Agency-Scoped Access
// ──────────────────────────────────────────────────

function isAgencyMember(agencyId) {
  return isAuthenticated() &&
    exists(/databases/$(database)/documents/agencies/$(agencyId)/members/$(request.auth.uid));
}

function isAgencyAdmin(agencyId) {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/agencies/$(agencyId)/members/$(request.auth.uid)).data.role == 'admin';
}

// ──────────────────────────────────────────────────
// Data Validation Helpers
// ──────────────────────────────────────────────────

function hasRequiredFields(fields) {
  return request.resource.data.keys().hasAll(fields);
}

function onlyAllowedFields(fields) {
  return request.resource.data.keys().hasOnly(fields);
}

function fieldDidNotChange(field) {
  return request.resource.data[field] == resource.data[field];
}

function isValidEmail(email) {
  return email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
}

function isValidStatus(status, allowed) {
  return status in allowed;
}
```

---

## Rules for Every Collection Type in A3

### Core Entity: Clients

```
match /clients/{clientId} {
  // Anyone authenticated can read client records
  allow get: if isAuthenticated();
  allow list: if isAuthenticated() && request.query.limit <= 100;

  // Create: admin, super, or users with clients.create permission
  allow create: if
    (isAdminOrSuper() || hasPermission('clients.create')) &&
    hasRequiredFields(['firstName', 'lastName', 'createdBy']) &&
    isCreator();

  // Update: admin, owner, or users with clients.update permission
  allow update: if
    (isAdminOrSuper() || isOwner(resource) || hasPermission('clients.update')) &&
    fieldDidNotChange('createdBy') &&
    fieldDidNotChange('createdAt');

  // Delete: super admin only
  allow delete: if isSuper();

  // Subcollections
  match /notes/{noteId} {
    allow read: if isAuthenticated();
    allow create: if isAuthenticated() && isCreator();
    allow update: if isAuthenticated() && isOwner(resource);
    allow delete: if isAdminOrSuper() || isOwner(resource);
  }

  match /files/{fileId} {
    allow read: if isAuthenticated();
    allow create: if isAuthenticated() && isCreator();
    allow update: if isAuthenticated() && isOwner(resource);
    allow delete: if isAdminOrSuper() || isOwner(resource);
  }
}
```

### Core Entity: Enrollments

```
match /enrollments/{enrollmentId} {
  allow get: if isAuthenticated();
  allow list: if isAuthenticated() && request.query.limit <= 100;

  allow create: if
    (isAdminOrSuper() || hasPermission('enrollments.create')) &&
    hasRequiredFields(['clientId', 'agencyId', 'status', 'createdBy']) &&
    isCreator() &&
    isValidStatus(request.resource.data.status, ['draft', 'pending', 'active']);

  allow update: if
    (isAdminOrSuper() || isOwner(resource) || hasPermission('enrollments.update')) &&
    fieldDidNotChange('createdBy') &&
    fieldDidNotChange('createdAt') &&
    fieldDidNotChange('clientId');

  allow delete: if isSuper();

  match /notes/{noteId} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }

  match /files/{fileId} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }
}
```

### Core Entity: Agencies

```
match /agencies/{agencyId} {
  allow read: if isAuthenticated();

  allow create: if isAdminOrSuper();
  allow update: if isAdminOrSuper() || isAgencyAdmin(agencyId);
  allow delete: if isSuper();

  match /members/{memberId} {
    allow read: if isAuthenticated();
    allow create: if isAdminOrSuper() || isAgencyAdmin(agencyId);
    allow update: if isAdminOrSuper() || isAgencyAdmin(agencyId);
    allow delete: if isAdminOrSuper();
  }
}
```

### Admin-Only: Settings

```
match /settings/{settingId} {
  allow read: if isAuthenticated();
  allow write: if isAdminOrSuper();
}
```

### User-Scoped: User Preferences

```
match /user-preferences/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}
```

### User Documents

```
match /users/{userId} {
  // Any authenticated user can read any user document (for directory/lookup)
  allow get: if isAuthenticated();
  allow list: if isAuthenticated() && request.query.limit <= 100;

  // Users can update their OWN document (limited fields)
  allow update: if
    request.auth.uid == userId &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'displayName', 'phone', 'avatar', 'modifiedAt'
    ]);

  // Only admins can create or delete users, or change sensitive fields
  allow create: if isAdminOrSuper();
  allow delete: if isSuper();
}
```

### Financial: Statements and Transactions

```
match /statements/{statementId} {
  allow read: if isAuthenticated() && (
    isAdminOrSuper() ||
    hasPermission('statements.read') ||
    resource.data.agentId == request.auth.uid
  );
  allow create: if isAdminOrSuper();
  allow update: if isAdminOrSuper();
  allow delete: if isSuper();
}

match /transactions/{transactionId} {
  allow read: if isAuthenticated() && (
    isAdminOrSuper() || hasPermission('transactions.read')
  );
  allow write: if isAdminOrSuper();
}
```

### Public Read: Resources

```
match /public-resources/{resourceId} {
  allow read: if true;   // No auth required
  allow write: if isAdminOrSuper();
}
```

### Activities (Audit Trail)

```
match /activities/{activityId} {
  // Read: any authenticated user (audit trail is visible)
  allow read: if isAuthenticated();

  // Create: system only (created by Cloud Functions, not client-side)
  // In practice, Cloud Functions use Admin SDK which bypasses rules,
  // but if a client tries to create activities, it should be blocked.
  allow create: if false;  // Activities are created server-side only
  allow update: if false;  // Activities are immutable
  allow delete: if isSuper();  // Only super can clean up
}
```

---

## Performance Considerations

### get() Call Budget

- Maximum **10 get() calls per rule evaluation** (across all rules in the evaluation chain)
- Each `get()` and `exists()` counts as 1 read for billing
- Cache results in `let` variables when the same document is needed multiple times
- Failing to stay within the 10-call limit results in a permission denied error

```
// BAD — 3 separate get() calls for the same document:
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
function getRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}
function getPermissions() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions;
}

// GOOD — single get() with cached result:
function getUserDoc() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid));
}
function isAdmin() {
  return getUserDoc().data.isAdmin == true;
}
// NOTE: Firestore rules MAY cache get() calls within a single evaluation,
// but it is best practice to structure rules to minimize calls.
```

### Rule Evaluation Performance

- Rules are evaluated on EVERY read and write — keep them efficient
- Avoid complex regex patterns in frequently-evaluated rules
- Use `exists()` instead of `get()` when you only need to check existence
- Short-circuit with `&&` — put cheap checks (like `isAuthenticated()`) first

```
// GOOD — cheap check first, expensive get() only if needed:
allow create: if isAuthenticated() && isAdmin();
// isAuthenticated() is a simple null check (free)
// isAdmin() calls get() (1 read) — only runs if auth check passes
```

---

## Further Investigation

- **Firestore Rules Docs**: https://firebase.google.com/docs/firestore/security/get-started
- **Rules Language Reference**: https://firebase.google.com/docs/firestore/security/rules-conditions
- **Rules Unit Testing**: https://firebase.google.com/docs/firestore/security/test-rules-emulator
- **Security Rules Cookbook**: https://firebase.google.com/docs/firestore/security/rules-query
- **Custom Claims**: https://firebase.google.com/docs/auth/admin/custom-claims
- **Batch Write Rules**: https://firebase.google.com/docs/firestore/security/rules-conditions#batch_writes
