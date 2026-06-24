# LSP Evaluation

## Best Fit For This Repo
- TypeScript / JavaScript language support is the highest-value LSP category
- Most useful when editing `community/claude` app code or the marketplace MCP server

## Recommended Servers
- `typescript-language-server` with `typescript`
- Optional ESLint integration when working in subtrees that already carry lint setup
- JSON schema tooling for plugin manifests and hook files

## Low-Priority
- Heavy multi-language LSP installation at repo root
- Tooling for stacks not actively edited in this repo

## Codex Guidance
- Use grep and targeted reads first
- Reach for LSP-level reasoning only when cross-file symbol navigation would materially reduce risk
