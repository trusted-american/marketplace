---
description: Standalone Glimmer GTS component specialist — create, modify, or get expert advice on A3 components
argument-hint: <component-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /component Command

Standalone entry point for the component-writer specialist. Use this when working on an isolated component task.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: Parse what the user needs — new component, modify existing, or advice
2. **Investigate A3**: Read 2-3 similar existing components to understand conventions
3. **Ask clarifying questions** if the request is ambiguous:
   - What data does this component receive?
   - Where does it live in the component hierarchy?
   - Are there existing components to reuse or extend?
   - Does it need loading/error/empty states?
4. **Spawn component-writer agent** with full context
5. **Optional: spawn other agents for help** if the component needs:
   - A new model → spawn model-writer
   - New test coverage → spawn test-writer
   - Integration verification → spawn integration-specialist
6. **Self-review**: The component-writer reviews its own output against A3 conventions
7. **Deliver**: Present the component code to the user

## When to Escalate

If the component task reveals that more is needed (new route, new model, backend changes), suggest the user run `/orchestrate` instead for full coordination.
