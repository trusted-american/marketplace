# Plugin Structure Conventions

## Manifest (.claude-plugin/plugin.json)

Required fields:
- `name`: kebab-case (`^[a-z0-9-]+$`), unique across marketplace
- All other fields optional but recommended

Recommended fields:
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Under 200 chars, clear purpose statement",
  "author": { "name": "Author Name" },
  "license": "MIT",
  "keywords": ["relevant", "searchable", "tags"],
  "repository": "https://github.com/org/repo"
}
```

Community plugins MUST include `repository`.

## Component Frontmatter Specs

### Skills (skills/name/SKILL.md)
```yaml
---
name: skill-name          # kebab-case, matches directory name
description: "When to auto-invoke this skill — include file patterns"
model: claude-sonnet-4-6  # optional model override
allowed-tools:            # optional tool restrictions
  - Read
  - Glob
---
```
Body: workflow steps, patterns, templates, pitfalls. Use 3-tier loading: keep frontmatter ~50 tokens, body ~500-2000 tokens, reference files for deep content.

### Agents (agents/name.md)
```yaml
---
name: agent-name
description: "What it does and WHEN to trigger it"
model: sonnet              # sonnet|opus|haiku
allowed-tools:
  - Read
  - Glob
  - Grep
---
```
Body: role, approach steps, output format. Keep under 100 lines.

### Commands (commands/name.md)
```yaml
---
description: "What this slash command does — shown in /help"
---
```
Body: full prompt that executes when command is invoked.

### Hooks (hooks/hooks.json)
```json
{
  "hooks": {
    "EventName": [{
      "matcher": "ToolPattern",
      "hooks": [{ "type": "prompt", "prompt": "instruction" }]
    }]
  }
}
```
Events: PreToolUse, PostToolUse, Stop, Notification, SubagentStop

### Templates (templates/name.md)
```yaml
---
name: template-name
description: "Output format template for specific use case"
---
```
Body: template structure with placeholders.

## Directory Rules
- Components ALWAYS at plugin root, NEVER inside .claude-plugin/
- .claude-plugin/ contains ONLY plugin.json
- Skills are directories (skills/name/SKILL.md)
- Everything else is flat .md or .json files in their respective dirs
