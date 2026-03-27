---
name: mcp-server-dev
description: "MCP server development patterns — auto-invoke when editing tools/marketplace-mcp/src/*.js or tools/lib/registry.js"
---

# Marketplace MCP Server Development

## Architecture
- `tools/marketplace-mcp/src/index.js` — MCP server with 6 tools (Hono + Zod + @modelcontextprotocol/sdk)
- `tools/lib/registry.js` — Shared registry generation logic (used by both CLI and MCP server)
- `tools/generate-marketplace-json.js` — CLI script for CI registry regeneration

## Key APIs
```js
// Registry helpers (tools/lib/registry.js)
import { listDirs, fileExists, generateRegistry, writeRegistry } from "../../lib/registry.js";

// generateRegistry(pluginsDir, communityDir) → { plugins: [], warnings: [] }
// writeRegistry(outputPath, plugins) → { count: number }
```

## Adding a New MCP Tool
```js
server.tool(
  "tool_name",                    // snake_case name
  "Description of what it does",  // shown to Claude
  {                               // Zod schema for params
    param: z.string().describe("What this param is"),
  },
  async ({ param }) => {
    // Implementation
    return {
      content: [{ type: "text", text: "result" }],
    };
  }
);
```

## Testing
- Framework: Vitest (57 tests)
- Run: `npm test --prefix tools/marketplace-mcp`
- Test file: `tools/marketplace-mcp/src/index.test.js`
- Tests cover: validation, registry generation, component handling, security (path traversal)

## Security Considerations
- All plugin paths validated against directory traversal (`path.resolve` + `startsWith` check)
- Plugin names validated as kebab-case before use in filesystem paths
- JSON parsing wrapped in try/catch with safe fallbacks

## Common Tasks
- **Add validation check**: Update `validatePlugin()` in index.js
- **Change registry format**: Update `generateRegistry()` in tools/lib/registry.js (shared with CI)
- **Add component type**: Update both `create_plugin` and `add_component` tools, plus `validatePlugin`
