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
