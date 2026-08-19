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
