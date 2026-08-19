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
