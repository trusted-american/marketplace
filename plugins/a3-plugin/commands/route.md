---
description: Standalone route specialist — create routes, GTS templates, and controllers (when needed) for A3
argument-hint: <route-description-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /route Command

Standalone entry point for the route-writer specialist. Use this for isolated route tasks.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: New route, modify existing, or routing advice
2. **Read router.ts**: Understand the current route map
3. **Investigate A3**: Read 2-3 similar routes for pattern matching
4. **Ask clarifying questions**:
   - What route path? Where in the hierarchy? (admin, authenticated, public)
   - What data does the route load?
   - Does it need query params? (if so, controller is justified)
   - What components will the template render?
5. **Spawn route-writer agent** with full context
6. **CRITICAL**: Default to GTS route template. Only create a controller if query params or complex state is truly needed. Investigate similar routes first.
7. **Self-review**: Check route against A3 conventions
8. **Deliver**: Present route, template, and controller (if any) to user

## When to Escalate

If the route needs new models, components, or backend support, suggest `/orchestrate`.
