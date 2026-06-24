# Git Workflow

## Branch Strategy
- `main` — protected, requires PR
- Feature branches: `feat/<plugin-name>` or `feat/<description>`
- Fix branches: `fix/<description>`

## Commit Messages
Follow conventional commits (from git history):
- `feat: <plugin-name> Plugin (#PR)` — new plugin
- `fix: <description> (#PR)` — bug fix
- `chore: update marketplace.json [skip ci]` — auto-generated registry update

## PR Rules
- CI must pass: plugin validation + MCP server tests + registry verification
- marketplace.json changes are auto-generated — never include manual edits
- One plugin per PR preferred for clean review

## Submodules
- `community/claude` is a git submodule pointing to upstream community repo
- Initialize with: `git submodule update --init --recursive`
- Do NOT edit files inside community/ directly — changes go upstream
- CI checks out submodules recursively

## Registry Flow
1. PR adds/modifies plugins → CI validates
2. PR merges to main
3. CI runs `node tools/generate-marketplace-json.js`
4. CI creates auto-PR with updated marketplace.json + `[skip ci]`
