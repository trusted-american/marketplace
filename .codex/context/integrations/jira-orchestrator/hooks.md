# Jira Orchestrator Hook Notes

## Scope
Primary files:
- `community/claude/plugins/jira-orchestrator/hooks/hooks.json`
- `community/claude/schemas/hooks.schema.json`
- `community/claude/docs/LESSONS_LEARNED.md`

## Current Findings
- The old "missing `hooks` wrapper" failure is documented as a cached-plugin issue from 2025-01-19, not a current source-file issue
- The current source hook file already has `$schema`, `version`, `plugin`, and `hooks`
- The source file defines 8 hooks, while the README summary still says 6
- Two hooks use `severity: "blocking"`, but the canonical schema only allows `advisory`, `warn`, or `block`

## Handler Reality
- Referenced hook scripts exist under `community/claude/plugins/jira-orchestrator/hooks/scripts`
- One handler appends an argument (`pr-size-guard.sh main`), so path checks must separate the executable from args

## Validation Gaps
- `tools/marketplace-mcp` `validate_all` does not meaningfully validate this plugin because it does not recurse into `community/claude/plugins/*`
- Even if it did, the MCP validator only checks that `hooks/` contains `.json` files, not that hook payloads satisfy the canonical schema

## Working Rule
- For jira-orchestrator hook debugging, inspect the source hook file and schema directly
- Use CI plus targeted local validation, not `validate_all`, as the source of truth
