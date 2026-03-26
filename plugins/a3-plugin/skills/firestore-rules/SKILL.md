---
name: firestore-rules
description: Firestore security rules reference — rule syntax, helper functions, A3's permission model, and common patterns for collection-level access control
version: 0.1.0
---

# Firestore Security Rules Reference

## Overview

Firestore security rules control who can read/write documents. In A3, the rules file (`firestore.rules`) is ~101KB covering all collections. Rules are deployed with `firebase deploy --only firestore:rules`.

## Rule Syntax

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Rules go here

  }
}
```

### Match Statements
```
// Specific document
match /clients/{clientId} {
  // Rules for a single client document
}

// Subcollection
match /clients/{clientId}/notes/{noteId} {
  // Rules for notes subcollection
}

// Wildcard (all subcollections)
match /clients/{clientId}/{document=**} {
  // Rules for all documents under a client
}
```

### Operations
```
allow read;                    // get + list
allow write;                   // create + update + delete
allow get;                     // Single document read
allow list;                    // Collection query
allow create;                  // New document
allow update;                  // Existing document modification
allow delete;                  // Document deletion
```

### Conditions
```
allow read: if request.auth != null;           // Authenticated
allow write: if request.auth.uid == 'admin';   // Specific user
allow create: if request.resource.data.name != ''; // Validate data
allow update: if resource.data.createdBy == request.auth.uid; // Owner only
```

## A3 Helper Functions

A3 defines reusable functions in the rules file:

```
function isAuthenticated() {
  return request.auth != null;
}

function isAdmin() {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}

function isSuper() {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSuper == true;
}

function isOwner(res) {
  return isAuthenticated() &&
    res.data.createdBy == request.auth.uid;
}

function hasPermission(permission) {
  return isAuthenticated() &&
    permission in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions;
}
```

## Common A3 Rule Patterns

### Standard Collection (Admin CRUD, Auth Read)
```
match /clients/{clientId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin() || hasPermission('clients.create');
  allow update: if isAdmin() || isOwner(resource) || hasPermission('clients.update');
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

### Admin-Only Collection
```
match /settings/{settingId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

### Owner-Scoped Collection
```
match /user-preferences/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}
```

### Public Read, Auth Write
```
match /public-resources/{resourceId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

## Data Validation in Rules

```
match /clients/{clientId} {
  allow create: if
    isAuthenticated() &&
    request.resource.data.keys().hasAll(['firstName', 'lastName', 'email']) &&
    request.resource.data.firstName is string &&
    request.resource.data.email.matches('.*@.*\\..*') &&
    request.resource.data.status in ['active', 'inactive', 'pending'];

  allow update: if
    isAuthenticated() &&
    // Cannot change createdBy
    request.resource.data.createdBy == resource.data.createdBy;
}
```

## Rule Evaluation

### Request Object
```
request.auth            // Auth context (null if unauthenticated)
request.auth.uid        // User ID
request.auth.token      // JWT claims (email, emailVerified, etc.)
request.resource.data   // Data being written (for create/update)
request.method          // 'get', 'list', 'create', 'update', 'delete'
request.time            // Request timestamp
```

### Resource Object
```
resource.data           // Current document data (for read/update/delete)
resource.id             // Document ID
resource.__name__       // Full document path
```

### Functions Available
```
get()                   // Read another document
exists()                // Check if document exists
getAfter()              // Read document after batch write
existsAfter()           // Check existence after batch write
```

## Performance Considerations

- `get()` calls count toward billing and have a limit of 10 per rule evaluation
- Cache `get()` results by assigning to a `let` variable
- Avoid deep nesting of `get()` calls
- Rules are evaluated on every read/write — keep them efficient

## Testing Rules

Firebase Emulator validates rules locally:
```bash
firebase emulators:start --only firestore
```

Rules can be tested with the `@firebase/rules-unit-testing` package.

## Further Investigation

- **Firestore Rules Docs**: https://firebase.google.com/docs/firestore/security/get-started
- **Rules Reference**: https://firebase.google.com/docs/firestore/security/rules-conditions
- **Rules Unit Testing**: https://firebase.google.com/docs/firestore/security/test-rules-emulator
