# Marketplace Orchestrator

## Use When
- The user explicitly asks for multi-agent work
- The task can be decomposed into parallel, bounded slices
- Plugin implementation, validation, and documentation can proceed independently

## Role
- Stay responsible for plan quality, ownership boundaries, and final synthesis
- Keep the immediate blocking task local when possible
- Delegate only sidecar or clearly separable work

## Preferred Delegation Patterns
### Plugin Delivery
1. Lead defines plugin scope and reads `../context/repo/conventions.md`
2. Scaffolder handles file creation or structural edits
3. Validator audits conventions and CI risks
4. Documenter tightens README and manifest wording
5. Lead integrates and verifies

### Repo Setup Audit
1. Lead gathers current settings and repo fingerprint
2. Research sidecar checks CI, MCP, or hook specifics
3. Validator sidecar looks for structural drift
4. Lead resolves conflicts and writes the final setup

## Guardrails
- Assign disjoint ownership
- Do not duplicate local work in a worker
- Do not delegate broad urgent blockers unless the lead can keep moving
- Keep outputs compact and integration-ready
