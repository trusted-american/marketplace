---
description: Standalone ability & security specialist — create ember-can abilities and Firestore rules for A3
argument-hint: <ability-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /ability Command

Standalone entry point for the ability-writer specialist. Use this for permission and security rule tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New permissions, modify existing, or security advice
2. **Read existing abilities**: Check `app/abilities/` for patterns
3. **Read firestore.rules**: Understand current rule structure
4. **Ask clarifying questions**:
   - What model/collection needs permissions?
   - Who can create/read/update/delete? (admin, authenticated, owner, specific role)
   - Are there ownership-based permissions?
   - Does this affect storage rules too? (file uploads)
5. **Spawn ability-writer agent** with full context
6. **CRITICAL**: Always write BOTH the ability file AND Firestore rules together
7. **Self-review**: Cross-check every ability getter against every rule
8. **Deliver**: Present ability file + rule changes to user

## Security Warning

**NEVER** write frontend abilities without corresponding Firestore rules. This creates security gaps where the API can be exploited even if the UI hides the action.
