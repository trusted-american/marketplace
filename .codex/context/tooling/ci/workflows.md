# CI Workflows

## `ci.yml`
Runs on push and pull request.

### Jobs
- `validate`: checks required files for first-party plugins and nested community plugins
- `test`: runs `npm ci` and `npm test` in `tools/marketplace-mcp`
- `verify-registry`: on PRs, regenerates `.claude-plugin/marketplace.json` and compares plugin data
- `update-registry`: on `main`, regenerates registry, commits to a branch, and opens a PR

## `sync-submodules.yml`
- Scheduled weekly and runnable manually
- Updates `community/claude` submodule and opens a PR when upstream changes

## Mismatch To Remember
- CI validates nested community plugin manifests
- `validate_all` in the marketplace MCP does not recurse the same way

## Safe Operating Rule
- If a task touches registry behavior, check both `ci.yml` and `tools/marketplace-mcp/src/index.js`
