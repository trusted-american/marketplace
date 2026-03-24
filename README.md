# Marketplace

**A curated collection of Claude Code plugins by [Trusted American Insurance Agency](https://taia.us/).**

We build practical, high-quality plugins that extend what Claude Code can do. This repository is our central hub for developing, publishing, and discovering those tools.

## Structure

```
marketplace/
├── plugins/                    # Original plugins we build and maintain
├── community/                  # Forked, adapted, or linked third-party plugins
├── tools/
│   └── marketplace-mcp/        # MCP server for plugin management
├── .github/workflows/ci.yml    # CI validation
└── .mcp.json                   # MCP server config (auto-loads in Claude Code)
```

**`plugins/`** — First-party plugins created by our team.

**`community/`** — Plugins forked from or linked to upstream projects. Each includes attribution and a link back to the original source.

## Plugin requirements

Every plugin (in both `plugins/` and `community/`) must include:

| File | Purpose |
|---|---|
| `README.md` | Installation and usage instructions |
| `LICENSE` | License file |
| `.claude-plugin/plugin.json` | Plugin manifest with at minimum a `name` field |

### Plugin directory structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json             # Manifest (only this goes here)
├── skills/                     # Skill directories with SKILL.md
│   └── skill-name/
│       └── SKILL.md
├── agents/                     # Agent markdown files
│   └── agent-name.md
├── commands/                   # Command markdown files
│   └── command-name.md
├── hooks/                      # Hook configuration
│   └── hooks.json
├── .mcp.json                   # MCP server config (optional)
├── README.md
└── LICENSE
```

> **Important:** Never put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes there.

## Getting started

### Team setup

**Prerequisites:** [Claude Code](https://claude.ai/code) installed and authenticated. Node.js 18+ (22 recommended to match CI).

1. **Clone the repo:**

   ```bash
   git clone https://github.com/trusted-american/marketplace.git
   cd marketplace
   ```

2. **Install MCP server dependencies:**

   ```bash
   npm ci --prefix tools/marketplace-mcp
   ```

3. **Add the Atlassian MCP server** (for Jira/Confluence integration):

   ```bash
   claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
   ```

   The first time you use an Atlassian tool, a browser window opens for OAuth. Each team member runs this once — it is stored in your local Claude Code config, not shared via the repo.

4. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `ATLASSIAN_CLOUD_ID` (obtained from the OAuth step above — run `getAccessibleAtlassianResources` in Claude Code) and `JIRA_DEFAULT_PROJECT`. The database and notification variables in `.env.example` are optional unless you use the jira-orchestrator plugin.

5. **Open the repo in Claude Code.** The marketplace MCP server auto-loads via `.mcp.json` and provides plugin management tools.

6. **Verify the setup:** In Claude Code, run `claude mcp list` to confirm `marketplace` and `atlassian` appear. Then ask Claude to "list plugins" to confirm the marketplace tools are active.

### Installing plugins

Install a plugin from this marketplace:

```bash
claude plugin install <plugin-name>@marketplace
```

Or load locally for development:

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

## Tooling

This repo includes an MCP server at `tools/marketplace-mcp/` that auto-loads when you open the repo in Claude Code. It provides tools for:

- **`create_plugin`** — Scaffold a new plugin with all required files and correct structure
- **`validate_plugin`** — Check a single plugin for required files and valid manifest
- **`validate_all`** — Validate every plugin in the marketplace
- **`list_plugins`** — List all plugins with version, description, and components
- **`add_component`** — Add a skill, agent, command, or hook to an existing plugin
- **`get_conventions`** — View the full marketplace conventions and structure rules

## CI

Every push and PR to `main` runs validation to ensure all plugins have the required `README.md`, `LICENSE`, and `.claude-plugin/plugin.json`.

## Contributing

This marketplace is maintained by the Trusted American Insurance Agency team. If you'd like to contribute a plugin or suggest an improvement, open an issue or submit a pull request.

## License

MIT
