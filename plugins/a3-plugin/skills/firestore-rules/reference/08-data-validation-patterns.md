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
