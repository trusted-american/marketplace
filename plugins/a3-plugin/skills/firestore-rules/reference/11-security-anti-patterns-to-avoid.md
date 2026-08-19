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
