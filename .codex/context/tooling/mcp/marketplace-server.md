# Marketplace MCP Server

## Location
- Source: `tools/marketplace-mcp/src/index.js`
- Package: `tools/marketplace-mcp/package.json`
- Shared registry logic: `tools/lib/registry.js`

## Available Tools
- `create_plugin`
- `validate_plugin`
- `validate_all`
- `list_plugins`
- `add_component`
- `get_conventions`

## Reliable Uses
- Scaffold new plugin directories and manifests
- Add component directories/files with the expected shape
- Validate first-party plugin structure
- Summarize current marketplace entries

## Important Limits
- `validate_all` walks direct children of `plugins/` and direct children of `community/`
- It does not recurse into `community/*/plugins/*`
- It checks hook files exist, but it does not json-schema validate hook contents
- It is a structure validator, not a full marketplace QA system

## Codex Guidance
- When Codex cannot call MCP directly, use these tool docs as the source of truth for expected behavior
- If marketplace behavior seems wrong, inspect `src/index.js` before trusting README claims
