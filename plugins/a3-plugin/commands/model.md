---
description: Standalone model specialist — create Ember Data models, adapters, serializers, and Firestore document schemas for A3
argument-hint: <model-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /model Command

Standalone entry point for the model-writer specialist. Use this for data layer tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New model, modify existing, or data layer advice
2. **Read base.ts**: Understand the base model pattern
3. **Investigate A3**: Read 2-3 similar models for conventions
4. **Ask clarifying questions**:
   - What Firestore collection name?
   - What fields and types?
   - What relationships to existing models?
   - Does it need -file and -note sub-models?
   - Does it need a custom adapter (Cloud Function data source)?
   - Does it need a custom serializer?
5. **Spawn model-writer agent** with full context
6. **Self-review**: Verify Firestore document structure is sensible
7. **Deliver**: Present model, adapter (if needed), serializer (if needed)

## When to Escalate

If the model needs Firestore rules, Cloud Function triggers, or new routes, suggest `/orchestrate`.
