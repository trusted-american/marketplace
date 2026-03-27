---
description: Standalone integration specialist — analyze and fix cross-concern integration issues in A3
argument-hint: <integration-question-or-issue>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /integration Command

Standalone entry point for the integration-specialist. Use this to trace data flows, debug connection issues, or verify cross-concern wiring in A3.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: Integration debugging, verification, or analysis
2. **Trace the full data flow**: From user action through every layer to Firestore and back
3. **Ask clarifying questions**:
   - What feature or flow is having issues?
   - What's the expected behavior vs actual behavior?
   - Which layers are involved? (frontend, backend, third-party)
4. **Spawn integration-specialist agent** with full context
5. **Map all integration points** for the feature:
   - Model ↔ Adapter ↔ Serializer ↔ Firestore
   - Route ↔ Template ↔ Component
   - Ability ↔ Firestore Rules
   - Cloud Function ↔ Frontend
   - Third-party service flows
6. **Identify disconnects** or potential failure points
7. **Deliver**: Present integration map and findings/fixes to user

## Common Integration Issues in A3

- **Reactivity break**: Firestore update happens but component doesn't re-render (adapter listener issue)
- **Permission mismatch**: Ability allows but Firestore rule denies (or vice versa)
- **Type mismatch**: Serializer transforms data differently than model expects
- **Missing trigger**: Firestore document created but no trigger fires (path mismatch)
- **Infinite loop**: Trigger updates a document that triggers another trigger
