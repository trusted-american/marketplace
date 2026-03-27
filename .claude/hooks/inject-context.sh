#!/bin/bash
# UserPromptSubmit hook: Inject branch and working state into every prompt
INPUT=$(head -c 65536)

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "none")

echo "[context] Branch: $BRANCH | Uncommitted: $UNCOMMITTED files | Last: $LAST_COMMIT" >&2
echo '{"decision": "approve"}'
