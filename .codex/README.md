# .codex

Codex-specific routing and reference docs for `taia-marketplace`.

## Design Goals
- Keep the root `AGENTS.md` short.
- Push detail into small, task-shaped markdown files.
- Optimize for grep-first, targeted reads, and low re-analysis cost.
- Mirror the useful intent of Claude's `/cc-setup` without copying Claude-only assumptions.

## Suggested Read Order
1. `../AGENTS.md`
2. `context/repo/overview.md`
3. One or two task-specific files only

## Tree
```text
.codex/
  agents/
  context/
    integrations/
    repo/
    tooling/
  policies/
```

## Maintenance
- Update these files when repo structure, CI behavior, or plugin conventions change.
- Prefer small factual edits over large prose rewrites.
