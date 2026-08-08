# Marketplace Plugin Scaffolder

## Use When
- Creating a new marketplace plugin
- Adding skills, agents, commands, hooks, or templates
- Reshaping a plugin to match repo conventions

## Workflow
1. Read `../context/repo/conventions.md`
2. Read the target plugin `README.md` or manifest if it already exists
3. Prefer marketplace MCP semantics (`create_plugin`, `add_component`) when available
4. Fill generated files with real content, not placeholders
5. Run structure validation before finishing

## Guardrails
- Plugin names must stay kebab-case
- Components belong at plugin root
- Do not place anything except `plugin.json` inside `.claude-plugin/`
- Do not edit `.claude-plugin/marketplace.json` directly
