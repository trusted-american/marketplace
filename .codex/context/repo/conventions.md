# Plugin Conventions

## Required Files
Every plugin needs:
- `README.md`
- `LICENSE`
- `.claude-plugin/plugin.json`

## Allowed Component Locations
Components live at plugin root, never inside `.claude-plugin/`:
- `skills/<skill-name>/SKILL.md`
- `agents/<agent-name>.md`
- `commands/<command-name>.md`
- `hooks/<file>.json`
- `templates/<template-name>.md`

## Manifest Rules
- `plugin.json.name` is required and must be kebab-case
- `description`, `version`, `license`, `author`, `keywords`, and `repository` are optional but useful
- Community plugins should include `repository`

## Structural Guardrails
- Do not create component directories under `.claude-plugin/`
- Do not hand-edit `.claude-plugin/marketplace.json`
- Skills are directories; agents/commands/templates are markdown files; hooks are json files

## Validation Reality
- `tools/marketplace-mcp` validates marketplace structure, not deep semantic quality
- CI validates required files and manifest naming
- Hook schema correctness needs separate review when hooks matter
