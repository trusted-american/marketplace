# Codex Routing

Use this repository to build, validate, document, and publish Claude Code marketplace plugins.

## Fast Start
- Install MCP server deps: `npm ci --prefix tools/marketplace-mcp`
- Test MCP server: `npm test --prefix tools/marketplace-mcp`
- Regenerate registry: `node tools/generate-marketplace-json.js`
- Core source docs: `README.md`, this file, `.codex/README.md`

## Read Only What You Need
- Repo map: `.codex/context/repo/overview.md`
- Plugin structure and manifest rules: `.codex/context/repo/conventions.md`
- First-party plugin snapshots: `.codex/context/repo/plugins/first-party.md`
- Community/submodule guardrails: `.codex/context/repo/plugins/community.md`
- Marketplace MCP behavior and limits: `.codex/context/tooling/mcp/marketplace-server.md`
- CI and registry flow: `.codex/context/tooling/ci/workflows.md`
- Jira hook diagnostics: `.codex/context/integrations/jira-orchestrator/hooks.md`
- Context-budget policy: `.codex/policies/context-budget.md`
- Multi-agent policy: `.codex/policies/multi-agent.md`
- Agent briefs: `.codex/agents/README.md`

## Working Rules
- Prefer `rg --files` and `rg -n` before reading whole files.
- Keep reads targeted; avoid bulk scans of `community/` unless the task is community-plugin specific.
- Use `apply_patch` for manual file edits.
- Treat `community/` as submodule-managed unless the user explicitly wants upstream/community plugin edits.
- Never hand-edit `.claude-plugin/marketplace.json`; regenerate it.
- Do not trust `validate_all` as a deep validator for community plugins or hook schema correctness.
- Use Codex parallel reads for discovery.
- Multi-agent work is enabled as an opt-in mode for this repo: if the user asks for delegation, parallel agents, or a swarm/team, route through `.codex/policies/multi-agent.md`.
- In multi-agent mode, assign disjoint ownership and keep the immediate critical-path task local unless a user-requested orchestration pattern clearly improves speed or quality.

## Task Routing
- Multi-agent orchestration: `.codex/agents/marketplace-orchestrator.md`
- New plugin or new component work: `.codex/agents/marketplace-plugin-scaffolder.md`
- QA, review, CI, or convention failures: `.codex/agents/marketplace-plugin-validator.md`
- README, manifest descriptions, component summaries: `.codex/agents/marketplace-plugin-documenter.md`
- Claude/Jira setup drift or hook errors: `.codex/context/integrations/jira-orchestrator/hooks.md`

## Current Repo Fingerprint
- Purpose: TAIA marketplace for Claude Code plugins plus shared registry/MCP tooling
- Runtime: Node.js 18+ supported, Node.js 22 recommended
- Main executable code: `tools/marketplace-mcp/src/index.js`
- Shared library: `tools/lib/registry.js`
- First-party plugins: `plugins/a3-plugin`, `plugins/playwright`
- Community content: `community/claude` git submodule
