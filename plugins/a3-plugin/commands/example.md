---
description: Find real examples and established conventions within the A3 codebase — search by feature type, component pattern, or convention question
argument-hint: <what-to-find-or-check>
allowed-tools: Read, Grep, Glob, Bash, Agent
---

# /example Command

Standalone entry point for the example-finder agent. Use this to search the A3 codebase for real examples, verify conventions, or find patterns before writing new code.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Parse the request**: What is the user looking for? (component pattern, route convention, model structure, test approach, function pattern, etc.)
2. **Spawn example-finder agent** with the search query and relevant A3 paths
3. The agent searches the A3 codebase at `~/Desktop/A3` using Glob, Grep, and Read
4. Returns findings with:
   - File paths and line numbers
   - Pattern counts ("X of Y files do it this way")
   - Code snippets from the most relevant examples
   - Recommendation for what convention to follow

## Example Queries

### Component Patterns
```
/example how do badge components work in A3
/example what's the pattern for form editor components
/example how do search-list components handle pagination
/example show me modal usage patterns
```

### Route Patterns
```
/example how do list routes with filtering work
/example what do detail routes with nested sub-routes look like
/example which routes use controllers vs GTS-only templates
/example how does the enrollments route hierarchy work
```

### Model Patterns
```
/example how do models with file attachments work
/example what relationship patterns exist between clients and enrollments
/example how do models with custom adapters work
/example show me models that use the null-timestamp transform
```

### Cloud Function Patterns
```
/example how do Firestore onCreate triggers handle audit trails
/example how do HTTPS endpoints verify auth tokens
/example how does A3 integrate with Stripe in Cloud Functions
/example what's the pattern for Mailgun email sending
```

### Test Patterns
```
/example how do acceptance tests for list pages work
/example how do component integration tests handle async
/example how do ability unit tests mock the current user
/example what data-test selectors are used on enrollment components
```

### Security Patterns
```
/example how are abilities structured for models with owner-scoped permissions
/example how do Firestore rules handle subcollection access
/example how does A3 protect admin-only routes
```

### Convention Checks
```
/example does this component follow A3 conventions [paste code or file path]
/example is it normal to use a controller for this route
/example how many components import ember-concurrency tasks
/example what percentage of routes use GTS templates vs controller+hbs
```

## Output Format

The agent always reports:

1. **What was searched** — directories, file patterns, grep queries
2. **Quantitative findings** — "Found X files matching, Y follow pattern A, Z follow pattern B"
3. **Top examples** — 3-5 most relevant files with code snippets
4. **Convention recommendation** — what new code should do, based on evidence
