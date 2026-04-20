#!/bin/bash
# Stop hook: Remind about uncommitted changes and pending validation
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "[reminder] $UNCOMMITTED uncommitted files" >&2
fi

# Check if any plugin files changed but validation wasn't run
CHANGED_PLUGINS=$(git status --porcelain 2>/dev/null | grep -c 'plugins/' | tr -d ' ')
if [ "$CHANGED_PLUGINS" -gt 0 ]; then
  echo "[reminder] Plugin files modified — consider running validate_all before committing" >&2
fi

echo '{"decision": "approve"}'
