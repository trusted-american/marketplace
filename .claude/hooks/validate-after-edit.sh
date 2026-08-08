#!/bin/bash
# PostToolUse hook: After editing files in plugins/, emit validation reminder
# Registered on Write|Edit tools
INPUT=$(head -c 65536)
if ! printf '%s' "$INPUT" | jq -e . >/dev/null 2>&1; then
  echo '{"decision": "approve"}'
  exit 0
fi

FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')
FILE=$(printf '%s' "$FILE" | tr '\\' '/')

# Only check files inside plugins/ directory
if printf '%s' "$FILE" | grep -qi '/plugins/'; then
  # Extract plugin name from path (plugins/<name>/...)
  PLUGIN=$(printf '%s' "$FILE" | sed -n 's|.*/plugins/\([^/]*\)/.*|\1|p')
  if [ -n "$PLUGIN" ]; then
    echo "[validate] Plugin '$PLUGIN' modified — run validate_plugin to verify structure" >&2
  fi
fi

echo '{"decision": "approve"}'
