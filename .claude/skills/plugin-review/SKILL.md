---
name: plugin-review
description: "Plugin PR review workflow — auto-invoke when reviewing pull requests or running quality checks on plugins"
---

# Plugin PR Review

## Quick Review (2 minutes)
1. Run `validate_all` MCP tool — catches structural issues
2. Check `git diff` for marketplace.json edits (should be none — it's auto-generated)
3. Verify no secrets in diff (grep for API keys, tokens, passwords)

## Thorough Review
1. **Structure**: Run `validate_plugin` for the specific plugin
2. **Manifest**: Open plugin.json — check name uniqueness, description quality, keywords
3. **Components**:
   - Skills: Does SKILL.md have specific trigger description? Is body useful, not placeholder?
   - Agents: Is model choice justified? Is system prompt focused and under 100 lines?
   - Commands: Does description make sense in /help listing?
   - Hooks: Are events appropriate? Will they block normal workflows?
4. **README**: Does it explain installation and actual usage?
5. **Tests**: If plugin includes MCP server, are there tests?

## Red Flags
- Component directories inside .claude-plugin/ (structure violation)
- Placeholder text from scaffolding still present
- Plugin name not kebab-case or conflicts with existing plugin
- Agent using opus model for simple tasks (cost waste)
- Hook blocking Write/Edit broadly without good reason
- Missing LICENSE file
- Community plugin without repository URL

## After Review
- If PASS: approve PR, CI will auto-generate marketplace.json on merge
- If FAIL: comment with specific fixes referencing the conventions in .claude/rules/plugin-conventions.md
