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
