# Context Budget Policy

## Defaults
- Start with `rg --files` or `rg -n`.
- Read the smallest file that can answer the question.
- Use `Get-Content -TotalCount` or narrow line windows before full-file reads.
- Avoid re-fingerprinting the repo if `.codex/` already contains the answer.

## Routing
- Repo-wide orientation: `../context/repo/overview.md`
- Plugin authoring rules: `../context/repo/conventions.md`
- Tooling behavior: `../context/tooling/mcp/marketplace-server.md`
- CI expectations: `../context/tooling/ci/workflows.md`
- Jira hook edge cases: `../context/integrations/jira-orchestrator/hooks.md`

## Codex-Specific Practices
- Prefer parallel file reads for discovery.
- In multi-agent mode, keep the lead context small and push narrow subtasks to workers.
- Keep summaries factual and compressed.
- Do not promise MCP, Context7, or team features that are not available in the active Codex environment.
- Use repo source over stale derived docs if they disagree.

## Validation Ladder
1. Static inspection
2. Small targeted command
3. Existing test or validation script
4. Broader test run only if needed

## Expensive Reads To Avoid By Default
- Full recursive dumps of `community/`
- Large generated files
- Long plugin docs when a README or manifest already answers the question
