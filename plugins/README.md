# plugins/

First-party plugins built by Trusted American Insurance Agency.

Each subdirectory is a standalone Claude Code plugin. Required files per plugin:

- `README.md` — usage documentation
- `LICENSE` — license file
- `.claude-plugin/plugin.json` — manifest with a kebab-case `name` field

Component directories (`skills/`, `agents/`, `commands/`, `hooks/`, `templates/`) go in the plugin root, not inside `.claude-plugin/`.

See the [root README](../README.md) for the full directory layout, manifest schema, and CI validation details.

## Current plugins

| Plugin | Description |
|---|---|
| [playwright](./playwright/) | Multi-agent Playwright test generation with parallel review pipeline |
