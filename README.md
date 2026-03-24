# Marketplace

**A curated collection of Claude Code plugins by [Trusted American Insurance Agency]([https://github.com/Trusted-American-Organization](https://taia.us/)).**

We build practical, high-quality plugins that extend what Claude Code can do. This repository is our central hub for developing, publishing, and discovering those tools.

## Structure

```
marketplace/
  plugins/          # Original plugins we build and maintain
  community/        # Forked, adapted, or linked third-party plugins
  registry.json     # Central index of all available plugins
```

**`plugins/`** — First-party plugins created by our team. Each subdirectory is a standalone Claude Code plugin with its own `plugin.json`.

**`community/`** — Plugins forked from or linked to upstream projects. Each includes attribution and a link back to the original source.

**`registry.json`** — Machine-readable index of every plugin in the marketplace, validated against `registry.schema.json`.

## Getting started

To install a plugin from this marketplace:

```bash
# First-party plugin
claude install-plugin /path/to/marketplace/plugins/<plugin-name>

# Community plugin
claude install-plugin /path/to/marketplace/community/<plugin-name>
```

## Contributing

This marketplace is maintained by the Trusted American Organization team. If you'd like to contribute a plugin or suggest an improvement, open an issue or submit a pull request.

## License

MIT
