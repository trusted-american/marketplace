# Community Plugins

## Ownership Model
- `community/claude` is a git submodule
- Treat upstream content as externally managed unless the user explicitly asks for community-plugin changes

## Important Consequences
- Repo-wide tooling and CI do not behave exactly the same for first-party and community content
- Small local fixes may still be valid, but broader refactors inside `community/claude` should be deliberate
- Submodule updates happen through `.github/workflows/sync-submodules.yml`

## High-Signal Community Areas
- `community/claude/plugins/claude-code-expert`: the Claude setup plugin that inspired this Codex layout
- `community/claude/plugins/jira-orchestrator`: large plugin with hook and integration complexity

## Caution
- `tools/marketplace-mcp` does not fully recurse into `community/*/plugins/*` during `validate_all`
- CI has better coverage for nested community plugins than the MCP validator does
