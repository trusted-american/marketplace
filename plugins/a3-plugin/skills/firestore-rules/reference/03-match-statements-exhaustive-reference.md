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
