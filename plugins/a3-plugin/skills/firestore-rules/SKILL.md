---
name: firestore-rules
description: Firestore security rules reference — rule syntax, helper functions, A3's permission model, and common patterns for collection-level access control
version: 0.2.0
---


# Firestore Security Rules Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/03-match-statements-exhaustive-reference.md` | Match Statements — Exhaustive Reference |
| `reference/05-request-object-exhaustive-reference.md` | Request Object — Exhaustive Reference |
| `reference/07-built-in-functions-complete-reference.md` | Built-In Functions — Complete Reference |
| `reference/08-data-validation-patterns.md` | Data Validation Patterns |
| `reference/11-security-anti-patterns-to-avoid.md` | Security Anti-Patterns to Avoid |
| `reference/12-testing-rules-with-emulator.md` | Testing Rules with Emulator |
| `reference/13-a3-s-complete-helper-function-library.md` | A3's Complete Helper Function Library |
| `reference/14-rules-for-every-collection-type-in-a3.md` | Rules for Every Collection Type in A3 |
| `reference/15-performance-considerations.md` | Performance Considerations |

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
## Further Investigation

- **Firestore Rules Docs**: https://firebase.google.com/docs/firestore/security/get-started
- **Rules Language Reference**: https://firebase.google.com/docs/firestore/security/rules-conditions
- **Rules Unit Testing**: https://firebase.google.com/docs/firestore/security/test-rules-emulator
- **Security Rules Cookbook**: https://firebase.google.com/docs/firestore/security/rules-query
- **Custom Claims**: https://firebase.google.com/docs/auth/admin/custom-claims
- **Batch Write Rules**: https://firebase.google.com/docs/firestore/security/rules-conditions#batch_writes
