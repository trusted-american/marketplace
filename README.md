# Marketplace

Plugin registry for Claude Code, maintained by [Trusted American Insurance Agency](https://taia.us/).

## Repository layout

```
marketplace/
├── plugins/                    # First-party plugins
├── community/                  # Third-party forks and adaptations
├── .claude-plugin/
│   └── marketplace.json        # Auto-generated plugin index (do not edit)
├── tools/
│   ├── lib/registry.js         # Shared registry generation logic
│   ├── generate-marketplace-json.js  # CLI script to regenerate marketplace.json
│   └── marketplace-mcp/        # MCP server for plugin management
├── .github/workflows/ci.yml    # Validation + registry generation
└── .mcp.json                   # Auto-loads the MCP server in Claude Code
```

## Plugin structure

Every plugin in `plugins/` or `community/` must contain these files:

| File | Purpose |
|---|---|
| `README.md` | Usage documentation |
| `LICENSE` | License file |
| `.claude-plugin/plugin.json` | Plugin manifest |

Components go in the plugin root, never inside `.claude-plugin/`:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Manifest — only file in this directory
├── skills/                  # Each skill is a subdirectory with a SKILL.md
│   └── skill-name/
│       └── SKILL.md
├── agents/                  # Agent definitions (.md files)
│   └── agent-name.md
├── commands/                # Slash command definitions (.md files)
│   └── command-name.md
├── hooks/                   # Hook configurations (.json files)
│   └── hooks.json
├── templates/               # Output templates (.md files)
│   └── template-name.md
├── .mcp.json                # MCP server config (optional)
├── README.md
└── LICENSE
```

### plugin.json manifest

The `name` field is required and must be kebab-case (`^[a-z0-9-]+$`). All other fields are optional but recommended.

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "What this plugin does",
  "author": { "name": "Author Name" },
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "repository": "https://github.com/org/repo"
}
```

Names must be unique across the entire marketplace. If two plugins share a `name`, CI will warn and the second one overwrites the first in `.claude-plugin/marketplace.json`.

## How marketplace.json works

`.claude-plugin/marketplace.json` is a generated index of all plugins. It is **not** updated in PRs. The flow:

1. A PR adds or modifies plugins and passes CI validation.
2. The PR merges to `main`.
3. CI runs `node tools/generate-marketplace-json.js`, which scans `plugins/` and `community/`, reads each `plugin.json`, collects component directories, and writes `.claude-plugin/marketplace.json`.
4. CI commits the updated file to `main` with `[skip ci]` to avoid a loop.

The `lastUpdated` timestamp updates on every run. The generation logic lives in `tools/lib/registry.js` and is shared between the CLI script and the MCP server.

## MCP server

The MCP server at `tools/marketplace-mcp/` auto-loads when you open this repo in Claude Code (configured in `.mcp.json`). It exposes 6 tools:

| Tool | What it does |
|---|---|
| `create_plugin` | Scaffolds a new plugin with required files and correct directory structure |
| `validate_plugin` | Checks a plugin for required files, valid manifest, and component structure |
| `validate_all` | Validates every plugin in `plugins/` and `community/` |
| `list_plugins` | Lists all plugins with version, description, and component breakdown |
| `add_component` | Adds a skill, agent, command, hook, or template to an existing plugin |
| `get_conventions` | Returns the full marketplace conventions document |

Validation checks: required files exist, `plugin.json` is valid JSON with a kebab-case `name`, and any component directories that exist contain correctly typed files (`.md` for skills/agents/commands/templates, `.json` for hooks).

## CI pipeline

Every push and PR runs two jobs:

1. **Validate plugins** — Shell script checks every directory in `plugins/` and `community/` for `README.md`, `LICENSE`, and a valid `.claude-plugin/plugin.json` with a kebab-case `name`.
2. **Test MCP server** — Runs `npm test` in `tools/marketplace-mcp/` (vitest, 57 tests covering validation, registry generation, component handling, and security).

On merge to `main`, a third job runs:

3. **Update registry** — Regenerates `.claude-plugin/marketplace.json` and commits it.

## Setup

Prerequisites: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and Node.js 18+ (22 recommended).

```bash
git clone https://github.com/trusted-american/marketplace.git
cd marketplace
npm ci --prefix tools/marketplace-mcp
```

Open the repo in Claude Code. The MCP server loads automatically. Run `list plugins` to verify.

### Optional: Atlassian integration

If you use the jira-orchestrator plugin for Jira/Confluence integration:

```bash
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
cp .env.example .env
# Edit .env — set ATLASSIAN_CLOUD_ID and JIRA_DEFAULT_PROJECT at minimum
```

The first Atlassian tool call opens a browser for OAuth. Run `getAccessibleAtlassianResources` to find your Cloud ID. This config is per-user (stored in your local Claude Code config, not committed to the repo).

## Installing plugins

From this marketplace via HTTPS:

```bash
claude plugin install https://github.com/trusted-american/marketplace.git/plugins/<plugin-name>
```

For local development:

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

## Contributing

Open an issue or submit a pull request. CI validates plugin structure automatically — if validation passes, the plugin follows conventions.

## License

MIT
