#!/bin/bash
# PostToolUseFailure hook: Capture tool failures to lessons-learned.md
INPUT=$(head -c 65536)
if ! printf '%s' "$INPUT" | jq -e . >/dev/null 2>&1; then
  echo '{"decision": "approve"}'
  exit 0
fi

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')
ERROR=$(printf '%s' "$INPUT" | jq -r '.error // ""')

if [ -z "$ERROR" ] || [ "$ERROR" = "null" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Sanitize for safe file writing
SAFE_TOOL=$(printf '%s' "$TOOL" | head -c 50 | tr -d '`$()\\!"'\''')
SAFE_ERROR=$(printf '%s' "$ERROR" | head -c 200 | tr -d '`$()\\!"'\''')
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

LESSONS_FILE=".claude/rules/lessons-learned.md"
if [ -f "$LESSONS_FILE" ]; then
  printf '\n### %s failure (%s)\n- **Tool:** %s\n- **Error:** %s\n- **Status:** NEEDS_FIX\n' \
    "$SAFE_TOOL" "$TIMESTAMP" "$SAFE_TOOL" "$SAFE_ERROR" \
    >> "$LESSONS_FILE"
fi

echo '{"decision": "approve"}'
