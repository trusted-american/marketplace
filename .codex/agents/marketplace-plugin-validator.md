# Marketplace Plugin Validator

## Use When
- Reviewing a plugin before commit or PR
- Diagnosing CI failures
- Auditing whether a plugin matches marketplace rules

## Checks
- Required files exist
- `plugin.json` name is kebab-case
- Component directories are correctly placed and typed
- README matches the actual plugin contents
- Hook validation is treated separately when hooks matter

## Validation Order
1. Static file layout and manifest review
2. Marketplace MCP validation or equivalent local logic
3. CI workflow comparison when behavior differs
4. Targeted hook/schema review for hook-bearing plugins

## Known Trap
- `validate_all` is not authoritative for nested community plugins such as `community/claude/plugins/jira-orchestrator`
