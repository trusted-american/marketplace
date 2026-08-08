# Repo Overview

## Purpose
`taia-marketplace` is a plugin marketplace for Claude Code. It stores first-party plugins, a community plugin submodule, registry generation code, and a local MCP server for plugin management.

## Top-Level Map
- `plugins/`: first-party plugins owned in this repo
- `community/`: third-party and upstream content, currently centered on `community/claude`
- `.claude-plugin/marketplace.json`: generated plugin registry
- `tools/lib/registry.js`: shared registry generation logic
- `tools/marketplace-mcp/`: MCP server used to scaffold and validate marketplace plugins
- `.github/workflows/`: CI and submodule sync automation

## Runtime Facts
- Node.js 18+ supported; 22 recommended in README and CI
- Marketplace MCP server uses `@modelcontextprotocol/sdk`, `zod`, and `vitest`
- Root `.mcp.json` auto-points Claude Code at `tools/marketplace-mcp/src/index.js`

## Core Commands
- Install: `npm ci --prefix tools/marketplace-mcp`
- Test: `npm test --prefix tools/marketplace-mcp`
- Regenerate registry: `node tools/generate-marketplace-json.js`

## Where To Look Next
- Conventions: `conventions.md`
- First-party plugins: `plugins/first-party.md`
- Community rules: `plugins/community.md`
- Tooling: `../tooling/mcp/marketplace-server.md`
