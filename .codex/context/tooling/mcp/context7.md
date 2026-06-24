# Context7 Notes

## Current State
- Claude-local settings in this repo allow Context7 tool names in `.claude/settings.local.json`
- The active Codex environment for this repo does not expose a direct Context7 tool

## Practical Policy
- If Context7 becomes available later, use it first for framework/library API verification
- Until then, prefer official docs and repo source over memory
- Do not describe Context7 as "configured for Codex" unless the tool is actually available in-session

## Why This Matters
- Claude's `claude-code-expert` plugin assumes Context7-first validation for library questions
- Codex parity here should preserve the decision rule, not fake the capability
