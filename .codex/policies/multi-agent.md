# Multi-Agent Policy

## Status
- Multi-agent mode is enabled for this repo as an opt-in workflow
- Use it when the user asks for parallel agents, delegation, sub-agents, a team, a swarm, or orchestration

## Default Topology
- Lead stays local in the main Codex session
- Sidecar agents take bounded, non-overlapping work
- Validator or auditor runs in parallel when quality risk is meaningful

## Preferred Splits
- Build + validate
- Scaffold + document
- Repo research + implementation
- Implementation + targeted review

## Marketplace-Specific Templates
### Builder-Validator
- Local lead: owns plan, integration, and final answer
- Worker A: plugin scaffolding or code changes
- Worker B: validation and convention review

### Builder-Documenter
- Local lead: owns scope and integration
- Worker A: file creation or edits
- Worker B: README, manifest description, usage docs

### Research-Build-Review
- Local lead: owns the critical path and final synthesis
- Worker A: focused repo research
- Worker B: implementation in a disjoint write scope
- Worker C: review or QA pass

## Ownership Rules
- Give each agent a clear write scope
- Tell workers they are not alone in the codebase
- Never have two agents edit the same file unless the lead intends to integrate manually
- Keep risky or ambiguous decisions with the lead

## Context Budget Rules
- Delegate bounded tasks, not broad exploration
- Pass only the files and facts the worker needs
- Reuse the agent index in `../agents/README.md`
- Do not spawn agents for trivial grep/read tasks

## Recommended Role Map
- Orchestrator: `../agents/marketplace-orchestrator.md`
- Builder: `../agents/marketplace-plugin-scaffolder.md`
- Validator: `../agents/marketplace-plugin-validator.md`
- Documenter: `../agents/marketplace-plugin-documenter.md`
