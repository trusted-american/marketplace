---
name: plugin-authoring
description: "Guide for writing high-quality plugin components — auto-invoke when creating or editing files in plugins/**/skills/, plugins/**/agents/, plugins/**/commands/, plugins/**/hooks/, plugins/**/templates/, or any plugin.json"
---

# Plugin Authoring Guide

## Workflow: New Plugin
1. Run `create_plugin` MCP tool with name, description, category, components list
2. Replace all generated placeholder content with real implementations
3. Write README with installation, usage, component listing
4. Run `validate_plugin` to verify structure
5. Test locally: `claude --plugin-dir ./plugins/<name>`

## Workflow: Add Component to Existing Plugin
1. Run `add_component` MCP tool OR create files manually following conventions
2. Write meaningful frontmatter — description must be specific enough for auto-triggering
3. Validate with `validate_plugin`

## Writing Good Skills
- **Frontmatter description**: Include file patterns or trigger phrases. This is what Claude reads to decide whether to activate the skill.
  - Bad: `"Helps with testing"`
  - Good: `"Playwright test patterns — auto-invoke when working on *.spec.ts or test generation"`
- **Body structure**: Problem context → workflow steps → code patterns → pitfalls
- **Progressive disclosure**: Keep body under 2000 tokens. Reference external files for deep content.
- **allowed-tools**: Only list tools the skill actually needs

## Writing Good Agents
- **Description**: Must say WHAT it does AND WHEN to use it
  - Bad: `"Code review agent"`
  - Good: `"Security-focused code reviewer for auth and payment code. Use before merging PRs touching auth/ or payments/"`
- **Model selection**: opus for reasoning/security/architecture, sonnet for implementation/generation, haiku for lookups
- **System prompt**: Role → trigger conditions → step-by-step approach → output format
- **Keep under 100 lines** — agents get loaded into subagent context

## Writing Good Commands
- **Description**: Shown in `/help` — make it scannable
- **Body**: Full prompt. Can reference files with `${CLAUDE_PLUGIN_ROOT}/path`
- **Arguments**: Use `$ARGUMENTS` placeholder for user input after the command name

## Writing Good Hooks
- **prompt type** preferred over command type — more flexible, no shell scripts needed
- **Matchers**: Use tool name patterns like `Write|Edit`, `Bash`, `*`
- **Events**: PreToolUse (guard), PostToolUse (validate/format), Stop (remind), Notification (alert)

## Anti-Patterns
- Placeholder content left from scaffolding ("Example skill — replace with your own")
- Overly broad agent descriptions that trigger for everything
- Skills with no body content (just frontmatter)
- Components inside .claude-plugin/ directory
- Hooks that block common operations without good reason
